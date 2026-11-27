import { describe, expect, it } from 'vitest';
import { DT, SHUTTLE_MIN_SPEED_FOR_ORIENT } from '@shared/config';
import { copyQuatOut, quatFromUnitVectorsOut, quatIdentity } from '@shared/math/quat';
import { dot, length, normalize, vec3 } from '@shared/math/vec3';
import {
  getShuttleNoseOut,
  initialShuttleOrientation,
  shuttleOrientation,
} from '@shared/physics/orientation';
import {
  DEFAULT_PHYSICS_CONFIG,
  createShuttleScratch,
  createShuttleState,
  spawnShuttleState,
  stepShuttle,
} from '@shared/physics/shuttle';
import type { Quat, Vec3 } from '@shared/types';
import shuttleRef from '../../fixtures/shuttle_reference.json';

type RefCase = (typeof shuttleRef.cases)[number];

function getCase(name: string): RefCase {
  const found = shuttleRef.cases.find((c) => c.name === name);
  if (!found) {
    throw new Error(`Missing fixture case: ${name}`);
  }
  return found;
}

function tupleToVec3(t: readonly number[]): Vec3 {
  return vec3(t[0] ?? 0, t[1] ?? 0, t[2] ?? 0);
}

describe('Hướng mũi quả cầu (orientation.ts)', () => {
  it('P2-U09 ORIENT_RATE=40: bám hướng vận tốc (>0.99), đảo 180° sau 0.1s (>0.98), và |v|<0.05 hoặc v=0 giữ hướng cũ không NaN', () => {
    const nose = vec3();

    // 1. clear, smash, drop after 0.05s with |v| > 3 m/s -> dot(nose, v_hat) > 0.99
    for (const caseName of ['clear_from_back', 'smash_standing', 'drop_shot']) {
      const refCase = getCase(caseName);
      const state = createShuttleState();
      const scratch = createShuttleScratch();
      const cfg = { ...DEFAULT_PHYSICS_CONFIG, collideNet: false };
      spawnShuttleState(state, tupleToVec3(refCase.p0), tupleToVec3(refCase.v0), cfg);
      const q = initialShuttleOrientation(state.vel);

      let minDot = 1;
      let checkedTicks = 0;
      for (let tick = 1; tick <= 600; tick += 1) {
        stepShuttle(state, DT, cfg, scratch, tick);
        if (state.state === 'grounded') {
          break;
        }
        shuttleOrientation(q, state.vel, DT, q);

        const t = tick * DT;
        const speed = length(state.vel);
        if (t >= 0.05 && speed > 3.0) {
          getShuttleNoseOut(q, nose);
          const vHat = normalize(state.vel);
          const alignment = dot(nose, vHat);
          if (alignment < minDot) {
            minDot = alignment;
          }
          checkedTicks += 1;
        }
      }

      expect(checkedTicks).toBeGreaterThan(0);
      expect(minDot).toBeGreaterThan(0.99);
    }

    // 2. 180-degree velocity reversal: after 0.1s -> dot(nose, v_hat) > 0.98
    const qRev = initialShuttleOrientation(vec3(20, 0, 0));
    const vReversed = vec3(-20, 0, 0);
    const ticksFor100Ms = Math.round(0.1 / DT);
    for (let tick = 0; tick < ticksFor100Ms; tick += 1) {
      shuttleOrientation(qRev, vReversed, DT, qRev);
    }
    getShuttleNoseOut(qRev, nose);
    expect(dot(nose, normalize(vReversed))).toBeGreaterThan(0.98);
    expect(Number.isFinite(qRev.x)).toBe(true);
    expect(Number.isFinite(qRev.y)).toBe(true);
    expect(Number.isFinite(qRev.z)).toBe(true);
    expect(Number.isFinite(qRev.w)).toBe(true);

    // Deterministic 180-deg axis check for (0,1,0) -> (0,-1,0) uses Z axis (0,0,1,0)
    const qFlip180 = quatIdentity();
    quatFromUnitVectorsOut(vec3(0, 1, 0), vec3(0, -1, 0), qFlip180);
    expect(qFlip180.x).toBeCloseTo(0, 12);
    expect(qFlip180.y).toBeCloseTo(0, 12);
    expect(Math.abs(qFlip180.z)).toBeCloseTo(1, 12);
    expect(qFlip180.w).toBeCloseTo(0, 12);

    // 3. |v| < SHUTTLE_MIN_SPEED_FOR_ORIENT and v = 0 preserve prevQ, no NaN
    const preservedQ: Quat = initialShuttleOrientation(vec3(10, 5, 0));
    const expectedQ: Quat = quatIdentity();
    copyQuatOut(preservedQ, expectedQ);

    const lowSpeedOut = shuttleOrientation(
      preservedQ,
      vec3(SHUTTLE_MIN_SPEED_FOR_ORIENT * 0.4, SHUTTLE_MIN_SPEED_FOR_ORIENT * 0.3, 0),
      DT,
    );
    expect(lowSpeedOut.x).toBeCloseTo(expectedQ.x, 12);
    expect(lowSpeedOut.y).toBeCloseTo(expectedQ.y, 12);
    expect(lowSpeedOut.z).toBeCloseTo(expectedQ.z, 12);
    expect(lowSpeedOut.w).toBeCloseTo(expectedQ.w, 12);

    const zeroSpeedOut = shuttleOrientation(preservedQ, vec3(0, 0, 0), DT);
    expect(zeroSpeedOut.x).toBeCloseTo(expectedQ.x, 12);
    expect(zeroSpeedOut.y).toBeCloseTo(expectedQ.y, 12);
    expect(zeroSpeedOut.z).toBeCloseTo(expectedQ.z, 12);
    expect(zeroSpeedOut.w).toBeCloseTo(expectedQ.w, 12);
    expect(Number.isNaN(zeroSpeedOut.w)).toBe(false);
  });
});
