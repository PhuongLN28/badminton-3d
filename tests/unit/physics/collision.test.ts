import { describe, expect, it } from 'vitest';
import {
  DEBUG_AUTO_RETURN_ANGLE_DEG,
  DEBUG_AUTO_RETURN_SPEED,
  DT,
  NET_HEIGHT_CENTER,
} from '@shared/config';
import { length, vec3 } from '@shared/math/vec3';
import { resolvePlayerBoxAutoReturn } from '@shared/physics/collision';
import {
  DEFAULT_PHYSICS_CONFIG,
  createShuttleScratch,
  createShuttleState,
  spawnShuttleState,
  stepShuttle,
} from '@shared/physics/shuttle';
import { createPlayerState } from '@shared/player/playerSim';
import type { SimEvent, Vec3 } from '@shared/types';
import shuttleRef from '../../fixtures/shuttle_reference.json';

type RefCase = (typeof shuttleRef.cases)[number];

interface LandedExpected {
  landed: true;
  t_land: number;
  land: { x: number; z: number };
  apex: { x: number; y: number };
  net_cross: { y: number; speed: number } | null;
  hits_net: boolean;
}

function getCase(name: string): RefCase {
  const found = shuttleRef.cases.find((c) => c.name === name);
  if (!found) {
    throw new Error(`Missing fixture case: ${name}`);
  }
  return found;
}

function getLandedExpected(refCase: RefCase): LandedExpected {
  const exp = refCase.expected;
  if (!exp.landed || !('t_land' in exp)) {
    throw new Error(`Fixture case ${refCase.name} is not a landed case`);
  }
  return exp as LandedExpected;
}

function tupleToVec3(t: readonly number[]): Vec3 {
  return vec3(t[0] ?? 0, t[1] ?? 0, t[2] ?? 0);
}

describe('Va chạm lưới, sàn và hộp người chơi (collision.ts)', () => {
  it('P2-U10 smash_into_net với collideNet: true -> 1 netHit tại y ≈ 1.296m (±1cm) và rơi vào [-1.0, 0) quanh -0.78m', () => {
    const refCase = getCase('smash_into_net');
    const exp = getLandedExpected(refCase);
    const scratch = createShuttleScratch();
    const state = createShuttleState();
    const cfg = { ...DEFAULT_PHYSICS_CONFIG, collideNet: true };
    spawnShuttleState(state, tupleToVec3(refCase.p0), tupleToVec3(refCase.v0), cfg);

    const netHits: Array<Extract<SimEvent, { type: 'netHit' }>> = [];
    const lands: Array<Extract<SimEvent, { type: 'land' }>> = [];

    for (let tick = 1; tick <= 600; tick += 1) {
      const res = stepShuttle(state, DT, cfg, scratch, tick);
      if (res.netHitEvent) {
        netHits.push(res.netHitEvent);
      }
      if (res.landEvent) {
        lands.push(res.landEvent);
      }
      if (state.state === 'grounded') {
        break;
      }
    }

    expect(netHits).toHaveLength(1);
    expect(netHits[0]?.fromSide).toBe(0);
    if (netHits[0] && exp.net_cross) {
      expect(Math.abs(netHits[0].heightM - exp.net_cross.y)).toBeLessThanOrEqual(
        shuttleRef.tolerances.position_m,
      );
    }

    expect(lands).toHaveLength(1);
    if (lands[0]) {
      expect(lands[0].x).toBeGreaterThanOrEqual(-1.0);
      expect(lands[0].x).toBeLessThan(0);
      expect(Math.abs(lands[0].x - -0.78)).toBeLessThan(0.1);
    }
  });

  it('P2-U11 Chống xuyên lưới: cầu 65 m/s bắn thẳng vào lưới dưới 1.524 m vẫn phát netHit', () => {
    const cfg = { ...DEFAULT_PHYSICS_CONFIG, collideNet: true };
    const scratch = createShuttleScratch();

    // Left -> Right across x = 0 (~0.54 m/tick)
    const sLeft = createShuttleState();
    spawnShuttleState(sLeft, vec3(-0.25, 1.0, 0), vec3(65, 0, 0), cfg);
    const netHitsLeft: Array<Extract<SimEvent, { type: 'netHit' }>> = [];
    for (let tick = 1; tick <= 10; tick += 1) {
      const res = stepShuttle(sLeft, DT, cfg, scratch, tick);
      if (res.netHitEvent) {
        netHitsLeft.push(res.netHitEvent);
      }
    }
    expect(netHitsLeft).toHaveLength(1);
    expect(netHitsLeft[0]?.fromSide).toBe(0);
    expect(netHitsLeft[0]?.heightM).toBeLessThan(NET_HEIGHT_CENTER);

    // Right -> Left across x = 0
    const sRight = createShuttleState();
    spawnShuttleState(sRight, vec3(0.25, 1.0, 0), vec3(-65, 0, 0), cfg);
    const netHitsRight: Array<Extract<SimEvent, { type: 'netHit' }>> = [];
    for (let tick = 1; tick <= 10; tick += 1) {
      const res = stepShuttle(sRight, DT, cfg, scratch, tick);
      if (res.netHitEvent) {
        netHitsRight.push(res.netHitEvent);
      }
    }
    expect(netHitsRight).toHaveLength(1);
    expect(netHitsRight[0]?.fromSide).toBe(1);
    expect(netHitsRight[0]?.heightM).toBeLessThan(NET_HEIGHT_CENTER);
  });

  it('P2-U12 net_shot với collideNet: true -> 0 netHit và rơi khớp fixture', () => {
    const refCase = getCase('net_shot');
    const exp = getLandedExpected(refCase);
    const cfg = { ...DEFAULT_PHYSICS_CONFIG, collideNet: true };
    const scratch = createShuttleScratch();
    const state = createShuttleState();
    spawnShuttleState(state, tupleToVec3(refCase.p0), tupleToVec3(refCase.v0), cfg);

    let netHitCount = 0;
    let landEvent: Extract<SimEvent, { type: 'land' }> | null = null;
    for (let tick = 1; tick <= 600; tick += 1) {
      const res = stepShuttle(state, DT, cfg, scratch, tick);
      if (res.netHitEvent) {
        netHitCount += 1;
      }
      if (res.landEvent) {
        landEvent = res.landEvent;
      }
      if (state.state === 'grounded') {
        break;
      }
    }

    expect(netHitCount).toBe(0);
    expect(landEvent).not.toBeNull();
    if (landEvent) {
      expect(Math.abs(landEvent.x - exp.land.x)).toBeLessThanOrEqual(
        shuttleRef.tolerances.position_m,
      );
    }
  });

  it('P2-U13 Chạm sàn: lệch < 1cm so với fixture, phát đúng 1 land, state=grounded và đứng yên sau đó', () => {
    const refCase = getCase('clear_from_back');
    const exp = getLandedExpected(refCase);
    const cfg = { ...DEFAULT_PHYSICS_CONFIG, collideNet: true };
    const scratch = createShuttleScratch();
    const state = createShuttleState();
    spawnShuttleState(state, tupleToVec3(refCase.p0), tupleToVec3(refCase.v0), cfg);

    const lands: Array<Extract<SimEvent, { type: 'land' }>> = [];
    for (let tick = 1; tick <= 600; tick += 1) {
      const res = stepShuttle(state, DT, cfg, scratch, tick);
      if (res.landEvent) {
        lands.push(res.landEvent);
      }
    }

    expect(lands).toHaveLength(1);
    expect(state.state).toBe('grounded');
    expect(state.pos.y).toBe(0);
    expect(state.vel).toEqual({ x: 0, y: 0, z: 0 });
    if (lands[0]) {
      expect(Math.abs(lands[0].x - exp.land.x)).toBeLessThan(shuttleRef.tolerances.position_m);
      expect(state.pos.x).toBe(lands[0].x);
    }

    // Step another 120 ticks to confirm it stays completely stationary with no duplicate land event
    const frozenPos = { ...state.pos };
    for (let tick = 601; tick <= 720; tick += 1) {
      const res = stepShuttle(state, DT, cfg, scratch, tick);
      expect(res.landEvent).toBeNull();
      expect(res.netHitEvent).toBeNull();
      expect(state.pos).toEqual(frozenPos);
      expect(state.vel).toEqual({ x: 0, y: 0, z: 0 });
    }
  });

  it('P2-U17 Nảy tạm thời resolvePlayerBoxAutoReturn: bật khỏi hộp P2 với vx < 0, 30 m/s @ 50°, chỉ 1 lần mỗi va chạm', () => {
    const p1 = createPlayerState(0, -2.6);
    const p2 = createPlayerState(1, 2.6);
    const players = [p1, p2] as const;
    const scratch = createShuttleScratch();
    const cfg = { ...DEFAULT_PHYSICS_CONFIG, collideNet: true };

    const shuttle = createShuttleState();
    spawnShuttleState(shuttle, vec3(2.1, 1.0, 0), vec3(25, -2, 0), cfg);

    let bounceCount = 0;
    for (let tick = 1; tick <= 20; tick += 1) {
      const prevPos = vec3(shuttle.pos.x, shuttle.pos.y, shuttle.pos.z);
      stepShuttle(shuttle, DT, cfg, scratch, tick);
      const hitPlayer = resolvePlayerBoxAutoReturn(prevPos, shuttle, players);
      if (hitPlayer !== null) {
        expect(hitPlayer).toBe(1);
        bounceCount += 1;
        expect(shuttle.vel.x).toBeLessThan(0);
        expect(length(shuttle.vel)).toBeCloseTo(DEBUG_AUTO_RETURN_SPEED, 6);
        const angleDeg = (Math.atan2(shuttle.vel.y, -shuttle.vel.x) * 180) / Math.PI;
        expect(angleDeg).toBeCloseTo(DEBUG_AUTO_RETURN_ANGLE_DEG, 6);
      }
    }

    expect(bounceCount).toBe(1);

    // P1 box bounce: shuttle flying leftward into P1 bounces rightward (+x)
    const p1Shuttle = createShuttleState();
    spawnShuttleState(p1Shuttle, vec3(-2.1, 1.0, 0), vec3(-25, -2, 0), cfg);
    let p1BounceCount = 0;
    for (let tick = 1; tick <= 20; tick += 1) {
      const prevPos = vec3(p1Shuttle.pos.x, p1Shuttle.pos.y, p1Shuttle.pos.z);
      stepShuttle(p1Shuttle, DT, cfg, scratch, tick);
      const hitPlayer = resolvePlayerBoxAutoReturn(prevPos, p1Shuttle, players);
      if (hitPlayer !== null) {
        expect(hitPlayer).toBe(0);
        p1BounceCount += 1;
        expect(p1Shuttle.vel.x).toBeGreaterThan(0);
        expect(length(p1Shuttle.vel)).toBeCloseTo(DEBUG_AUTO_RETURN_SPEED, 6);
      }
    }
    expect(p1BounceCount).toBe(1);

    // Moving away from P2 or grounded must not bounce
    const awayShuttle = createShuttleState();
    spawnShuttleState(awayShuttle, vec3(2.8, 1.0, 0), vec3(-10, 2, 0), cfg);
    expect(resolvePlayerBoxAutoReturn(vec3(2.7, 1.0, 0), awayShuttle, players)).toBeNull();

    const groundedShuttle = createShuttleState();
    groundedShuttle.state = 'grounded';
    groundedShuttle.pos = vec3(2.6, 0, 0);
    expect(resolvePlayerBoxAutoReturn(vec3(2.5, 0.1, 0), groundedShuttle, players)).toBeNull();
  });
});
