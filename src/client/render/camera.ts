import * as THREE from 'three';
import {
  CAMERA_CLOSEUP_OFFSET,
  CAMERA_DAMPING_RATE,
  CAMERA_DEFAULT_LOOK_AT,
  CAMERA_DEFAULT_POS,
  CAMERA_FAR,
  CAMERA_FOV_DEG,
  CAMERA_HIGH_SHUTTLE_Y,
  CAMERA_HIGH_SHUTTLE_Z,
  CAMERA_LOOK_Y_MAX,
  CAMERA_LOOK_Y_SHUTTLE_FACTOR,
  CAMERA_MIN_VISIBLE_HALF_X,
  CAMERA_NEAR,
} from '@shared/config';
import type { ReadonlyVec3 } from '@shared/types';

/** Camera viewing mode for side-view match play or close-up shuttle inspection. */
export type CameraViewMode = 'side' | 'closeup';

const CLOSEUP_MIN_CAM_Y_M = 0.45;
const CLOSEUP_MIN_LOOK_Y_M = 0.25;

/** Managed side-view perspective camera and dynamic tracking helper. */
export interface SideCameraController {
  readonly camera: THREE.PerspectiveCamera;
  /** Recompute aspect ratio and pullback distance so court width stays visible without distortion. */
  resize(widthPx: number, heightPx: number): void;
  /** Switch between dynamic `'side'` match view and `'closeup'` shuttle inspection view. */
  setMode(mode: CameraViewMode): void;
  /** Return active camera viewing mode. */
  getMode(): CameraViewMode;
  /**
   * Update camera position and look-at target for the current frame without heap allocations.
   * @param shuttlePos Current shuttlecock world position in meters.
   * @param shuttleActive True while the shuttlecock is actively in flight.
   * @param frameDtS Elapsed render frame delta in seconds.
   */
  update(shuttlePos: ReadonlyVec3, shuttleActive: boolean, frameDtS: number): void;
}

/**
 * Create side-view PerspectiveCamera centered on the court per GAME_SPEC §10.5.
 * @param widthPx Initial viewport width in CSS pixels.
 * @param heightPx Initial viewport height in CSS pixels.
 */
export function createSideCamera(widthPx: number, heightPx: number): SideCameraController {
  const safeHeight = Math.max(1, heightPx);
  const aspect = Math.max(0.1, widthPx / safeHeight);
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, aspect, CAMERA_NEAR, CAMERA_FAR);

  const currentLookAt = new THREE.Vector3(
    CAMERA_DEFAULT_LOOK_AT.x,
    CAMERA_DEFAULT_LOOK_AT.y,
    CAMERA_DEFAULT_LOOK_AT.z,
  );
  const targetPos = new THREE.Vector3(
    CAMERA_DEFAULT_POS.x,
    CAMERA_DEFAULT_POS.y,
    CAMERA_DEFAULT_POS.z,
  );
  const targetLookAt = new THREE.Vector3(
    CAMERA_DEFAULT_LOOK_AT.x,
    CAMERA_DEFAULT_LOOK_AT.y,
    CAMERA_DEFAULT_LOOK_AT.z,
  );

  let mode: CameraViewMode = 'side';
  let minAspectDistanceZ: number = CAMERA_DEFAULT_POS.z;
  let highShuttleActive = false;

  camera.position.set(CAMERA_DEFAULT_POS.x, CAMERA_DEFAULT_POS.y, CAMERA_DEFAULT_POS.z);
  camera.lookAt(currentLookAt);

  const halfVerticalRad = (CAMERA_FOV_DEG * Math.PI) / 360;
  const tanHalfVertical = Math.tan(halfVerticalRad);

  const resize = (nextWidthPx: number, nextHeightPx: number): void => {
    const h = Math.max(1, nextHeightPx);
    const nextAspect = Math.max(0.1, nextWidthPx / h);
    camera.aspect = nextAspect;

    const tanHalfHorizontal = tanHalfVertical * nextAspect;
    const minDistanceForCourt = CAMERA_MIN_VISIBLE_HALF_X / Math.max(0.05, tanHalfHorizontal);
    minAspectDistanceZ = Math.max(CAMERA_DEFAULT_POS.z, minDistanceForCourt);

    if (mode === 'side') {
      const desiredZ = highShuttleActive
        ? Math.max(minAspectDistanceZ, CAMERA_HIGH_SHUTTLE_Z)
        : minAspectDistanceZ;
      camera.position.z = desiredZ;
      camera.lookAt(currentLookAt);
    }
    camera.updateProjectionMatrix();
  };

  const setMode = (nextMode: CameraViewMode): void => {
    if (mode === nextMode) {
      return;
    }
    mode = nextMode;
    if (mode === 'side') {
      const desiredZ = highShuttleActive
        ? Math.max(minAspectDistanceZ, CAMERA_HIGH_SHUTTLE_Z)
        : minAspectDistanceZ;
      camera.position.set(CAMERA_DEFAULT_POS.x, CAMERA_DEFAULT_POS.y, desiredZ);
      currentLookAt.set(
        CAMERA_DEFAULT_LOOK_AT.x,
        CAMERA_DEFAULT_LOOK_AT.y,
        CAMERA_DEFAULT_LOOK_AT.z,
      );
      camera.lookAt(currentLookAt);
    }
  };

  const getMode = (): CameraViewMode => mode;

  const update = (shuttlePos: ReadonlyVec3, shuttleActive: boolean, frameDtS: number): void => {
    const posFinite =
      Number.isFinite(shuttlePos.x) &&
      Number.isFinite(shuttlePos.y) &&
      Number.isFinite(shuttlePos.z);

    if (mode === 'closeup') {
      const sx = posFinite ? shuttlePos.x : 0;
      const sy = posFinite ? shuttlePos.y : 0;
      const sz = posFinite ? shuttlePos.z : 0;

      camera.position.set(
        sx + CAMERA_CLOSEUP_OFFSET.x,
        Math.max(CLOSEUP_MIN_CAM_Y_M, sy + CAMERA_CLOSEUP_OFFSET.y),
        sz + CAMERA_CLOSEUP_OFFSET.z,
      );
      currentLookAt.set(sx, Math.max(CLOSEUP_MIN_LOOK_Y_M, sy), sz);
      camera.lookAt(currentLookAt);
      return;
    }

    const activeAndFinite = shuttleActive && posFinite;
    highShuttleActive = activeAndFinite && shuttlePos.y > CAMERA_HIGH_SHUTTLE_Y;

    const targetLookY = activeAndFinite
      ? Math.min(
          CAMERA_LOOK_Y_MAX,
          Math.max(CAMERA_DEFAULT_LOOK_AT.y, shuttlePos.y * CAMERA_LOOK_Y_SHUTTLE_FACTOR),
        )
      : CAMERA_DEFAULT_LOOK_AT.y;

    const targetZ = Math.max(
      minAspectDistanceZ,
      highShuttleActive ? CAMERA_HIGH_SHUTTLE_Z : CAMERA_DEFAULT_POS.z,
    );

    targetPos.set(CAMERA_DEFAULT_POS.x, CAMERA_DEFAULT_POS.y, targetZ);
    targetLookAt.set(CAMERA_DEFAULT_LOOK_AT.x, targetLookY, CAMERA_DEFAULT_LOOK_AT.z);

    const safeDtS = Number.isFinite(frameDtS) ? frameDtS : 1;
    const alpha = safeDtS >= 1 || safeDtS <= 0 ? 1 : 1 - Math.exp(-CAMERA_DAMPING_RATE * safeDtS);

    camera.position.lerp(targetPos, alpha);
    currentLookAt.lerp(targetLookAt, alpha);
    camera.lookAt(currentLookAt);
  };

  resize(widthPx, heightPx);

  return {
    camera,
    resize,
    setMode,
    getMode,
    update,
  };
}
