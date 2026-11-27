import * as THREE from 'three';
import { SHUTTLE_TRAIL_DURATION_S } from '@shared/config';
import type { ReadonlyVec3 } from '@shared/types';

const MAX_TRAIL_SAMPLES = 96;
const TRAIL_HEAD_COLOR_HEX = 0xe0f2fe;
const TRAIL_MID_COLOR_HEX = 0x0284c7;
const TRAIL_MID_SPLIT_RATIO = 0.45;

/** Managed Three.js short fading flight ribbon behind the shuttlecock. */
export interface ShuttleTrailHandle {
  readonly line: THREE.Line;
  /**
   * Append a shuttle position sample and refresh active trail vertices within
   * `SHUTTLE_TRAIL_DURATION_S` without allocating objects.
   * @param pos World position in meters.
   * @param timeS Monotonic sample timestamp in seconds.
   */
  recordSample(pos: ReadonlyVec3, timeS: number): void;
  /** Reset all recorded trail samples immediately. */
  clear(): void;
  /** Release GPU buffer geometry and material resources. */
  dispose(): void;
}

/**
 * Create a pre-allocated fading flight ribbon covering the most recent `SHUTTLE_TRAIL_DURATION_S` (0.3 s).
 */
export function createShuttleTrail(): ShuttleTrailHandle {
  const ringX = new Float64Array(MAX_TRAIL_SAMPLES);
  const ringY = new Float64Array(MAX_TRAIL_SAMPLES);
  const ringZ = new Float64Array(MAX_TRAIL_SAMPLES);
  const ringTimeS = new Float64Array(MAX_TRAIL_SAMPLES);

  let head = 0;
  let count = 0;
  let lastSampleTimeS = Number.NaN;

  const positions = new Float32Array(MAX_TRAIL_SAMPLES * 3);
  const colors = new Float32Array(MAX_TRAIL_SAMPLES * 3);

  const headColor = new THREE.Color(TRAIL_HEAD_COLOR_HEX);
  const midColor = new THREE.Color(TRAIL_MID_COLOR_HEX);

  const geometry = new THREE.BufferGeometry();
  const positionAttr = new THREE.BufferAttribute(positions, 3);
  positionAttr.setUsage(THREE.DynamicDrawUsage);
  const colorAttr = new THREE.BufferAttribute(colors, 3);
  colorAttr.setUsage(THREE.DynamicDrawUsage);

  geometry.setAttribute('position', positionAttr);
  geometry.setAttribute('color', colorAttr);
  geometry.setDrawRange(0, 0);

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const line = new THREE.Line(geometry, material);
  line.name = 'ShuttleFlightTrail';
  line.frustumCulled = false;
  line.visible = false;

  const clear = (): void => {
    head = 0;
    count = 0;
    lastSampleTimeS = Number.NaN;
    geometry.setDrawRange(0, 0);
    line.visible = false;
  };

  const recordSample = (pos: ReadonlyVec3, timeS: number): void => {
    if (
      !Number.isFinite(pos.x) ||
      !Number.isFinite(pos.y) ||
      !Number.isFinite(pos.z) ||
      !Number.isFinite(timeS)
    ) {
      return;
    }

    if (Number.isFinite(lastSampleTimeS) && timeS < lastSampleTimeS) {
      head = 0;
      count = 0;
    }
    lastSampleTimeS = timeS;

    ringX[head] = pos.x;
    ringY[head] = pos.y;
    ringZ[head] = pos.z;
    ringTimeS[head] = timeS;
    head = (head + 1) % MAX_TRAIL_SAMPLES;
    if (count < MAX_TRAIL_SAMPLES) {
      count += 1;
    }

    const cutoffTimeS = timeS - SHUTTLE_TRAIL_DURATION_S;
    const oldestIdx = (head - count + MAX_TRAIL_SAMPLES) % MAX_TRAIL_SAMPLES;
    const invDuration = SHUTTLE_TRAIL_DURATION_S > 0 ? 1 / SHUTTLE_TRAIL_DURATION_S : 1;

    let activeCount = 0;
    for (let i = 0; i < count; i += 1) {
      const idx = (oldestIdx + i) % MAX_TRAIL_SAMPLES;
      const sampleTime = ringTimeS[idx] ?? timeS;
      if (sampleTime < cutoffTimeS) {
        continue;
      }

      const ageS = timeS - sampleTime;
      const life =
        SHUTTLE_TRAIL_DURATION_S > 0 ? Math.max(0, Math.min(1, 1 - ageS * invDuration)) : 1;

      const outBase = activeCount * 3;
      positions[outBase] = ringX[idx] ?? 0;
      positions[outBase + 1] = ringY[idx] ?? 0;
      positions[outBase + 2] = ringZ[idx] ?? 0;

      if (life >= TRAIL_MID_SPLIT_RATIO) {
        const t = (life - TRAIL_MID_SPLIT_RATIO) / (1 - TRAIL_MID_SPLIT_RATIO);
        colors[outBase] = midColor.r + (headColor.r - midColor.r) * t;
        colors[outBase + 1] = midColor.g + (headColor.g - midColor.g) * t;
        colors[outBase + 2] = midColor.b + (headColor.b - midColor.b) * t;
      } else {
        const t = life / TRAIL_MID_SPLIT_RATIO;
        colors[outBase] = midColor.r * t;
        colors[outBase + 1] = midColor.g * t;
        colors[outBase + 2] = midColor.b * t;
      }

      activeCount += 1;
    }

    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    geometry.setDrawRange(0, activeCount);
    line.visible = activeCount >= 2;
  };

  const dispose = (): void => {
    geometry.dispose();
    material.dispose();
  };

  return {
    line,
    recordSample,
    clear,
    dispose,
  };
}
