import { DT, NET_HEIGHT_CENTER, SHUTTLE_MAX_SPEED } from '../config';
import { simulateFlight, type FlightResult } from '../physics/flight';
import type { ReadonlyVec3, ShotParams, ShotType, Vec3 } from '../types';
import { launchP0 } from './solverSearch';
import { solveFixedElev, solveFixedSpeed, solveTwoPoint, type Candidate } from './solverModes';

const DEG_TO_RAD = Math.PI / 180;

/** Input of `solveShot`, positions in meters, `facing` is +1 for P1 and -1 for P2. */
export interface ShotRequest {
  /** Shot being solved (informational, the numbers come from `params`). */
  shot: ShotType;
  /** Racket contact point (m). Only the x-y plane is solved, the result has `v0.z = 0`. */
  contact: ReadonlyVec3;
  /** Hitting direction along x, +1 toward +x (P1) or -1 toward -x (P2). */
  facing: 1 | -1;
  /** Desired landing depth measured from the net toward the opponent (m). */
  targetDepth: number;
  /** Solve mode and parameters, see `SHOT_PARAMS`. */
  params: ShotParams;
  /** True: lift or deepen the shot until it clears the net by `params.minNetClearance`. */
  assist: boolean;
  /** Fixed physics step (s), defaults to `DT`. */
  dtS?: number;
}

/** Result of `solveShot`. */
export interface ShotSolution {
  /** Launch velocity at the contact point (m/s). */
  v0: Vec3;
  /** Launch speed (m/s). */
  speed: number;
  /** Launch elevation above horizontal (deg), including any assist lift. */
  elevationDeg: number;
  /** Free flight (no net collision) of the final solution, from `simulateFlight`. */
  flight: FlightResult;
  /** True when the assist changed the angle, target or clearance. */
  adjusted: boolean;
  /** Landing depth actually solved for, after any assist push (m from the net). */
  targetDepth: number;
  /** False when the target was not reached within tolerance or the assist could not clear the net. */
  solved: boolean;
}

function pickCandidate(req: ShotRequest, xLocal: number, yContact: number, dtS: number): Candidate {
  const { params, assist, targetDepth } = req;
  const minNetY = NET_HEIGHT_CENTER + params.minNetClearance;
  launchP0.x = xLocal;
  launchP0.y = yContact;
  launchP0.z = 0;
  switch (params.solveMode) {
    case 'FIXED_ELEV':
      return solveFixedElev(params.elevationDeg, targetDepth, minNetY, assist, dtS);
    case 'FIXED_SPEED':
      return solveFixedSpeed(
        Math.min(params.speed, SHUTTLE_MAX_SPEED),
        targetDepth,
        minNetY,
        assist,
        dtS,
      );
    case 'TWO_POINT':
      return solveTwoPoint(params.clearance, targetDepth, params.minNetClearance, assist, dtS);
  }
}

/**
 * Solve the launch velocity of a shot so the shuttle lands at `targetDepth` from the net.
 * Bisection on `stepShuttle` trial flights (free flight, no net collision):
 * FIXED_ELEV searches speed, FIXED_SPEED searches angle, TWO_POINT searches angle and speed so the
 * shuttle also passes over the net at `NET_HEIGHT_CENTER + clearance`.
 * With `assist`, FIXED_ELEV adds `ASSIST_ELEV_STEP_DEG` per retry (up to `ASSIST_ELEV_MAX_DEG`) and
 * FIXED_SPEED pushes the target by `k * ASSIST_DEPTH_STEP` (up to `ASSIST_DEPTH_MAX`, D-019) until
 * the shuttle clears the net by `params.minNetClearance`.
 * Never throws and never returns NaN: an unreachable target gives the best finite `v0` with
 * `solved = false`.
 *
 * @param req Shot request, positions in m, depth in m from the net.
 * @returns Launch velocity in m/s with flight summary.
 */
export function solveShot(req: ShotRequest): ShotSolution {
  const dtS = req.dtS !== undefined && Number.isFinite(req.dtS) && req.dtS > 0 ? req.dtS : DT;
  const facing = req.facing;
  const { contact } = req;
  const finiteInput =
    Number.isFinite(contact.x) &&
    Number.isFinite(contact.y) &&
    Number.isFinite(contact.z) &&
    Number.isFinite(req.targetDepth);
  if (!finiteInput) {
    const zero: Vec3 = { x: 0, y: 0, z: 0 };
    return {
      v0: zero,
      speed: 0,
      elevationDeg: 0,
      flight: simulateFlight({ x: 0, y: 0, z: 0 }, zero, { collideNet: false, dt: dtS }),
      adjusted: false,
      targetDepth: 0,
      solved: false,
    };
  }

  const cand = pickCandidate(req, contact.x * facing, contact.y, dtS);
  const angleRad = cand.angleDeg * DEG_TO_RAD;
  const v0: Vec3 = {
    x: cand.speed * Math.cos(angleRad) * facing,
    y: cand.speed * Math.sin(angleRad),
    z: 0,
  };
  const flight = simulateFlight(contact, v0, { collideNet: false, dt: dtS });
  // TWO_POINT hits its net height by construction (within SOLVER_NET_TOL), so only FIXED_* are re-checked.
  const netOk =
    !req.assist ||
    req.params.solveMode === 'TWO_POINT' ||
    (flight.netCross !== null &&
      flight.netCross.y >= NET_HEIGHT_CENTER + req.params.minNetClearance);
  return {
    v0,
    speed: cand.speed,
    elevationDeg: cand.angleDeg,
    flight,
    adjusted: cand.adjusted,
    targetDepth: cand.depth,
    solved: cand.status === 'OK' && cand.netOk && netOk,
  };
}
