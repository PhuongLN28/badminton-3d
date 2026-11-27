import { JUMP_SMASH_SPEED_MULT, KMH_PER_MS } from '../config';
import type { SeededRng } from '../math/rng';
import { length } from '../math/vec3';
import { simulateFlight, type FlightResult } from '../physics/flight';
import type {
  AimDirection,
  PlayerIndex,
  ReadonlyVec3,
  ShotParams,
  ShotType,
  SimEvent,
  SwingKind,
  TimingGrade,
  Vec3,
} from '../types';
import { solveShot, type ShotSolution } from './shotSolver';
import { getShotParams } from './shotTypes';
import { aimTargetDepth, gaussIrwinHall, getTimingParams, timingSpeedFactor } from './timing';

const DEG_TO_RAD = Math.PI / 180;

/** Inputs of `resolveShot`: everything the hit decided before the launch velocity is computed. */
export interface ShotContext {
  /** Shot type chosen by `classifyShot`. */
  shot: ShotType;
  /** Swing kind of the swing that made contact. */
  swingKind: SwingKind;
  /** Racket contact point (m). Only the x-y plane is solved. */
  contact: ReadonlyVec3;
  /** Hitting direction along x: +1 for P1, -1 for P2. */
  facing: 1 | -1;
  /** True when the hitter is in the air at contact (jump smash). */
  airborne: boolean;
  /** Aim captured at the swing press (-1 deeper, 0 neutral, +1 shorter). */
  aim: AimDirection;
  /** Timing grade of the contact. */
  grade: TimingGrade;
  /** Seeded RNG; every shot draws exactly 12 uniforms (3 normal samples), also for PERFECT. */
  rng: SeededRng;
  /** Simulation step the trial flights use (s). */
  dtS: number;
}

/** Result of `resolveShot`. */
export interface ShotOutcome {
  /** Launch velocity (m/s), after timing noise and speed factor. */
  v0: Vec3;
  /** Launch speed `|v0|` (m/s). */
  speed: number;
  /** Launch elevation above horizontal (deg), after timing noise. */
  elevationDeg: number;
  /** Ideal landing depth: after aim, clamping and assist, before timing noise (m from the net). */
  targetDepth: number;
  /** Landing depth aimed at after the timing noise was added (m from the net). */
  noisyTargetDepth: number;
  /** True when the assist changed the angle or target of the ideal shot. */
  adjusted: boolean;
  /** True when the final solve reached its landing target within tolerance. */
  solved: boolean;
  /** Free flight (no net collision) of the final `v0`. */
  flight: FlightResult;
}

/** Speed-based modes scale the fixed speed before solving; the other modes scale `v0` after it. */
function scaledSpeedParams(params: ShotParams, speedMult: number): ShotParams {
  return params.solveMode === 'FIXED_SPEED'
    ? { ...params, speed: params.speed * speedMult }
    : params;
}

/** Shot parameters for the noisy re-solve: the noise terms that are solver inputs in that mode (D-013). */
function noisyParams(
  ideal: ShotParams,
  idealElevationDeg: number,
  angleNoiseDeg: number,
  clearanceNoiseM: number,
): ShotParams {
  switch (ideal.solveMode) {
    case 'FIXED_ELEV':
      return { ...ideal, elevationDeg: idealElevationDeg + angleNoiseDeg };
    case 'FIXED_SPEED':
      return ideal;
    case 'TWO_POINT':
      return { ...ideal, clearance: ideal.clearance + clearanceNoiseM };
  }
}

/**
 * Turn a racket contact into a launch velocity, per GAME_SPEC §5.5 to §5.7 and DECISIONS D-011..D-013.
 *
 * 1. Aim moves the default landing depth, clamped into the court (`aimTargetDepth`).
 * 2. The ideal shot is solved with `assist = true`. SMASH scales its fixed speed first
 *    (`JUMP_SMASH_SPEED_MULT` when airborne, times the timing speed factor).
 * 3. Three normal samples (target, angle, clearance) are drawn from the RNG, always in that order.
 * 4. The shot is solved again with `assist = false` using the noisy inputs. FIXED_ELEV adds the angle
 *    noise to the elevation, FIXED_SPEED rotates `v0` by the angle noise after solving, TWO_POINT adds
 *    the clearance noise. Nothing is clamped after the noise, so a bad timing can fault.
 * 5. DRIVE multiplies `v0` by its timing speed factor after solving.
 *
 * A grade without any noise (PERFECT) skips the re-solve: the result equals the ideal solution.
 * Runs once per hit, so it may allocate. Never throws for finite input.
 */
export function resolveShot(ctx: ShotContext): ShotOutcome {
  const baseParams = getShotParams(ctx.shot);
  const timing = getTimingParams(ctx.grade);

  const jumpMult = ctx.shot === 'SMASH' && ctx.airborne ? JUMP_SMASH_SPEED_MULT : 1;
  const speedMult = jumpMult * timingSpeedFactor(ctx.grade, ctx.shot);
  const scalesBeforeSolve = baseParams.solveMode === 'FIXED_SPEED';
  const idealParams = scaledSpeedParams(baseParams, speedMult);
  const postSolveFactor = scalesBeforeSolve ? 1 : speedMult;

  const ideal = solveShot({
    shot: ctx.shot,
    contact: ctx.contact,
    facing: ctx.facing,
    targetDepth: aimTargetDepth(ctx.shot, baseParams.defaultDepth, ctx.aim),
    params: idealParams,
    assist: true,
    dtS: ctx.dtS,
  });

  // Exactly three normal samples per shot keep the RNG stream aligned across timing grades.
  const targetNoiseM = timing.targetSigmaM * gaussIrwinHall(ctx.rng);
  const angleNoiseDeg = timing.angleSigmaDeg * gaussIrwinHall(ctx.rng);
  const clearanceNoiseM = timing.clearanceSigmaM * gaussIrwinHall(ctx.rng);
  const noisyTargetDepth = ideal.targetDepth + targetNoiseM;
  const hasNoise = targetNoiseM !== 0 || angleNoiseDeg !== 0 || clearanceNoiseM !== 0;

  let solution: ShotSolution = ideal;
  let rotationDeg = 0;
  if (hasNoise) {
    const params = noisyParams(idealParams, ideal.elevationDeg, angleNoiseDeg, clearanceNoiseM);
    solution = solveShot({
      shot: ctx.shot,
      contact: ctx.contact,
      facing: ctx.facing,
      targetDepth: noisyTargetDepth,
      params,
      assist: false,
      dtS: ctx.dtS,
    });
    rotationDeg = params.solveMode === 'FIXED_SPEED' ? angleNoiseDeg : 0;
  }

  const v0: Vec3 = { x: solution.v0.x, y: solution.v0.y, z: solution.v0.z };
  if (rotationDeg !== 0) {
    // Rotate in the x-y plane, positive angle raises the elevation toward the hitting direction.
    const rad = rotationDeg * DEG_TO_RAD;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const forward = v0.x * ctx.facing;
    v0.x = (forward * c - v0.y * s) * ctx.facing;
    v0.y = forward * s + v0.y * c;
  }
  if (postSolveFactor !== 1) {
    v0.x *= postSolveFactor;
    v0.y *= postSolveFactor;
    v0.z *= postSolveFactor;
  }
  const changed = rotationDeg !== 0 || postSolveFactor !== 1;

  return {
    v0,
    speed: changed ? length(v0) : solution.speed,
    elevationDeg: solution.elevationDeg + rotationDeg,
    targetDepth: ideal.targetDepth,
    noisyTargetDepth,
    adjusted: ideal.adjusted,
    solved: solution.solved,
    flight: changed
      ? simulateFlight(ctx.contact, v0, { collideNet: false, dt: ctx.dtS })
      : solution.flight,
  };
}

/**
 * Build the `hit` event of GAME_SPEC §5.8 (plus `timingOffsetS`, D-018). `speedKmh = |v0| * KMH_PER_MS`.
 *
 * @param tick Simulation tick of the hit.
 * @param hitter Player who made contact.
 * @param timingOffsetS Contact time minus the center of the ACTIVE span (s); negative means early.
 */
export function buildHitEvent(
  tick: number,
  hitter: PlayerIndex,
  ctx: ShotContext,
  outcome: ShotOutcome,
  timingOffsetS: number,
): Extract<SimEvent, { type: 'hit' }> {
  return {
    type: 'hit',
    tick,
    hitter,
    shot: ctx.shot,
    swing: ctx.swingKind,
    timing: ctx.grade,
    contact: { x: ctx.contact.x, y: ctx.contact.y, z: ctx.contact.z },
    v0: { x: outcome.v0.x, y: outcome.v0.y, z: outcome.v0.z },
    speedKmh: length(outcome.v0) * KMH_PER_MS,
    targetDepth: outcome.targetDepth,
    adjusted: outcome.adjusted,
    timingOffsetS,
  };
}
