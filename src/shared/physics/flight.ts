import { DT, FLIGHT_DEFAULT_MAX_TIME_S } from '../config';
import type { ReadonlyVec3, Vec3 } from '../types';
import {
  DEFAULT_PHYSICS_CONFIG,
  copyShuttleState,
  createShuttleScratch,
  createShuttleState,
  spawnShuttleState,
  stepShuttle,
  type PhysicsConfig,
  type ShuttleState,
} from './shuttle';

/** Summary metrics produced by `simulateFlight`. */
export interface FlightResult {
  landed: boolean;
  /** Landing timestamp (s), or `null` if still airborne at `maxTime`. */
  tLand: number | null;
  /** Landing ground coordinates `(x, z)` (m), or `null` if not landed. */
  land: { x: number; z: number } | null;
  /** Highest trajectory point `(x, y)` (m). */
  apex: { x: number; y: number };
  /** Height (m) and speed (m/s) when first crossing `x = 0`, or `null` if never crossed. */
  netCross: { y: number; speed: number } | null;
  /** True if the shuttle collided with the net or crossed `x = 0` below `netHeight`. */
  hitsNet: boolean;
  /** Speed at floor contact (m/s), or `null` if not landed. */
  landSpeed: number | null;
  /** Downward trajectory angle relative to horizontal at floor contact (deg), or `null`. */
  descentAngleDeg: number | null;
  /** Ratio `|land.x - apex.x| / |apex.x - p0.x|` when ascent span >= 0.05 m, else `null`. */
  descOverAscRatio: number | null;
  /** Optional sampled trajectory points (m) when `recordPath` is true. */
  path?: Vec3[];
}

/** Configuration options for `simulateFlight`. */
export interface SimulateFlightOptions {
  /** Whether net collisions alter trajectory (`false` for unobstructed reference curves). */
  collideNet: boolean;
  /** Maximum simulated time (s), defaults to `FLIGHT_DEFAULT_MAX_TIME_S`. */
  maxTime?: number;
  /** Fixed simulation timestep (s), defaults to `DT`. */
  dt?: number;
  /** Override gravity enabled flag (defaults to `true`). */
  gravityEnabled?: boolean;
  /** Override quadratic drag enabled flag (defaults to `true`). */
  dragEnabled?: boolean;
  /** Record per-tick world positions into `FlightResult.path`. */
  recordPath?: boolean;
}

/** First state satisfying a `predictUntil` predicate. */
export interface PredictResult {
  /** Exact step timestamp `stepCount * dtS` (s). */
  t: number;
  /** Shuttle position at `t` (m). */
  p: Vec3;
  /** Shuttle velocity at `t` (m/s). */
  v: Vec3;
}

/**
 * Simulate a complete shuttle flight from `(p0, v0)` using `stepShuttle`, tracking sub-tick
 * cubic Hermite apex, first net-plane crossing, and floor landing metrics.
 *
 * @param p0 Initial cork position (m).
 * @param v0 Initial velocity (m/s).
 * @param opts Simulation options.
 */
export function simulateFlight(
  p0: ReadonlyVec3,
  v0: ReadonlyVec3,
  opts: SimulateFlightOptions,
): FlightResult {
  const maxTime = opts.maxTime ?? FLIGHT_DEFAULT_MAX_TIME_S;
  const dt = opts.dt ?? DT;
  const cfg: PhysicsConfig = {
    ...DEFAULT_PHYSICS_CONFIG,
    collideNet: opts.collideNet,
    gravityEnabled: opts.gravityEnabled ?? true,
    dragEnabled: opts.dragEnabled ?? true,
  };

  const state = createShuttleState();
  spawnShuttleState(state, p0, v0, cfg);
  const scratch = createShuttleScratch();

  let apex = { x: state.pos.x, y: state.pos.y };
  let netCross: { y: number; speed: number } | null = null;
  let hitNetEvent = false;
  const path: Vec3[] | undefined = opts.recordPath
    ? [{ x: state.pos.x, y: state.pos.y, z: state.pos.z }]
    : undefined;

  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(maxTime) || maxTime <= 0) {
    const emptyResult: FlightResult = {
      landed: false,
      tLand: null,
      land: null,
      apex,
      netCross: null,
      hitsNet: false,
      landSpeed: null,
      descentAngleDeg: null,
      descOverAscRatio: null,
    };
    if (path) {
      emptyResult.path = path;
    }
    return emptyResult;
  }

  let stepCount = 0;
  while (stepCount * dt < maxTime - 1e-12) {
    stepCount += 1;
    const stepRes = stepShuttle(state, dt, cfg, scratch, stepCount);
    const { prevPos, prevVel, postIntegratePos, postIntegrateVel } = scratch;

    if (stepRes.netHitEvent !== null) {
      hitNetEvent = true;
    }

    // Track net-plane crossing on the integrated segment before landing/bounce.
    if (
      netCross === null &&
      ((prevPos.x < 0 && postIntegratePos.x >= 0) || (prevPos.x > 0 && postIntegratePos.x <= 0)) &&
      postIntegratePos.x !== prevPos.x
    ) {
      const fNet = -prevPos.x / (postIntegratePos.x - prevPos.x);
      if (stepRes.landEvent === null || fNet <= stepRes.landEvent.subTickFraction) {
        const yCross = prevPos.y + (postIntegratePos.y - prevPos.y) * fNet;
        const vxCross = prevVel.x + (postIntegrateVel.x - prevVel.x) * fNet;
        const vyCross = prevVel.y + (postIntegrateVel.y - prevVel.y) * fNet;
        const vzCross = prevVel.z + (postIntegrateVel.z - prevVel.z) * fNet;
        netCross = {
          y: yCross,
          speed: Math.sqrt(vxCross * vxCross + vyCross * vyCross + vzCross * vzCross),
        };
      }
    }

    // Sub-tick cubic Hermite apex interpolation when vertical velocity crosses zero downward.
    if (stepRes.netHitEvent === null && prevVel.y > 0 && postIntegrateVel.y <= 0) {
      const f = prevVel.y / (prevVel.y - postIntegrateVel.y);
      const f2 = f * f;
      const f3 = f2 * f;
      const h00 = 2 * f3 - 3 * f2 + 1;
      const h10 = f3 - 2 * f2 + f;
      const h01 = -2 * f3 + 3 * f2;
      const h11 = f3 - f2;

      const xApex =
        h00 * prevPos.x +
        h10 * (dt * prevVel.x) +
        h01 * postIntegratePos.x +
        h11 * (dt * postIntegrateVel.x);
      const yApex =
        h00 * prevPos.y +
        h10 * (dt * prevVel.y) +
        h01 * postIntegratePos.y +
        h11 * (dt * postIntegrateVel.y);

      if (yApex > apex.y) {
        apex = { x: xApex, y: yApex };
      }
    } else if (stepRes.netHitEvent === null && stepRes.landEvent === null && state.pos.y > apex.y) {
      apex = { x: state.pos.x, y: state.pos.y };
    }

    if (stepRes.landEvent !== null) {
      const fFloor = stepRes.landEvent.subTickFraction;
      const tLand = (stepCount - 1 + fFloor) * dt;
      const land = { x: stepRes.landEvent.x, z: stepRes.landEvent.z };

      if (path) {
        path.push({ x: land.x, y: 0, z: land.z });
      }

      const vlx = prevVel.x + (postIntegrateVel.x - prevVel.x) * fFloor;
      const vly = prevVel.y + (postIntegrateVel.y - prevVel.y) * fFloor;
      const vlz = prevVel.z + (postIntegrateVel.z - prevVel.z) * fFloor;
      const landSpeed = Math.sqrt(vlx * vlx + vly * vly + vlz * vlz);
      const horizSpeed = Math.sqrt(vlx * vlx + vlz * vlz);
      const descentAngleDeg = (Math.atan2(-vly, horizSpeed) * 180) / Math.PI;

      const dirSign = v0.x >= 0 ? 1 : -1;
      const asc = (apex.x - p0.x) * dirSign;
      const desc = (land.x - apex.x) * dirSign;
      const descOverAscRatio = asc < 0.05 ? null : desc / asc;

      const landedResult: FlightResult = {
        landed: true,
        tLand,
        land,
        apex,
        netCross,
        hitsNet: hitNetEvent || (netCross !== null && netCross.y < cfg.netHeight),
        landSpeed,
        descentAngleDeg,
        descOverAscRatio,
      };
      if (path) {
        landedResult.path = path;
      }
      return landedResult;
    }

    if (path) {
      path.push({ x: state.pos.x, y: state.pos.y, z: state.pos.z });
    }
  }

  const unlandedResult: FlightResult = {
    landed: false,
    tLand: null,
    land: null,
    apex,
    netCross,
    hitsNet: hitNetEvent || (netCross !== null && netCross.y < cfg.netHeight),
    landSpeed: null,
    descentAngleDeg: null,
    descOverAscRatio: null,
  };
  if (path) {
    unlandedResult.path = path;
  }
  return unlandedResult;
}

/**
 * Step a clone of `s` until `predicate(p, v, t)` returns true or `maxTime` (s) expires.
 * Does not mutate `s`, and computes `t = stepCount * dtS`.
 */
export function predictUntil(
  s: Readonly<ShuttleState>,
  predicate: (p: ReadonlyVec3, v: ReadonlyVec3, t: number) => boolean,
  maxTime: number,
  dtS: number = DT,
  cfg: Readonly<PhysicsConfig> = DEFAULT_PHYSICS_CONFIG,
): PredictResult | null {
  if (
    s.state !== 'flying' ||
    !Number.isFinite(dtS) ||
    dtS <= 0 ||
    !Number.isFinite(maxTime) ||
    maxTime <= 0
  ) {
    return null;
  }

  const simState = createShuttleState();
  copyShuttleState(simState, s);
  const scratch = createShuttleScratch();

  let stepCount = 0;
  while (stepCount * dtS < maxTime - 1e-12) {
    stepCount += 1;
    stepShuttle(simState, dtS, cfg, scratch, stepCount);
    const t = stepCount * dtS;
    if (predicate(simState.pos, simState.vel, t)) {
      return {
        t,
        p: { x: simState.pos.x, y: simState.pos.y, z: simState.pos.z },
        v: { x: simState.vel.x, y: simState.vel.y, z: simState.vel.z },
      };
    }
    if (simState.state !== 'flying') {
      break;
    }
  }

  return null;
}
