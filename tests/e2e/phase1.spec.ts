import { expect, test } from '@playwright/test';
import type { BadmintonTestHooks } from '@shared/types';

declare global {
  interface Window {
    __BADMINTON__?: BadmintonTestHooks;
  }
}

test.describe('Phase 1 — Sân 3D và hai khối hộp', () => {
  test('P1-E01 Nhấn D 500 ms: getState().players[0].x tăng', async ({ page }) => {
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

    await page.goto('/?test=1');
    await page.evaluate(() => window.__BADMINTON__!.pause());

    const startX = await page.evaluate(() => window.__BADMINTON__!.getState().players[0].x);
    await page.keyboard.down('KeyD');
    await page.evaluate(() => window.__BADMINTON__!.step(60));
    await page.keyboard.up('KeyD');

    const after = await page.evaluate(() => window.__BADMINTON__!.getState().players[0]);
    expect(after.x).toBeGreaterThan(startX);
    expect(after.x).toBeLessThanOrEqual(-0.35);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('P1-E02 Nhấn W: có thời điểm y > 0, sau đó quay về 0', async ({ page }) => {
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

    await page.goto('/?test=1');
    await page.evaluate(() => window.__BADMINTON__!.pause());

    await page.keyboard.down('KeyW');
    await page.evaluate(() => window.__BADMINTON__!.step(31));

    const midAir = await page.evaluate(() => window.__BADMINTON__!.getState().players[0]);
    expect(midAir.y).toBeGreaterThan(0.5);
    expect(midAir.grounded).toBe(false);

    await page.keyboard.up('KeyW');
    await page.evaluate(() => window.__BADMINTON__!.step(35));

    const landed = await page.evaluate(() => window.__BADMINTON__!.getState().players[0]);
    expect(landed.y).toBe(0);
    expect(landed.grounded).toBe(true);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('P1-E03 P2 nhấn ← 500 ms: players[1].x giảm (tiến về lưới)', async ({ page }) => {
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

    await page.goto('/?test=1');
    await page.evaluate(() => window.__BADMINTON__!.pause());

    const startX = await page.evaluate(() => window.__BADMINTON__!.getState().players[1].x);
    await page.keyboard.down('ArrowLeft');
    await page.evaluate(() => window.__BADMINTON__!.step(60));
    await page.keyboard.up('ArrowLeft');

    const after = await page.evaluate(() => window.__BADMINTON__!.getState().players[1]);
    expect(after.x).toBeLessThan(startX);
    expect(after.x).toBeGreaterThanOrEqual(0.35);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
