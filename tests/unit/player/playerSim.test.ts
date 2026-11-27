import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  DT,
  PLAYER_AIR_CONTROL,
  PLAYER_BACK_LIMIT,
  PLAYER_MAX_SPEED,
  PLAYER_NET_MARGIN,
} from '@shared/config';
import { createRng } from '@shared/math/rng';
import type { InputFrame, SwingButton } from '@shared/types';
import {
  createPlayerState,
  stepPlayer,
  toPlayerSnapshot,
} from '../../../src/shared/player/playerSim';

function makeInput(partial: Partial<InputFrame> = {}): InputFrame {
  return {
    moveX: partial.moveX ?? 0,
    jump: partial.jump ?? false,
    swing: partial.swing ?? null,
    aim: partial.aim ?? 0,
  };
}

describe('Mô phỏng nhân vật playerSim', () => {
  it('P1-U02 Giữ phím tiến 1 s từ đứng yên: vận tốc = 5.0 m/s (±1%), đạt tốc độ tối đa ≈ 0.167 s (±1 tick)', () => {
    const p1 = createPlayerState(0, -6.0);
    const forward = makeInput({ moveX: 1 });
    let tickReachedMax = -1;

    for (let tick = 1; tick <= 120; tick += 1) {
      stepPlayer(p1, forward, DT);
      if (tickReachedMax === -1 && p1.vx >= PLAYER_MAX_SPEED - 1e-6) {
        tickReachedMax = tick;
      }
    }

    expect(p1.vx).toBeGreaterThanOrEqual(PLAYER_MAX_SPEED * 0.99);
    expect(p1.vx).toBeLessThanOrEqual(PLAYER_MAX_SPEED * 1.01);
    expect(tickReachedMax).toBeGreaterThanOrEqual(19);
    expect(tickReachedMax).toBeLessThanOrEqual(21);
    expect(Math.abs(tickReachedMax * DT - 1 / 6)).toBeLessThanOrEqual(DT + 1e-9);
  });

  it('P1-U03 Thả phím khi đang 5 m/s: dừng sau 0.3125 m (±0.03 m)', () => {
    const p1 = createPlayerState(0, -5.0);
    p1.vx = PLAYER_MAX_SPEED;
    const startX = p1.x;
    const idle = makeInput({ moveX: 0 });

    for (let tick = 0; tick < 120 && p1.vx !== 0; tick += 1) {
      stepPlayer(p1, idle, DT);
    }

    expect(p1.vx).toBe(0);
    const stopDistance = p1.x - startX;
    expect(Math.abs(stopDistance - 0.3125)).toBeLessThanOrEqual(0.03);
  });

  it('P1-U04 Nhảy: đỉnh = 0.551 m (±0.01), thời gian bay = 0.525 s (±1 tick), nhảy lần 2 khi đang bay không có tác dụng', () => {
    const singleJump = createPlayerState(0);
    const mashJump = createPlayerState(0);

    let maxY = 0;
    let flightTicks = 0;
    let landed = false;

    for (let tick = 1; tick <= 120; tick += 1) {
      stepPlayer(singleJump, makeInput({ jump: tick === 1 }), DT);
      stepPlayer(mashJump, makeInput({ jump: true }), DT);

      if (!landed) {
        expect(mashJump.y).toBe(singleJump.y);
        expect(mashJump.vy).toBe(singleJump.vy);
        expect(mashJump.grounded).toBe(singleJump.grounded);

        if (singleJump.y > maxY) {
          maxY = singleJump.y;
        }
        flightTicks += 1;
        if (singleJump.grounded) {
          landed = true;
        }
      }
    }

    expect(landed).toBe(true);
    expect(Math.abs(maxY - 0.551)).toBeLessThanOrEqual(0.01);
    expect(flightTicks).toBeGreaterThanOrEqual(62);
    expect(flightTicks).toBeLessThanOrEqual(64);
    expect(Math.abs(flightTicks * DT - 0.525)).toBeLessThanOrEqual(DT + 1e-9);
    expect(singleJump.y).toBe(0);
    expect(singleJump.grounded).toBe(true);
  });

  it('P1-U05 Biên: P1 không vượt x > -0.35, P2 không vượt x < 0.35, không lùi quá 8.0 m', () => {
    const p1Forward = createPlayerState(0);
    const p1Back = createPlayerState(0);
    const p2Forward = createPlayerState(1);
    const p2Back = createPlayerState(1);

    for (let tick = 0; tick < 600; tick += 1) {
      stepPlayer(p1Forward, makeInput({ moveX: 1 }), DT);
      stepPlayer(p1Back, makeInput({ moveX: -1 }), DT);
      stepPlayer(p2Forward, makeInput({ moveX: -1 }), DT);
      stepPlayer(p2Back, makeInput({ moveX: 1 }), DT);

      expect(p1Forward.x).toBeLessThanOrEqual(-PLAYER_NET_MARGIN);
      expect(p1Back.x).toBeGreaterThanOrEqual(-PLAYER_BACK_LIMIT);
      expect(p2Forward.x).toBeGreaterThanOrEqual(PLAYER_NET_MARGIN);
      expect(p2Back.x).toBeLessThanOrEqual(PLAYER_BACK_LIMIT);
    }

    expect(p1Forward.x).toBe(-PLAYER_NET_MARGIN);
    expect(p1Back.x).toBe(-PLAYER_BACK_LIMIT);
    expect(p2Forward.x).toBe(PLAYER_NET_MARGIN);
    expect(p2Back.x).toBe(PLAYER_BACK_LIMIT);
  });

  it('P1-U07 Tất định: cùng chuỗi input 600 tick chạy 2 lần cho state giống hệt (so sánh hash)', () => {
    const rng = createRng(987654);
    const swings: SwingButton[] = [null, 'high', 'power', 'soft'];
    const inputs: Array<[InputFrame, InputFrame]> = [];

    for (let tick = 0; tick < 600; tick += 1) {
      const f0 = makeInput({
        moveX: rng.range(-1, 1),
        jump: rng.next() < 0.08,
        swing: swings[rng.int(0, swings.length - 1)] ?? null,
        aim: (rng.int(-1, 1) as -1 | 0 | 1),
      });
      const f1 = makeInput({
        moveX: rng.range(-1, 1),
        jump: rng.next() < 0.08,
        swing: swings[rng.int(0, swings.length - 1)] ?? null,
        aim: (rng.int(-1, 1) as -1 | 0 | 1),
      });
      inputs.push([f0, f1]);
    }

    const runAndHash = (): string => {
      const p1 = createPlayerState(0);
      const p2 = createPlayerState(1);
      const hash = createHash('sha256');
      for (const [i0, i1] of inputs) {
        stepPlayer(p1, i0, DT);
        stepPlayer(p2, i1, DT);
        hash.update(JSON.stringify([toPlayerSnapshot(p1), toPlayerSnapshot(p2)]));
      }
      return hash.digest('hex');
    };

    const hashA = runAndHash();
    const hashB = runAndHash();
    expect(hashA).toBe(hashB);
  });

  it('P1-U08 Trên không: gia tốc ngang khi đang bay = 50% gia tốc mặt đất', () => {
    const groundedPlayer = createPlayerState(0, -4.0);
    const airbornePlayer = createPlayerState(0, -4.0);
    airbornePlayer.y = 0.4;
    airbornePlayer.grounded = false;

    const moveRight = makeInput({ moveX: 1 });
    for (let tick = 0; tick < 10; tick += 1) {
      stepPlayer(groundedPlayer, moveRight, DT);
      stepPlayer(airbornePlayer, moveRight, DT);
    }

    expect(airbornePlayer.vx / groundedPlayer.vx).toBeCloseTo(PLAYER_AIR_CONTROL, 6);
    expect(airbornePlayer.vx / groundedPlayer.vx).toBeCloseTo(0.5, 6);
  });
});
