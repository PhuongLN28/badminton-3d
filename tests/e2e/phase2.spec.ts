import { expect, test } from '@playwright/test';
import type { BadmintonTestHooks } from '@shared/types';
import shuttleReference from '../fixtures/shuttle_reference.json' with { type: 'json' };

declare global {
  interface Window {
    __BADMINTON__?: BadmintonTestHooks;
  }
}

test.describe('Phase 2 — Vật lý quả cầu và tích hợp mô phỏng', () => {
  test('P2-E01 spawnShuttle theo case clear_from_back: sau step(360) grounded và có đúng 1 sự kiện land', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const clearCase = shuttleReference.cases.find((c) => c.name === 'clear_from_back');
    expect(clearCase).toBeDefined();
    expect(clearCase!.expected.landed).toBe(true);
    const expectedLandX = (clearCase!.expected as { land: { x: number; z: number } }).land.x;

    const p0 = {
      x: clearCase!.p0[0] ?? 0,
      y: clearCase!.p0[1] ?? 0,
      z: clearCase!.p0[2] ?? 0,
    };
    const v0 = {
      x: clearCase!.v0[0] ?? 0,
      y: clearCase!.v0[1] ?? 0,
      z: clearCase!.v0[2] ?? 0,
    };

    await page.goto('/?test=1');
    await page.evaluate(
      ({ startPos, startVel }) => {
        const hooks = window.__BADMINTON__!;
        hooks.pause();
        hooks.spawnShuttle(startPos, startVel);
        hooks.step(360);
      },
      { startPos: p0, startVel: v0 },
    );

    const snapshot = await page.evaluate(() => window.__BADMINTON__!.getState());
    const events = await page.evaluate(() => window.__BADMINTON__!.getEvents());
    const landEvents = events.filter((ev) => ev.type === 'land');

    expect(snapshot.shuttle.state).toBe('grounded');
    expect(Math.abs(snapshot.shuttle.x - expectedLandX)).toBeLessThanOrEqual(
      shuttleReference.tolerances.position_m,
    );
    expect(landEvents).toHaveLength(1);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('P2-E02 Bắn 20 quả liên tiếp trên /?test=1&debug=1: không có console.error', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto('/?test=1&debug=1');
    await page.evaluate(() => window.__BADMINTON__!.pause());

    const totalCases = shuttleReference.cases.length;
    expect(totalCases).toBeGreaterThan(0);

    for (let i = 0; i < 20; i += 1) {
      const refCase = shuttleReference.cases[i % totalCases]!;
      const p0 = {
        x: refCase.p0[0] ?? 0,
        y: refCase.p0[1] ?? 0,
        z: refCase.p0[2] ?? 0,
      };
      const v0 = {
        x: refCase.v0[0] ?? 0,
        y: refCase.v0[1] ?? 0,
        z: refCase.v0[2] ?? 0,
      };
      const ticks = i % 2 === 0 ? 60 : 360;

      const shuttleSnap = await page.evaluate(
        ({ startPos, startVel, stepTicks }) => {
          const hooks = window.__BADMINTON__!;
          hooks.spawnShuttle(startPos, startVel);
          hooks.step(stepTicks);
          return hooks.getState().shuttle;
        },
        { startPos: p0, startVel: v0, stepTicks: ticks },
      );

      expect(Number.isFinite(shuttleSnap.x)).toBe(true);
      expect(Number.isFinite(shuttleSnap.y)).toBe(true);
      expect(Number.isFinite(shuttleSnap.z)).toBe(true);
    }

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
