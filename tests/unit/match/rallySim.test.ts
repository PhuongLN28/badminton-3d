import { describe, expect, it } from 'vitest';
import { DT, KMH_PER_MS, SMASH_MIN_CONTACT_Y } from '@shared/config';
import {
  createRallyState,
  spawnRallyShuttle,
  stepRally,
  type RallyState,
} from '@shared/match/rallySim';
import { predictUntil } from '@shared/physics/flight';
import { getShuttleNoseOut } from '@shared/physics/orientation';
import { DEFAULT_PHYSICS_CONFIG } from '@shared/physics/shuttle';
import type { InputFrame, SimEvent, Vec3 } from '@shared/types';

type HitEvent = Extract<SimEvent, { type: 'hit' }>;

/** Ticks between the swing press and the shuttle entering the hitbox (ticks); ACTIVE centers on the entry. */
const PRESS_LEAD_TICKS = 18;
/** Ticks simulated by a full scenario (ticks). */
const SCENARIO_TICKS = 200;
/** Ticks simulated after the second swing press so the whole swing is covered (ticks). */
const SECOND_SWING_TAIL_TICKS = 20;
/** Ticks the shuttle rests inside the hitbox in the double-hit checks (ticks), shorter than the ACTIVE tail. */
const PUT_BACK_TICKS = 10;
/** Safety cap for loops waiting on a swing to finish (ticks). */
const MAX_WAIT_TICKS = 200;
/** Overhead hitbox center of the default P1 (x = -2.6): feet x + 0.20, height 2.30 (m). */
const P1_OVERHEAD_CENTER: Vec3 = { x: -2.4, y: 2.3, z: 0 };
/** Overhead hitbox radius (m). */
const P1_OVERHEAD_RADIUS = 0.5;
/** Release point of the falling shuttle above the P1 overhead hitbox (m). */
const DROP_POINT: Vec3 = { x: -2.4, y: 3.6, z: 0 };
/** Parking point far above P1 where the shuttle waits while a swing runs out (m). */
const PARK_POINT: Vec3 = { x: -2.4, y: 8.0, z: 0 };
const REST: Vec3 = { x: 0, y: 0, z: 0 };

const IDLE: InputFrame = { moveX: 0, jump: false, swing: null, aim: 0 };
const POWER: InputFrame = { moveX: 0, jump: false, swing: 'power', aim: 0 };
const IDLE_PAIR: readonly [InputFrame, InputFrame] = [IDLE, IDLE];
const POWER_P1: readonly [InputFrame, InputFrame] = [POWER, IDLE];

function distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Call number (1-based) of `stepRally` at which the shuttle first sits inside the P1 hitbox while falling. */
function predictEntryCall(s: RallyState): number {
  const result = predictUntil(
    s.shuttle,
    (p, v) => distance(p, P1_OVERHEAD_CENTER) <= P1_OVERHEAD_RADIUS && v.y < 0,
    3,
    DT,
    DEFAULT_PHYSICS_CONFIG,
  );
  if (result === null) {
    throw new Error('Shuttle never enters the P1 hitbox');
  }
  return Math.round(result.t / DT);
}

/** Collect the hit events of one `stepRally` call (the returned array is reused by the sim). */
function collectHits(events: readonly SimEvent[], into: HitEvent[]): void {
  for (const ev of events) {
    if (ev.type === 'hit') {
      into.push(ev);
    }
  }
}

/** Put the shuttle at rest at `p` while keeping every double-hit lock untouched. */
function placeShuttle(s: RallyState, p: Vec3): void {
  s.shuttle.pos.x = p.x;
  s.shuttle.pos.y = p.y;
  s.shuttle.pos.z = p.z;
  s.shuttle.vel.x = 0;
  s.shuttle.vel.y = 0;
  s.shuttle.vel.z = 0;
  s.shuttle.state = 'flying';
}

/** Shuttle dropped from rest above P1, P1 presses `power` timed so the ACTIVE span centers on the entry. */
function runDropScenario(): { hits: HitEvent[]; all: SimEvent[]; entryCall: number } {
  const s = createRallyState(1);
  spawnRallyShuttle(s, DROP_POINT, REST);
  const entryCall = predictEntryCall(s);
  const hits: HitEvent[] = [];
  const all: SimEvent[] = [];
  for (let call = 1; call <= SCENARIO_TICKS; call += 1) {
    const events = stepRally(s, call === entryCall - PRESS_LEAD_TICKS ? POWER_P1 : IDLE_PAIR);
    collectHits(events, hits);
    all.push(...events);
  }
  return { hits, all, entryCall };
}

/** Run the drop scenario until the tick of the first hit and return the sim state right after it. */
function advanceToFirstHit(): { s: RallyState; hit: HitEvent; entryCall: number } {
  const s = createRallyState(1);
  spawnRallyShuttle(s, DROP_POINT, REST);
  const entryCall = predictEntryCall(s);
  const hits: HitEvent[] = [];
  for (let call = 1; call <= entryCall; call += 1) {
    collectHits(stepRally(s, call === entryCall - PRESS_LEAD_TICKS ? POWER_P1 : IDLE_PAIR), hits);
  }
  const hit = hits[0];
  if (hit === undefined) {
    throw new Error('The drop scenario produced no hit');
  }
  return { s, hit, entryCall };
}

describe('rallySim swing and hit flow', () => {
  it('P3-U02 hitbox chỉ trúng trong ACTIVE: đúng 1 hit; ngoài ACTIVE và không vung đều 0 hit', () => {
    // A: press timed so the ACTIVE span covers the shuttle passing through the hitbox.
    const a = runDropScenario();
    expect(a.hits).toHaveLength(1);
    const swingEvents = a.all.filter((ev) => ev.type === 'swing');
    expect(swingEvents).toHaveLength(1);
    expect(swingEvents[0]).toMatchObject({
      player: 0,
      kind: 'overhead',
      button: 'power',
      tick: a.entryCall - PRESS_LEAD_TICKS,
    });
    expect(a.hits[0]?.tick).toBe(a.entryCall);

    // B: the shuttle crosses the hitbox within the first ticks (WINDUP), before ACTIVE starts at tick 7.
    const b = createRallyState(1);
    spawnRallyShuttle(b, { x: -1.3, y: 2.3, z: 0 }, { x: -60, y: 0, z: 0 });
    const bHits: HitEvent[] = [];
    let insideDuringWindup = 0;
    for (let call = 1; call <= SCENARIO_TICKS; call += 1) {
      collectHits(stepRally(b, call === 1 ? POWER_P1 : IDLE_PAIR), bHits);
      if (
        b.swings[0].phase === 'WINDUP' &&
        distance(b.shuttle.pos, P1_OVERHEAD_CENTER) <= P1_OVERHEAD_RADIUS
      ) {
        insideDuringWindup += 1;
      }
    }
    expect(insideDuringWindup).toBeGreaterThanOrEqual(1);
    expect(bHits).toHaveLength(0);

    // C: no swing at all, the shuttle falls straight through the hitbox.
    const c = createRallyState(1);
    spawnRallyShuttle(c, DROP_POINT, REST);
    const cHits: HitEvent[] = [];
    let insideAnyTick = 0;
    for (let call = 1; call <= SCENARIO_TICKS; call += 1) {
      collectHits(stepRally(c, IDLE_PAIR), cHits);
      if (distance(c.shuttle.pos, P1_OVERHEAD_CENTER) <= P1_OVERHEAD_RADIUS) {
        insideAnyTick += 1;
      }
    }
    expect(insideAnyTick).toBeGreaterThanOrEqual(1);
    expect(cHits).toHaveLength(0);
  });

  it('P3-U16 chống chạm 2 lần: sau cú đánh của P1, cầu quay lại hitbox P1 không có hit thứ 2', () => {
    // (a) The same swing is still ACTIVE: the shuttle is put back inside the hitbox right after the hit.
    const putBackHits = (clearLastHitter: boolean, clearHasHit: boolean): number => {
      const { s } = advanceToFirstHit();
      expect(s.swings[0].phase).toBe('ACTIVE');
      expect(s.lastHitter).toBe(0);
      expect(s.swings[0].hasHit).toBe(true);
      placeShuttle(s, P1_OVERHEAD_CENTER);
      if (clearLastHitter) {
        s.lastHitter = null;
      }
      if (clearHasHit) {
        s.swings[0].hasHit = false;
      }
      const hits: HitEvent[] = [];
      for (let i = 0; i < PUT_BACK_TICKS; i += 1) {
        collectHits(stepRally(s, IDLE_PAIR), hits);
      }
      return hits.length;
    };
    expect(putBackHits(false, false)).toBe(0);
    // Each lock alone is enough to block the second hit; only clearing both lets the geometry hit.
    expect(putBackHits(true, false)).toBe(0);
    expect(putBackHits(false, true)).toBe(0);
    expect(putBackHits(true, true)).toBe(1);

    // (b) The swing is READY again: a new swing still cannot hit while `lastHitter` is P1.
    const secondSwingHits = (spawnResetsLock: boolean): number => {
      const { s } = advanceToFirstHit();
      placeShuttle(s, PARK_POINT);
      for (let i = 0; s.swings[0].phase !== 'READY'; i += 1) {
        expect(i).toBeLessThan(MAX_WAIT_TICKS);
        stepRally(s, IDLE_PAIR);
      }
      expect(s.lastHitter).toBe(0);
      if (spawnResetsLock) {
        spawnRallyShuttle(s, DROP_POINT, REST);
      } else {
        placeShuttle(s, DROP_POINT);
      }
      const entry = predictEntryCall(s);
      const hits: HitEvent[] = [];
      for (let call = 1; call <= entry + SECOND_SWING_TAIL_TICKS; call += 1) {
        collectHits(stepRally(s, call === entry - PRESS_LEAD_TICKS ? POWER_P1 : IDLE_PAIR), hits);
      }
      return hits.length;
    };
    expect(secondSwingHits(false)).toBe(0);
    // Control: `spawnRallyShuttle` resets the lock, so the same second swing hits.
    expect(secondSwingHits(true)).toBe(1);
  });

  it('P3-U19 sự kiện hit có đủ trường, speedKmh = |v0| × 3.6, cầu rời điểm chạm với v0', () => {
    const { s, hit, entryCall } = advanceToFirstHit();

    expect(Object.keys(hit).sort()).toEqual(
      [
        'adjusted',
        'contact',
        'hitter',
        'shot',
        'speedKmh',
        'swing',
        'targetDepth',
        'tick',
        'timing',
        'timingOffsetS',
        'type',
        'v0',
      ].sort(),
    );
    expect(hit.type).toBe('hit');
    expect(hit.tick).toBe(entryCall);
    expect(hit.hitter).toBe(0);
    expect(hit.shot).toBe('SMASH');
    expect(hit.swing).toBe('overhead');
    expect(hit.timing).toBe('PERFECT');
    expect(hit.contact.y).toBeGreaterThanOrEqual(SMASH_MIN_CONTACT_Y);
    expect(hit.contact.x).toBeLessThanOrEqual(0);
    expect(Math.abs(hit.timingOffsetS)).toBeLessThanOrEqual(0.035);
    expect(typeof hit.adjusted).toBe('boolean');
    expect(hit.targetDepth).toBeGreaterThanOrEqual(4.5);
    expect(hit.v0.x).toBeGreaterThan(0);
    expect(hit.v0.y).toBeLessThan(0);
    const speedMs = Math.sqrt(hit.v0.x * hit.v0.x + hit.v0.y * hit.v0.y + hit.v0.z * hit.v0.z);
    expect(hit.speedKmh).toBeCloseTo(speedMs * KMH_PER_MS, 9);

    // The shuttle leaves the contact point with exactly v0 and the nose is not snapped to the new direction.
    expect(s.shuttle.vel.x).toBe(hit.v0.x);
    expect(s.shuttle.vel.y).toBe(hit.v0.y);
    expect(s.shuttle.pos.x).toBe(hit.contact.x);
    expect(s.shuttle.pos.y).toBe(hit.contact.y);
    const nose = getShuttleNoseOut(s.shuttle.quat, { x: 0, y: 0, z: 0 });
    const alignment = (nose.x * hit.v0.x + nose.y * hit.v0.y + nose.z * hit.v0.z) / speedMs;
    expect(alignment).toBeLessThan(0.99);
  });
});
