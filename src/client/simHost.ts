import { DEFAULT_GAME_SPEED, DEFAULT_RNG_SEED, MAX_STORED_EVENTS } from '@shared/config';
import {
  createRallyState,
  setRallyPlayerX,
  setRallySeed,
  spawnRallyShuttle,
  stepRally,
  tossPracticeShuttle,
  type RallyState,
} from '@shared/match/rallySim';
import {
  DEFAULT_PHYSICS_CONFIG,
  copyShuttleState,
  createShuttleState,
  toShuttleSnapshot,
  type PhysicsConfig,
  type ShuttleState,
} from '@shared/physics/shuttle';
import {
  copyPlayerState,
  createPlayerState,
  toPlayerSnapshot,
  type PlayerState,
} from '@shared/player/playerSim';
import type {
  InputFrame,
  PlayerIndex,
  ReadonlyVec3,
  SimEvent,
  TestSnapshot,
} from '@shared/types';

/** A scripted input held for a number of ticks; it wins over the keyboard (test hook `setInput`). */
interface InputOverride {
  remainingTicks: number;
  readonly frame: InputFrame;
}

/**
 * Client-side owner of the Phase 3 simulation: the rally state, the previous-tick copies used for
 * render interpolation, the scripted-input overrides, the event history and the game speed.
 * Holds no game rules; every rule lives in `@shared/match/rallySim`.
 */
export interface SimHost {
  /** Live simulation state. Render code may read it, never write it. */
  readonly rally: RallyState;
  /** Player states before the latest tick (interpolation source). */
  readonly prevPlayers: readonly [PlayerState, PlayerState];
  /** Shuttle state before the latest tick (interpolation source). */
  readonly prevShuttle: ShuttleState;
  /** Multiplier on every step duration (dimensionless, 1.0 = real time). */
  gameSpeed: number;
  /**
   * Advance one tick and record its events in the history.
   * @param stepDtS Step duration (s), already multiplied by the game speed.
   * @param keyboardFrames Keyboard input of P1 and P2, used unless a scripted override is active.
   * @returns Events of this tick; the array is reused by the next call.
   */
  step(stepDtS: number, keyboardFrames: readonly [InputFrame, InputFrame]): readonly SimEvent[];
  /**
   * Launch the shuttle with default physics plus `cfg` and clear the event history.
   * @param p Start position (m).
   * @param v Start velocity (m/s).
   * @param cfg Physics flags to override for this flight.
   */
  spawnShuttle(p: ReadonlyVec3, v: ReadonlyVec3, cfg?: Readonly<Partial<PhysicsConfig>>): void;
  /** Toss the practice shuttle from the hand of `player` with default physics; clears the history. */
  toss(player: PlayerIndex): void;
  /** Hold `input` for `ticks` ticks (count) for `player`, replacing the keyboard. */
  setInput(player: PlayerIndex, input: Partial<InputFrame>, ticks?: number): void;
  /** Teleport `player` to `x` (m) at rest on the ground (test and debug use). */
  setPlayerX(player: PlayerIndex, x: number): void;
  /** Reseed the timing-noise RNG. */
  setSeed(seed: number): void;
  /** Stored events (the latest `MAX_STORED_EVENTS`) with `tick >= sinceTick`. */
  getEvents(sinceTick?: number): SimEvent[];
  /** Read-only snapshot for the test hooks. */
  snapshot(): TestSnapshot;
}

function createInputOverride(): InputOverride {
  return {
    remainingTicks: 0,
    frame: { moveX: 0, jump: false, swing: null, aim: 0 },
  };
}

/** Input of one player for this tick: the scripted override while it lasts, else the keyboard. */
function resolvePlayerInput(
  index: PlayerIndex,
  keyboardFrames: readonly [InputFrame, InputFrame],
  overrides: readonly [InputOverride, InputOverride],
): Readonly<InputFrame> {
  const override = overrides[index];
  if (override.remainingTicks > 0) {
    override.remainingTicks -= 1;
    return override.frame;
  }
  return keyboardFrames[index];
}

/**
 * Create the simulation host: a fresh rally with both players at their start positions.
 * @param seed 32-bit seed of the timing-noise RNG.
 */
export function createSimHost(seed: number = DEFAULT_RNG_SEED): SimHost {
  const rally = createRallyState(seed);
  const prevPlayers: [PlayerState, PlayerState] = [createPlayerState(0), createPlayerState(1)];
  const prevShuttle = createShuttleState();
  const history: SimEvent[] = [];
  const overrides: [InputOverride, InputOverride] = [createInputOverride(), createInputOverride()];
  const resolved: [Readonly<InputFrame>, Readonly<InputFrame>] = [
    overrides[0].frame,
    overrides[1].frame,
  ];

  const syncPrevShuttle = (): void => {
    copyShuttleState(prevShuttle, rally.shuttle);
  };

  const resetPhysics = (cfg?: Readonly<Partial<PhysicsConfig>>): void => {
    Object.assign(rally.physicsCfg, DEFAULT_PHYSICS_CONFIG);
    if (cfg !== undefined) {
      Object.assign(rally.physicsCfg, cfg);
    }
  };

  const host: SimHost = {
    rally,
    prevPlayers,
    prevShuttle,
    gameSpeed: DEFAULT_GAME_SPEED,

    step(stepDtS, keyboardFrames) {
      copyPlayerState(prevPlayers[0], rally.players[0]);
      copyPlayerState(prevPlayers[1], rally.players[1]);
      copyShuttleState(prevShuttle, rally.shuttle);
      resolved[0] = resolvePlayerInput(0, keyboardFrames, overrides);
      resolved[1] = resolvePlayerInput(1, keyboardFrames, overrides);
      const events = stepRally(rally, resolved, stepDtS);
      for (const ev of events) {
        history.push(ev);
        if (history.length > MAX_STORED_EVENTS) {
          history.shift();
        }
      }
      return events;
    },

    spawnShuttle(p, v, cfg) {
      history.length = 0;
      resetPhysics(cfg);
      spawnRallyShuttle(rally, p, v);
      syncPrevShuttle();
    },

    toss(player) {
      history.length = 0;
      resetPhysics();
      tossPracticeShuttle(rally, player);
      syncPrevShuttle();
    },

    setInput(player, input, ticks = 1) {
      const target = overrides[player];
      target.remainingTicks = Number.isFinite(ticks) && ticks > 0 ? Math.floor(ticks) : 0;
      target.frame.moveX = input.moveX ?? 0;
      target.frame.jump = input.jump ?? false;
      target.frame.swing = input.swing ?? null;
      target.frame.aim = input.aim ?? 0;
    },

    setPlayerX(player, x) {
      setRallyPlayerX(rally, player, x);
      copyPlayerState(prevPlayers[player], rally.players[player]);
    },

    setSeed(nextSeed) {
      setRallySeed(rally, nextSeed);
    },

    getEvents(sinceTick = 0) {
      return history.filter((ev) => ev.tick >= sinceTick);
    },

    snapshot() {
      return {
        phase: 'RALLY',
        tick: rally.tick,
        players: [toPlayerSnapshot(rally.players[0]), toPlayerSnapshot(rally.players[1])],
        shuttle: toShuttleSnapshot(rally.shuttle),
        score: { points: [0, 0], games: [0, 0] },
        server: 0,
        lastEvents: [...history],
      };
    },
  };

  return host;
}
