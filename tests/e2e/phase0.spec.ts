import { expect, test } from '@playwright/test';
import type { BadmintonTestHooks } from '@shared/types';

declare global {
  interface Window {
    __BADMINTON__?: BadmintonTestHooks;
  }
}

test.describe('Phase 0 — Khởi tạo cảnh 3D và test hooks', () => {
  test('P0-E01 Tải trang: có <canvas>, không có console.error trong 3 s', async ({ page }) => {
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

    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    // Yêu cầu bắt buộc của P0-E01: không có console.error trong 3 giây sau khi tải trang.
    await page.waitForTimeout(3000);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('P0-E02 ?test=1: window.__BADMINTON__ tồn tại, getState().tick tăng theo thời gian', async ({
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

    await page.goto('/?test=1');

    const hasHooks = await page.evaluate(() => typeof window.__BADMINTON__ === 'object');
    expect(hasHooks).toBe(true);

    const initialTick = await page.evaluate(() => window.__BADMINTON__!.getState().tick);
    await expect
      .poll(
        async () => page.evaluate(() => window.__BADMINTON__!.getState().tick),
        { timeout: 5000 },
      )
      .toBeGreaterThan(initialTick);

    const steppedDelta = await page.evaluate(() => {
      const hooks = window.__BADMINTON__!;
      hooks.pause();
      const before = hooks.getState().tick;
      hooks.step(15);
      const after = hooks.getState().tick;
      return after - before;
    });
    expect(steppedDelta).toBe(15);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
