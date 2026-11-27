import {
  DT,
  JUMP_V0,
  PLAYER_ACCEL,
  PLAYER_AIR_CONTROL,
  PLAYER_BACK_LIMIT,
  PLAYER_DECEL,
  PLAYER_GRAVITY,
  PLAYER_GROUND_EPSILON,
  PLAYER_INITIAL_X,
  PLAYER_MAX_SPEED,
  PLAYER_NET_MARGIN,
} from '@shared/config';
import type { InputFrame, PlayerIndex, PlayerSnapshot } from '@shared/types';

/** Mutable authoritative simulation state for a single player. */
export interface PlayerState {
  playerIndex: PlayerIndex;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  swingState: PlayerSnapshot['swingState'];
}

/** Tunable horizontal and vertical movement parameters for `stepPlayer`. */
export interface PlayerPhysicsConfig {
  readonly maxSpeed: number;
  readonly accel: number;
  readonly decel: number;
  readonly airControl: number;
  readonly jumpV0: number;
  readonly gravity: number;
  readonly netMargin: number;
  readonly backLimit: number;
  readonly groundEpsilon: number;
}

/** Default player physics constants sourced from `src/shared/config.ts`. */
export const DEFAULT_PLAYER_PHYSICS_CONFIG: Readonly<PlayerPhysicsConfig> = {
  maxSpeed: PLAYER_MAX_SPEED,
  accel: PLAYER_ACCEL,
  decel: PLAYER_DECEL,
  airControl: PLAYER_AIR_CONTROL,
  jumpV0: JUMP_V0,
  gravity: PLAYER_GRAVITY,
  netMargin: PLAYER_NET_MARGIN,
  backLimit: PLAYER_BACK_LIMIT,
  groundEpsilon: PLAYER_GROUND_EPSILON,
};

function clampPlayerX(
  x: number,
  playerIndex: PlayerIndex,
  cfg: Readonly<PlayerPhysicsConfig>,
): number {
  const minX = playerIndex === 0 ? -cfg.backLimit : cfg.netMargin;
  const maxX = playerIndex === 0 ? -cfg.netMargin : cfg.backLimit;
  if (x < minX) {
    return minX;
  }
  if (x > maxX) {
    return maxX;
  }
  return x;
}

/**
 * Create an initial grounded player state on their court half.
 *
 * @param playerIndex `0` for P1 (left, x < 0), `1` for P2 (right, x > 0).
 * @param initialX Optional starting X position (m); clamped to legal court limits.
 */
export function createPlayerState(playerIndex: PlayerIndex, initialX?: number): PlayerState {
  const defaultX = playerIndex === 0 ? -PLAYER_INITIAL_X : PLAYER_INITIAL_X;
  const rawX = initialX !== undefined && Number.isFinite(initialX) ? initialX : defaultX;

  return {
    playerIndex,
    x: clampPlayerX(rawX, playerIndex, DEFAULT_PLAYER_PHYSICS_CONFIG),
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    facing: playerIndex === 0 ? 1 : -1,
    grounded: true,
    swingState: 'READY',
  };
}

/**
 * Copy all player state fields into an existing object without allocating memory.
 */
export function copyPlayerState(dst: PlayerState, src: Readonly<PlayerState>): void {
  dst.playerIndex = src.playerIndex;
  dst.x = src.x;
  dst.y = src.y;
  dst.z = src.z;
  dst.vx = src.vx;
  dst.vy = src.vy;
  dst.facing = src.facing;
  dst.grounded = src.grounded;
  dst.swingState = src.swingState;
}

/**
 * Convert a `PlayerState` into a read-only `PlayerSnapshot`.
 */
export function toPlayerSnapshot(state: Readonly<PlayerState>): PlayerSnapshot {
  return {
    x: state.x,
    y: state.y,
    vx: state.vx,
    vy: state.vy,
    facing: state.facing,
    grounded: state.grounded,
    swingState: state.swingState,
  };
}

function sanitizePlayerState(state: PlayerState, cfg: Readonly<PlayerPhysicsConfig>): void {
  if (!Number.isFinite(state.x)) {
    state.x = state.playerIndex === 0 ? -PLAYER_INITIAL_X : PLAYER_INITIAL_X;
  }
  if (!Number.isFinite(state.y) || state.y < 0) {
    state.y = 0;
  }
  if (!Number.isFinite(state.z)) {
    state.z = 0;
  }
  if (!Number.isFinite(state.vx)) {
    state.vx = 0;
  }
  if (!Number.isFinite(state.vy)) {
    state.vy = 0;
  }
  state.x = clampPlayerX(state.x, state.playerIndex, cfg);
}

/**
 * Advance one player's movement and jump physics by `dtS` seconds in-place.
 * Uses only `+ - * /` and comparisons to guarantee cross-engine determinism.
 *
 * @param state Player state mutated in place.
 * @param input Per-tick input frame (`moveX` in `[-1, 1]`, `jump`).
 * @param dtS Fixed simulation step duration (s), defaults to `1/120 s`.
 * @param cfg Player physics parameters.
 * @param canJump Set `false` during serve lock (Phase 4+); defaults to `true`.
 */
export function stepPlayer(
  state: PlayerState,
  input: Readonly<InputFrame>,
  dtS: number = DT,
  cfg: Readonly<PlayerPhysicsConfig> = DEFAULT_PLAYER_PHYSICS_CONFIG,
  canJump = true,
): void {
  if (!Number.isFinite(dtS) || dtS <= 0) {
    return;
  }

  sanitizePlayerState(state, cfg);

  if (state.grounded && input.jump && canJump) {
    state.vy = cfg.jumpV0;
    state.grounded = false;
  }

  const rawMoveX = Number.isFinite(input.moveX) ? input.moveX : 0;
  const moveX = rawMoveX < -1 ? -1 : rawMoveX > 1 ? 1 : rawMoveX;
  const airFactor = state.grounded ? 1 : cfg.airControl;
  const targetVx = moveX * cfg.maxSpeed;

  const vxOld = state.vx;
  const absVxOld = vxOld < 0 ? -vxOld : vxOld;
  const absTargetVx = targetVx < 0 ? -targetVx : targetVx;
  const isAccelerating = moveX !== 0 && vxOld * moveX >= 0 && absVxOld <= absTargetVx;
  const rate = (isAccelerating ? cfg.accel : cfg.decel) * airFactor;

  const diff = targetVx - vxOld;
  const absDiff = diff < 0 ? -diff : diff;
  const maxDeltaV = rate * dtS;

  let vxNew: number;
  let dx: number;
  if (absDiff <= maxDeltaV) {
    const tSub = rate > 0 ? absDiff / rate : 0;
    vxNew = targetVx;
    dx = 0.5 * (vxOld + vxNew) * tSub + vxNew * (dtS - tSub);
  } else {
    vxNew = vxOld + (diff > 0 ? maxDeltaV : -maxDeltaV);
    dx = 0.5 * (vxOld + vxNew) * dtS;
  }

  state.x += dx;
  state.vx = vxNew;

  const minX = state.playerIndex === 0 ? -cfg.backLimit : cfg.netMargin;
  const maxX = state.playerIndex === 0 ? -cfg.netMargin : cfg.backLimit;
  if (state.x < minX) {
    state.x = minX;
    if (state.vx < 0) {
      state.vx = 0;
    }
  } else if (state.x > maxX) {
    state.x = maxX;
    if (state.vx > 0) {
      state.vx = 0;
    }
  }

  if (!state.grounded) {
    state.y += state.vy * dtS - 0.5 * cfg.gravity * dtS * dtS;
    state.vy -= cfg.gravity * dtS;

    if (state.y <= cfg.groundEpsilon && state.vy <= 0) {
      state.y = 0;
      state.vy = 0;
      state.grounded = true;
    }
  }
}
