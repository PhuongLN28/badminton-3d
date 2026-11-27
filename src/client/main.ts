import './ui/styles.css';
import { DEFAULT_RNG_SEED } from '@shared/config';
import type { SimEvent, TestSnapshot } from '@shared/types';
import { GameLoop } from './loop';
import { createSideCamera } from './render/camera';
import { createArenaScene } from './render/scene';
import { installTestHooks } from './testHooks';
import { createDebugOverlay } from './ui/debugOverlay';

interface Phase0SimState {
  tick: number;
  seed: number;
  events: SimEvent[];
}

function createInitialSnapshot(state: Phase0SimState): TestSnapshot {
  return {
    phase: 'MENU',
    tick: state.tick,
    players: [
      {
        x: -2.6,
        y: 0,
        vx: 0,
        vy: 0,
        facing: 1,
        grounded: true,
        swingState: 'READY',
      },
      {
        x: 2.6,
        y: 0,
        vx: 0,
        vy: 0,
        facing: -1,
        grounded: true,
        swingState: 'READY',
      },
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
    lastEvents: state.events,
  };
}

function bootstrap(): void {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('Missing #app mount container');
  }

  const params = new URLSearchParams(window.location.search);
  const debugEnabled = params.get('debug') === '1';

  const state: Phase0SimState = {
    tick: 0,
    seed: DEFAULT_RNG_SEED,
    events: [],
  };

  const snapshot = createInitialSnapshot(state);
  const arena = createArenaScene(container);
  const sideCamera = createSideCamera(
    container.clientWidth || window.innerWidth,
    container.clientHeight || window.innerHeight,
  );
  const debugOverlay = createDebugOverlay(container, debugEnabled);

  const onResize = (): void => {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    arena.resize(width, height);
    sideCamera.resize(width, height);
  };
  window.addEventListener('resize', onResize);

  const overlayData = {
    tick: 0,
    phase: snapshot.phase,
    stats: {
      fps: 0,
      lastStepMs: 0,
      alpha: 0,
      paused: false,
    },
  };

  const loop = new GameLoop({
    onStep: () => {
      state.tick += 1;
    },
    onRender: (_alpha, stats) => {
      arena.renderer.render(arena.scene, sideCamera.camera);
      overlayData.tick = state.tick;
      overlayData.phase = snapshot.phase;
      overlayData.stats = stats;
      debugOverlay.update(overlayData);
    },
  });

  installTestHooks({
    getSnapshot: () => ({
      ...snapshot,
      tick: state.tick,
      lastEvents: [...state.events],
    }),
    getEvents: (sinceTick = 0) => state.events.filter((ev) => ev.tick >= sinceTick),
    pause: () => loop.pause(),
    resume: () => loop.resume(),
    step: (ticks: number) => loop.stepManual(ticks),
    setSeed: (seed: number) => {
      state.seed = seed >>> 0;
    },
  });

  loop.start();
}

bootstrap();
