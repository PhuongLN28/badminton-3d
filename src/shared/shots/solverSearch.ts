import {
  SOLVER_ANGLE_MAX_DEG,
  SOLVER_ANGLE_MIN_DEG,
  SOLVER_LAND_TOL,
  SOLVER_MAX_ITER,
} from '../config';
import type { Vec3 } from '../types';
import { probeLandingX } from './flightProbe';

const DEG_TO_RAD = Math.PI / 180;

/**
 * Half-width of the first bracket tried around a warm-start speed guess, as a fraction of the guess
 * (dimensionless). The bracket is validated and widened by doubling when it misses the solution.
 */
const WARM_START_HALF_WIDTH_RATIO = 0.05;

/** Outcome of a landing search. */
export type SearchStatus = 'OK' | 'SHORT' | 'LONG' | 'MAXITER';

/** Result record reused by the search functions: solved `value` and how the search ended. */
export interface SearchResult {
  /** Speed (m/s) or angle (deg) found. */
  value: number;
  /**
   * `OK` = landing within `SOLVER_LAND_TOL`; `SHORT` = even the upper bound lands short of the
   * target; `LONG` = even the lower bound overshoots; `MAXITER` = iteration cap reached.
   */
  status: SearchStatus;
}

/** Launch point of the trial flights (m), set by the caller before a search. */
export const launchP0: Vec3 = { x: 0, y: 0, z: 0 };
/** Launch velocity scratch of the trial flights (m/s), written by `setLaunch`. */
export const launchV0: Vec3 = { x: 0, y: 0, z: 0 };

/** Write the launch velocity for `speed` (m/s) at `angleDeg` above horizontal, hitting toward +x. */
export function setLaunch(speed: number, angleDeg: number): void {
  const angleRad = angleDeg * DEG_TO_RAD;
  launchV0.x = speed * Math.cos(angleRad);
  launchV0.y = speed * Math.sin(angleRad);
}

type LandingFn = (value: number) => number;

/** Bisection core: `lo` lands short and `hi` overshoots (landing increases with the value). */
function bisectBracket(
  landAt: LandingFn,
  lo0: number,
  hi0: number,
  target: number,
  out: SearchResult,
): void {
  let lo = lo0;
  let hi = hi0;
  for (let i = 0; i < SOLVER_MAX_ITER; i += 1) {
    const mid = 0.5 * (lo + hi);
    const err = landAt(mid) - target;
    if (err > -SOLVER_LAND_TOL && err < SOLVER_LAND_TOL) {
      out.value = mid;
      out.status = 'OK';
      return;
    }
    if (err < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  out.value = 0.5 * (lo + hi);
  out.status = lo === lo0 ? 'LONG' : 'MAXITER';
}

/** Full-range search: check the upper bound first, then bisect `[lo0, hi0]`. */
function searchRange(
  landAt: LandingFn,
  lo0: number,
  hi0: number,
  target: number,
  out: SearchResult,
): void {
  const xHi = landAt(hi0);
  if (xHi < target - SOLVER_LAND_TOL) {
    out.value = hi0;
    out.status = 'SHORT';
    return;
  }
  if (xHi <= target + SOLVER_LAND_TOL) {
    out.value = hi0;
    out.status = 'OK';
    return;
  }
  bisectBracket(landAt, lo0, hi0, target, out);
}

function speedLanding(angleDeg: number, targetX: number, dtS: number): LandingFn {
  const stopX = targetX + SOLVER_LAND_TOL;
  return (speed) => {
    setLaunch(speed, angleDeg);
    return probeLandingX(launchP0, launchV0, dtS, stopX);
  };
}

/**
 * Find the speed in `[minSpeed, maxSpeed]` (m/s) that lands at `targetX` for a fixed launch angle.
 * Trial flights start from `launchP0`.
 */
export function searchSpeed(
  angleDeg: number,
  targetX: number,
  minSpeed: number,
  maxSpeed: number,
  dtS: number,
  out: SearchResult,
): void {
  searchRange(speedLanding(angleDeg, targetX, dtS), minSpeed, maxSpeed, targetX, out);
}

/**
 * Like `searchSpeed`, but start from a validated bracket around `guessSpeed` (m/s), typically the
 * solution of a neighbouring angle. The bracket is widened by doubling until it contains the
 * solution, so the result matches a full-range search up to `SOLVER_LAND_TOL`.
 */
export function searchSpeedNear(
  angleDeg: number,
  targetX: number,
  guessSpeed: number,
  minSpeed: number,
  maxSpeed: number,
  dtS: number,
  out: SearchResult,
): void {
  const landAt = speedLanding(angleDeg, targetX, dtS);
  let half = Math.max(guessSpeed * WARM_START_HALF_WIDTH_RATIO, SOLVER_LAND_TOL);
  let lo = Math.max(minSpeed, guessSpeed - half);
  let hi = Math.min(maxSpeed, guessSpeed + half);
  let loIsShort = false;

  // Raise `hi` until it reaches the target (every skipped `hi` becomes a valid short `lo`).
  for (;;) {
    const xHi = landAt(hi);
    if (xHi >= targetX - SOLVER_LAND_TOL) {
      if (xHi <= targetX + SOLVER_LAND_TOL) {
        out.value = hi;
        out.status = 'OK';
        return;
      }
      break;
    }
    if (hi >= maxSpeed) {
      out.value = hi;
      out.status = 'SHORT';
      return;
    }
    lo = hi;
    loIsShort = true;
    half *= 2;
    hi = Math.min(maxSpeed, hi + half);
  }

  // Lower `lo` until it lands short of the target (every skipped `lo` becomes a valid `hi`).
  while (!loIsShort) {
    const xLo = landAt(lo);
    if (xLo < targetX - SOLVER_LAND_TOL) {
      loIsShort = true;
    } else if (xLo <= targetX + SOLVER_LAND_TOL) {
      out.value = lo;
      out.status = 'OK';
      return;
    } else if (lo <= minSpeed) {
      out.value = lo;
      out.status = 'LONG';
      return;
    } else {
      hi = lo;
      half *= 2;
      lo = Math.max(minSpeed, lo - half);
    }
  }
  bisectBracket(landAt, lo, hi, targetX, out);
}

/**
 * Find the launch angle (deg) that lands at `targetX` for a fixed speed. Searches
 * `[loDeg, hiDeg]`, which defaults to the full FIXED_SPEED range. Pass a narrower range only when
 * it is known to contain the solution (the landing x increases with the angle).
 */
export function searchAngle(
  speed: number,
  targetX: number,
  dtS: number,
  out: SearchResult,
  loDeg: number = SOLVER_ANGLE_MIN_DEG,
  hiDeg: number = SOLVER_ANGLE_MAX_DEG,
): void {
  const stopX = targetX + SOLVER_LAND_TOL;
  searchRange(
    (angleDeg) => {
      setLaunch(speed, angleDeg);
      return probeLandingX(launchP0, launchV0, dtS, stopX);
    },
    loDeg,
    hiDeg,
    targetX,
    out,
  );
}
