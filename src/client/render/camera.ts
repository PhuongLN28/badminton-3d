import * as THREE from 'three';
import {
  CAMERA_DEFAULT_LOOK_AT,
  CAMERA_DEFAULT_POS,
  CAMERA_FAR,
  CAMERA_FOV_DEG,
  CAMERA_MIN_VISIBLE_HALF_X,
  CAMERA_NEAR,
} from '@shared/config';

/** Managed side-view perspective camera and viewport helper. */
export interface SideCameraController {
  readonly camera: THREE.PerspectiveCamera;
  /** Recompute aspect ratio and pullback distance so court width stays visible without distortion. */
  resize(widthPx: number, heightPx: number): void;
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

  camera.position.set(CAMERA_DEFAULT_POS.x, CAMERA_DEFAULT_POS.y, CAMERA_DEFAULT_POS.z);
  camera.lookAt(
    CAMERA_DEFAULT_LOOK_AT.x,
    CAMERA_DEFAULT_LOOK_AT.y,
    CAMERA_DEFAULT_LOOK_AT.z,
  );

  const halfVerticalRad = (CAMERA_FOV_DEG * Math.PI) / 360;
  const tanHalfVertical = Math.tan(halfVerticalRad);

  const resize = (nextWidthPx: number, nextHeightPx: number): void => {
    const h = Math.max(1, nextHeightPx);
    const nextAspect = Math.max(0.1, nextWidthPx / h);
    camera.aspect = nextAspect;

    const tanHalfHorizontal = tanHalfVertical * nextAspect;
    const minDistanceForCourt = CAMERA_MIN_VISIBLE_HALF_X / Math.max(0.05, tanHalfHorizontal);
    camera.position.z = Math.max(CAMERA_DEFAULT_POS.z, minDistanceForCourt);
    camera.lookAt(
      CAMERA_DEFAULT_LOOK_AT.x,
      CAMERA_DEFAULT_LOOK_AT.y,
      CAMERA_DEFAULT_LOOK_AT.z,
    );
    camera.updateProjectionMatrix();
  };

  resize(widthPx, heightPx);

  return {
    camera,
    resize,
  };
}
