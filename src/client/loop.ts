import { ACCUMULATOR_EPSILON, DT, MAX_FRAME_DELTA } from '@shared/config';

/** Result of consuming fixed simulation steps from a frame delta. */
export interface AccumulatorStepResult {
  ticks: number;
  accumulatorS: number;
  alpha: number;
}

/** Live loop timing telemetry passed to render and debug overlay without allocations. */
export interface LoopStats {
  fps: number;
  lastStepMs: number;
  alpha: number;
  paused: boolean;
}

/** Options for configuring the 120 Hz fixed-timestep GameLoop. */
export interface GameLoopOptions {
  /** Fixed simulation tick callback (receives step duration in seconds). */
  onStep: (dtS: number) => void;
  /** Per-frame render callback (receives interpolation alpha in [0, 1) and reusable stats). */
  onRender: (alpha: number, stats: Readonly<LoopStats>) => void;
  /** Automatically pause when browser tab becomes hidden (default true). */
  autoPauseOnHide?: boolean;
}

/**
 * Advance a fixed-timestep accumulator by `frameDeltaS` and compute how many ticks to execute.
 * Pure function exported for deterministic unit testing (`P0-U01`..`P0-U03`).
 *
 * @param accumulatorS Current unconsumed time in seconds.
 * @param frameDeltaS Elapsed frame delta in seconds.
 * @param dtS Fixed simulation step duration in seconds (default `1/120 s`).
 * @param maxFrameDeltaS Maximum delta clamp in seconds (default `0.1 s`).
 */
export function stepAccumulator(
  accumulatorS: number,
  frameDeltaS: number,
  dtS = DT,
  maxFrameDeltaS = MAX_FRAME_DELTA,
): AccumulatorStepResult {
  const safeDt = Number.isFinite(dtS) && dtS > 0 ? dtS : DT;
  const safeMaxDelta = Number.isFinite(maxFrameDeltaS) && maxFrameDeltaS > 0
    ? maxFrameDeltaS
    : MAX_FRAME_DELTA;
  const safeAcc = Number.isFinite(accumulatorS) && accumulatorS > 0 ? accumulatorS : 0;
  const rawDelta = Number.isFinite(frameDeltaS) && frameDeltaS > 0 ? frameDeltaS : 0;
  const clampedDelta = rawDelta > safeMaxDelta ? safeMaxDelta : rawDelta;

  let acc = safeAcc + clampedDelta;
  let ticks = 0;

  while (acc + ACCUMULATOR_EPSILON >= safeDt) {
    acc -= safeDt;
    ticks += 1;
  }

  if (acc < 0) {
    acc = 0;
  }

  const rawAlpha = acc / safeDt;
  const alpha = rawAlpha >= 1 ? 1 - Number.EPSILON : rawAlpha < 0 ? 0 : rawAlpha;

  return {
    ticks,
    accumulatorS: acc,
    alpha,
  };
}

/** 120 Hz fixed-timestep game loop driven by `requestAnimationFrame`. */
export class GameLoop {
  private readonly onStep: (dtS: number) => void;
  private readonly onRender: (alpha: number, stats: Readonly<LoopStats>) => void;
  private readonly autoPauseOnHide: boolean;

  private rafId: number | null = null;
  private running = false;
  private paused = false;
  private lastTimestampMs = 0;
  private accumulatorS = 0;

  private fpsWindowS = 0;
  private fpsFrames = 0;
  private readonly stats: LoopStats = {
    fps: 0,
    lastStepMs: 0,
    alpha: 0,
    paused: false,
  };

  private readonly handleVisibilityChange = (): void => {
    if (this.autoPauseOnHide && typeof document !== 'undefined' && document.hidden) {
      this.pause();
    }
  };

  private readonly tickFrame = (nowMs: number): void => {
    if (!this.running) {
      return;
    }

    if (this.lastTimestampMs === 0) {
      this.lastTimestampMs = nowMs;
    }

    const frameDeltaS = Math.max(0, (nowMs - this.lastTimestampMs) / 1000);
    this.lastTimestampMs = nowMs;

    this.fpsFrames += 1;
    this.fpsWindowS += frameDeltaS;
    if (this.fpsWindowS >= 0.5) {
      this.stats.fps = this.fpsFrames / this.fpsWindowS;
      this.fpsFrames = 0;
      this.fpsWindowS = 0;
    }

    if (!this.paused) {
      const result = stepAccumulator(this.accumulatorS, frameDeltaS, DT, MAX_FRAME_DELTA);
      this.accumulatorS = result.accumulatorS;
      this.stats.alpha = result.alpha;

      const stepStartMs = performance.now();
      for (let i = 0; i < result.ticks; i += 1) {
        this.runStepSafe(DT);
      }
      this.stats.lastStepMs = result.ticks > 0 ? performance.now() - stepStartMs : 0;
    } else {
      this.stats.lastStepMs = 0;
    }

    this.stats.paused = this.paused;
    this.runRenderSafe(this.stats.alpha);

    if (this.running) {
      this.rafId = requestAnimationFrame(this.tickFrame);
    }
  };

  public constructor(options: GameLoopOptions) {
    this.onStep = options.onStep;
    this.onRender = options.onRender;
    this.autoPauseOnHide = options.autoPauseOnHide ?? true;
  }

  /** Start the animation frame loop. */
  public start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.lastTimestampMs = 0;
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.rafId = requestAnimationFrame(this.tickFrame);
  }

  /** Stop the animation frame loop and detach listeners. */
  public stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  /** Pause fixed simulation stepping (rendering continues). */
  public pause(): void {
    this.paused = true;
    this.stats.paused = true;
  }

  /** Resume fixed simulation stepping without catching up pause duration. */
  public resume(): void {
    this.paused = false;
    this.stats.paused = false;
    this.accumulatorS = 0;
    this.lastTimestampMs = 0;
  }

  /** Whether simulation stepping is currently paused. */
  public isPaused(): boolean {
    return this.paused;
  }

  /** Execute `ticks` simulation steps immediately and render one frame (used by test hooks). */
  public stepManual(ticks: number): void {
    if (!Number.isFinite(ticks) || ticks <= 0) {
      return;
    }
    const count = Math.floor(ticks);
    const startMs = performance.now();
    for (let i = 0; i < count; i += 1) {
      this.runStepSafe(DT);
    }
    this.stats.lastStepMs = performance.now() - startMs;
    this.stats.alpha = 0;
    this.runRenderSafe(0);
  }

  /** Return current reusable timing telemetry snapshot. */
  public getStats(): Readonly<LoopStats> {
    return this.stats;
  }

  private runStepSafe(dtS: number): void {
    try {
      this.onStep(dtS);
    } catch (err) {
      console.warn('[GameLoop] Simulation step error recovered:', err);
    }
  }

  private runRenderSafe(alpha: number): void {
    try {
      this.onRender(alpha, this.stats);
    } catch (err) {
      console.warn('[GameLoop] Render error recovered:', err);
    }
  }
}
