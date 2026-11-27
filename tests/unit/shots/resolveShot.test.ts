import { describe, expect, it } from 'vitest';
import { DT, KMH_PER_MS, JUMP_SMASH_SPEED_MULT } from '@shared/config';
import { createRng } from '@shared/math/rng';
import {
  buildHitEvent,
  resolveShot,
  type ShotContext,
  type ShotOutcome,
} from '@shared/shots/resolveShot';
import { aimTargetDepth } from '@shared/shots/timing';
import type { Vec3 } from '@shared/types';

/** Contact of a back-court clear used across the pipeline tests (m). */
const BACK_COURT_CONTACT: Vec3 = { x: -5.0, y: 2.6, z: 0 };

function clearContext(overrides: Partial<ShotContext> = {}): ShotContext {
  return {
    shot: 'CLEAR',
    swingKind: 'overhead',
    contact: BACK_COURT_CONTACT,
    facing: 1,
    airborne: false,
    aim: 0,
    grade: 'PERFECT',
    rng: createRng(20261127),
    dtS: DT,
    ...overrides,
  };
}

function smashContext(overrides: Partial<ShotContext> = {}): ShotContext {
  return clearContext({ shot: 'SMASH', rng: createRng(1), ...overrides });
}

function speedOf(outcome: ShotOutcome): number {
  const { v0 } = outcome;
  return Math.sqrt(v0.x * v0.x + v0.y * v0.y + v0.z * v0.z);
}

describe('resolveShot pipeline', () => {
  it('P3-U14 PERFECT không có nhiễu: 100 cú cùng đầu vào cho điểm rơi và v0 giống hệt', () => {
    const rng = createRng(424242);
    const first = resolveShot(clearContext({ rng }));
    const firstLandX = first.flight.land?.x;
    expect(firstLandX).toBeDefined();

    for (let i = 1; i < 100; i += 1) {
      const next = resolveShot(clearContext({ rng }));
      expect(next.flight.land?.x).toBe(firstLandX);
      expect(next.v0.x).toBe(first.v0.x);
      expect(next.v0.y).toBe(first.v0.y);
      expect(next.v0.z).toBe(first.v0.z);
      expect(next.noisyTargetDepth).toBe(first.noisyTargetDepth);
    }
    // PERFECT lands on the ideal target (reference: CLEAR 6.0 m from (-5.0, 2.6)).
    expect(Math.abs((firstLandX ?? 0) - first.targetDepth)).toBeLessThan(0.05);

    // Control: the GOOD grade does add noise, so the same 100 shots must not all coincide.
    const goodRng = createRng(424242);
    const landings = new Set<number>();
    for (let i = 0; i < 100; i += 1) {
      const good = resolveShot(clearContext({ rng: goodRng, grade: 'GOOD' }));
      landings.add(good.flight.land?.x ?? Number.NaN);
    }
    expect(landings.size).toBeGreaterThanOrEqual(2);
  });

  it('P3-U17 aim dịch đích đúng hướng, đích kẹp trong sân trước khi cộng nhiễu', () => {
    expect(aimTargetDepth('CLEAR', 6.0, 1)).toBeCloseTo(5.4, 9);
    // 6.0 + 0.6 = 6.6 exceeds the legal depth 6.5, so it is clamped.
    expect(aimTargetDepth('CLEAR', 6.0, -1)).toBeCloseTo(6.5, 9);
    // 6.0 + 0.8 = 6.8 exceeds 6.5 as well.
    expect(aimTargetDepth('SMASH', 6.0, -1)).toBeCloseTo(6.5, 9);
    // 0.5 - 0.3 = 0.2, exactly the minimum depth from the net.
    expect(aimTargetDepth('NET_SHOT', 0.5, 1)).toBeCloseTo(0.2, 9);

    // Pipeline: CLEAR with aim -1 and an OK timing grade (noisy).
    const outcome = resolveShot(clearContext({ aim: -1, grade: 'OK', rng: createRng(99) }));
    expect(outcome.targetDepth).toBeCloseTo(6.5, 9);
    expect(outcome.noisyTargetDepth).not.toBe(outcome.targetDepth);
    expect(Number.isFinite(outcome.noisyTargetDepth)).toBe(true);
    expect(Number.isFinite(outcome.speed)).toBe(true);
  });

  it('P3-U18 smash khi nhảy nhanh gấp 1.08 lần và cắm dốc hơn smash đứng', () => {
    const standCtx = smashContext({ contact: { x: -4.0, y: 2.7, z: 0 }, airborne: false });
    const jumpCtx = smashContext({ contact: { x: -4.0, y: 3.25, z: 0 }, airborne: true });
    const stand = resolveShot(standCtx);
    const jump = resolveShot(jumpCtx);

    expect(JUMP_SMASH_SPEED_MULT).toBe(1.08);
    expect(speedOf(jump) / speedOf(stand)).toBeCloseTo(1.08, 9);
    expect(jump.elevationDeg).toBeLessThan(stand.elevationDeg);
    // Both smashes dive (negative elevation).
    expect(stand.elevationDeg).toBeLessThan(0);
    expect(jump.elevationDeg).toBeLessThan(0);

    // The hit event reports the speed in km/h from |v0|.
    const event = buildHitEvent(1, 0, jumpCtx, jump, 0);
    expect(event.speedKmh).toBeCloseTo(speedOf(jump) * KMH_PER_MS, 9);
  });
});
