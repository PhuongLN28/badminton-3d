import type { Quat, ReadonlyVec3, Vec3 } from '../types';

const UNIT_DIR_EPSILON = 1e-6;
const SLERP_LINEAR_DOT_THRESHOLD = 0.9995;

/** Create an identity unit quaternion `(0, 0, 0, 1)`. */
export function quatIdentity(): Quat {
  return { x: 0, y: 0, z: 0, w: 1 };
}

/** Copy quaternion components from `src` into `out` without allocating. */
export function copyQuatOut(src: Readonly<Quat>, out: Quat): Quat {
  out.x = src.x;
  out.y = src.y;
  out.z = src.z;
  out.w = src.w;
  return out;
}

/**
 * Normalize `q` into `out`. Falls back to identity `(0, 0, 0, 1)` when `q` is
 * zero or contains non-finite values.
 */
export function normalizeQuatOut(q: Readonly<Quat>, out: Quat): Quat {
  if (
    !Number.isFinite(q.x) ||
    !Number.isFinite(q.y) ||
    !Number.isFinite(q.z) ||
    !Number.isFinite(q.w)
  ) {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    out.w = 1;
    return out;
  }

  const lenSq = q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w;
  if (lenSq <= 0 || !Number.isFinite(lenSq)) {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    out.w = 1;
    return out;
  }

  const invLen = 1 / Math.sqrt(lenSq);
  out.x = q.x * invLen;
  out.y = q.y * invLen;
  out.z = q.z * invLen;
  out.w = q.w * invLen;
  return out;
}

/**
 * Compute the shortest-arc quaternion rotating unit vector `from` to unit vector `to`.
 * Picks a deterministic perpendicular axis on 180-degree reversals (Z-axis when `from = (0, 1, 0)`).
 */
export function quatFromUnitVectorsOut(from: ReadonlyVec3, to: ReadonlyVec3, out: Quat): Quat {
  if (
    !Number.isFinite(from.x) ||
    !Number.isFinite(from.y) ||
    !Number.isFinite(from.z) ||
    !Number.isFinite(to.x) ||
    !Number.isFinite(to.y) ||
    !Number.isFinite(to.z)
  ) {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    out.w = 1;
    return out;
  }

  const r = from.x * to.x + from.y * to.y + from.z * to.z + 1;
  if (!Number.isFinite(r)) {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    out.w = 1;
    return out;
  }

  if (r < UNIT_DIR_EPSILON) {
    let ax: number;
    let ay: number;
    let az: number;

    if (Math.abs(from.x) < 0.9) {
      // cross((1, 0, 0), from) = (0, -from.z, from.y) -> (0, 0, 1) when from = (0, 1, 0)
      ax = 0;
      ay = -from.z;
      az = from.y;
    } else {
      // cross(from, (0, 1, 0)) = (-from.z, 0, from.x)
      ax = -from.z;
      ay = 0;
      az = from.x;
    }

    const axisLenSq = ax * ax + ay * ay + az * az;
    if (axisLenSq <= 0 || !Number.isFinite(axisLenSq)) {
      out.x = 0;
      out.y = 0;
      out.z = 1;
      out.w = 0;
      return out;
    }

    const invAxisLen = 1 / Math.sqrt(axisLenSq);
    out.x = ax * invAxisLen;
    out.y = ay * invAxisLen;
    out.z = az * invAxisLen;
    out.w = 0;
    return out;
  }

  // cross(from, to)
  out.x = from.y * to.z - from.z * to.y;
  out.y = from.z * to.x - from.x * to.z;
  out.z = from.x * to.y - from.y * to.x;
  out.w = r;
  return normalizeQuatOut(out, out);
}

/**
 * Shortest-path spherical linear interpolation between unit quaternions `a` and `b`
 * by factor `t` in `[0, 1]`, writing the result into `out`.
 */
export function slerpQuatOut(a: Readonly<Quat>, b: Readonly<Quat>, t: number, out: Quat): Quat {
  if (!Number.isFinite(t)) {
    return normalizeQuatOut(a, out);
  }

  const clampedT = t <= 0 ? 0 : t >= 1 ? 1 : t;

  const ax = a.x;
  const ay = a.y;
  const az = a.z;
  const aw = a.w;

  let bx = b.x;
  let by = b.y;
  let bz = b.z;
  let bw = b.w;

  let cosHalfTheta = ax * bx + ay * by + az * bz + aw * bw;
  if (!Number.isFinite(cosHalfTheta)) {
    return normalizeQuatOut(a, out);
  }

  if (cosHalfTheta < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    cosHalfTheta = -cosHalfTheta;
  }

  if (cosHalfTheta > 1) {
    cosHalfTheta = 1;
  }

  if (cosHalfTheta >= SLERP_LINEAR_DOT_THRESHOLD) {
    out.x = ax + (bx - ax) * clampedT;
    out.y = ay + (by - ay) * clampedT;
    out.z = az + (bz - az) * clampedT;
    out.w = aw + (bw - aw) * clampedT;
    return normalizeQuatOut(out, out);
  }

  const halfTheta = Math.acos(cosHalfTheta);
  const sinHalfTheta = Math.sin(halfTheta);
  if (sinHalfTheta <= 1e-12) {
    out.x = ax + (bx - ax) * clampedT;
    out.y = ay + (by - ay) * clampedT;
    out.z = az + (bz - az) * clampedT;
    out.w = aw + (bw - aw) * clampedT;
    return normalizeQuatOut(out, out);
  }

  const ratioA = Math.sin((1 - clampedT) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(clampedT * halfTheta) / sinHalfTheta;

  out.x = ax * ratioA + bx * ratioB;
  out.y = ay * ratioA + by * ratioB;
  out.z = az * ratioA + bz * ratioB;
  out.w = aw * ratioA + bw * ratioB;
  return normalizeQuatOut(out, out);
}

/**
 * Rotate local `+Y` axis `(0, 1, 0)` by quaternion `q` and store the resulting
 * direction into `out` without allocating.
 */
export function rotateLocalYByQuatOut(q: Readonly<Quat>, out: Vec3): Vec3 {
  if (
    !Number.isFinite(q.x) ||
    !Number.isFinite(q.y) ||
    !Number.isFinite(q.z) ||
    !Number.isFinite(q.w)
  ) {
    out.x = 0;
    out.y = 1;
    out.z = 0;
    return out;
  }

  const qx = q.x;
  const qy = q.y;
  const qz = q.z;
  const qw = q.w;

  out.x = 2 * (qx * qy - qw * qz);
  out.y = 1 - 2 * (qx * qx + qz * qz);
  out.z = 2 * (qy * qz + qw * qx);
  return out;
}
