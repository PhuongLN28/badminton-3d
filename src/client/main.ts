import './ui/styles.css';
import {
  COURT_HALF_LENGTH,
  DEBUG_AUTO_RETURN,
  DEFAULT_GAME_SPEED,
  DEFAULT_RNG_SEED,
  DT,
  MAX_STORED_EVENTS,
} from '@shared/config';
import { copyQuatOut, quatIdentity, slerpQuatOut } from '@shared/math/quat';
import { copyOut, length, lerpOut, vec3 } from '@shared/math/vec3';
import { resolvePlayerBoxAutoReturn } from '@shared/physics/collision';
import { simulateFlight } from '@shared/physics/flight';
import { initialShuttleOrientation, shuttleOrientation } from '@shared/physics/orientation';
import {
  DEFAULT_PHYSICS_CONFIG,
  copyShuttleState,
  createShuttleScratch,
  createShuttleState,
  spawnShuttleState,
  stepShuttle,
  toShuttleSnapshot,
  type PhysicsConfig,
  type ShuttleScratch,
  type ShuttleState,
} from '@shared/physics/shuttle';
import {
  copyPlayerState,
  createPlayerState,
  stepPlayer,
  toPlayerSnapshot,
  type PlayerState,
} from '@shared/player/playerSim';
import type {
  InputFrame,
  PlayerIndex,
  Quat,
  ReadonlyVec3,
  SimEvent,
  TestSnapshot,
  Vec3,
} from '@shared/types';
import { KeyboardInputController, attachKeyboardListeners } from './input/keyboard';
import { GameLoop } from './loop';
import { createSideCamera } from './render/camera';
import { createDebugDraw } from './render/debugDraw';
import { createPlayerMesh } from './render/playerMesh';
import { createArenaScene } from './render/scene';
import { createShuttleMesh } from './render/shuttleMesh';
import { createShuttleTrail } from './render/trail';
import { installTestHooks } from './testHooks';
import {
  createDebugOverlay,
  type DebugOverlayData,
  type DebugOverlayShuttleData,
} from './ui/debugOverlay';
import { createShuttleLabGui } from './ui/shuttleLabGui';

interface InputOverride {
  remainingTicks: number;
  readonly frame: InputFrame;
}

type MutablePhysicsConfig = {
  -readonly [K in keyof PhysicsConfig]: PhysicsConfig[K];
};

interface Phase2SimState {
  tick: number;
  seed: number;
  events: SimEvent[];
  prevPlayers: [PlayerState, PlayerState];
  currPlayers: [PlayerState, PlayerState];
  prevShuttle: ShuttleState;
  currShuttle: ShuttleState;
  shuttleScratch: ShuttleScratch;
  physicsCfg: MutablePhysicsConfig;
  flightElapsedS: number;
  gameSpeed: number;
  autoReturnEnabled: boolean;
  overrides: [InputOverride, InputOverride];
}

function createInputOverride(): InputOverride {
  return {
    remainingTicks: 0,
    frame: { moveX: 0, jump: false, swing: null, aim: 0 },
  };
}

function resolvePlayerInput(
  index: PlayerIndex,
  keyboardFrames: readonly [InputFrame, InputFrame],
  overrides: readonly [InputOverride, InputOverride],
): Readonly<InputFrame> {
  const override = overrides[index];
  if (override.remainingTicks > 0) {
    override.remainingTicks -= 1;
    return override.frame;
  }
  return keyboardFrames[index];
}

function computePredictedLanding(
  shuttle: Readonly<ShuttleState>,
  cfg: Readonly<PhysicsConfig>,
): { x: number; z: number } | null {
  if (shuttle.state !== 'flying' || !cfg.gravityEnabled) {
    return null;
  }
  const res = simulateFlight(shuttle.pos, shuttle.vel, {
    collideNet: cfg.collideNet,
    gravityEnabled: cfg.gravityEnabled,
    dragEnabled: cfg.dragEnabled,
  });
  return res.landed ? res.land : null;
}

function bootstrap(): void {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('Missing #app mount container');
  }

  const params = new URLSearchParams(window.location.search);
  const debugEnabled = params.get('debug') === '1';

  const state: Phase2SimState = {
    tick: 0,
    seed: DEFAULT_RNG_SEED,
    events: [],
    prevPlayers: [createPlayerState(0), createPlayerState(1)],
    currPlayers: [createPlayerState(0), createPlayerState(1)],
    prevShuttle: createShuttleState(),
    currShuttle: createShuttleState(),
    shuttleScratch: createShuttleScratch(),
    physicsCfg: { ...DEFAULT_PHYSICS_CONFIG },
    flightElapsedS: 0,
    gameSpeed: DEFAULT_GAME_SPEED,
    autoReturnEnabled: DEBUG_AUTO_RETURN,
    overrides: [createInputOverride(), createInputOverride()],
  };

  const arena = createArenaScene(container);
  const p1Mesh = createPlayerMesh(0, 1);
  const p2Mesh = createPlayerMesh(1, -1);
  p1Mesh.setPosition(state.currPlayers[0].x, state.currPlayers[0].y, 0);
  p2Mesh.setPosition(state.currPlayers[1].x, state.currPlayers[1].y, 0);

  const shuttleMesh = createShuttleMesh();
  const shuttleTrail = createShuttleTrail();
  const debugDraw = createDebugDraw();
  debugDraw.setDebugVisible(debugEnabled);
  shuttleMesh.updateTransform(state.currShuttle.pos, state.currShuttle.quat, false);

  arena.scene.add(
    p1Mesh.group,
    p2Mesh.group,
    shuttleMesh.group,
    shuttleMesh.shadowMesh,
    shuttleTrail.line,
    debugDraw.group,
  );

  const sideCamera = createSideCamera(
    container.clientWidth || window.innerWidth,
    container.clientHeight || window.innerHeight,
  );
  const debugOverlay = createDebugOverlay(container, debugEnabled);

  const pushEvent = (ev: SimEvent): void => {
    state.events.push(ev);
    if (state.events.length > MAX_STORED_EVENTS) {
      state.events.shift();
    }
  };

  const launchShuttle = (
    p0: ReadonlyVec3,
    v0: ReadonlyVec3,
    cfg: Readonly<PhysicsConfig>,
  ): void => {
    state.events.length = 0;
    spawnShuttleState(state.currShuttle, p0, v0, cfg);
    initialShuttleOrientation(state.currShuttle.vel, state.currShuttle.quat);
    copyShuttleState(state.prevShuttle, state.currShuttle);
    state.flightElapsedS = 0;
    shuttleTrail.clear();
    shuttleTrail.recordSample(state.currShuttle.pos, 0);
    debugDraw.beginFlight(state.currShuttle.pos, computePredictedLanding(state.currShuttle, cfg));
    shuttleMesh.updateTransform(state.currShuttle.pos, state.currShuttle.quat, true);
    sideCamera.update(state.currShuttle.pos, true, 1.0);
  };

  const shuttleLabGui = createShuttleLabGui(debugEnabled, {
    onLaunch: (req) => {
      state.physicsCfg.gravityEnabled = req.gravityEnabled;
      state.physicsCfg.dragEnabled = req.dragEnabled;
      state.physicsCfg.collideNet = req.collideNet;
      launchShuttle(req.p0, req.v0, state.physicsCfg);
    },
    onReverseVelocity: () => {
      if (state.currShuttle.state !== 'flying') {
        return;
      }
      state.currShuttle.vel.x = -state.currShuttle.vel.x + 0;
      state.currShuttle.vel.y = -state.currShuttle.vel.y + 0;
      state.currShuttle.vel.z = -state.currShuttle.vel.z + 0;
      state.prevShuttle.vel.x = -state.prevShuttle.vel.x + 0;
      state.prevShuttle.vel.y = -state.prevShuttle.vel.y + 0;
      state.prevShuttle.vel.z = -state.prevShuttle.vel.z + 0;
      debugDraw.updatePredictedLanding(
        computePredictedLanding(state.currShuttle, state.physicsCfg),
      );
    },
    onClearTrail: () => {
      shuttleTrail.clear();
      debugDraw.clearTrajectory();
    },
    onToggleAutoReturn: (enabled) => {
      state.autoReturnEnabled = enabled;
    },
    onChangeGameSpeed: (speed) => {
      state.gameSpeed = Number.isFinite(speed) && speed > 0 ? speed : DEFAULT_GAME_SPEED;
    },
    onChangeCameraMode: (mode) => {
      sideCamera.setMode(mode);
      sideCamera.update(state.currShuttle.pos, state.currShuttle.state === 'flying', 1.0);
    },
  });

  const keyboard = new KeyboardInputController();
  const detachKeyboard = attachKeyboardListeners(window, keyboard, document);

  const onResize = (): void => {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    arena.resize(width, height);
    sideCamera.resize(width, height);
  };
  window.addEventListener('resize', onResize);

  const onKeyDownSyncDebug = (event: KeyboardEvent): void => {
    if (event.code === 'F3') {
      const visible = debugOverlay.isVisible();
      shuttleLabGui.setVisible(visible);
      debugDraw.setDebugVisible(visible);
    }
  };
  window.addEventListener('keydown', onKeyDownSyncDebug);

  const interpShuttlePos: Vec3 = vec3(0, 0, 0);
  const interpShuttleQuat: Quat = quatIdentity();
  const hudShuttleData: DebugOverlayShuttleData = {
    x: 0,
    y: 0,
    speedMs: 0,
    state: 'idle',
  };
  const overlayData: DebugOverlayData = {
    tick: 0,
    phase: 'RALLY',
    stats: {
      fps: 0,
      lastStepMs: 0,
      alpha: 0,
      paused: false,
    },
    p1: { x: state.currPlayers[0].x, y: state.currPlayers[0].y },
    p2: { x: state.currPlayers[1].x, y: state.currPlayers[1].y },
    shuttle: hudShuttleData,
  };
  let lastRenderNowMs = 0;

  const loop = new GameLoop({
    onStep: (dtS = DT) => {
      const stepDt = dtS * state.gameSpeed;
      const keyboardFrames = keyboard.consumeFrames();
      copyPlayerState(state.prevPlayers[0], state.currPlayers[0]);
      copyPlayerState(state.prevPlayers[1], state.currPlayers[1]);

      const input0 = resolvePlayerInput(0, keyboardFrames, state.overrides);
      const input1 = resolvePlayerInput(1, keyboardFrames, state.overrides);

      stepPlayer(state.currPlayers[0], input0, stepDt);
      stepPlayer(state.currPlayers[1], input1, stepDt);

      copyShuttleState(state.prevShuttle, state.currShuttle);
      if (state.currShuttle.state === 'flying') {
        const stepRes = stepShuttle(
          state.currShuttle,
          stepDt,
          state.physicsCfg,
          state.shuttleScratch,
          state.tick + 1,
        );
        if (stepRes.netHitEvent) {
          pushEvent(stepRes.netHitEvent);
        }
        if (stepRes.landEvent) {
          state.flightElapsedS += stepRes.landEvent.subTickFraction * stepDt;
          pushEvent(stepRes.landEvent);
          debugDraw.markLanding(
            stepRes.landEvent.x,
            stepRes.landEvent.z,
            Math.abs(stepRes.landEvent.x) <= COURT_HALF_LENGTH,
          );
        } else {
          state.flightElapsedS += stepDt;
        }
        if (state.autoReturnEnabled && state.currShuttle.state === 'flying') {
          const hitPlayer = resolvePlayerBoxAutoReturn(
            state.shuttleScratch.prevPos,
            state.currShuttle,
            state.currPlayers,
          );
          if (hitPlayer !== null) {
            debugDraw.updatePredictedLanding(
              computePredictedLanding(state.currShuttle, state.physicsCfg),
            );
          }
        }
        shuttleOrientation(
          state.currShuttle.quat,
          state.currShuttle.vel,
          stepDt,
          state.currShuttle.quat,
        );
        shuttleTrail.recordSample(state.currShuttle.pos, state.flightElapsedS);
        debugDraw.recordFlightStep(state.currShuttle.pos, state.flightElapsedS);
      }

      state.tick += 1;
    },
    onRender: (alpha, stats) => {
      const p1Prev = state.prevPlayers[0];
      const p1Curr = state.currPlayers[0];
      const p2Prev = state.prevPlayers[1];
      const p2Curr = state.currPlayers[1];

      const p1RenderX = p1Prev.x + (p1Curr.x - p1Prev.x) * alpha;
      const p1RenderY = p1Prev.y + (p1Curr.y - p1Prev.y) * alpha;
      const p2RenderX = p2Prev.x + (p2Curr.x - p2Prev.x) * alpha;
      const p2RenderY = p2Prev.y + (p2Curr.y - p2Prev.y) * alpha;

      p1Mesh.setPosition(p1RenderX, p1RenderY, 0);
      p2Mesh.setPosition(p2RenderX, p2RenderY, 0);

      if (state.currShuttle.state === 'flying') {
        lerpOut(state.prevShuttle.pos, state.currShuttle.pos, alpha, interpShuttlePos);
        slerpQuatOut(state.prevShuttle.quat, state.currShuttle.quat, alpha, interpShuttleQuat);
      } else {
        copyOut(state.currShuttle.pos, interpShuttlePos);
        copyQuatOut(state.currShuttle.quat, interpShuttleQuat);
      }
      shuttleMesh.updateTransform(
        interpShuttlePos,
        interpShuttleQuat,
        state.currShuttle.state !== 'idle',
      );

      const nowMs = performance.now();
      const rawRenderDtS = lastRenderNowMs > 0 ? (nowMs - lastRenderNowMs) / 1000 : DT;
      lastRenderNowMs = nowMs;
      const cameraDtS = stats.paused ? 1.0 : Math.min(0.1, Math.max(DT, rawRenderDtS));
      sideCamera.update(interpShuttlePos, state.currShuttle.state === 'flying', cameraDtS);

      arena.renderer.render(arena.scene, sideCamera.camera);

      overlayData.tick = state.tick;
      overlayData.stats = stats;
      overlayData.p1.x = p1Curr.x;
      overlayData.p1.y = p1Curr.y;
      overlayData.p2.x = p2Curr.x;
      overlayData.p2.y = p2Curr.y;
      hudShuttleData.x = state.currShuttle.pos.x;
      hudShuttleData.y = state.currShuttle.pos.y;
      hudShuttleData.speedMs = length(state.currShuttle.vel);
      hudShuttleData.state = state.currShuttle.state;
      debugOverlay.update(overlayData);
    },
  });

  const buildSnapshot = (): TestSnapshot => ({
    phase: 'RALLY',
    tick: state.tick,
    players: [toPlayerSnapshot(state.currPlayers[0]), toPlayerSnapshot(state.currPlayers[1])],
    shuttle: toShuttleSnapshot(state.currShuttle),
    score: {
      points: [0, 0],
      games: [0, 0],
    },
    server: 0,
    lastEvents: [...state.events],
  });

  installTestHooks({
    getSnapshot: buildSnapshot,
    getEvents: (sinceTick = 0) => state.events.filter((ev) => ev.tick >= sinceTick),
    pause: () => loop.pause(),
    resume: () => loop.resume(),
    step: (ticks: number) => loop.stepManual(ticks),
    setSeed: (seed: number) => {
      state.seed = seed >>> 0;
    },
    spawnShuttle: (p, v) => {
      state.physicsCfg = { ...DEFAULT_PHYSICS_CONFIG };
      launchShuttle(p, v, state.physicsCfg);
    },
    setInput: (player, input, ticks = 1) => {
      const target = state.overrides[player];
      const safeTicks = Number.isFinite(ticks) && ticks > 0 ? Math.floor(ticks) : 0;
      target.remainingTicks = safeTicks;
      target.frame.moveX = input.moveX ?? 0;
      target.frame.jump = input.jump ?? false;
      target.frame.swing = input.swing ?? null;
      target.frame.aim = input.aim ?? 0;
    },
  });

  window.addEventListener(
    'beforeunload',
    () => {
      loop.stop();
      detachKeyboard();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDownSyncDebug);
      shuttleLabGui.dispose();
      debugOverlay.dispose();
      debugDraw.dispose();
      shuttleTrail.dispose();
      shuttleMesh.dispose();
      p1Mesh.dispose();
      p2Mesh.dispose();
      arena.dispose();
    },
    { once: true },
  );

  loop.start();
}

bootstrap();
