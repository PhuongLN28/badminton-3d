import { expect, test, type Page } from '@playwright/test';
import { DT, HITBOX_OVERHEAD } from '@shared/config';
import { predictUntil } from '@shared/physics/flight';
import {
  DEFAULT_PHYSICS_CONFIG,
  createShuttleState,
  spawnShuttleState,
} from '@shared/physics/shuttle';
import type {
  BadmintonTestHooks,
  PlayerIndex,
  ShuttleSnapshot,
  SimEvent,
  SwingButton,
  TestSnapshot,
} from '@shared/types';

declare global {
  interface Window {
    __BADMINTON__?: BadmintonTestHooks;
  }
}

type HitEvent = Extract<SimEvent, { type: 'hit' }>;

/** Seed of the timing-noise RNG; PERFECT hits draw no noise, so the value only pins the stream. */
const TEST_SEED = 1;
/** Ticks between the button press and the swing contact moment: WINDUP plus half of ACTIVE. */
const PRESS_TO_CONTACT_TICKS = 18;
/** Longest search (s) for the shuttle to reach a hitbox or a height. */
const MAX_PREDICT_S = 6;
/** Single ticks stepped after a press while waiting for the `hit` event. */
const MAX_TICKS_AFTER_PRESS = 40;
/** Ticks stepped after the press before polling tick by tick; contact comes 18 ticks after the press, so a hit before tick 16 is impossible. */
const SAFE_SKIP_TICKS = 15;

interface ConsoleWatch {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
}

function watchConsole(page: Page): ConsoleWatch {
  const watch: ConsoleWatch = { consoleErrors: [], pageErrors: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      watch.consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    watch.pageErrors.push(err.message);
  });
  return watch;
}

/** Rebuild a flying shuttle from a hook snapshot so `@shared` code can predict its path in Node. */
function toShuttleState(s: ShuttleSnapshot): ReturnType<typeof createShuttleState> {
  return spawnShuttleState(
    createShuttleState(),
    { x: s.x, y: s.y, z: s.z },
    { x: s.vx, y: s.vy, z: s.vz },
    DEFAULT_PHYSICS_CONFIG,
  );
}

/** Ticks (count) until the falling shuttle first gets within the overhead hitbox of a player at `playerX`. */
function ticksUntilOverheadHitbox(
  shuttle: ShuttleSnapshot,
  playerX: number,
  facing: 1 | -1,
): number {
  const centerX = playerX + facing * HITBOX_OVERHEAD.offsetX;
  const hit = predictUntil(
    toShuttleState(shuttle),
    (p, v) => {
      const dx = p.x - centerX;
      const dy = p.y - HITBOX_OVERHEAD.offsetY;
      return v.y < 0 && dx * dx + dy * dy <= HITBOX_OVERHEAD.radius * HITBOX_OVERHEAD.radius;
    },
    MAX_PREDICT_S,
    DT,
    DEFAULT_PHYSICS_CONFIG,
  );
  expect(hit, 'the shuttle must reach the overhead hitbox').not.toBeNull();
  return Math.round(hit!.t / DT);
}

/** X (m) where the shuttle first falls through the overhead hitbox centre height. */
function fallThroughX(shuttle: ShuttleSnapshot): number {
  const hit = predictUntil(
    toShuttleState(shuttle),
    (p, v) => v.y < 0 && p.y <= HITBOX_OVERHEAD.offsetY,
    MAX_PREDICT_S,
    DT,
    DEFAULT_PHYSICS_CONFIG,
  );
  expect(hit, 'the shuttle must fall through the hitbox centre height').not.toBeNull();
  return hit!.p.x;
}

/** Pause, seed, toss the practice shuttle from P1's hand and return the snapshot right after. */
async function tossFromP1(page: Page): Promise<TestSnapshot> {
  return page.evaluate((seed) => {
    const hooks = window.__BADMINTON__!;
    hooks.pause();
    hooks.setSeed(seed);
    hooks.tossShuttle(0);
    return hooks.getState();
  }, TEST_SEED);
}

/**
 * Press `button` for `player` so the swing contact moment (WINDUP plus half of ACTIVE) lands on
 * tick `ticksToEntry`, then step one tick at a time until a new `hit` event exists.
 * @returns The new hit event and the snapshot taken on the tick that produced it.
 */
async function swingAndWaitForHit(
  page: Page,
  player: PlayerIndex,
  button: Exclude<SwingButton, null>,
  ticksToEntry: number,
): Promise<{ hit: HitEvent; state: TestSnapshot }> {
  const waitBeforePress = ticksToEntry - PRESS_TO_CONTACT_TICKS - 1;
  expect(waitBeforePress, 'the press tick must still be ahead').toBeGreaterThanOrEqual(0);
  const result = await page.evaluate(
    ({ who, btn, wait, skip, maxTicks }) => {
      const hooks = window.__BADMINTON__!;
      const countHits = (): number => hooks.getEvents().filter((e) => e.type === 'hit').length;
      const hitsBefore = countHits();
      if (wait > 0) {
        hooks.step(wait);
      }
      hooks.setInput(who, { swing: btn }, 1);
      hooks.step(1);
      hooks.step(skip);
      let waited = 0;
      while (countHits() === hitsBefore && waited < maxTicks) {
        hooks.step(1);
        waited += 1;
      }
      const hits = hooks.getEvents().filter((e) => e.type === 'hit');
      return { hit: hits[hits.length - 1] ?? null, state: hooks.getState() };
    },
    {
      who: player,
      btn: button,
      wait: waitBeforePress,
      skip: SAFE_SKIP_TICKS,
      maxTicks: MAX_TICKS_AFTER_PRESS,
    },
  );
  expect(result.hit, 'a hit event must follow the press').not.toBeNull();
  return { hit: result.hit as HitEvent, state: result.state };
}

test.describe('Phase 3 — Vung vợt và các kiểu đánh (e2e)', () => {
  test('P3-E01 tung cầu vào vùng overhead của P1 rồi nhấn power đúng tick: SMASH, cầu rơi bên P2', async ({
    page,
  }) => {
    const watch = watchConsole(page);
    await page.goto('/?test=1');

    const tossed = await tossFromP1(page);
    const p1 = tossed.players[0];
    const ticksToEntry = ticksUntilOverheadHitbox(tossed.shuttle, p1.x, p1.facing);

    const { hit, state } = await swingAndWaitForHit(page, 0, 'power', ticksToEntry);
    await page.evaluate(() => window.__BADMINTON__!.step(300));

    const events = await page.evaluate(() => window.__BADMINTON__!.getEvents());
    const hits = events.filter((e): e is HitEvent => e.type === 'hit');
    const lands = events.filter((e) => e.type === 'land');
    const final = await page.evaluate(() => window.__BADMINTON__!.getState());

    // Measured values, printed so the report can quote them.
    console.log(
      `P3-E01 ticksToEntry=${ticksToEntry} hitTick=${hit.tick} shot=${hit.shot} timing=${hit.timing}` +
        ` speedKmh=${hit.speedKmh.toFixed(1)} contact=(${hit.contact.x.toFixed(3)},${hit.contact.y.toFixed(3)})` +
        ` land.x=${lands.length > 0 ? (lands[0] as { x: number }).x.toFixed(3) : 'none'}`,
    );

    expect(hits).toHaveLength(1);
    expect(hit.hitter).toBe(0);
    expect(hit.shot).toBe('SMASH');
    expect(Number.isFinite(state.shuttle.x)).toBe(true);
    expect(lands).toHaveLength(1);
    expect((lands[0] as { x: number }).x).toBeGreaterThan(0);
    expect(final.shuttle.state).toBe('grounded');
    expect(watch.consoleErrors).toEqual([]);
    expect(watch.pageErrors).toEqual([]);
  });

  test('P3-E02 rally 6 cú CLEAR xen kẽ P1 và P2 bằng input kịch bản: không lỗi console', async ({
    page,
  }) => {
    const watch = watchConsole(page);
    await page.goto('/?test=1');

    const hitCount = 6;
    const measured: string[] = [];
    let snapshot = await tossFromP1(page);
    let hitter: PlayerIndex = 0;
    let first = true;

    for (let i = 0; i < hitCount; i += 1) {
      let playerX = snapshot.players[hitter].x;
      const facing = snapshot.players[hitter].facing;
      if (!first) {
        // Teleport the receiver so its overhead hitbox centre sits where the shuttle falls past it.
        playerX = fallThroughX(snapshot.shuttle) - facing * HITBOX_OVERHEAD.offsetX;
        await page.evaluate(
          ({ who, x }) => window.__BADMINTON__!.setPlayerX(who, x),
          { who: hitter, x: playerX },
        );
        const placed = await page.evaluate(() => window.__BADMINTON__!.getState());
        playerX = placed.players[hitter].x;
        snapshot = placed;
      }
      first = false;

      const ticksToEntry = ticksUntilOverheadHitbox(snapshot.shuttle, playerX, facing);
      const { hit, state } = await swingAndWaitForHit(page, hitter, 'high', ticksToEntry);
      measured.push(
        `#${i + 1} P${hit.hitter + 1} ${hit.shot} ${hit.timing} ${hit.speedKmh.toFixed(0)}km/h` +
          ` entry=${ticksToEntry}`,
      );
      expect(hit.hitter).toBe(hitter);
      expect(hit.shot).toBe('CLEAR');
      expect(Number.isFinite(state.shuttle.x)).toBe(true);
      expect(Number.isFinite(state.shuttle.y)).toBe(true);
      expect(Number.isFinite(state.shuttle.z)).toBe(true);
      expect(state.shuttle.state).toBe('flying');
      snapshot = state;
      hitter = hitter === 0 ? 1 : 0;
    }

    const hits = (await page.evaluate(() => window.__BADMINTON__!.getEvents())).filter(
      (e): e is HitEvent => e.type === 'hit',
    );
    console.log(`P3-E02 ${measured.join(' | ')}`);

    expect(hits.map((h) => h.hitter)).toEqual([0, 1, 0, 1, 0, 1]);
    expect(hits.map((h) => h.shot)).toEqual(Array<string>(hitCount).fill('CLEAR'));
    for (const h of hits) {
      expect(Number.isFinite(h.speedKmh)).toBe(true);
      expect(Number.isFinite(h.contact.x)).toBe(true);
      expect(Number.isFinite(h.contact.y)).toBe(true);
    }
    expect(watch.consoleErrors).toEqual([]);
    expect(watch.pageErrors).toEqual([]);
  });
});
