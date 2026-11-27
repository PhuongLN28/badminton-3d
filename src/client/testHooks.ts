import type {
  BadmintonTestHooks,
  InputFrame,
  MatchConfig,
  PlayerIndex,
  SimEvent,
  TestSnapshot,
  Vec3,
} from '@shared/types';

declare global {
  interface Window {
    __BADMINTON__?: BadmintonTestHooks;
  }
}

/** Determine whether `window.__BADMINTON__` should be exposed per AGENTS.md §5.8. */
export function shouldEnableTestHooks(isDev: boolean, search: string): boolean {
  if (isDev) {
    return true;
  }
  const params = new URLSearchParams(search);
  return params.get('test') === '1';
}

/** Adapter supplied by the client runtime to power `window.__BADMINTON__`. */
export interface TestHooksContext {
  getSnapshot(): TestSnapshot;
  getEvents(sinceTick?: number): SimEvent[];
  pause(): void;
  resume(): void;
  step(ticks: number): void;
  setSeed(seed: number): void;
  startMatch?(cfg: Partial<MatchConfig>): void;
  spawnShuttle?(p: Vec3, v: Vec3): void;
  forceLanding?(x: number): void;
  setInput?(player: PlayerIndex, input: Partial<InputFrame>, ticks?: number): void;
}

/**
 * Attach deterministic automated testing hooks onto `window.__BADMINTON__` when permitted.
 * @returns `true` if hooks were installed, `false` otherwise.
 */
export function installTestHooks(
  context: TestHooksContext,
  isDev: boolean = import.meta.env.DEV,
  search: string = window.location.search,
): boolean {
  if (!shouldEnableTestHooks(isDev, search)) {
    return false;
  }

  const hooks: BadmintonTestHooks = {
    getState: () => context.getSnapshot(),
    getEvents: (sinceTick?: number) => context.getEvents(sinceTick),
    pause: () => context.pause(),
    resume: () => context.resume(),
    step: (ticks: number) => context.step(ticks),
    setSeed: (seed: number) => context.setSeed(seed),
    startMatch: (cfg: Partial<MatchConfig>) => {
      context.startMatch?.(cfg);
    },
    spawnShuttle: (p: Vec3, v: Vec3) => {
      context.spawnShuttle?.(p, v);
    },
    forceLanding: (x: number) => {
      context.forceLanding?.(x);
    },
    setInput: (player: PlayerIndex, input: Partial<InputFrame>, ticks?: number) => {
      context.setInput?.(player, input, ticks);
    },
  };

  window.__BADMINTON__ = hooks;
  return true;
}
