import { describe, expect, it } from 'vitest';
import { createRng, mulberry32 } from '@shared/math/rng';

describe('RNG có seed (mulberry32)', () => {
  it('P0-U04 RNG seed: cùng seed cho cùng dãy 1000 số, khác seed cho dãy khác, mọi giá trị trong [0, 1)', () => {
    const rngA1 = createRng(123456);
    const rngA2 = createRng(123456);
    const rngB = createRng(654321);
    const rawA = mulberry32(123456);

    const seqA1: number[] = [];
    const seqA2: number[] = [];
    const seqB: number[] = [];
    const seqRaw: number[] = [];

    for (let i = 0; i < 1000; i += 1) {
      const a1 = rngA1.next();
      const a2 = rngA2.next();
      const b = rngB.next();
      const r = rawA();

      expect(Number.isFinite(a1)).toBe(true);
      expect(a1).toBeGreaterThanOrEqual(0);
      expect(a1).toBeLessThan(1);

      expect(Number.isFinite(b)).toBe(true);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(1);

      seqA1.push(a1);
      seqA2.push(a2);
      seqB.push(b);
      seqRaw.push(r);
    }

    expect(seqA1).toEqual(seqA2);
    expect(seqA1).toEqual(seqRaw);
    expect(seqA1).not.toEqual(seqB);
  });
});
