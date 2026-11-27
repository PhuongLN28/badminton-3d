import { describe, expect, it } from 'vitest';
import { COURT_HALF_LENGTH, DT, NET_HEIGHT_CENTER, SHOT_PARAMS } from '@shared/config';
import { simulateFlight } from '@shared/physics/flight';
import { probeLandingX, probeNetCrossY } from '@shared/shots/flightProbe';
import { solveShot, type ShotRequest, type ShotSolution } from '@shared/shots/shotSolver';
import type { ShotType, Vec3 } from '@shared/types';
import shuttleRef from '../../fixtures/shuttle_reference.json';

type RefCase = (typeof shuttleRef.cases)[number];

/** Stopping tolerance of the solver bisection (m), mirrors GAME_SPEC §5.5. */
const LAND_TOL_M = 0.002;
/** Landing check margin after re-simulating the solved shot (m), per ROADMAP P3-U06. */
const REPLAY_LAND_TOL_M = 0.05;

function getCase(name: string): RefCase {
  const found = shuttleRef.cases.find((c) => c.name === name);
  if (!found) {
    throw new Error(`Missing fixture case: ${name}`);
  }
  return found;
}

function p0Of(refCase: RefCase): Vec3 {
  return { x: refCase.p0[0] ?? 0, y: refCase.p0[1] ?? 0, z: refCase.p0[2] ?? 0 };
}

function request(
  shot: ShotType,
  contact: Vec3,
  targetDepth: number,
  overrides: Partial<ShotRequest> = {},
): ShotRequest {
  return {
    shot,
    contact,
    facing: 1,
    targetDepth,
    params: SHOT_PARAMS[shot],
    assist: true,
    ...overrides,
  };
}

function replay(contact: Vec3, solution: ShotSolution): ReturnType<typeof simulateFlight> {
  return simulateFlight(contact, solution.v0, { collideNet: false });
}

function medianMs(fn: () => void): number {
  for (let i = 0; i < 10; i += 1) {
    fn();
  }
  const samples: number[] = [];
  for (let i = 0; i < 100; i += 1) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return samples[samples.length >> 1] ?? Number.POSITIVE_INFINITY;
}

describe('Bộ giải cú đánh (shotSolver.ts)', () => {
  it('P3-U06 CLEAR FIXED_ELEV: từ p0 của clear_from_back, đích 6.0 → 46.9 m/s (±0.3), rơi trong 5 cm, đối xứng P2', () => {
    const fx = getCase('clear_from_back');
    const contact = p0Of(fx);
    const sol = solveShot(request('CLEAR', contact, 6.0));

    expect(Math.abs(sol.speed - fx.speed)).toBeLessThanOrEqual(0.3);
    expect(sol.elevationDeg).toBeCloseTo(fx.elevation_deg, 6);
    expect(sol.adjusted).toBe(false);
    expect(sol.solved).toBe(true);
    expect(sol.targetDepth).toBe(6.0);
    expect(sol.flight.landed).toBe(true);
    expect(Math.abs((sol.flight.land?.x ?? Number.NaN) - 6.0)).toBeLessThanOrEqual(LAND_TOL_M * 2);

    const replayed = replay(contact, sol);
    expect(Math.abs((replayed.land?.x ?? Number.NaN) - 6.0)).toBeLessThanOrEqual(REPLAY_LAND_TOL_M);

    // The trial-flight probe equals simulateFlight exactly (same stepShuttle, same dt).
    expect(probeLandingX(contact, sol.v0, DT, Number.POSITIVE_INFINITY)).toBe(sol.flight.land?.x);

    // P2 (facing -1) stands at x = +5.0: v0.x mirrors, speed and elevation stay the same.
    const mirrored = solveShot(
      request('CLEAR', { x: -contact.x, y: contact.y, z: contact.z }, 6.0, { facing: -1 }),
    );
    expect(mirrored.v0.x).toBe(-sol.v0.x);
    expect(mirrored.v0.y).toBe(sol.v0.y);
    expect(mirrored.speed).toBe(sol.speed);
    expect(mirrored.flight.land?.x).toBe(-(sol.flight.land?.x ?? Number.NaN));

    // Unreachable target: finite v0, solved = false, no exception.
    const unreachable = solveShot(request('CLEAR', contact, 400));
    expect(unreachable.solved).toBe(false);
    for (const value of [unreachable.v0.x, unreachable.v0.y, unreachable.v0.z, unreachable.speed]) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('P3-U07 DROP FIXED_ELEV: từ p0 của drop_shot, góc 10°, đích 1.2 → 11.3 m/s (±0.1)', () => {
    const fx = getCase('drop_shot');
    const contact = p0Of(fx);
    const sol = solveShot(request('DROP', contact, 1.2));

    expect(Math.abs(sol.speed - fx.speed)).toBeLessThanOrEqual(0.1);
    expect(sol.elevationDeg).toBeCloseTo(fx.elevation_deg, 6);
    expect(sol.solved).toBe(true);
    expect(sol.adjusted).toBe(false);
    expect(Math.abs((replay(contact, sol).land?.x ?? Number.NaN) - 1.2)).toBeLessThanOrEqual(
      REPLAY_LAND_TOL_M,
    );
  });

  it('P3-U08 SMASH FIXED_SPEED + lưới: từ p0 của smash_standing, 60 m/s, đích 3.0 → adjusted, đích thực tế trong [4.3, 4.5], qua lưới ≥ 1.624, rơi trong sân', () => {
    const fx = getCase('smash_standing');
    const contact = p0Of(fx);
    const params = SHOT_PARAMS.SMASH;
    const sol = solveShot(request('SMASH', contact, 3.0));

    expect(params.solveMode).toBe('FIXED_SPEED');
    expect(sol.adjusted).toBe(true);
    expect(sol.targetDepth).toBeGreaterThanOrEqual(4.3);
    expect(sol.targetDepth).toBeLessThanOrEqual(4.5);
    expect(sol.speed).toBeCloseTo(fx.speed, 6);
    expect(sol.solved).toBe(true);

    const netCross = sol.flight.netCross;
    expect(netCross).not.toBeNull();
    const minHeight = NET_HEIGHT_CENTER + params.minNetClearance;
    expect(netCross?.y ?? Number.NEGATIVE_INFINITY).toBeGreaterThanOrEqual(minHeight - 1e-9);

    const landX = sol.flight.land?.x ?? Number.NaN;
    expect(landX).toBeGreaterThan(0);
    expect(landX).toBeLessThanOrEqual(COURT_HALF_LENGTH);
    expect(Math.abs(landX - sol.targetDepth)).toBeLessThanOrEqual(LAND_TOL_M * 2);

    // The net-height probe equals simulateFlight().netCross.y exactly.
    expect(probeNetCrossY(contact, sol.v0, DT)).toBe(netCross?.y);

    // A target that already clears the net is left alone by the assist.
    const noAdjust = solveShot(request('SMASH', contact, 5.0));
    expect(noAdjust.adjusted).toBe(false);
    expect(noAdjust.targetDepth).toBe(5.0);

    // assist = false keeps the requested target even though the shot cuts the net.
    const raw = solveShot(request('SMASH', contact, 3.0, { assist: false }));
    expect(raw.adjusted).toBe(false);
    expect(raw.targetDepth).toBe(3.0);
    expect(raw.flight.netCross?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(minHeight);
  });

  it('P3-U09 NET_SHOT TWO_POINT: từ p0 của net_shot, clearance 0.08, đích 0.5 → 67.3° (±0.5), 3.46 m/s (±0.05), qua lưới trong [1.584, 1.624]', () => {
    const fx = getCase('net_shot');
    const contact = p0Of(fx);
    const sol = solveShot(request('NET_SHOT', contact, 0.5));

    expect(Math.abs(sol.elevationDeg - fx.elevation_deg)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(sol.speed - fx.speed)).toBeLessThanOrEqual(0.05);
    expect(sol.solved).toBe(true);
    expect(sol.adjusted).toBe(false);

    const netY = sol.flight.netCross?.y ?? Number.NaN;
    expect(netY).toBeGreaterThanOrEqual(1.584);
    expect(netY).toBeLessThanOrEqual(1.624);
    expect(Math.abs((sol.flight.land?.x ?? Number.NaN) - 0.5)).toBeLessThanOrEqual(LAND_TOL_M * 2);
    expect(sol.flight.hitsNet).toBe(false);
  });

  it('P3-U10 LOW_SERVE TWO_POINT: từ p0 của low_serve, clearance 0.10, đích 2.3 → 26.1° (±0.5), 9.16 m/s (±0.05), rơi > 1.98', () => {
    const fx = getCase('low_serve');
    const contact = p0Of(fx);
    const sol = solveShot(request('LOW_SERVE', contact, 2.3));

    expect(Math.abs(sol.elevationDeg - fx.elevation_deg)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(sol.speed - fx.speed)).toBeLessThanOrEqual(0.05);
    expect(sol.solved).toBe(true);
    expect(sol.flight.land?.x ?? Number.NEGATIVE_INFINITY).toBeGreaterThan(1.98);
    const netY = sol.flight.netCross?.y ?? Number.NaN;
    expect(Math.abs(netY - (NET_HEIGHT_CENTER + 0.1))).toBeLessThanOrEqual(LAND_TOL_M);
  });

  it('P3-U11 BLOCK TWO_POINT: từ (−3.0, 0.8), clearance 0.20, đích 1.5 → 37.8° (±0.5), 9.37 m/s (±0.05)', () => {
    const contact: Vec3 = { x: -3.0, y: 0.8, z: 0 };
    const sol = solveShot(request('BLOCK', contact, 1.5));

    expect(Math.abs(sol.elevationDeg - 37.8)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(sol.speed - 9.37)).toBeLessThanOrEqual(0.05);
    expect(sol.solved).toBe(true);
    const netY = sol.flight.netCross?.y ?? Number.NaN;
    expect(Math.abs(netY - (NET_HEIGHT_CENTER + 0.2))).toBeLessThanOrEqual(LAND_TOL_M);
    expect(Math.abs((sol.flight.land?.x ?? Number.NaN) - 1.5)).toBeLessThanOrEqual(LAND_TOL_M * 2);
  });

  it('P3-U20 Hiệu năng solver: trung vị 100 lần giải FIXED_ELEV < 3 ms, FIXED_SPEED (có assist) < 3 ms, TWO_POINT < 6 ms', () => {
    const clear = request('CLEAR', p0Of(getCase('clear_from_back')), 6.0);
    const smash = request('SMASH', p0Of(getCase('smash_standing')), 3.0);
    const netShot = request('NET_SHOT', p0Of(getCase('net_shot')), 0.5);

    const fixedElevMs = medianMs(() => solveShot(clear));
    const fixedSpeedMs = medianMs(() => solveShot(smash));
    const twoPointMs = medianMs(() => solveShot(netShot));

    console.info(
      `P3-U20 median ms: FIXED_ELEV=${fixedElevMs.toFixed(3)} FIXED_SPEED=${fixedSpeedMs.toFixed(3)} TWO_POINT=${twoPointMs.toFixed(3)}`,
    );
    expect(fixedElevMs).toBeLessThan(3);
    expect(fixedSpeedMs).toBeLessThan(3);
    expect(twoPointMs).toBeLessThan(6);
  });
});
