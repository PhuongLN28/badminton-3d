import { describe, expect, it } from 'vitest';
import { DT, SHUTTLE_TERMINAL_VELOCITY } from '@shared/config';
import { vec3 } from '@shared/math/vec3';
import { predictUntil, simulateFlight } from '@shared/physics/flight';
import { createShuttleState, spawnShuttleState } from '@shared/physics/shuttle';
import type { Vec3 } from '@shared/types';
import shuttleRef from '../../fixtures/shuttle_reference.json';

type RefCase = (typeof shuttleRef.cases)[number];

interface LandedExpected {
  landed: true;
  t_land: number;
  land: { x: number; z: number };
  apex: { x: number; y: number };
  net_cross: { y: number; speed: number } | null;
  hits_net: boolean;
  land_speed: number;
  descent_angle_deg: number;
  desc_over_asc_ratio: number | null;
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

describe('Mô phỏng quỹ đạo bay (flight.ts)', () => {
  it('P2-U03 parabola_no_drag: tầm xa khớp fixture (±1cm) và tỷ lệ xuống/lên ≈ 1.00 (±0.03)', () => {
    const refCase = getCase('parabola_no_drag');
    const exp = getLandedExpected(refCase);
    const tol = shuttleRef.tolerances;

    const res = simulateFlight(tupleToVec3(refCase.p0), tupleToVec3(refCase.v0), {
      collideNet: false,
      gravityEnabled: refCase.gravity,
      dragEnabled: refCase.drag,
    });

    expect(res.landed).toBe(true);
    expect(res.land).not.toBeNull();
    expect(res.tLand).not.toBeNull();
    expect(res.descOverAscRatio).not.toBeNull();
    if (res.land && res.tLand !== null && res.descOverAscRatio !== null) {
      expect(Math.abs(res.land.x - exp.land.x)).toBeLessThanOrEqual(tol.position_m);
      expect(Math.abs(res.tLand - exp.t_land)).toBeLessThanOrEqual(tol.time_s);
      expect(Math.abs(res.apex.x - exp.apex.x)).toBeLessThanOrEqual(tol.position_m);
      expect(Math.abs(res.apex.y - exp.apex.y)).toBeLessThanOrEqual(tol.position_m);
      expect(Math.abs(res.descOverAscRatio - (exp.desc_over_asc_ratio ?? 1))).toBeLessThanOrEqual(
        tol.ratio_abs,
      );
    }
  });

  it('P2-U04 clear_from_back: khớp fixture, ratio < 0.6, góc rơi >= 80°, tốc độ chạm sàn trong 5% của VT', () => {
    const refCase = getCase('clear_from_back');
    const exp = getLandedExpected(refCase);
    const tol = shuttleRef.tolerances;

    const res = simulateFlight(tupleToVec3(refCase.p0), tupleToVec3(refCase.v0), {
      collideNet: false,
      gravityEnabled: refCase.gravity,
      dragEnabled: refCase.drag,
    });

    expect(res.landed).toBe(true);
    expect(res.land).not.toBeNull();
    expect(res.tLand).not.toBeNull();
    expect(res.descOverAscRatio).not.toBeNull();
    expect(res.descentAngleDeg).not.toBeNull();
    expect(res.landSpeed).not.toBeNull();

    if (
      res.land &&
      res.tLand !== null &&
      res.descOverAscRatio !== null &&
      res.descentAngleDeg !== null &&
      res.landSpeed !== null
    ) {
      expect(Math.abs(res.land.x - exp.land.x)).toBeLessThanOrEqual(tol.position_m);
      expect(Math.abs(res.tLand - exp.t_land)).toBeLessThanOrEqual(tol.time_s);
      expect(Math.abs(res.apex.x - exp.apex.x)).toBeLessThanOrEqual(tol.position_m);
      expect(Math.abs(res.apex.y - exp.apex.y)).toBeLessThanOrEqual(tol.position_m);
      expect(Math.abs(res.descOverAscRatio - (exp.desc_over_asc_ratio ?? 0))).toBeLessThanOrEqual(
        tol.ratio_abs,
      );
      expect(Math.abs(res.descentAngleDeg - exp.descent_angle_deg)).toBeLessThanOrEqual(
        tol.angle_deg,
      );
      expect(Math.abs(res.landSpeed - exp.land_speed) / exp.land_speed).toBeLessThanOrEqual(
        tol.speed_rel,
      );

      expect(res.descOverAscRatio).toBeLessThan(0.6);
      expect(res.descentAngleDeg).toBeGreaterThanOrEqual(80);
      expect(Math.abs(res.landSpeed - SHUTTLE_TERMINAL_VELOCITY)).toBeLessThanOrEqual(
        0.05 * SHUTTLE_TERMINAL_VELOCITY,
      );
    }
  });

  it('P2-U05 Tất cả case landed===true trong fixture (collideNet: false): tLand, land, apex, netCross trong dung sai', () => {
    const tol = shuttleRef.tolerances;
    const landedCases = shuttleRef.cases.filter((c) => c.expected.landed);
    expect(landedCases.length).toBeGreaterThanOrEqual(13);

    for (const refCase of landedCases) {
      const exp = getLandedExpected(refCase);
      const res = simulateFlight(tupleToVec3(refCase.p0), tupleToVec3(refCase.v0), {
        collideNet: false,
        gravityEnabled: refCase.gravity,
        dragEnabled: refCase.drag,
      });

      expect(res.landed).toBe(true);
      expect(res.tLand).not.toBeNull();
      expect(res.land).not.toBeNull();
      if (res.tLand !== null && res.land !== null) {
        expect(Math.abs(res.tLand - exp.t_land)).toBeLessThanOrEqual(tol.time_s);
        expect(Math.abs(res.land.x - exp.land.x)).toBeLessThanOrEqual(tol.position_m);
        expect(Math.abs(res.land.z - exp.land.z)).toBeLessThanOrEqual(tol.position_m);
      }

      expect(Math.abs(res.apex.x - exp.apex.x)).toBeLessThanOrEqual(tol.position_m);
      expect(Math.abs(res.apex.y - exp.apex.y)).toBeLessThanOrEqual(tol.position_m);
      expect(res.hitsNet).toBe(exp.hits_net);

      if (exp.net_cross === null) {
        expect(res.netCross).toBeNull();
      } else {
        expect(res.netCross).not.toBeNull();
        if (res.netCross) {
          expect(Math.abs(res.netCross.y - exp.net_cross.y)).toBeLessThanOrEqual(tol.position_m);
          expect(
            Math.abs(res.netCross.speed - exp.net_cross.speed) / exp.net_cross.speed,
          ).toBeLessThanOrEqual(tol.speed_rel);
        }
      }
    }

    // Sanity check predictUntil preserves input state and uses exact stepCount * dtS timing
    const clearCase = getCase('clear_from_back');
    const shuttle = createShuttleState();
    spawnShuttleState(shuttle, tupleToVec3(clearCase.p0), tupleToVec3(clearCase.v0));
    const pred = predictUntil(shuttle, (_p, _v, t) => t >= 0.5, 2.0, DT);
    expect(pred).not.toBeNull();
    expect(pred?.t).toBe(60 * DT);
    expect(shuttle.pos).toEqual(tupleToVec3(clearCase.p0));
  });

  it('P2-U06 smash_fast_reference: tốc độ qua lưới < 45% tốc độ đầu (giảm tốc mạnh)', () => {
    const refCase = getCase('smash_fast_reference');
    const exp = getLandedExpected(refCase);
    const res = simulateFlight(tupleToVec3(refCase.p0), tupleToVec3(refCase.v0), {
      collideNet: false,
      gravityEnabled: refCase.gravity,
      dragEnabled: refCase.drag,
    });

    expect(res.netCross).not.toBeNull();
    if (res.netCross && exp.net_cross) {
      expect(res.netCross.speed).toBeLessThan(0.45 * refCase.speed);
      expect(
        Math.abs(res.netCross.speed - exp.net_cross.speed) / exp.net_cross.speed,
      ).toBeLessThanOrEqual(shuttleRef.tolerances.speed_rel);
    }
  });
});
