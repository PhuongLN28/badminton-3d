/** Deterministic pseudo-random generator interface returning values in [0, 1). */
export interface SeededRng {
  /** Return next uniform float in [0, 1). */
  next(): number;
  /** Return next uniform float in [min, max). */
  range(min: number, max: number): number;
  /** Return next uniform integer in [minInclusive, maxInclusive]. */
  int(minInclusive: number, maxInclusive: number): number;
}

/**
 * Create a deterministic mulberry32 generator function yielding floats in [0, 1).
 * @param seed 32-bit integer seed.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a structured seeded RNG wrapper using mulberry32.
 * @param seed 32-bit integer seed.
 */
export function createRng(seed: number): SeededRng {
  const nextFn = mulberry32(seed);
  return {
    next: nextFn,
    range(min: number, max: number): number {
      return min + (max - min) * nextFn();
    },
    int(minInclusive: number, maxInclusive: number): number {
      const span = maxInclusive - minInclusive + 1;
      return minInclusive + Math.floor(nextFn() * span);
    },
  };
}
