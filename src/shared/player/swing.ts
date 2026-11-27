import { DT, SWING_ACTIVE, SWING_MOVE_FACTOR, SWING_RECOVERY, SWING_WINDUP } from '../config';
import type { AimDirection, PressedSwingButton, SwingKind, SwingPhase } from '../types';

/** Swing phase lengths in whole simulation ticks (count). */
export interface SwingTicks {
  /** Wind-up length before the hitbox turns on (ticks). */
  windup: number;
  /** ACTIVE span length while the hitbox is enabled (ticks). */
  active: number;
  /** Recovery length before the next swing is accepted (ticks). */
  recovery: number;
}

/** Mutable swing state machine of one player, per GAME_SPEC §5.1. */
export interface SwingState {
  /** Current phase. */
  phase: SwingPhase;
  /** Ticks since the button press; the press tick itself has value 0 (ticks). */
  elapsedTicks: number;
  /** Button that started the current swing, or `null` while READY. */
  button: PressedSwingButton | null;
  /** Swing kind chosen at the press, or `null` while READY. */
  kind: SwingKind | null;
  /** Aim captured at the press (-1 deeper, 0 neutral, +1 shorter). */
  aim: AimDirection;
  /** True once this swing has hit the shuttle; a swing hits at most once. */
  hasHit: boolean;
}

/** Create a READY swing state. */
export function createSwingState(): SwingState {
  return {
    phase: 'READY',
    elapsedTicks: 0,
    button: null,
    kind: null,
    aim: 0,
    hasHit: false,
  };
}

function toTicks(durationS: number, dtS: number): number {
  const ticks = Math.round(durationS / dtS);
  return ticks < 1 ? 1 : ticks;
}

/**
 * Convert the swing durations into whole ticks without allocating (at 120 Hz: 6 / 24 / 30).
 * Each phase lasts at least one tick. A non-finite or non-positive `dtS` falls back to `DT`.
 *
 * @param dtS Simulation step duration (s).
 * @param out Receives the tick counts and is returned.
 */
export function swingTicksForOut(dtS: number, out: SwingTicks): SwingTicks {
  const stepS = Number.isFinite(dtS) && dtS > 0 ? dtS : DT;
  out.windup = toTicks(SWING_WINDUP, stepS);
  out.active = toTicks(SWING_ACTIVE, stepS);
  out.recovery = toTicks(SWING_RECOVERY, stepS);
  return out;
}

/**
 * Phase of a swing `elapsedTicks` ticks after the press (pure).
 * WINDUP below `windup`, ACTIVE below `windup + active`, RECOVERY below the total, READY from the total on.
 *
 * @param elapsedTicks Ticks since the press; the press tick has value 0.
 */
export function swingPhaseAt(elapsedTicks: number, ticks: Readonly<SwingTicks>): SwingPhase {
  const activeStart = ticks.windup;
  const recoveryStart = activeStart + ticks.active;
  const readyAt = recoveryStart + ticks.recovery;
  if (elapsedTicks < activeStart) {
    return 'WINDUP';
  }
  if (elapsedTicks < recoveryStart) {
    return 'ACTIVE';
  }
  if (elapsedTicks < readyAt) {
    return 'RECOVERY';
  }
  return 'READY';
}

/**
 * Start a swing when READY. A press in any other phase is ignored and never queued.
 *
 * @param kind Swing kind decided at the press (see `predictSwingKind`).
 * @param aim Aim modifier captured at the press.
 * @returns `true` when the swing started, `false` when the press was ignored.
 */
export function tryStartSwing(
  s: SwingState,
  button: PressedSwingButton,
  kind: SwingKind,
  aim: AimDirection,
): boolean {
  if (s.phase !== 'READY') {
    return false;
  }
  s.phase = 'WINDUP';
  s.elapsedTicks = 0;
  s.button = button;
  s.kind = kind;
  s.aim = aim;
  s.hasHit = false;
  return true;
}

/**
 * Advance a running swing by one tick; no-op while READY. Call once per tick before `tryStartSwing`,
 * so the press tick keeps `elapsedTicks = 0`. Returning to READY clears button, kind and `hasHit`.
 */
export function advanceSwing(s: SwingState, ticks: Readonly<SwingTicks>): void {
  if (s.phase === 'READY') {
    return;
  }
  s.elapsedTicks += 1;
  s.phase = swingPhaseAt(s.elapsedTicks, ticks);
  if (s.phase === 'READY') {
    s.elapsedTicks = 0;
    s.button = null;
    s.kind = null;
    s.aim = 0;
    s.hasHit = false;
  }
}

/**
 * Ticks elapsed since the ACTIVE span began: 0 on the first ACTIVE tick, `active - 1` on the last.
 *
 * @returns The tick count, or `-1` when the swing is not ACTIVE.
 */
export function activeElapsedTicks(s: Readonly<SwingState>, ticks: Readonly<SwingTicks>): number {
  return s.phase === 'ACTIVE' ? s.elapsedTicks - ticks.windup : -1;
}

/** Horizontal speed factor of the player: 1 while READY, `SWING_MOVE_FACTOR` during any swing phase. */
export function moveFactorFor(s: Readonly<SwingState>): number {
  return s.phase === 'READY' ? 1 : SWING_MOVE_FACTOR;
}
