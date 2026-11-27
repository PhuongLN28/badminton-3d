import { KMH_PER_MS } from '@shared/config';
import type { MatchPhase, SwingKind, SwingPhase } from '@shared/types';
import type { LoopStats } from '../loop';
import { VI } from './i18n/vi';

/** Shuttle telemetry fields rendered by the debug overlay. */
export interface DebugOverlayShuttleData {
  x: number;
  y: number;
  speedMs: number;
  state: 'idle' | 'flying' | 'grounded';
}

/** Swing telemetry of one player; a swing state (`phase`, `kind`) satisfies it structurally. */
export interface DebugOverlaySwingData {
  phase: SwingPhase;
  kind: SwingKind | null;
}

/** Telemetry fields rendered by the debug overlay. */
export interface DebugOverlayData {
  tick: number;
  phase: MatchPhase;
  stats: Readonly<LoopStats>;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  shuttle?: DebugOverlayShuttleData | undefined;
  /** Swing phase and kind of P1 and P2; omitted until a rally sim provides them. */
  swings?: readonly [Readonly<DebugOverlaySwingData>, Readonly<DebugOverlaySwingData>] | undefined;
}

/** "<phase> · <kind>" text of a swing; the kind is omitted while READY. Runs only when the swing changes. */
function formatSwing(swing: Readonly<DebugOverlaySwingData>): string {
  const phaseText = VI.debug.swingPhases[swing.phase];
  return swing.kind === null ? phaseText : `${phaseText} · ${VI.debug.swingKinds[swing.kind]}`;
}

/** DOM debug overlay controller toggled via `?debug=1` or `F3`. */
export interface DebugOverlay {
  isVisible(): boolean;
  setVisible(visible: boolean): void;
  update(data: DebugOverlayData): void;
  dispose(): void;
}

/**
 * Create the debug HUD overlay showing FPS, simulation tick, step duration, and alpha.
 * @param container Parent element to attach the overlay onto.
 * @param initialVisible Whether overlay starts visible (e.g. `?debug=1`).
 */
export function createDebugOverlay(container: HTMLElement, initialVisible: boolean): DebugOverlay {
  const root = document.createElement('aside');
  root.className = initialVisible ? 'debug-overlay' : 'debug-overlay debug-overlay--hidden';
  root.setAttribute('data-testid', 'debug-overlay');

  const header = document.createElement('div');
  header.className = 'debug-overlay__header';

  const titleEl = document.createElement('span');
  titleEl.textContent = VI.debug.title;

  const badgeEl = document.createElement('span');
  badgeEl.textContent = VI.debug.runningBadge;

  header.append(titleEl, badgeEl);
  root.appendChild(header);

  const createRow = (labelText: string, testId: string, initialText = '0'): HTMLSpanElement => {
    const row = document.createElement('div');
    row.className = 'debug-overlay__row';

    const label = document.createElement('span');
    label.className = 'debug-overlay__label';
    label.textContent = labelText;

    const value = document.createElement('span');
    value.className = 'debug-overlay__value';
    value.setAttribute('data-testid', testId);
    value.textContent = initialText;

    row.append(label, value);
    root.appendChild(row);
    return value;
  };

  const fpsVal = createRow(VI.debug.fpsLabel, 'debug-fps');
  const tickVal = createRow(VI.debug.tickLabel, 'debug-tick');
  const stepMsVal = createRow(VI.debug.stepMsLabel, 'debug-step-ms');
  const alphaVal = createRow(VI.debug.alphaLabel, 'debug-alpha');
  const phaseVal = createRow(VI.debug.phaseLabel, 'debug-phase');
  const p1Val = createRow(VI.debug.p1PosLabel, 'debug-p1');
  const p2Val = createRow(VI.debug.p2PosLabel, 'debug-p2');
  const shuttlePosVal = createRow(VI.debug.shuttlePosLabel, 'debug-shuttle-pos', '—');
  const shuttleSpeedVal = createRow(VI.debug.shuttleSpeedLabel, 'debug-shuttle-speed', '—');
  const shuttleStateVal = createRow(VI.debug.shuttleStateLabel, 'debug-shuttle-state', '—');
  const swingP1Val = createRow(VI.debug.swingP1Label, 'debug-swing-p1', VI.debug.swingNone);
  const swingP2Val = createRow(VI.debug.swingP2Label, 'debug-swing-p2', VI.debug.swingNone);

  container.appendChild(root);

  let visible = initialVisible;
  let lastBadge = '';
  let lastFps = '';
  let lastTick = -1;
  let lastStepMs = '';
  let lastAlpha = '';
  let lastPhase = '';
  let lastP1 = '';
  let lastP2 = '';
  let lastShuttlePos = '';
  let lastShuttleSpeed = '';
  let lastShuttleState = '';
  let lastSwingP1Phase: SwingPhase | null = null;
  let lastSwingP1Kind: SwingKind | null = null;
  let lastSwingP2Phase: SwingPhase | null = null;
  let lastSwingP2Kind: SwingKind | null = null;

  const setVisible = (nextVisible: boolean): void => {
    visible = nextVisible;
    root.classList.toggle('debug-overlay--hidden', !visible);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'F3') {
      event.preventDefault();
      setVisible(!visible);
    }
  };

  window.addEventListener('keydown', onKeyDown, true);

  const update = (data: DebugOverlayData): void => {
    if (!visible) {
      return;
    }

    const nextBadge = data.stats.paused ? VI.debug.pausedBadge : VI.debug.runningBadge;
    if (nextBadge !== lastBadge) {
      lastBadge = nextBadge;
      badgeEl.textContent = nextBadge;
    }

    const nextFps = data.stats.fps.toFixed(1);
    if (nextFps !== lastFps) {
      lastFps = nextFps;
      fpsVal.textContent = nextFps;
    }

    if (data.tick !== lastTick) {
      lastTick = data.tick;
      tickVal.textContent = String(data.tick);
    }

    const nextStepMs = `${data.stats.lastStepMs.toFixed(3)} ms`;
    if (nextStepMs !== lastStepMs) {
      lastStepMs = nextStepMs;
      stepMsVal.textContent = nextStepMs;
    }

    const nextAlpha = data.stats.alpha.toFixed(3);
    if (nextAlpha !== lastAlpha) {
      lastAlpha = nextAlpha;
      alphaVal.textContent = nextAlpha;
    }

    if (data.phase !== lastPhase) {
      lastPhase = data.phase;
      phaseVal.textContent = data.phase;
    }

    const nextP1 = `${data.p1.x.toFixed(2)}, ${data.p1.y.toFixed(2)}`;
    if (nextP1 !== lastP1) {
      lastP1 = nextP1;
      p1Val.textContent = nextP1;
    }

    const nextP2 = `${data.p2.x.toFixed(2)}, ${data.p2.y.toFixed(2)}`;
    if (nextP2 !== lastP2) {
      lastP2 = nextP2;
      p2Val.textContent = nextP2;
    }

    const shuttle = data.shuttle;
    const nextShuttlePos = shuttle ? `${shuttle.x.toFixed(2)}, ${shuttle.y.toFixed(2)}` : '—';
    if (nextShuttlePos !== lastShuttlePos) {
      lastShuttlePos = nextShuttlePos;
      shuttlePosVal.textContent = nextShuttlePos;
    }

    const nextShuttleSpeed = shuttle
      ? `${shuttle.speedMs.toFixed(1)} m/s (${(shuttle.speedMs * KMH_PER_MS).toFixed(0)} km/h)`
      : '—';
    if (nextShuttleSpeed !== lastShuttleSpeed) {
      lastShuttleSpeed = nextShuttleSpeed;
      shuttleSpeedVal.textContent = nextShuttleSpeed;
    }

    const nextShuttleState = shuttle ? VI.debug.shuttleStates[shuttle.state] : '—';
    if (nextShuttleState !== lastShuttleState) {
      lastShuttleState = nextShuttleState;
      shuttleStateVal.textContent = nextShuttleState;
    }

    const swings = data.swings;
    const swing1 = swings?.[0];
    if (swing1 === undefined) {
      if (lastSwingP1Phase !== null) {
        lastSwingP1Phase = null;
        lastSwingP1Kind = null;
        swingP1Val.textContent = VI.debug.swingNone;
      }
    } else if (swing1.phase !== lastSwingP1Phase || swing1.kind !== lastSwingP1Kind) {
      lastSwingP1Phase = swing1.phase;
      lastSwingP1Kind = swing1.kind;
      swingP1Val.textContent = formatSwing(swing1);
    }

    const swing2 = swings?.[1];
    if (swing2 === undefined) {
      if (lastSwingP2Phase !== null) {
        lastSwingP2Phase = null;
        lastSwingP2Kind = null;
        swingP2Val.textContent = VI.debug.swingNone;
      }
    } else if (swing2.phase !== lastSwingP2Phase || swing2.kind !== lastSwingP2Kind) {
      lastSwingP2Phase = swing2.phase;
      lastSwingP2Kind = swing2.kind;
      swingP2Val.textContent = formatSwing(swing2);
    }
  };

  const dispose = (): void => {
    window.removeEventListener('keydown', onKeyDown, true);
    root.remove();
  };

  return {
    isVisible: () => visible,
    setVisible,
    update,
    dispose,
  };
}
