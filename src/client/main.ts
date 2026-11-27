import './ui/styles.css';
import { COURT_HALF_LENGTH, DEFAULT_GAME_SPEED, DT, MAX_FRAME_DELTA } from '@shared/config';
import { copyQuatOut, quatIdentity, slerpQuatOut } from '@shared/math/quat';
import { copyOut, length, lerpOut, vec3 } from '@shared/math/vec3';
import { simulateFlight } from '@shared/physics/flight';
import type { PhysicsConfig, ShuttleState } from '@shared/physics/shuttle';
import type { PlayerIndex, Quat, ReadonlyVec3, Vec3 } from '@shared/types';
import { KeyboardInputController, attachKeyboardListeners } from './input/keyboard';
import { GameLoop } from './loop';
import { createSideCamera } from './render/camera';
import { createDebugDraw } from './render/debugDraw';
import { createHitboxDebug } from './render/hitboxDebug';
import { createPlayerMesh } from './render/playerMesh';
import { createArenaScene } from './render/scene';
import { createShuttleMesh } from './render/shuttleMesh';
import { createShuttleTrail } from './render/trail';
import { createSimHost } from './simHost';
import { installTestHooks } from './testHooks';
import {
  createDebugOverlay,
  type DebugOverlayData,
  type DebugOverlayShuttleData,
} from './ui/debugOverlay';
import { createShotPopup } from './ui/shotPopup';
import { createShuttleLabGui } from './ui/shuttleLabGui';

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

  const host = createSimHost();
  const rally = host.rally;
  const shuttle = rally.shuttle;
  let flightElapsedS = 0;

  const arena = createArenaScene(container);
  const p1Mesh = createPlayerMesh(0, 1);
  const p2Mesh = createPlayerMesh(1, -1);
  p1Mesh.setPosition(rally.players[0].x, rally.players[0].y, 0);
  p2Mesh.setPosition(rally.players[1].x, rally.players[1].y, 0);

  const shuttleMesh = createShuttleMesh();
  const shuttleTrail = createShuttleTrail();
  const debugDraw = createDebugDraw();
  debugDraw.setDebugVisible(debugEnabled);
  const hitboxDebug = createHitboxDebug();
  hitboxDebug.setVisible(debugEnabled);
  shuttleMesh.updateTransform(shuttle.pos, shuttle.quat, false);

  arena.scene.add(
    p1Mesh.group,
    p2Mesh.group,
    shuttleMesh.group,
    shuttleMesh.shadowMesh,
    shuttleTrail.line,
    debugDraw.group,
    hitboxDebug.group,
  );

  const sideCamera = createSideCamera(
    container.clientWidth || window.innerWidth,
    container.clientHeight || window.innerHeight,
  );
  const debugOverlay = createDebugOverlay(container, debugEnabled);
  const shotPopup = createShotPopup(container);

  /** Restart the trail, the debug path and the predicted landing ring from the current shuttle. */
  const beginTrackedFlight = (startPos: ReadonlyVec3): void => {
    flightElapsedS = 0;
    shuttleTrail.clear();
    shuttleTrail.recordSample(startPos, 0);
    debugDraw.beginFlight(startPos, computePredictedLanding(shuttle, rally.physicsCfg));
  };

  /** Snap the shuttle mesh and camera to a freshly launched shuttle. */
  const snapShuttleVisuals = (): void => {
    beginTrackedFlight(shuttle.pos);
    shuttleMesh.updateTransform(shuttle.pos, shuttle.quat, true);
    sideCamera.update(shuttle.pos, true, 1.0);
  };

  const launchShuttle = (
    p0: ReadonlyVec3,
    v0: ReadonlyVec3,
    cfg?: Readonly<Partial<PhysicsConfig>>,
  ): void => {
    host.spawnShuttle(p0, v0, cfg);
    snapShuttleVisuals();
  };

  /** Temporary practice toss (ROADMAP Phase 3 item 8): the shuttle rises from the hand of `player`. */
  const launchToss = (player: PlayerIndex): void => {
    host.toss(player);
    snapShuttleVisuals();
  };

  const shuttleLabGui = createShuttleLabGui(debugEnabled, {
    onLaunch: (req) => {
      launchShuttle(req.p0, req.v0, {
        gravityEnabled: req.gravityEnabled,
        dragEnabled: req.dragEnabled,
        collideNet: req.collideNet,
      });
    },
    onReverseVelocity: () => {
      if (shuttle.state !== 'flying') {
        return;
      }
      const prev = host.prevShuttle;
      shuttle.vel.x = -shuttle.vel.x + 0;
      shuttle.vel.y = -shuttle.vel.y + 0;
      shuttle.vel.z = -shuttle.vel.z + 0;
      prev.vel.x = -prev.vel.x + 0;
      prev.vel.y = -prev.vel.y + 0;
      prev.vel.z = -prev.vel.z + 0;
      debugDraw.updatePredictedLanding(computePredictedLanding(shuttle, rally.physicsCfg));
    },
    onClearTrail: () => {
      shuttleTrail.clear();
      debugDraw.clearTrajectory();
    },
    onToggleAutoReturn: (enabled) => {
      rally.autoReturnEnabled = enabled;
    },
    onChangeGameSpeed: (speed) => {
      host.gameSpeed = Number.isFinite(speed) && speed > 0 ? speed : DEFAULT_GAME_SPEED;
    },
    onChangeCameraMode: (mode) => {
      sideCamera.setMode(mode);
      sideCamera.update(shuttle.pos, shuttle.state === 'flying', 1.0);
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

  const onKeyDownExtras = (event: KeyboardEvent): void => {
    if (event.code === 'F3') {
      const visible = debugOverlay.isVisible();
      shuttleLabGui.setVisible(visible);
      debugDraw.setDebugVisible(visible);
      hitboxDebug.setVisible(visible);
    } else if (
      event.code === 'KeyT' &&
      !event.repeat &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      launchToss(0);
    }
  };
  window.addEventListener('keydown', onKeyDownExtras);

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
    p1: { x: rally.players[0].x, y: rally.players[0].y },
    p2: { x: rally.players[1].x, y: rally.players[1].y },
    shuttle: hudShuttleData,
    swings: rally.swings,
  };
  let lastRenderNowMs = 0;

  const loop = new GameLoop({
    onStep: (dtS = DT) => {
      const stepDtS = dtS * host.gameSpeed;
      const wasFlying = shuttle.state === 'flying';
      const events = host.step(stepDtS, keyboard.consumeFrames());

      let flightRestarted = false;
      let landed = false;
      for (const ev of events) {
        if (ev.type === 'hit') {
          shotPopup.show(ev);
          beginTrackedFlight(ev.contact);
          flightRestarted = true;
        } else if (ev.type === 'land') {
          flightElapsedS += ev.subTickFraction * stepDtS;
          debugDraw.markLanding(ev.x, ev.z, Math.abs(ev.x) <= COURT_HALF_LENGTH);
          landed = true;
        }
      }
      if (wasFlying && !flightRestarted) {
        if (!landed) {
          flightElapsedS += stepDtS;
        }
        shuttleTrail.recordSample(shuttle.pos, flightElapsedS);
        debugDraw.recordFlightStep(shuttle.pos, flightElapsedS);
      }
    },
    onRender: (alpha, stats) => {
      const prevPlayers = host.prevPlayers;
      const p1Prev = prevPlayers[0];
      const p1Curr = rally.players[0];
      const p2Prev = prevPlayers[1];
      const p2Curr = rally.players[1];

      p1Mesh.setPosition(
        p1Prev.x + (p1Curr.x - p1Prev.x) * alpha,
        p1Prev.y + (p1Curr.y - p1Prev.y) * alpha,
        0,
      );
      p2Mesh.setPosition(
        p2Prev.x + (p2Curr.x - p2Prev.x) * alpha,
        p2Prev.y + (p2Curr.y - p2Prev.y) * alpha,
        0,
      );

      if (shuttle.state === 'flying') {
        lerpOut(host.prevShuttle.pos, shuttle.pos, alpha, interpShuttlePos);
        slerpQuatOut(host.prevShuttle.quat, shuttle.quat, alpha, interpShuttleQuat);
      } else {
        copyOut(shuttle.pos, interpShuttlePos);
        copyQuatOut(shuttle.quat, interpShuttleQuat);
      }
      shuttleMesh.updateTransform(interpShuttlePos, interpShuttleQuat, shuttle.state !== 'idle');

      const nowMs = performance.now();
      const rawRenderDtS = lastRenderNowMs > 0 ? (nowMs - lastRenderNowMs) / 1000 : DT;
      lastRenderNowMs = nowMs;
      const cameraDtS = stats.paused ? 1.0 : Math.min(MAX_FRAME_DELTA, Math.max(DT, rawRenderDtS));
      sideCamera.update(interpShuttlePos, shuttle.state === 'flying', cameraDtS);
      hitboxDebug.update(rally);
      shotPopup.update(Math.min(MAX_FRAME_DELTA, rawRenderDtS));

      arena.renderer.render(arena.scene, sideCamera.camera);

      overlayData.tick = rally.tick;
      overlayData.stats = stats;
      overlayData.p1.x = p1Curr.x;
      overlayData.p1.y = p1Curr.y;
      overlayData.p2.x = p2Curr.x;
      overlayData.p2.y = p2Curr.y;
      hudShuttleData.x = shuttle.pos.x;
      hudShuttleData.y = shuttle.pos.y;
      hudShuttleData.speedMs = length(shuttle.vel);
      hudShuttleData.state = shuttle.state;
      debugOverlay.update(overlayData);
    },
  });

  installTestHooks({
    getSnapshot: () => host.snapshot(),
    getEvents: (sinceTick) => host.getEvents(sinceTick),
    pause: () => loop.pause(),
    resume: () => loop.resume(),
    step: (ticks: number) => loop.stepManual(ticks),
    setSeed: (seed: number) => host.setSeed(seed),
    spawnShuttle: (p, v) => launchShuttle(p, v),
    tossShuttle: launchToss,
    setPlayerX: (player, x) => host.setPlayerX(player, x),
    setInput: (player, input, ticks) => host.setInput(player, input, ticks),
  });

  window.addEventListener(
    'beforeunload',
    () => {
      loop.stop();
      detachKeyboard();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDownExtras);
      shuttleLabGui.dispose();
      shotPopup.dispose();
      debugOverlay.dispose();
      hitboxDebug.dispose();
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
