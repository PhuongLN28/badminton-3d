import { describe, expect, it } from 'vitest';
import { SWING_ACTIVE, TIMING_PARAMS, TIMING_SPEED_FACTOR_SHOTS } from '@shared/config';
import { createRng } from '@shared/math/rng';
import {
  gaussIrwinHall,
  getTimingParams,
  gradeTiming,
  timingOffsetS,
  timingSpeedFactor,
} from '@shared/shots/timing';
import type { ShotType } from '@shared/types';

describe('Timing và nhiễu (GAME_SPEC §5.6)', () => {
  it('P3-U12 timing: 0.10 s PERFECT, 0.03 / 0.17 s GOOD, 0.0 / 0.20 s OK, biên theo tâm cửa sổ ACTIVE', () => {
    expect(SWING_ACTIVE / 2).toBe(0.1);

    // Các ca bắt buộc của ROADMAP
    expect(gradeTiming(0.1)).toBe('PERFECT');
    expect(gradeTiming(0.03)).toBe('GOOD');
    expect(gradeTiming(0.17)).toBe('GOOD');
    expect(gradeTiming(0.0)).toBe('OK');
    expect(gradeTiming(0.2)).toBe('OK');

    // Hai đầu của vùng PERFECT: |t - 0.10| = 0.035
    expect(gradeTiming(0.065)).toBe('PERFECT');
    expect(gradeTiming(0.135)).toBe('PERFECT');
    // Ngay ngoài biên PERFECT thì thành GOOD
    expect(gradeTiming(0.065 - 1e-6)).toBe('GOOD');
    expect(gradeTiming(0.135 + 1e-6)).toBe('GOOD');

    // Biên GOOD: |t - 0.10| = 0.070, ngoài biên là OK
    expect(gradeTiming(0.03 - 1e-6)).toBe('OK');
    expect(gradeTiming(0.17 + 1e-6)).toBe('OK');

    // Dấu của độ lệch: âm = sớm, dương = muộn
    expect(timingOffsetS(0.03)).toBeLessThan(0);
    expect(timingOffsetS(0.17)).toBeGreaterThan(0);
    expect(timingOffsetS(0.03)).toBeCloseTo(-0.07, 12);
    expect(timingOffsetS(0.17)).toBeCloseTo(0.07, 12);
    expect(timingOffsetS(0.1)).toBe(0);

    // Bảng sai số và hệ số tốc độ theo §5.6
    expect(getTimingParams('PERFECT')).toBe(TIMING_PARAMS.PERFECT);
    expect(getTimingParams('GOOD')).toBe(TIMING_PARAMS.GOOD);
    expect(getTimingParams('OK')).toBe(TIMING_PARAMS.OK);
    expect(getTimingParams('PERFECT')).toEqual({
      targetSigmaM: 0,
      angleSigmaDeg: 0,
      clearanceSigmaM: 0,
      speedFactor: 1.05,
    });
    expect(getTimingParams('GOOD')).toEqual({
      targetSigmaM: 0.25,
      angleSigmaDeg: 1.0,
      clearanceSigmaM: 0.03,
      speedFactor: 1.0,
    });
    expect(getTimingParams('OK')).toEqual({
      targetSigmaM: 0.6,
      angleSigmaDeg: 3.0,
      clearanceSigmaM: 0.08,
      speedFactor: 0.9,
    });

    // D-012: hệ số tốc độ chỉ áp cho SMASH và DRIVE, các cú khác luôn 1
    expect(TIMING_SPEED_FACTOR_SHOTS).toEqual(['SMASH', 'DRIVE']);
    expect(timingSpeedFactor('PERFECT', 'SMASH')).toBe(1.05);
    expect(timingSpeedFactor('PERFECT', 'DRIVE')).toBe(1.05);
    expect(timingSpeedFactor('GOOD', 'SMASH')).toBe(1.0);
    expect(timingSpeedFactor('OK', 'SMASH')).toBe(0.9);
    expect(timingSpeedFactor('OK', 'DRIVE')).toBe(0.9);
    const others: ShotType[] = [
      'CLEAR',
      'LIFT',
      'DROP',
      'BLOCK',
      'NET_SHOT',
      'HIGH_SERVE',
      'LOW_SERVE',
    ];
    for (const shot of others) {
      expect(timingSpeedFactor('PERFECT', shot)).toBe(1);
      expect(timingSpeedFactor('GOOD', shot)).toBe(1);
      expect(timingSpeedFactor('OK', shot)).toBe(1);
    }
  });

  it('P3-U13 phân phối nhiễu: 2000 mẫu sigma 0.6 có trung bình trong +-0.05 và độ lệch chuẩn trong +-10%', () => {
    const sigma = 0.6;
    const count = 2000;
    const rng = createRng(20261127);

    let sum = 0;
    const samples: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const g = gaussIrwinHall(rng);
      // Tổng 4 số đều nằm trong [0, 4) nên g bị chặn trong [-2 sqrt(3), 2 sqrt(3)]
      expect(Number.isFinite(g)).toBe(true);
      expect(Math.abs(g)).toBeLessThanOrEqual(2 * Math.sqrt(3));
      const sample = sigma * g;
      samples.push(sample);
      sum += sample;
    }
    const mean = sum / count;

    let sumSq = 0;
    for (const sample of samples) {
      const d = sample - mean;
      sumSq += d * d;
    }
    const std = Math.sqrt(sumSq / (count - 1));

    expect(Math.abs(mean)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(std - sigma)).toBeLessThanOrEqual(0.06);

    // Mỗi lần gọi rút đúng 4 số đều: sau một lần gọi, RNG a đã đi trước RNG b cùng seed đúng 4 giá trị
    const a = createRng(77);
    const b = createRng(77);
    gaussIrwinHall(a);
    for (let i = 0; i < 4; i += 1) b.next();
    expect(a.next()).toBe(b.next());
  });
});
