import {
  ASSIST_DEPTH_MAX,
  ASSIST_DEPTH_STEP,
  ASSIST_ELEV_MAX_DEG,
  ASSIST_ELEV_STEP_DEG,
  NET_HEIGHT_CENTER,
  SHUTTLE_MAX_SPEED,
  SOLVER_MAX_ITER,
  SOLVER_NET_TOL,
  SOLVER_SPEED_MAX,
  SOLVER_SPEED_MIN,
  SOLVER_TP_ANGLE_MAX_DEG,
  SOLVER_TP_ANGLE_MIN_DEG,
  SOLVER_TP_SPEED_MAX,
  SOLVER_TP_SPEED_MIN,
  SOLVER_TP_UNREACHABLE_SPLIT_DEG,
} from '../config';
import { probeNetCrossY } from './flightProbe';
import {
  launchP0,
  launchV0,
  searchAngle,
  searchSpeed,
  searchSpeedNear,
  setLaunch,
  type SearchResult,
  type SearchStatus,
} from './solverSearch';

/** Candidate launch found by one mode solver, in the local frame (hitting toward +x). */
export interface Candidate {
  /** Launch speed (m/s). */
  speed: number;
  /** Launch elevation above horizontal (deg). */
  angleDeg: number;
  /** Landing depth solved for, after any assist push (m from the net). */
  depth: number;
  /** How the landing search ended. */
  status: SearchStatus;
  /** True when the assist changed the angle, target or clearance. */
  adjusted: boolean;
  /** True when the net clearance requirement is met (always true without assist). */
  netOk: boolean;
}

const search: SearchResult = { value: 0, status: 'OK' };

function newCandidate(depth: number, netOk: boolean): Candidate {
  return { speed: 0, angleDeg: 0, depth, status: 'OK', adjusted: false, netOk };
}

/** Net crossing height of the launch `(speed, angleDeg)` from `launchP0` clears `minNetY` (m). */
function clearsNet(speed: number, angleDeg: number, minNetY: number, dtS: number): boolean {
  setLaunch(speed, angleDeg);
  const netY = probeNetCrossY(launchP0, launchV0, dtS);
  return netY !== null && netY >= minNetY;
}

/**
 * FIXED_ELEV: fixed launch elevation, search the speed. With assist, retry with
 * `ASSIST_ELEV_STEP_DEG` more elevation (up to `ASSIST_ELEV_MAX_DEG`) until the net is cleared.
 * Trial flights start from `launchP0`.
 *
 * @param baseDeg Base launch elevation (deg).
 * @param depth Landing depth from the net (m).
 * @param minNetY Required net crossing height (m).
 * @param assist Whether to lift the shot over the net.
 * @param dtS Fixed physics step (s).
 */
export function solveFixedElev(
  baseDeg: number,
  depth: number,
  minNetY: number,
  assist: boolean,
  dtS: number,
): Candidate {
  const speedMax = Math.min(SOLVER_SPEED_MAX, SHUTTLE_MAX_SPEED);
  const maxLift = assist ? Math.floor(ASSIST_ELEV_MAX_DEG / ASSIST_ELEV_STEP_DEG) : 0;
  const cand = newCandidate(depth, !assist);
  for (let lift = 0; lift <= maxLift; lift += 1) {
    cand.angleDeg = baseDeg + lift * ASSIST_ELEV_STEP_DEG;
    searchSpeed(cand.angleDeg, depth, SOLVER_SPEED_MIN, speedMax, dtS, search);
    cand.speed = search.value;
    cand.status = search.status;
    cand.adjusted = lift > 0;
    if (!assist) {
      break;
    }
    cand.netOk = clearsNet(cand.speed, cand.angleDeg, minNetY, dtS);
    if (cand.netOk) {
      break;
    }
  }
  return cand;
}

/**
 * FIXED_SPEED: fixed launch speed, search the angle. With assist, push the target to
 * `base + k * ASSIST_DEPTH_STEP` (k integer, up to `ASSIST_DEPTH_MAX`) and bisect on k for the
 * smallest push that clears the net (D-019). Trial flights start from `launchP0`.
 *
 * @param speed Fixed launch speed (m/s).
 * @param baseDepth Requested landing depth from the net (m).
 * @param minNetY Required net crossing height (m).
 * @param assist Whether to push the target deeper until the net is cleared.
 * @param dtS Fixed physics step (s).
 */
export function solveFixedSpeed(
  speed: number,
  baseDepth: number,
  minNetY: number,
  assist: boolean,
  dtS: number,
): Candidate {
  let maxPush = 0;
  while (assist && baseDepth + (maxPush + 1) * ASSIST_DEPTH_STEP <= ASSIST_DEPTH_MAX) {
    maxPush += 1;
  }
  // Solve push index `k` (target = base + k * step) into `into`; true when it clears the net.
  const solveAt = (k: number, into: Candidate): boolean => {
    into.depth = baseDepth + k * ASSIST_DEPTH_STEP;
    searchAngle(speed, into.depth, dtS, search);
    into.speed = speed;
    into.angleDeg = search.value;
    into.status = search.status;
    into.adjusted = k > 0;
    into.netOk = !assist || clearsNet(speed, into.angleDeg, minNetY, dtS);
    return into.netOk;
  };

  const best = newCandidate(baseDepth, !assist);
  if (solveAt(0, best) || maxPush === 0) {
    return best;
  }
  if (!solveAt(maxPush, best)) {
    return best;
  }
  // Net clearance rises monotonically with the target depth, so bisect the integer push index.
  const trial = newCandidate(baseDepth, false);
  let failK = 0;
  let passK = maxPush;
  while (passK - failK > 1) {
    const midK = (failK + passK) >> 1;
    if (solveAt(midK, trial)) {
      passK = midK;
      Object.assign(best, trial);
    } else {
      failK = midK;
    }
  }
  return best;
}

/**
 * TWO_POINT: search angle (outer bisection on the net crossing height) and speed (inner search on
 * the landing) so the shuttle passes `NET_HEIGHT_CENTER + clearance` and lands at `depth`.
 * Unreachable landings follow D-016. The inner search warm-starts from earlier solutions.
 * Trial flights start from `launchP0`.
 *
 * @param clearance Target height above the net top (m).
 * @param depth Landing depth from the net (m).
 * @param minClearance Minimum clearance enforced when assist is on (m).
 * @param assist Whether the minimum clearance is enforced.
 * @param dtS Fixed physics step (s).
 */
export function solveTwoPoint(
  clearance: number,
  depth: number,
  minClearance: number,
  assist: boolean,
  dtS: number,
): Candidate {
  const lifted = assist && clearance < minClearance;
  const netTargetY = NET_HEIGHT_CENTER + (lifted ? minClearance : clearance);
  const cand = newCandidate(depth, false);
  cand.status = 'MAXITER';
  cand.adjusted = lifted;
  let lo = SOLVER_TP_ANGLE_MIN_DEG;
  let hi = SOLVER_TP_ANGLE_MAX_DEG;
  // Speeds solved at the current angle bracket ends, used as warm-start guesses (NaN = unknown).
  let speedLo = Number.NaN;
  let speedHi = Number.NaN;
  let bestErr = Number.POSITIVE_INFINITY;
  for (let i = 0; i < SOLVER_MAX_ITER; i += 1) {
    const angleDeg = 0.5 * (lo + hi);
    const guess = Number.isNaN(speedLo)
      ? speedHi
      : Number.isNaN(speedHi)
        ? speedLo
        : 0.5 * (speedLo + speedHi);
    if (Number.isNaN(guess)) {
      searchSpeed(angleDeg, depth, SOLVER_TP_SPEED_MIN, SOLVER_TP_SPEED_MAX, dtS, search);
    } else {
      searchSpeedNear(
        angleDeg,
        depth,
        guess,
        SOLVER_TP_SPEED_MIN,
        SOLVER_TP_SPEED_MAX,
        dtS,
        search,
      );
    }
    const inner = search.status;
    const speed = search.value;
    let tooLow: boolean;
    if (inner === 'SHORT') {
      // D-016: unreachable landing at top speed means "too high" from the split angle upward.
      tooLow = angleDeg < SOLVER_TP_UNREACHABLE_SPLIT_DEG;
    } else if (inner === 'LONG') {
      tooLow = false;
    } else {
      setLaunch(speed, angleDeg);
      const netY = probeNetCrossY(launchP0, launchV0, dtS);
      const err = netY === null ? Number.NEGATIVE_INFINITY : netY - netTargetY;
      const absErr = err < 0 ? -err : err;
      if (netY !== null && absErr < bestErr) {
        bestErr = absErr;
        cand.speed = speed;
        cand.angleDeg = angleDeg;
        cand.status = inner;
      }
      if (absErr < SOLVER_NET_TOL) {
        cand.netOk = inner === 'OK';
        return cand;
      }
      tooLow = err < 0;
    }
    const known = inner === 'OK' ? speed : Number.NaN;
    if (tooLow) {
      lo = angleDeg;
      speedLo = known;
    } else {
      hi = angleDeg;
      speedHi = known;
    }
  }
  if (bestErr === Number.POSITIVE_INFINITY) {
    cand.speed = SOLVER_TP_SPEED_MIN;
    cand.angleDeg = 0.5 * (lo + hi);
  }
  return cand;
}
