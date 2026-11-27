import { describe, expect, it } from 'vitest';
import {
  add,
  addOut,
  copyOut,
  dot,
  length,
  lengthSq,
  lerpOut,
  lerpVec3,
  normalize,
  normalizeOut,
  scale,
  scaleOut,
  sub,
  subOut,
  vec3,
} from '@shared/math/vec3';

describe('Toán vector 3D (vec3)', () => {
  it('P0-U06 vec3: add, sub, scale, dot, length, normalize (vector 0 trả 0, không NaN)', () => {
    const a = vec3(3, 4, 0);
    const b = vec3(-1, 2, 5);

    expect(add(a, b)).toEqual({ x: 2, y: 6, z: 5 });
    expect(sub(a, b)).toEqual({ x: 4, y: 2, z: -5 });
    expect(scale(a, 2.5)).toEqual({ x: 7.5, y: 10, z: 0 });
    expect(dot(a, b)).toBe(5);
    expect(lengthSq(a)).toBe(25);
    expect(length(a)).toBe(5);

    const normA = normalize(a);
    expect(normA.x).toBeCloseTo(0.6, 12);
    expect(normA.y).toBeCloseTo(0.8, 12);
    expect(normA.z).toBeCloseTo(0, 12);
    expect(length(normA)).toBeCloseTo(1, 12);

    const zeroNorm = normalize(vec3(0, 0, 0));
    expect(zeroNorm).toEqual({ x: 0, y: 0, z: 0 });
    expect(Number.isNaN(zeroNorm.x)).toBe(false);
    expect(Number.isNaN(zeroNorm.y)).toBe(false);
    expect(Number.isNaN(zeroNorm.z)).toBe(false);

    expect(lerpVec3(vec3(0, 2, -4), vec3(10, 6, 4), 0.25)).toEqual({ x: 2.5, y: 3, z: -2 });

    const out = vec3();
    addOut(a, b, out);
    expect(out).toEqual({ x: 2, y: 6, z: 5 });
    subOut(a, b, out);
    expect(out).toEqual({ x: 4, y: 2, z: -5 });
    scaleOut(a, -2, out);
    expect(out).toEqual({ x: -6, y: -8, z: 0 });
    normalizeOut(vec3(0, 0, 0), out);
    expect(out).toEqual({ x: 0, y: 0, z: 0 });
    normalizeOut(a, out);
    expect(out.x).toBeCloseTo(0.6, 12);
    expect(out.y).toBeCloseTo(0.8, 12);
    lerpOut(vec3(0, 0, 0), vec3(4, 8, 12), 0.5, out);
    expect(out).toEqual({ x: 2, y: 4, z: 6 });
    copyOut(b, out);
    expect(out).toEqual(b);
  });
});
