import { describe, expect, it } from 'vitest';
import { DT, MAX_FRAME_DELTA } from '@shared/config';
import { createRng } from '@shared/math/rng';
import { stepAccumulator } from '../../src/client/loop';

describe('Vòng lặp fixed timestep 120 Hz', () => {
  it('P0-U01 Loop: 60 frame, mỗi frame 1/60 s chạy đúng 120 tick', () => {
    let acc = 0;
    let totalTicks = 0;

    for (let i = 0; i < 60; i += 1) {
      const res = stepAccumulator(acc, 1 / 60, DT, MAX_FRAME_DELTA);
      totalTicks += res.ticks;
      acc = res.accumulatorS;
    }

    expect(totalTicks).toBe(120);
  });

  it('P0-U02 Loop: 1 frame 0.5 s (tab bị treo) kẹp còn 0.1 s và chạy đúng 12 tick, không hơn', () => {
    const res = stepAccumulator(0, 0.5, DT, MAX_FRAME_DELTA);

    expect(res.ticks).toBe(12);
    expect(res.alpha).toBeGreaterThanOrEqual(0);
    expect(res.alpha).toBeLessThan(1);
  });

  it('P0-U03 Loop: alpha nội suy luôn trong [0, 1)', () => {
    const deltas = [0, 1 / 60, 1 / 144, 0.003, 0.05, 0.5, -0.1, Number.NaN, Number.POSITIVE_INFINITY];
    let acc = 0;

    for (const delta of deltas) {
      const res = stepAccumulator(acc, delta, DT, MAX_FRAME_DELTA);
      expect(Number.isFinite(res.alpha)).toBe(true);
      expect(res.alpha).toBeGreaterThanOrEqual(0);
      expect(res.alpha).toBeLessThan(1);
      acc = res.accumulatorS;
    }

    const rng = createRng(42);
    for (let i = 0; i < 1000; i += 1) {
      const res = stepAccumulator(acc, rng.range(0, 0.2), DT, MAX_FRAME_DELTA);
      expect(Number.isFinite(res.alpha)).toBe(true);
      expect(res.alpha).toBeGreaterThanOrEqual(0);
      expect(res.alpha).toBeLessThan(1);
      acc = res.accumulatorS;
    }
  });
});
