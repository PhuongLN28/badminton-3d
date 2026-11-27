import { describe, expect, it } from 'vitest';
import {
  SHOT_PARAMS,
  MIN_NET_CLEARANCE,
  MIN_NET_CLEARANCE_POWER,
  NET_SHOT_MAX_HITTER_DIST,
  SMASH_MIN_CONTACT_Y,
} from '@shared/config';
import { classifyShot, getShotParams, minNetClearanceFor } from '@shared/shots/shotTypes';
import type { ShotType } from '@shared/types';

describe('Phân loại cú đánh (GAME_SPEC §5.3)', () => {
  it('P3-U05 bảng phân loại: đủ 12 ô (kiểu vung x nút), biên 2.2 m và |x| = 2.5 m, x âm dùng trị tuyệt đối', () => {
    // overhead: High -> CLEAR, Power -> SMASH nếu contactY >= 2.2 ngược lại DRIVE, Soft -> DROP
    expect(classifyShot('overhead', 'high', 2.6, 3)).toBe('CLEAR');
    expect(classifyShot('overhead', 'power', 2.6, 3)).toBe('SMASH');
    expect(classifyShot('overhead', 'power', 2.0, 3)).toBe('DRIVE');
    expect(classifyShot('overhead', 'soft', 2.6, 3)).toBe('DROP');

    // Biên SMASH_MIN_CONTACT_Y = 2.2 m: bằng ngưỡng thì SMASH, thấp hơn một chút thì DRIVE
    expect(SMASH_MIN_CONTACT_Y).toBe(2.2);
    expect(classifyShot('overhead', 'power', 2.2, 3)).toBe('SMASH');
    expect(classifyShot('overhead', 'power', 2.2 - 1e-6, 3)).toBe('DRIVE');

    // mid: High -> LIFT, Power -> DRIVE, Soft -> BLOCK (không phụ thuộc độ cao chạm và vị trí)
    expect(classifyShot('mid', 'high', 1.4, 3)).toBe('LIFT');
    expect(classifyShot('mid', 'power', 1.4, 3)).toBe('DRIVE');
    expect(classifyShot('mid', 'soft', 1.4, 3)).toBe('BLOCK');
    expect(classifyShot('mid', 'power', 3.0, 3)).toBe('DRIVE');
    expect(classifyShot('mid', 'soft', 1.4, 0.5)).toBe('BLOCK');

    // underhand: High -> LIFT, Power -> DRIVE, Soft -> NET_SHOT nếu |x| <= 2.5 ngược lại BLOCK
    expect(classifyShot('underhand', 'high', 0.6, 3)).toBe('LIFT');
    expect(classifyShot('underhand', 'power', 0.6, 3)).toBe('DRIVE');
    expect(classifyShot('underhand', 'soft', 0.6, 1.5)).toBe('NET_SHOT');
    expect(classifyShot('underhand', 'soft', 0.6, 4)).toBe('BLOCK');

    // Biên NET_SHOT_MAX_HITTER_DIST = 2.5 m
    expect(NET_SHOT_MAX_HITTER_DIST).toBe(2.5);
    expect(classifyShot('underhand', 'soft', 0.6, 2.5)).toBe('NET_SHOT');
    expect(classifyShot('underhand', 'soft', 0.6, 2.5 + 1e-6)).toBe('BLOCK');

    // Vị trí người đánh tính bằng |x|: P1 (x < 0) và P2 (x > 0) cùng kết quả
    expect(classifyShot('underhand', 'soft', 0.6, -1.5)).toBe('NET_SHOT');
    expect(classifyShot('underhand', 'soft', 0.6, -4)).toBe('BLOCK');
    expect(classifyShot('underhand', 'soft', 0.6, -2.5)).toBe('NET_SHOT');
    expect(classifyShot('underhand', 'soft', 0.6, -(2.5 + 1e-6))).toBe('BLOCK');

    // serve: High -> HIGH_SERVE, Power -> HIGH_SERVE, Soft -> LOW_SERVE
    expect(classifyShot('serve', 'high', 1.0, 2.6)).toBe('HIGH_SERVE');
    expect(classifyShot('serve', 'power', 1.0, 2.6)).toBe('HIGH_SERVE');
    expect(classifyShot('serve', 'soft', 1.0, 2.6)).toBe('LOW_SERVE');

    // Bảng thông số lấy đúng từ config, độ chừa lưới tối thiểu theo §5.5
    const all: ShotType[] = [
      'CLEAR',
      'LIFT',
      'SMASH',
      'DRIVE',
      'DROP',
      'BLOCK',
      'NET_SHOT',
      'HIGH_SERVE',
      'LOW_SERVE',
    ];
    for (const shot of all) {
      expect(getShotParams(shot)).toBe(SHOT_PARAMS[shot]);
      const expectedClearance =
        shot === 'SMASH' || shot === 'DRIVE' ? MIN_NET_CLEARANCE_POWER : MIN_NET_CLEARANCE;
      expect(minNetClearanceFor(shot)).toBe(expectedClearance);
    }
    expect(minNetClearanceFor('SMASH')).toBe(0.1);
    expect(minNetClearanceFor('DRIVE')).toBe(0.1);
    expect(minNetClearanceFor('CLEAR')).toBe(0.05);
    expect(minNetClearanceFor('NET_SHOT')).toBe(0.05);
  });
});
