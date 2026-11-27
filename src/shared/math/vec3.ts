import type { ReadonlyVec3, Vec3 } from '../types';

/** Create a mutable 3D vector in meters or m/s. */
export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

/** Copy vector components from `src` into `out` without allocating. */
export function copyOut(src: ReadonlyVec3, out: Vec3): Vec3 {
  out.x = src.x;
  out.y = src.y;
  out.z = src.z;
  return out;
}

/** Return `a + b` as a new vector. */
export function add(a: ReadonlyVec3, b: ReadonlyVec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/** Store `a + b` into `out` without allocating. */
export function addOut(a: ReadonlyVec3, b: ReadonlyVec3, out: Vec3): Vec3 {
  out.x = a.x + b.x;
  out.y = a.y + b.y;
  out.z = a.z + b.z;
  return out;
}

/** Return `a - b` as a new vector. */
export function sub(a: ReadonlyVec3, b: ReadonlyVec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/** Store `a - b` into `out` without allocating. */
export function subOut(a: ReadonlyVec3, b: ReadonlyVec3, out: Vec3): Vec3 {
  out.x = a.x - b.x;
  out.y = a.y - b.y;
  out.z = a.z - b.z;
  return out;
}

/** Return `v * scalar` as a new vector. */
export function scale(v: ReadonlyVec3, scalar: number): Vec3 {
  return { x: v.x * scalar + 0, y: v.y * scalar + 0, z: v.z * scalar + 0 };
}

/** Store `v * scalar` into `out` without allocating. */
export function scaleOut(v: ReadonlyVec3, scalar: number, out: Vec3): Vec3 {
  out.x = v.x * scalar + 0;
  out.y = v.y * scalar + 0;
  out.z = v.z * scalar + 0;
  return out;
}

/** Compute Euclidean dot product of `a` and `b`. */
export function dot(a: ReadonlyVec3, b: ReadonlyVec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Compute squared Euclidean length of `v`. */
export function lengthSq(v: ReadonlyVec3): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

/** Compute Euclidean length of `v`. */
export function length(v: ReadonlyVec3): number {
  return Math.sqrt(lengthSq(v));
}

/** Normalize `v`; returns zero vector `(0, 0, 0)` when length is zero (never produces NaN). */
export function normalize(v: ReadonlyVec3): Vec3 {
  const out = { x: 0, y: 0, z: 0 };
  return normalizeOut(v, out);
}

/** Normalize `v` into `out`; sets `(0, 0, 0)` when length is zero (never produces NaN). */
export function normalizeOut(v: ReadonlyVec3, out: Vec3): Vec3 {
  const lenSq = lengthSq(v);
  if (lenSq <= 0 || !Number.isFinite(lenSq)) {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    return out;
  }
  const invLen = 1 / Math.sqrt(lenSq);
  out.x = v.x * invLen;
  out.y = v.y * invLen;
  out.z = v.z * invLen;
  return out;
}

/** Linearly interpolate between `a` and `b` by factor `t`. */
export function lerpVec3(a: ReadonlyVec3, b: ReadonlyVec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

/** Linearly interpolate between `a` and `b` by factor `t` into `out` without allocating. */
export function lerpOut(a: ReadonlyVec3, b: ReadonlyVec3, t: number, out: Vec3): Vec3 {
  out.x = a.x + (b.x - a.x) * t;
  out.y = a.y + (b.y - a.y) * t;
  out.z = a.z + (b.z - a.z) * t;
  return out;
}
