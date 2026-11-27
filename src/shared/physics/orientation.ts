import { SHUTTLE_MIN_SPEED_FOR_ORIENT, SHUTTLE_ORIENT_RATE } from '../config';
import {
  normalizeQuatOut,
  quatFromUnitVectorsOut,
  quatIdentity,
  rotateLocalYByQuatOut,
  slerpQuatOut,
} from '../math/quat';
import type { Quat, ReadonlyVec3, Vec3 } from '../types';

const LOCAL_NOSE_DIR: ReadonlyVec3 = { x: 0, y: 1, z: 0 };
const SCRATCH_DIR: Vec3 = { x: 0, y: 1, z: 0 };
const SCRATCH_PREV_Q: Quat = { x: 0, y: 0, z: 0, w: 1 };
const SCRATCH_TARGET_Q: Quat = { x: 0, y: 0, z: 0, w: 1 };

function tryNormalizeVelocityOut(v: ReadonlyVec3, out: Vec3): boolean {
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) {
    return false;
  }

  const ax = v.x < 0 ? -v.x : v.x;
  const ay = v.y < 0 ? -v.y : v.y;
  const az = v.z < 0 ? -v.z : v.z;
  const maxComp = ax > ay ? (ax > az ? ax : az) : ay > az ? ay : az;
  if (maxComp === 0) {
    return false;
  }

  const nx = v.x / maxComp;
  const ny = v.y / maxComp;
  const nz = v.z / maxComp;
  const normLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
  const speed = maxComp * normLen;
  if (!Number.isFinite(speed) || speed < SHUTTLE_MIN_SPEED_FOR_ORIENT) {
    return false;
  }

  const invNorm = 1 / normLen;
  out.x = nx * invNorm;
  out.y = ny * invNorm;
  out.z = nz * invNorm;
  return true;
}

/**
 * Smoothly align shuttle nose (`+Y` local axis) toward velocity `v` (m/s) via exponential slerp
 * at `SHUTTLE_ORIENT_RATE` (1/s). Keeps normalized `prevQ` when speed < `SHUTTLE_MIN_SPEED_FOR_ORIENT`
 * or `dtS` is invalid.
 */
export function shuttleOrientation(
  prevQ: Readonly<Quat>,
  v: ReadonlyVec3,
  dtS: number,
  out?: Quat,
): Quat {
  const dest = out ?? quatIdentity();
  normalizeQuatOut(prevQ, SCRATCH_PREV_Q);

  if (!Number.isFinite(dtS) || dtS <= 0 || !tryNormalizeVelocityOut(v, SCRATCH_DIR)) {
    dest.x = SCRATCH_PREV_Q.x;
    dest.y = SCRATCH_PREV_Q.y;
    dest.z = SCRATCH_PREV_Q.z;
    dest.w = SCRATCH_PREV_Q.w;
    return dest;
  }

  quatFromUnitVectorsOut(LOCAL_NOSE_DIR, SCRATCH_DIR, SCRATCH_TARGET_Q);
  const alpha = 1 - Math.exp(-SHUTTLE_ORIENT_RATE * dtS);
  return slerpQuatOut(SCRATCH_PREV_Q, SCRATCH_TARGET_Q, alpha, dest);
}

/**
 * Compute initial nose orientation quaternion pointing `+Y` local along `v` (m/s),
 * or identity if `|v| < SHUTTLE_MIN_SPEED_FOR_ORIENT`.
 */
export function initialShuttleOrientation(v: ReadonlyVec3, out?: Quat): Quat {
  const dest = out ?? quatIdentity();
  if (!tryNormalizeVelocityOut(v, SCRATCH_DIR)) {
    dest.x = 0;
    dest.y = 0;
    dest.z = 0;
    dest.w = 1;
    return dest;
  }
  return quatFromUnitVectorsOut(LOCAL_NOSE_DIR, SCRATCH_DIR, dest);
}

/** Compute the world-space cork nose unit vector (`+Y` local rotated by `q`) into `out`. */
export function getShuttleNoseOut(q: Readonly<Quat>, out: Vec3): Vec3 {
  normalizeQuatOut(q, SCRATCH_PREV_Q);
  return rotateLocalYByQuatOut(SCRATCH_PREV_Q, out);
}
