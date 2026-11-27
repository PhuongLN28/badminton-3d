import {
  COURT_HALF_WIDTH_DOUBLES,
  DT,
  GRAVITY,
  NET_HEIGHT_CENTER,
  SHUTTLE_MAX_POS_COORD,
  SHUTTLE_MAX_SPEED,
  SHUTTLE_MIN_SPEED_FOR_ORIENT,
  SHUTTLE_TERMINAL_VELOCITY,
} from '../config';
import { copyQuatOut, quatFromUnitVectorsOut, quatIdentity } from '../math/quat';
import { normalizeOut, vec3 } from '../math/vec3';
import type { Quat, ReadonlyVec3, ShuttleSnapshot, SimEvent, Vec3 } from '../types';
import { resolveNetAndFloorCollisions } from './collision';

const LOCAL_NOSE_DIR: ReadonlyVec3 = { x: 0, y: 1, z: 0 };
const TEMP_DIR: Vec3 = { x: 0, y: 1, z: 0 };

/** Mutable authoritative simulation state for the shuttlecock. */
export interface ShuttleState {
  /** World-space position of the cork center (m). */
  pos: Vec3;
  /** World-space linear velocity (m/s). */
  vel: Vec3;
  /** Visual nose orientation unit quaternion (+Y local points along velocity). */
  quat: Quat;
  /** Current lifecycle state of the shuttle. */
  state: 'idle' | 'flying' | 'grounded';
}

/** Tunable aerodynamic and collision parameters for shuttle stepping (SI units). */
export interface PhysicsConfig {
  /** Gravitational acceleration magnitude (m/s^2). */
  readonly g: number;
  /** Terminal velocity in air (m/s). */
  readonly vt: number;
  /** Upper safety clamp on shuttle speed (m/s). */
  readonly maxSpeed: number;
  /** Upper safety clamp on absolute position coordinate (m). */
  readonly maxPosCoord: number;
  /** Net top height at center plane x = 0 (m). */
  readonly netHeight: number;
  /** Half-width of the net along Z (m). */
  readonly netHalfWidth: number;
  /** Whether net collisions are resolved during stepping. */
  readonly collideNet: boolean;
  /** Whether downward gravity is active. */
  readonly gravityEnabled: boolean;
  /** Whether quadratic aerodynamic drag is active. */
  readonly dragEnabled: boolean;
}

/** Default shuttle physics parameters sourced from `src/shared/config.ts`. */
export const DEFAULT_PHYSICS_CONFIG: Readonly<PhysicsConfig> = {
  g: GRAVITY,
  vt: SHUTTLE_TERMINAL_VELOCITY,
  maxSpeed: SHUTTLE_MAX_SPEED,
  maxPosCoord: SHUTTLE_MAX_POS_COORD,
  netHeight: NET_HEIGHT_CENTER,
  netHalfWidth: COURT_HALF_WIDTH_DOUBLES,
  collideNet: true,
  gravityEnabled: true,
  dragEnabled: true,
};

/** Discrete collision events emitted by a single `stepShuttle` call. */
export interface StepResult {
  netHitEvent: Extract<SimEvent, { type: 'netHit' }> | null;
  landEvent: Extract<SimEvent, { type: 'land' }> | null;
}

/** Pre-allocated scratch buffers so `stepShuttle` performs zero heap allocations per tick. */
export interface ShuttleScratch {
  prevPos: Vec3;
  prevVel: Vec3;
  postIntegratePos: Vec3;
  postIntegrateVel: Vec3;
  k1v: Vec3;
  k2v: Vec3;
  k3v: Vec3;
  k4v: Vec3;
  v2: Vec3;
  v3: Vec3;
  v4: Vec3;
  result: StepResult;
}

/** Allocate a reusable `ShuttleScratch` workspace for `stepShuttle`. */
export function createShuttleScratch(): ShuttleScratch {
  return {
    prevPos: vec3(),
    prevVel: vec3(),
    postIntegratePos: vec3(),
    postIntegrateVel: vec3(),
    k1v: vec3(),
    k2v: vec3(),
    k3v: vec3(),
    k4v: vec3(),
    v2: vec3(),
    v3: vec3(),
    v4: vec3(),
    result: {
      netHitEvent: null,
      landEvent: null,
    },
  };
}

/** Create an idle shuttle state at the origin. */
export function createShuttleState(): ShuttleState {
  return {
    pos: vec3(0, 0, 0),
    vel: vec3(0, 0, 0),
    quat: quatIdentity(),
    state: 'idle',
  };
}

/** Copy all shuttle fields from `src` into `dst` without allocating. */
export function copyShuttleState(dst: ShuttleState, src: Readonly<ShuttleState>): void {
  dst.pos.x = src.pos.x;
  dst.pos.y = src.pos.y;
  dst.pos.z = src.pos.z;
  dst.vel.x = src.vel.x;
  dst.vel.y = src.vel.y;
  dst.vel.z = src.vel.z;
  copyQuatOut(src.quat, dst.quat);
  dst.state = src.state;
}

/** Convert a `ShuttleState` into a read-only `ShuttleSnapshot`. */
export function toShuttleSnapshot(state: Readonly<ShuttleState>): ShuttleSnapshot {
  return {
    x: state.pos.x,
    y: state.pos.y,
    z: state.pos.z,
    vx: state.vel.x,
    vy: state.vel.y,
    vz: state.vel.z,
    state: state.state,
  };
}

function clampFiniteCoord(value: number, maxAbs: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < -maxAbs) {
    return -maxAbs;
  }
  if (value > maxAbs) {
    return maxAbs;
  }
  return value;
}

/**
 * Sanitize non-finite numbers and clamp shuttle position and velocity without floating-point
 * squaring overflow (normalizes by `maxComp` before squaring when `maxComp > cfg.maxSpeed`).
 * Uses only `+ - * /` and `Math.sqrt`.
 */
export function sanitizeAndClampShuttle(
  state: ShuttleState,
  cfg: Readonly<PhysicsConfig> = DEFAULT_PHYSICS_CONFIG,
): void {
  const maxPos = cfg.maxPosCoord;
  state.pos.x = clampFiniteCoord(state.pos.x, maxPos);
  state.pos.y = clampFiniteCoord(state.pos.y, maxPos);
  state.pos.z = clampFiniteCoord(state.pos.z, maxPos);

  if (!Number.isFinite(state.vel.x)) state.vel.x = 0;
  if (!Number.isFinite(state.vel.y)) state.vel.y = 0;
  if (!Number.isFinite(state.vel.z)) state.vel.z = 0;

  const maxSpeed = cfg.maxSpeed;
  if (maxSpeed <= 0) {
    state.vel.x = 0;
    state.vel.y = 0;
    state.vel.z = 0;
    return;
  }

  const ax = state.vel.x < 0 ? -state.vel.x : state.vel.x;
  const ay = state.vel.y < 0 ? -state.vel.y : state.vel.y;
  const az = state.vel.z < 0 ? -state.vel.z : state.vel.z;
  let maxComp = ax;
  if (ay > maxComp) maxComp = ay;
  if (az > maxComp) maxComp = az;

  if (maxComp > maxSpeed) {
    // Divide by maxComp before squaring so large floats (e.g. 1e308) never overflow to Infinity.
    const nx = state.vel.x / maxComp;
    const ny = state.vel.y / maxComp;
    const nz = state.vel.z / maxComp;
    const normLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const scale = maxSpeed / normLen;
    state.vel.x = nx * scale;
    state.vel.y = ny * scale;
    state.vel.z = nz * scale;
    return;
  }

  const speedSq = state.vel.x * state.vel.x + state.vel.y * state.vel.y + state.vel.z * state.vel.z;
  if (speedSq > maxSpeed * maxSpeed) {
    const speed = Math.sqrt(speedSq);
    const scale = maxSpeed / speed;
    state.vel.x *= scale;
    state.vel.y *= scale;
    state.vel.z *= scale;
  }
}

/**
 * Initialize a flying shuttle state at position `pos` (m) and velocity `vel` (m/s),
 * orienting the cork nose along `vel` when speed >= `SHUTTLE_MIN_SPEED_FOR_ORIENT`.
 */
export function spawnShuttleState(
  state: ShuttleState,
  pos: ReadonlyVec3,
  vel: ReadonlyVec3,
  cfg: Readonly<PhysicsConfig> = DEFAULT_PHYSICS_CONFIG,
): ShuttleState {
  state.pos.x = pos.x;
  state.pos.y = pos.y;
  state.pos.z = pos.z;
  state.vel.x = vel.x;
  state.vel.y = vel.y;
  state.vel.z = vel.z;
  state.state = 'flying';
  sanitizeAndClampShuttle(state, cfg);

  const speedSq = state.vel.x * state.vel.x + state.vel.y * state.vel.y + state.vel.z * state.vel.z;
  if (speedSq >= SHUTTLE_MIN_SPEED_FOR_ORIENT * SHUTTLE_MIN_SPEED_FOR_ORIENT) {
    normalizeOut(state.vel, TEMP_DIR);
    quatFromUnitVectorsOut(LOCAL_NOSE_DIR, TEMP_DIR, state.quat);
  } else {
    state.quat.x = 0;
    state.quat.y = 0;
    state.quat.z = 0;
    state.quat.w = 1;
  }

  return state;
}

/**
 * Compute shuttle acceleration (m/s^2) from velocity `v` (m/s) under quadratic air drag:
 * `a = (0, -g, 0) - (g / VT^2) * |v| * v`.
 * Uses only `+ - * /` and `Math.sqrt` for cross-engine determinism.
 */
export function accel(
  v: ReadonlyVec3,
  out: Vec3,
  cfg: Readonly<PhysicsConfig> = DEFAULT_PHYSICS_CONFIG,
): Vec3 {
  const sp = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  const k = cfg.dragEnabled && cfg.vt > 0 ? (cfg.g / (cfg.vt * cfg.vt)) * sp : 0;
  out.x = -k * v.x;
  out.y = (cfg.gravityEnabled ? -cfg.g : 0) - k * v.y;
  out.z = -k * v.z;
  return out;
}

/**
 * Advance shuttle position and velocity by `dtS` seconds using RK4 integration and resolve
 * swept net/floor collisions. Performs zero heap allocations when `scratch` is supplied.
 * Uses only `+ - * /` and `Math.sqrt` in the integration loop; does not update `state.quat`.
 *
 * @param state Mutable shuttle state.
 * @param dtS Fixed step duration (s), defaults to `1/120 s`.
 * @param cfg Physics parameters.
 * @param scratch Pre-allocated scratch buffers.
 * @param tick Current simulation tick index attached to emitted collision events.
 */
export function stepShuttle(
  state: ShuttleState,
  dtS: number = DT,
  cfg: Readonly<PhysicsConfig> = DEFAULT_PHYSICS_CONFIG,
  scratch: ShuttleScratch = createShuttleScratch(),
  tick = 0,
): StepResult {
  scratch.result.netHitEvent = null;
  scratch.result.landEvent = null;

  if (state.state !== 'flying' || !Number.isFinite(dtS) || dtS <= 0) {
    return scratch.result;
  }

  sanitizeAndClampShuttle(state, cfg);

  const prevPos = scratch.prevPos;
  const prevVel = scratch.prevVel;
  prevPos.x = state.pos.x;
  prevPos.y = state.pos.y;
  prevPos.z = state.pos.z;
  prevVel.x = state.vel.x;
  prevVel.y = state.vel.y;
  prevVel.z = state.vel.z;

  const halfDt = dtS * 0.5;
  const sixthDt = dtS / 6;

  const k1v = scratch.k1v;
  const k2v = scratch.k2v;
  const k3v = scratch.k3v;
  const k4v = scratch.k4v;
  const v2 = scratch.v2;
  const v3 = scratch.v3;
  const v4 = scratch.v4;

  // Stage 1 (k1p = prevVel)
  accel(prevVel, k1v, cfg);

  // Stage 2 (k2p = v2)
  v2.x = prevVel.x + k1v.x * halfDt;
  v2.y = prevVel.y + k1v.y * halfDt;
  v2.z = prevVel.z + k1v.z * halfDt;
  accel(v2, k2v, cfg);

  // Stage 3 (k3p = v3)
  v3.x = prevVel.x + k2v.x * halfDt;
  v3.y = prevVel.y + k2v.y * halfDt;
  v3.z = prevVel.z + k2v.z * halfDt;
  accel(v3, k3v, cfg);

  // Stage 4 (k4p = v4)
  v4.x = prevVel.x + k3v.x * dtS;
  v4.y = prevVel.y + k3v.y * dtS;
  v4.z = prevVel.z + k3v.z * dtS;
  accel(v4, k4v, cfg);

  state.pos.x = prevPos.x + sixthDt * (prevVel.x + 2 * v2.x + 2 * v3.x + v4.x);
  state.pos.y = prevPos.y + sixthDt * (prevVel.y + 2 * v2.y + 2 * v3.y + v4.y);
  state.pos.z = prevPos.z + sixthDt * (prevVel.z + 2 * v2.z + 2 * v3.z + v4.z);

  state.vel.x = prevVel.x + sixthDt * (k1v.x + 2 * k2v.x + 2 * k3v.x + k4v.x);
  state.vel.y = prevVel.y + sixthDt * (k1v.y + 2 * k2v.y + 2 * k3v.y + k4v.y);
  state.vel.z = prevVel.z + sixthDt * (k1v.z + 2 * k2v.z + 2 * k3v.z + k4v.z);

  sanitizeAndClampShuttle(state, cfg);

  scratch.postIntegratePos.x = state.pos.x;
  scratch.postIntegratePos.y = state.pos.y;
  scratch.postIntegratePos.z = state.pos.z;
  scratch.postIntegrateVel.x = state.vel.x;
  scratch.postIntegrateVel.y = state.vel.y;
  scratch.postIntegrateVel.z = state.vel.z;

  resolveNetAndFloorCollisions(state, prevPos, prevVel, cfg, tick, scratch.result);

  return scratch.result;
}
