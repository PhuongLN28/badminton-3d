import {
  DEBUG_AUTO_RETURN,
  DEFAULT_RNG_SEED,
  PRACTICE_TOSS_VY,
  SERVE_CONTACT_OFFSET_X,
  SERVE_CONTACT_Y,
} from '../config';
import { createRng, type SeededRng } from '../math/rng';
import { initialShuttleOrientation } from '../physics/orientation';
import {
  DEFAULT_PHYSICS_CONFIG,
  createShuttleScratch,
  createShuttleState,
  spawnShuttleState,
  type PhysicsConfig,
  type ShuttleScratch,
  type ShuttleState,
} from '../physics/shuttle';
import { createPlayerState, type PlayerState } from '../player/playerSim';
import { createSwingState, type SwingState, type SwingTicks } from '../player/swing';
import type { InputFrame, PlayerIndex, ReadonlyVec3, SimEvent, Vec3 } from '../types';

/** `PhysicsConfig` with writable fields, so debug tools can flip drag, gravity and net collision. */
export type MutablePhysicsConfig = {
  -readonly [K in keyof PhysicsConfig]: PhysicsConfig[K];
};

/**
 * Mutable state of one rally without rules or score (precursor of `MatchSim`, Phase 4):
 * two players with swing state machines, one shuttle, a seeded RNG and the double-hit lock.
 */
export interface RallyState {
  /** Ticks simulated so far (count). */
  tick: number;
  /** P1 (index 0, x < 0) and P2 (index 1, x > 0). */
  players: [PlayerState, PlayerState];
  /** Swing state machine of each player. */
  swings: [SwingState, SwingState];
  /** Swing phase lengths for the current step duration (ticks), refreshed every `stepRally`. */
  ticks: SwingTicks;
  /** The shuttle. */
  shuttle: ShuttleState;
  /** Scratch buffers of `stepShuttle`; `prevPos` holds the shuttle position before the last step. */
  shuttleScratch: ShuttleScratch;
  /** Physics parameters used by `stepShuttle`, `predictSwingKind` and `spawnRallyShuttle`. */
  physicsCfg: MutablePhysicsConfig;
  /** Seeded RNG feeding the timing noise. */
  rng: SeededRng;
  /** Seed of `rng` (32-bit unsigned integer). */
  seed: number;
  /** Last player who hit the shuttle; that player cannot hit again until the opponent hits or it lands. */
  lastHitter: PlayerIndex | null;
  /** Temporary Phase 2 bounce off the player boxes, used by the debug lab only. */
  autoReturnEnabled: boolean;
  /** Events of the latest `stepRally`; the array is reused, so copy what must be kept. */
  events: SimEvent[];
  /** Movement input handed to `stepPlayer` (swing slowdown applied), reused every tick. */
  moveInputs: [InputFrame, InputFrame];
  /** Contact point of the best hit candidate this tick (m), reused. */
  bestContact: Vec3;
  /** Contact point of the candidate under test (m), reused. */
  candidateContact: Vec3;
}

/**
 * Create a rally with both players at their start positions and an idle shuttle.
 *
 * @param seed 32-bit seed of the timing-noise RNG.
 */
export function createRallyState(seed: number = DEFAULT_RNG_SEED): RallyState {
  const safeSeed = seed >>> 0;
  return {
    tick: 0,
    players: [createPlayerState(0), createPlayerState(1)],
    swings: [createSwingState(), createSwingState()],
    ticks: { windup: 0, active: 0, recovery: 0 },
    shuttle: createShuttleState(),
    shuttleScratch: createShuttleScratch(),
    physicsCfg: { ...DEFAULT_PHYSICS_CONFIG },
    rng: createRng(safeSeed),
    seed: safeSeed,
    lastHitter: null,
    autoReturnEnabled: DEBUG_AUTO_RETURN,
    events: [],
    moveInputs: [
      { moveX: 0, jump: false, swing: null, aim: 0 },
      { moveX: 0, jump: false, swing: null, aim: 0 },
    ],
    bestContact: { x: 0, y: 0, z: 0 },
    candidateContact: { x: 0, y: 0, z: 0 },
  };
}

/** Reseed the timing-noise RNG; the next shot draws from the new stream. */
export function setRallySeed(s: RallyState, seed: number): void {
  s.seed = seed >>> 0;
  s.rng = createRng(s.seed);
}

/**
 * Launch the shuttle at `p` (m) with velocity `v` (m/s) using `s.physicsCfg`, orient the nose along
 * `v` and release the double-hit lock. Swing states are left alone.
 */
export function spawnRallyShuttle(s: RallyState, p: ReadonlyVec3, v: ReadonlyVec3): void {
  spawnShuttleState(s.shuttle, p, v, s.physicsCfg);
  initialShuttleOrientation(s.shuttle.vel, s.shuttle.quat);
  s.lastHitter = null;
}

/**
 * Temporary practice toss (ROADMAP Phase 3 item 8): launch the shuttle straight up from the hand of
 * `player`, `SERVE_CONTACT_OFFSET_X` in front of the feet and `SERVE_CONTACT_Y` above them.
 */
export function tossPracticeShuttle(s: RallyState, player: PlayerIndex): void {
  const owner = s.players[player];
  spawnRallyShuttle(
    s,
    {
      x: owner.x + owner.facing * SERVE_CONTACT_OFFSET_X,
      y: owner.y + SERVE_CONTACT_Y,
      z: owner.z,
    },
    { x: 0, y: PRACTICE_TOSS_VY, z: 0 },
  );
}

/**
 * Teleport `player` to `x` (m) at rest on the ground, clamped to the legal range of that side
 * (test and debug use). A non-finite `x` falls back to the start position.
 */
export function setRallyPlayerX(s: RallyState, player: PlayerIndex, x: number): void {
  const target = s.players[player];
  target.x = createPlayerState(player, x).x;
  target.y = 0;
  target.vx = 0;
  target.vy = 0;
  target.grounded = true;
}
