import {
  IRWIN_HALL_OFFSET,
  IRWIN_HALL_SCALE,
  SHOT_PARAMS,
  SWING_ACTIVE,
  TARGET_MAX_DEPTH,
  TARGET_MIN_DEPTH,
  TIME_EPSILON_S,
  TIMING_GOOD_MAX_S,
  TIMING_PARAMS,
  TIMING_PERFECT_MAX_S,
  TIMING_SPEED_FACTOR_SHOTS,
} from '../config';
import type { SeededRng } from '../math/rng';
import type { AimDirection, ShotType, TimingGrade, TimingParams } from '../types';

/**
 * Signed offset of the contact from the center of the ACTIVE span (s), per GAME_SPEC §5.6.
 * Negative means early, positive means late.
 * @param contactTimeS time of contact measured from the start of the ACTIVE span (s)
 */
export function timingOffsetS(contactTimeS: number): number {
  return contactTimeS - SWING_ACTIVE / 2;
}

/**
 * Grade a contact by its distance from the center of the ACTIVE span, per GAME_SPEC §5.6.
 * The thresholds are compared with `TIME_EPSILON_S` slack so tick-derived times land on the right side.
 * @param contactTimeS time of contact measured from the start of the ACTIVE span (s)
 */
export function gradeTiming(contactTimeS: number): TimingGrade {
  const delta = Math.abs(timingOffsetS(contactTimeS));
  if (delta <= TIMING_PERFECT_MAX_S + TIME_EPSILON_S) return 'PERFECT';
  if (delta <= TIMING_GOOD_MAX_S + TIME_EPSILON_S) return 'GOOD';
  return 'OK';
}

/**
 * Error model of a timing grade: depth sigma (m), angle sigma (deg), clearance sigma (m), speed factor (-).
 * @param grade timing grade
 */
export function getTimingParams(grade: TimingGrade): TimingParams {
  return TIMING_PARAMS[grade];
}

/**
 * Launch speed multiplier of a timing grade for a given shot (dimensionless), per DECISIONS D-012.
 * Only the shots in `TIMING_SPEED_FACTOR_SHOTS` use the grade factor, every other shot returns 1.
 * @param grade timing grade
 * @param shot shot type
 */
export function timingSpeedFactor(grade: TimingGrade, shot: ShotType): number {
  return TIMING_SPEED_FACTOR_SHOTS.includes(shot) ? TIMING_PARAMS[grade].speedFactor : 1;
}

/**
 * Approximate unit normal sample (mean 0, variance 1) from four uniforms, per GAME_SPEC §5.6.
 * Draws exactly four values from the RNG and uses no log or cos.
 * @param rng seeded RNG
 */
export function gaussIrwinHall(rng: SeededRng): number {
  const u1 = rng.next();
  const u2 = rng.next();
  const u3 = rng.next();
  const u4 = rng.next();
  return (u1 + u2 + u3 + u4 - IRWIN_HALL_OFFSET) * IRWIN_HALL_SCALE;
}

/**
 * Clamp a landing depth into the legal span (m from the net), per GAME_SPEC §5.7 and DECISIONS D-014.
 * @param depthM landing depth measured from the net (m)
 */
export function clampTargetDepth(depthM: number): number {
  return Math.min(TARGET_MAX_DEPTH, Math.max(TARGET_MIN_DEPTH, depthM));
}

/**
 * Landing depth after the aim modifier, clamped into the legal span (m from the net), per GAME_SPEC §5.7.
 * Aim +1 (toward the net) shortens the shot, aim -1 (away from the net) deepens it.
 * The reference `depthRange` of the shot is not used for clamping.
 * @param shot shot type
 * @param baseDepthM landing depth before aim, measured from the net (m)
 * @param aim aim direction
 */
export function aimTargetDepth(shot: ShotType, baseDepthM: number, aim: AimDirection): number {
  return clampTargetDepth(baseDepthM - aim * SHOT_PARAMS[shot].aimDeltaM);
}
