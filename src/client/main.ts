import './ui/styles.css';
import { DEFAULT_RNG_SEED, DT } from '@shared/config';
import {
  copyPlayerState,
  createPlayerState,
  stepPlayer,
  toPlayerSnapshot,
  type PlayerState,
} from '@shared/player/playerSim';
import type { InputFrame, PlayerIndex, SimEvent, TestSnapshot } from '@shared/types';
import { KeyboardInputController, attachKeyboardListeners } from './input/keyboard';
import { GameLoop } from './loop';
import { createSideCamera } from './render/camera';
import { createPlayerMesh } from './render/playerMesh';
import { createArenaScene } from './render/scene';
import { installTestHooks } from './testHooks';
import { createDebugOverlay } from './ui/debugOverlay';

interface InputOverride {
  remainingTicks: number;
  readonly frame: InputFrame;
}

interface Phase1SimState {
  tick: number;
  seed: number;
  events: SimEvent[];
  prevPlayers: [PlayerState, PlayerState];
  currPlayers: [PlayerState, PlayerState];
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

function bootstrap(): void {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('Missing #app mount container');
  }

  const params = new URLSearchParams(window.location.search);
  const debugEnabled = params.get('debug') === '1';

  const state: Phase1SimState = {
    tick: 0,
    seed: DEFAULT_RNG_SEED,
    events: [],
    prevPlayers: [createPlayerState(0), createPlayerState(1)],
    currPlayers: [createPlayerState(0), createPlayerState(1)],
    overrides: [createInputOverride(), createInputOverride()],
  };

  const arena = createArenaScene(container);
  const p1Mesh = createPlayerMesh(0, 1);
  const p2Mesh = createPlayerMesh(1, -1);
  p1Mesh.setPosition(state.currPlayers[0].x, state.currPlayers[0].y, 0);
  p2Mesh.setPosition(state.currPlayers[1].x, state.currPlayers[1].y, 0);
  arena.scene.add(p1Mesh.group, p2Mesh.group);

  const sideCamera = createSideCamera(
    container.clientWidth || window.innerWidth,
    container.clientHeight || window.innerHeight,
  );
  const debugOverlay = createDebugOverlay(container, debugEnabled);

  const keyboard = new KeyboardInputController();
  const detachKeyboard = attachKeyboardListeners(window, keyboard, document);

  const onResize = (): void => {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    arena.resize(width, height);
    sideCamera.resize(width, height);
  };
  window.addEventListener('resize', onResize);

  const overlayData = {
    tick: 0,
    phase: 'RALLY' as const,
    stats: {
      fps: 0,
      lastStepMs: 0,
      alpha: 0,
      paused: false,
    },
    p1: { x: state.currPlayers[0].x, y: state.currPlayers[0].y },
    p2: { x: state.currPlayers[1].x, y: state.currPlayers[1].y },
  };

  const loop = new GameLoop({
    onStep: (dtS = DT) => {
      const keyboardFrames = keyboard.consumeFrames();
      copyPlayerState(state.prevPlayers[0], state.currPlayers[0]);
      copyPlayerState(state.prevPlayers[1], state.currPlayers[1]);

      const input0 = resolvePlayerInput(0, keyboardFrames, state.overrides);
      const input1 = resolvePlayerInput(1, keyboardFrames, state.overrides);

      stepPlayer(state.currPlayers[0], input0, dtS);
      stepPlayer(state.currPlayers[1], input1, dtS);
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

      arena.renderer.render(arena.scene, sideCamera.camera);

      overlayData.tick = state.tick;
      overlayData.stats = stats;
      overlayData.p1.x = p1Curr.x;
      overlayData.p1.y = p1Curr.y;
      overlayData.p2.x = p2Curr.x;
      overlayData.p2.y = p2Curr.y;
      debugOverlay.update(overlayData);
    },
  });

  const buildSnapshot = (): TestSnapshot => ({
    phase: 'RALLY',
    tick: state.tick,
    players: [
      toPlayerSnapshot(state.currPlayers[0]),
      toPlayerSnapshot(state.currPlayers[1]),
    ],
    shuttle: {
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      state: 'idle',
    },
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
      debugOverlay.dispose();
      p1Mesh.dispose();
      p2Mesh.dispose();
      arena.dispose();
    },
    { once: true },
  );

  loop.start();
}

bootstrap();
