import { FLIGHT_DEFAULT_MAX_TIME_S } from '../config';
import {
  DEFAULT_PHYSICS_CONFIG,
  createShuttleScratch,
  createShuttleState,
  stepShuttle,
  type PhysicsConfig,
} from '../physics/shuttle';
import type { ReadonlyVec3 } from '../types';

/**
 * Allocation-free trial flights for the shot solver bisection loops.
 * Every probe runs the real `stepShuttle` with the caller's `dtS`, so a probe result equals the
 * matching `simulateFlight` metric exactly. Net collisions are off (free flight), like the solver.
 * State and scratch live at module level and are reused by every call (not re-entrant).
 */
const PROBE_CONFIG: Readonly<PhysicsConfig> = { ...DEFAULT_PHYSICS_CONFIG, collideNet: false };
const probeState = createShuttleState();
const probeScratch = createShuttleScratch();

function startProbe(p0: ReadonlyVec3, v0: ReadonlyVec3): void {
  probeState.pos.x = p0.x;
  probeState.pos.y = p0.y;
  probeState.pos.z = p0.z;
  probeState.vel.x = v0.x;
  probeState.vel.y = v0.y;
  probeState.vel.z = v0.z;
  probeState.state = 'flying';
}

function maxProbeSteps(dtS: number): number {
  return Math.floor(FLIGHT_DEFAULT_MAX_TIME_S / dtS);
}

/**
 * Fly `(p0, v0)` and return the interpolated floor landing x (m). Stops early and returns the
 * current x when the shuttle is still airborne beyond `stopBeyondXM`, because for a shuttle flying
 * toward +x the final landing is then farther than `stopBeyondXM` too. If the shuttle never lands
 * within `FLIGHT_DEFAULT_MAX_TIME_S`, returns its last x.
 *
 * @param p0 Start position (m).
 * @param v0 Start velocity (m/s), expected to point toward +x.
 * @param dtS Fixed step (s).
 * @param stopBeyondXM Early-exit x bound (m).
 */
export function probeLandingX(
  p0: ReadonlyVec3,
  v0: ReadonlyVec3,
  dtS: number,
  stopBeyondXM: number,
): number {
  startProbe(p0, v0);
  const maxSteps = maxProbeSteps(dtS);
  for (let step = 1; step <= maxSteps; step += 1) {
    const result = stepShuttle(probeState, dtS, PROBE_CONFIG, probeScratch, step);
    if (result.landEvent !== null) {
      return result.landEvent.x;
    }
    if (probeState.pos.x > stopBeyondXM) {
      return probeState.pos.x;
    }
  }
  return probeState.pos.x;
}

/**
 * Fly `(p0, v0)` until the first crossing of the net plane `x = 0` and return the height there (m),
 * interpolated linearly like `simulateFlight().netCross.y`. Returns `null` when the shuttle starts
 * at or beyond the net, lands before reaching it, or never reaches it.
 *
 * @param p0 Start position (m).
 * @param v0 Start velocity (m/s).
 * @param dtS Fixed step (s).
 */
export function probeNetCrossY(p0: ReadonlyVec3, v0: ReadonlyVec3, dtS: number): number | null {
  if (p0.x >= 0) {
    return null;
  }
  startProbe(p0, v0);
  const maxSteps = maxProbeSteps(dtS);
  for (let step = 1; step <= maxSteps; step += 1) {
    const result = stepShuttle(probeState, dtS, PROBE_CONFIG, probeScratch, step);
    const prev = probeScratch.prevPos;
    const post = probeScratch.postIntegratePos;
    if (post.x >= 0 && post.x !== prev.x) {
      const fNet = -prev.x / (post.x - prev.x);
      if (result.landEvent === null || fNet <= result.landEvent.subTickFraction) {
        return prev.y + (post.y - prev.y) * fNet;
      }
      return null;
    }
    if (result.landEvent !== null) {
      return null;
    }
  }
  return null;
}
