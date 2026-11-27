import { describe, expect, it } from 'vitest';
import { DT, SWING_ACTIVE, SWING_MOVE_FACTOR, SWING_RECOVERY, SWING_WINDUP } from '@shared/config';
import type { SwingPhase } from '@shared/types';
import {
  activeElapsedTicks,
  advanceSwing,
  createSwingState,
  moveFactorFor,
  swingPhaseAt,
  swingTicksForOut,
  tryStartSwing,
  type SwingTicks,
} from '../../../src/shared/player/swing';

function makeTicks(dtS: number): SwingTicks {
  return swingTicksForOut(dtS, { windup: 0, active: 0, recovery: 0 });
}

describe('Máy trạng thái vung vợt swing', () => {
  it('P3-U01 Dòng thời gian vung: WINDUP 0.05 s, ACTIVE đến 0.25 s, READY lại ở 0.50 s, nhấn giữa chừng bị bỏ qua', () => {
    const ticks = makeTicks(DT);
    expect(ticks).toEqual({ windup: 6, active: 24, recovery: 30 });
    expect(ticks.windup * DT).toBeCloseTo(SWING_WINDUP, 9);
    expect(ticks.active * DT).toBeCloseTo(SWING_ACTIVE, 9);
    expect(ticks.recovery * DT).toBeCloseTo(SWING_RECOVERY, 9);

    const swing = createSwingState();
    expect(swing.phase).toBe('READY');
    expect(moveFactorFor(swing)).toBe(1);
    expect(activeElapsedTicks(swing, ticks)).toBe(-1);

    // Tick 0: nhấn nút, tick nhấn có elapsedTicks = 0.
    advanceSwing(swing, ticks);
    expect(tryStartSwing(swing, 'high', 'mid', 0)).toBe(true);
    expect(swing.elapsedTicks).toBe(0);

    const phases: SwingPhase[] = [swing.phase];
    let firstActiveTick = -1;
    let firstRecoveryTick = -1;

    for (let i = 1; i <= 70; i += 1) {
      advanceSwing(swing, ticks);
      if (i === 10) {
        // Nhấn lần 2 khi đang ACTIVE: bị bỏ qua, không xếp hàng lệnh, timeline không đổi.
        expect(tryStartSwing(swing, 'power', 'overhead', 1)).toBe(false);
        expect(swing.button).toBe('high');
        expect(swing.kind).toBe('mid');
        expect(swing.aim).toBe(0);
        expect(swing.elapsedTicks).toBe(10);
      }
      if (i === 40) {
        // Nhấn khi đang RECOVERY: cũng bị bỏ qua.
        expect(tryStartSwing(swing, 'soft', 'underhand', -1)).toBe(false);
        expect(swing.button).toBe('high');
      }
      if (i === 60) {
        // Đúng tick 60 (0.50 s) máy đã về READY và nhận lệnh mới.
        expect(swing.phase).toBe('READY');
        expect(swing.button).toBeNull();
        expect(swing.kind).toBeNull();
        expect(moveFactorFor(swing)).toBe(1);
        expect(tryStartSwing(swing, 'soft', 'underhand', -1)).toBe(true);
        expect(swing.phase).toBe('WINDUP');
        expect(swing.button).toBe('soft');
        expect(swing.elapsedTicks).toBe(0);
        break;
      }
      phases.push(swing.phase);
      if (firstActiveTick < 0 && swing.phase === 'ACTIVE') firstActiveTick = i;
      if (firstRecoveryTick < 0 && swing.phase === 'RECOVERY') firstRecoveryTick = i;
    }

    for (let i = 0; i <= 5; i += 1) expect(phases[i]).toBe('WINDUP');
    for (let i = 6; i <= 29; i += 1) expect(phases[i]).toBe('ACTIVE');
    for (let i = 30; i <= 59; i += 1) expect(phases[i]).toBe('RECOVERY');

    expect(firstActiveTick).toBe(6);
    expect(firstRecoveryTick).toBe(30);
    expect(firstActiveTick * DT).toBeCloseTo(0.05, 9);
    expect(firstRecoveryTick * DT).toBeCloseTo(0.25, 9);
    expect(60 * DT).toBeCloseTo(0.5, 9);

    // Hàm thuần swingPhaseAt khớp từng tick và biên.
    expect(swingPhaseAt(0, ticks)).toBe('WINDUP');
    expect(swingPhaseAt(5, ticks)).toBe('WINDUP');
    expect(swingPhaseAt(6, ticks)).toBe('ACTIVE');
    expect(swingPhaseAt(29, ticks)).toBe('ACTIVE');
    expect(swingPhaseAt(30, ticks)).toBe('RECOVERY');
    expect(swingPhaseAt(59, ticks)).toBe('RECOVERY');
    expect(swingPhaseAt(60, ticks)).toBe('READY');

    // moveFactorFor và activeElapsedTicks theo phase.
    const probe = createSwingState();
    expect(tryStartSwing(probe, 'power', 'overhead', 1)).toBe(true);
    expect(moveFactorFor(probe)).toBe(SWING_MOVE_FACTOR);
    expect(activeElapsedTicks(probe, ticks)).toBe(-1);
    for (let i = 0; i < ticks.windup; i += 1) advanceSwing(probe, ticks);
    expect(probe.phase).toBe('ACTIVE');
    expect(moveFactorFor(probe)).toBe(SWING_MOVE_FACTOR);
    expect(activeElapsedTicks(probe, ticks)).toBe(0);
    advanceSwing(probe, ticks);
    expect(activeElapsedTicks(probe, ticks)).toBe(1);
    for (let i = 0; i < ticks.active; i += 1) advanceSwing(probe, ticks);
    expect(probe.phase).toBe('RECOVERY');
    expect(moveFactorFor(probe)).toBe(SWING_MOVE_FACTOR);
    expect(activeElapsedTicks(probe, ticks)).toBe(-1);

    // Số tick theo dt khác (GAME_SPEED = 1.2 làm bước 0.01 s): làm tròn từ giây, tối thiểu 1.
    expect(makeTicks(0.01)).toEqual({ windup: 5, active: 20, recovery: 25 });
    expect(makeTicks(1)).toEqual({ windup: 1, active: 1, recovery: 1 });
    expect(makeTicks(Number.NaN)).toEqual({ windup: 6, active: 24, recovery: 30 });
  });
});
