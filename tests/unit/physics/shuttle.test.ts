import { describe, expect, it } from 'vitest';
import {
  DT,
  GRAVITY,
  SHUTTLE_CHAR_LENGTH,
  SHUTTLE_MAX_POS_COORD,
  SHUTTLE_MAX_SPEED,
  SHUTTLE_TERMINAL_VELOCITY,
} from '@shared/config';
import { length, vec3 } from '@shared/math/vec3';
import {
  DEFAULT_PHYSICS_CONFIG,
  accel,
  createShuttleScratch,
  createShuttleState,
  spawnShuttleState,
  stepShuttle,
  type PhysicsConfig,
} from '@shared/physics/shuttle';
import type { ReadonlyVec3, Vec3 } from '@shared/types';
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

function makeConfig(overrides: Partial<PhysicsConfig> = {}): PhysicsConfig {
  return { ...DEFAULT_PHYSICS_CONFIG, ...overrides };
}

function stepSemiImplicitEuler(
  pos: Vec3,
  vel: Vec3,
  dtS: number,
  cfg: Readonly<PhysicsConfig>,
  accOut: Vec3,
): { landed: boolean; xLand: number } {
  const prevX = pos.x;
  const prevY = pos.y;
  accel(vel, accOut, cfg);
  vel.x += accOut.x * dtS;
  vel.y += accOut.y * dtS;
  vel.z += accOut.z * dtS;
  pos.x += vel.x * dtS;
  pos.y += vel.y * dtS;
  pos.z += vel.z * dtS;

  if (pos.y <= 0 && vel.y < 0) {
    const f = prevY > 0 ? prevY / (prevY - pos.y) : 0;
    return { landed: true, xLand: prevX + (pos.x - prevX) * f };
  }
  return { landed: false, xLand: 0 };
}

function runLandXWithDt(
  p0: ReadonlyVec3,
  v0: ReadonlyVec3,
  dtS: number,
): { landX: number; ticks: number } {
  const s = createShuttleState();
  spawnShuttleState(s, p0, v0);
  const cfg = makeConfig({ collideNet: false });
  const scratch = createShuttleScratch();

  let ticks = 0;
  const maxTicks = Math.ceil(10 / dtS);
  while (ticks < maxTicks) {
    ticks += 1;
    const res = stepShuttle(s, dtS, cfg, scratch, ticks);
    if (res.landEvent) {
      return { landX: res.landEvent.x, ticks };
    }
  }
  throw new Error('Shuttle failed to land within 10s');
}

describe('Vật lý quả cầu RK4 (shuttle.ts)', () => {
  it('P2-U01 fall_from_rest: khớp samples tại t=0.5/1/2/3s (<=0.5%) và công thức giải tích VT*tanh(gt/VT)', () => {
    const refCase = getCase('fall_from_rest');
    const samples = refCase.expected.samples;
    expect(samples.length).toBe(4);

    const cfg = makeConfig({
      collideNet: false,
      gravityEnabled: refCase.gravity,
      dragEnabled: refCase.drag,
    });
    const scratch = createShuttleScratch();
    const state = createShuttleState();
    const p0 = tupleToVec3(refCase.p0);
    const v0 = tupleToVec3(refCase.v0);
    spawnShuttleState(state, p0, v0, cfg);

    let tick = 0;
    for (const sample of samples) {
      const targetTick = Math.round(sample.t / DT);
      while (tick < targetTick) {
        tick += 1;
        stepShuttle(state, DT, cfg, scratch, tick);
      }

      const samplePos = tupleToVec3(sample.pos);
      const sampleVel = tupleToVec3(sample.vel);

      expect(Math.abs(state.pos.y - samplePos.y)).toBeLessThanOrEqual(
        shuttleRef.tolerances.position_m,
      );
      expect(Math.abs(state.vel.y - sampleVel.y) / Math.abs(sampleVel.y)).toBeLessThanOrEqual(
        shuttleRef.tolerances.speed_rel,
      );

      const expectedVy =
        -SHUTTLE_TERMINAL_VELOCITY * Math.tanh((GRAVITY * sample.t) / SHUTTLE_TERMINAL_VELOCITY);
      const expectedDrop =
        SHUTTLE_CHAR_LENGTH * Math.log(Math.cosh((GRAVITY * sample.t) / SHUTTLE_TERMINAL_VELOCITY));

      expect(Math.abs(state.vel.y - expectedVy) / Math.abs(expectedVy)).toBeLessThanOrEqual(
        shuttleRef.tolerances.speed_rel,
      );
      expect(Math.abs(p0.y - state.pos.y - expectedDrop)).toBeLessThanOrEqual(
        shuttleRef.tolerances.position_m,
      );
    }
  });

  it('P2-U02 horizontal_decay_no_gravity: khớp samples và công thức v=v0/(1+v0*t/L), s=L*ln(1+v0*t/L)', () => {
    const refCase = getCase('horizontal_decay_no_gravity');
    const samples = refCase.expected.samples;
    expect(samples.length).toBe(3);
    expect(Math.abs(SHUTTLE_CHAR_LENGTH - 4.714)).toBeLessThan(0.001);

    const cfg = makeConfig({
      collideNet: false,
      gravityEnabled: refCase.gravity,
      dragEnabled: refCase.drag,
    });
    const scratch = createShuttleScratch();
    const state = createShuttleState();
    const p0 = tupleToVec3(refCase.p0);
    const v0 = tupleToVec3(refCase.v0);
    spawnShuttleState(state, p0, v0, cfg);

    let tick = 0;
    for (const sample of samples) {
      const targetTick = Math.round(sample.t / DT);
      while (tick < targetTick) {
        tick += 1;
        stepShuttle(state, DT, cfg, scratch, tick);
      }

      const samplePos = tupleToVec3(sample.pos);
      const sampleVel = tupleToVec3(sample.vel);

      expect(Math.abs(state.pos.x - samplePos.x)).toBeLessThanOrEqual(
        shuttleRef.tolerances.position_m,
      );
      expect(Math.abs(state.vel.x - sampleVel.x) / sampleVel.x).toBeLessThanOrEqual(
        shuttleRef.tolerances.speed_rel,
      );

      const expectedVx = v0.x / (1 + (v0.x * sample.t) / SHUTTLE_CHAR_LENGTH);
      const expectedX =
        p0.x + SHUTTLE_CHAR_LENGTH * Math.log(1 + (v0.x * sample.t) / SHUTTLE_CHAR_LENGTH);

      expect(Math.abs(state.vel.x - expectedVx) / expectedVx).toBeLessThanOrEqual(
        shuttleRef.tolerances.speed_rel,
      );
      expect(Math.abs(state.pos.x - expectedX)).toBeLessThanOrEqual(
        shuttleRef.tolerances.position_m,
      );
    }
  });

  it('P2-U07 Độ chính xác bộ tích phân: RK4 @120Hz lệch < 1cm và semi-implicit Euler @120Hz lệch > 20cm', () => {
    const refCase = getCase('smash_fast_reference');
    const exp = getLandedExpected(refCase);
    const p0 = tupleToVec3(refCase.p0);
    const v0 = tupleToVec3(refCase.v0);

    const rk4Result = runLandXWithDt(p0, v0, DT);
    expect(Math.abs(rk4Result.landX - exp.land.x)).toBeLessThan(shuttleRef.tolerances.position_m);

    const eulerPos = vec3(p0.x, p0.y, p0.z);
    const eulerVel = vec3(v0.x, v0.y, v0.z);
    const eulerCfg = makeConfig({ collideNet: false });
    const accOut = vec3();
    let eulerLandX: number | null = null;

    for (let tick = 1; tick <= 600; tick += 1) {
      const stepRes = stepSemiImplicitEuler(eulerPos, eulerVel, DT, eulerCfg, accOut);
      if (stepRes.landed) {
        eulerLandX = stepRes.xLand;
        break;
      }
    }

    expect(eulerLandX).not.toBeNull();
    if (eulerLandX !== null) {
      expect(Math.abs(eulerLandX - exp.land.x)).toBeGreaterThan(0.2);
    }
  });

  it('P2-U08 Độc lập timestep: RK4 @60Hz và @240Hz cho điểm rơi lệch nhau < 1cm', () => {
    for (const caseName of ['smash_fast_reference', 'clear_from_back']) {
      const refCase = getCase(caseName);
      const p0 = tupleToVec3(refCase.p0);
      const v0 = tupleToVec3(refCase.v0);

      const res60 = runLandXWithDt(p0, v0, 1 / 60);
      const res240 = runLandXWithDt(p0, v0, 1 / 240);
      expect(Math.abs(res60.landX - res240.landX)).toBeLessThan(0.01);
    }
  });

  it('P2-U14 Chống NaN/Infinity và kẹp biên: v=0, v=500 -> 120, NaN/Infinity, p=1e6 và 1e308', () => {
    const scratch = createShuttleScratch();
    const noGravCfg = makeConfig({ collideNet: false, gravityEnabled: false });

    // v = 0 without gravity stays 0
    const zeroState = createShuttleState();
    spawnShuttleState(zeroState, vec3(0, 2, 0), vec3(0, 0, 0), noGravCfg);
    stepShuttle(zeroState, DT, noGravCfg, scratch, 1);
    expect(zeroState.pos).toEqual({ x: 0, y: 2, z: 0 });
    expect(zeroState.vel).toEqual({ x: 0, y: 0, z: 0 });

    // v = 500 clamped to SHUTTLE_MAX_SPEED (120 m/s)
    const fastState = createShuttleState();
    spawnShuttleState(fastState, vec3(-2, 3, 0), vec3(500, 0, 0), noGravCfg);
    expect(length(fastState.vel)).toBeCloseTo(SHUTTLE_MAX_SPEED, 9);
    stepShuttle(fastState, DT, noGravCfg, scratch, 1);
    expect(Number.isFinite(fastState.pos.x)).toBe(true);
    expect(Number.isFinite(fastState.vel.x)).toBe(true);
    expect(length(fastState.vel)).toBeLessThanOrEqual(SHUTTLE_MAX_SPEED + 1e-9);

    // NaN / Infinity recovery
    const nanState = createShuttleState();
    nanState.state = 'flying';
    nanState.pos = vec3(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY);
    nanState.vel = vec3(Number.POSITIVE_INFINITY, Number.NaN, 10);
    stepShuttle(nanState, DT, DEFAULT_PHYSICS_CONFIG, scratch, 1);
    expect(Number.isFinite(nanState.pos.x)).toBe(true);
    expect(Number.isFinite(nanState.pos.y)).toBe(true);
    expect(Number.isFinite(nanState.pos.z)).toBe(true);
    expect(Number.isFinite(nanState.vel.x)).toBe(true);
    expect(Number.isFinite(nanState.vel.y)).toBe(true);
    expect(Number.isFinite(nanState.vel.z)).toBe(true);

    // p = 1e6 and huge 1e308 without NaN/Infinity overflow
    const medHugeState = createShuttleState();
    spawnShuttleState(medHugeState, vec3(1e6, 1e6, 0), vec3(60, 10, 0));
    stepShuttle(medHugeState, DT, DEFAULT_PHYSICS_CONFIG, scratch, 1);
    expect(Number.isFinite(medHugeState.pos.x)).toBe(true);
    expect(Number.isFinite(medHugeState.pos.y)).toBe(true);
    expect(Number.isFinite(medHugeState.vel.x)).toBe(true);

    const extremeState = createShuttleState();
    extremeState.state = 'flying';
    extremeState.pos = vec3(1e308, 1e308, -1e308);
    extremeState.vel = vec3(1e308, 1e308, 0);
    stepShuttle(extremeState, DT, DEFAULT_PHYSICS_CONFIG, scratch, 1);
    expect(Number.isFinite(extremeState.pos.x)).toBe(true);
    expect(Number.isFinite(extremeState.pos.y)).toBe(true);
    expect(Number.isFinite(extremeState.pos.z)).toBe(true);
    expect(Math.abs(extremeState.pos.x)).toBeLessThanOrEqual(SHUTTLE_MAX_POS_COORD);
    expect(Number.isFinite(extremeState.vel.x)).toBe(true);
    expect(Number.isFinite(extremeState.vel.y)).toBe(true);
    expect(Number.isFinite(extremeState.vel.z)).toBe(true);
    expect(length(extremeState.vel)).toBeLessThanOrEqual(SHUTTLE_MAX_SPEED + 1e-6);
  });

  it('P2-U15 GAME_SPEED = 1.2: điểm rơi trùng khớp (±1cm) và số tick giảm theo 1/1.2 (±1 tick)', () => {
    const refCase = getCase('clear_from_back');
    const p0 = tupleToVec3(refCase.p0);
    const v0 = tupleToVec3(refCase.v0);

    const normal = runLandXWithDt(p0, v0, DT);
    const fast = runLandXWithDt(p0, v0, DT * 1.2);

    expect(Math.abs(fast.landX - normal.landX)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(fast.ticks - normal.ticks / 1.2)).toBeLessThanOrEqual(1);
  });

  it('P2-U16 Tất định: chạy cùng case 2 lần cho kết quả giống hệt từng bit', () => {
    const runTrace = (caseName: string, collideNet: boolean): number[] => {
      const refCase = getCase(caseName);
      const cfg = makeConfig({ collideNet });
      const scratch = createShuttleScratch();
      const s = createShuttleState();
      spawnShuttleState(s, tupleToVec3(refCase.p0), tupleToVec3(refCase.v0), cfg);
      const trace: number[] = [];

      for (let tick = 1; tick <= 360; tick += 1) {
        stepShuttle(s, DT, cfg, scratch, tick);
        trace.push(s.pos.x, s.pos.y, s.pos.z, s.vel.x, s.vel.y, s.vel.z);
        if (s.state === 'grounded') {
          break;
        }
      }
      return trace;
    };

    for (const [name, collideNet] of [
      ['clear_from_back', true],
      ['smash_into_net', true],
    ] as const) {
      const runA = runTrace(name, collideNet);
      const runB = runTrace(name, collideNet);
      expect(runA.length).toBe(runB.length);
      for (let i = 0; i < runA.length; i += 1) {
        expect(Object.is(runA[i], runB[i])).toBe(true);
      }
    }
  });

  it('P2-U18 Hiệu năng: 10,000 lần stepShuttle < 20 ms (Node)', () => {
    const scratch = createShuttleScratch();
    const s = createShuttleState();
    const cfg = makeConfig({ collideNet: false });
    spawnShuttleState(s, vec3(-4, 50, 0), vec3(30, 15, 0), cfg);

    // Warm up JIT
    for (let i = 0; i < 1000; i += 1) {
      s.pos.y = 50;
      s.vel.x = 30;
      s.vel.y = 15;
      stepShuttle(s, DT, cfg, scratch, i + 1);
    }

    // D-021: median of 5 samples damps isolated CPU scheduling spikes on a busy
    // machine. Threshold and steps per sample are unchanged.
    const sampleCount = 5;
    const samplesMs: number[] = [];
    for (let n = 0; n < sampleCount; n += 1) {
      const startMs = performance.now();
      for (let i = 0; i < 10_000; i += 1) {
        s.pos.y = 50;
        s.vel.x = 30;
        s.vel.y = 15;
        stepShuttle(s, DT, cfg, scratch, i + 1);
      }
      samplesMs.push(performance.now() - startMs);
    }
    samplesMs.sort((a, b) => a - b);
    const medianMs = samplesMs[Math.floor(sampleCount / 2)] ?? Number.POSITIVE_INFINITY;
    expect(medianMs).toBeLessThan(20);
  });
});
