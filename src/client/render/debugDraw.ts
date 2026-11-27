import * as THREE from 'three';
import {
  COURT_SURFACE_Y,
  LANDING_MARKER_IN_COLOR,
  LANDING_MARKER_INNER_RADIUS,
  LANDING_MARKER_OUTER_RADIUS,
  LANDING_MARKER_OUT_COLOR,
  SHUTTLE_DEBUG_DOT_INTERVAL_S,
} from '@shared/config';
import type { ReadonlyVec3 } from '@shared/types';

const MAX_PATH_POINTS = 1024;
const MAX_DOTS = 128;
const DEBUG_PATH_COLOR_HEX = 0x38bdf8;
const DEBUG_DOT_COLOR_HEX = 0xfbbf24;
const DEBUG_DOT_RADIUS_M = 0.065;
const PREDICTED_RING_Y_OFFSET_M = 0.0025;
const LANDING_RING_Y_OFFSET_M = 0.003;
const DOT_TIME_EPSILON_S = 1e-6;

/** Managed Three.js debug trajectory line, 0.1 s deceleration dots, and floor landing rings. */
export interface DebugDrawHandle {
  readonly group: THREE.Group;
  /** Show or hide debug trajectory path, deceleration dots, and predicted landing ring. */
  setDebugVisible(visible: boolean): void;
  /**
   * Reset trajectory buffers and begin tracking a new flight from `startPos` (m).
   * @param startPos Initial shuttle position in meters at `t = 0`.
   * @param predictedLand Predicted floor landing point `(x, z)` in meters, or `null` if none.
   */
  beginFlight(startPos: ReadonlyVec3, predictedLand: { x: number; z: number } | null): void;
  /**
   * Update only the predicted floor landing ring `(x, z)` in meters without clearing
   * the recorded trajectory path or deceleration dots (used on mid-rally returns).
   * @param predictedLand Predicted floor landing point `(x, z)` in meters, or `null` to hide.
   */
  updatePredictedLanding(predictedLand: { x: number; z: number } | null): void;
  /**
   * Record one simulated flight position without heap allocations.
   * Places a debug dot every `SHUTTLE_DEBUG_DOT_INTERVAL_S` (0.1 s).
   * @param pos Current shuttle world position in meters.
   * @param flightTimeS Elapsed time since flight start in seconds.
   */
  recordFlightStep(pos: ReadonlyVec3, flightTimeS: number): void;
  /**
   * Display the floor landing marker ring at `(x, z)` in meters colored green (`inBounds`) or red (`out`).
   * @param x Landing X coordinate in meters.
   * @param z Landing Z coordinate in meters.
   * @param inBounds True if the landing point is inside legal court boundaries.
   */
  markLanding(x: number, z: number, inBounds: boolean): void;
  /** Clear debug trajectory line, dots, and floor rings. */
  clearTrajectory(): void;
  /** Release all GPU geometries and materials. */
  dispose(): void;
}

/**
 * Create pre-allocated debug visualization for shuttle trajectory (`?debug=1`)
 * and court landing feedback rings.
 */
export function createDebugDraw(): DebugDrawHandle {
  const group = new THREE.Group();
  group.name = 'ShuttleDebugDraw';

  const trajectoryGroup = new THREE.Group();
  trajectoryGroup.name = 'DebugTrajectoryGroup';
  trajectoryGroup.visible = false;
  group.add(trajectoryGroup);

  const pathPositions = new Float32Array(MAX_PATH_POINTS * 3);
  const pathGeometry = new THREE.BufferGeometry();
  const pathAttr = new THREE.BufferAttribute(pathPositions, 3);
  pathAttr.setUsage(THREE.DynamicDrawUsage);
  pathGeometry.setAttribute('position', pathAttr);
  pathGeometry.setDrawRange(0, 0);

  const pathMaterial = new THREE.LineBasicMaterial({
    color: DEBUG_PATH_COLOR_HEX,
    transparent: true,
    opacity: 0.9,
  });
  const pathLine = new THREE.Line(pathGeometry, pathMaterial);
  pathLine.name = 'DebugFlightPath';
  pathLine.frustumCulled = false;
  pathLine.visible = false;
  trajectoryGroup.add(pathLine);

  const dotGeometry = new THREE.SphereGeometry(DEBUG_DOT_RADIUS_M, 10, 8);
  const dotMaterial = new THREE.MeshBasicMaterial({
    color: DEBUG_DOT_COLOR_HEX,
  });
  const dotsMesh = new THREE.InstancedMesh(dotGeometry, dotMaterial, MAX_DOTS);
  dotsMesh.name = 'DebugFlightDots';
  dotsMesh.frustumCulled = false;
  dotsMesh.count = 0;
  dotsMesh.visible = false;
  trajectoryGroup.add(dotsMesh);

  const ringGeometry = new THREE.RingGeometry(
    LANDING_MARKER_INNER_RADIUS,
    LANDING_MARKER_OUTER_RADIUS,
    32,
  );
  ringGeometry.rotateX(-Math.PI / 2);

  const predictedMaterial = new THREE.MeshBasicMaterial({
    color: DEBUG_PATH_COLOR_HEX,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const predictedRing = new THREE.Mesh(ringGeometry, predictedMaterial);
  predictedRing.name = 'DebugPredictedLandingRing';
  predictedRing.position.set(0, COURT_SURFACE_Y + PREDICTED_RING_Y_OFFSET_M, 0);
  predictedRing.visible = false;
  trajectoryGroup.add(predictedRing);

  const landingMaterial = new THREE.MeshBasicMaterial({
    color: LANDING_MARKER_IN_COLOR,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const landingRing = new THREE.Mesh(ringGeometry, landingMaterial);
  landingRing.name = 'ShuttleLandingRing';
  landingRing.position.set(0, COURT_SURFACE_Y + LANDING_RING_Y_OFFSET_M, 0);
  landingRing.visible = false;
  group.add(landingRing);

  const dotMatrix = new THREE.Matrix4();
  let pathCount = 0;
  let dotCount = 0;
  let lastPathX = Number.NaN;
  let lastPathY = Number.NaN;
  let lastPathZ = Number.NaN;

  const appendPathPoint = (x: number, y: number, z: number): void => {
    if (pathCount >= MAX_PATH_POINTS) {
      return;
    }
    if (pathCount > 0 && x === lastPathX && y === lastPathY && z === lastPathZ) {
      return;
    }
    const base = pathCount * 3;
    pathPositions[base] = x;
    pathPositions[base + 1] = y;
    pathPositions[base + 2] = z;
    lastPathX = x;
    lastPathY = y;
    lastPathZ = z;
    pathCount += 1;
    pathAttr.needsUpdate = true;
    pathGeometry.setDrawRange(0, pathCount);
    pathLine.visible = pathCount >= 2;
  };

  const appendDot = (x: number, y: number, z: number): void => {
    if (dotCount >= MAX_DOTS) {
      return;
    }
    dotMatrix.makeTranslation(x, y, z);
    dotsMesh.setMatrixAt(dotCount, dotMatrix);
    dotCount += 1;
    dotsMesh.count = dotCount;
    dotsMesh.instanceMatrix.needsUpdate = true;
    dotsMesh.visible = true;
  };

  const setDebugVisible = (visible: boolean): void => {
    trajectoryGroup.visible = visible;
  };

  const clearTrajectory = (): void => {
    pathCount = 0;
    dotCount = 0;
    lastPathX = Number.NaN;
    lastPathY = Number.NaN;
    lastPathZ = Number.NaN;
    pathGeometry.setDrawRange(0, 0);
    pathLine.visible = false;
    dotsMesh.count = 0;
    dotsMesh.visible = false;
    predictedRing.visible = false;
    landingRing.visible = false;
  };

  const updatePredictedLanding = (predictedLand: { x: number; z: number } | null): void => {
    if (predictedLand && Number.isFinite(predictedLand.x) && Number.isFinite(predictedLand.z)) {
      predictedRing.position.set(
        predictedLand.x,
        COURT_SURFACE_Y + PREDICTED_RING_Y_OFFSET_M,
        predictedLand.z,
      );
      predictedRing.visible = true;
    } else {
      predictedRing.visible = false;
    }
  };

  const beginFlight = (
    startPos: ReadonlyVec3,
    predictedLand: { x: number; z: number } | null,
  ): void => {
    pathCount = 0;
    dotCount = 0;
    lastPathX = Number.NaN;
    lastPathY = Number.NaN;
    lastPathZ = Number.NaN;
    pathGeometry.setDrawRange(0, 0);
    pathLine.visible = false;
    dotsMesh.count = 0;
    dotsMesh.visible = false;
    landingRing.visible = false;

    updatePredictedLanding(predictedLand);

    if (Number.isFinite(startPos.x) && Number.isFinite(startPos.y) && Number.isFinite(startPos.z)) {
      appendPathPoint(startPos.x, startPos.y, startPos.z);
      appendDot(startPos.x, startPos.y, startPos.z);
    }
  };

  const recordFlightStep = (pos: ReadonlyVec3, flightTimeS: number): void => {
    if (
      !Number.isFinite(pos.x) ||
      !Number.isFinite(pos.y) ||
      !Number.isFinite(pos.z) ||
      !Number.isFinite(flightTimeS)
    ) {
      return;
    }

    appendPathPoint(pos.x, pos.y, pos.z);

    if (SHUTTLE_DEBUG_DOT_INTERVAL_S > 0) {
      const nextTargetTimeS = dotCount * SHUTTLE_DEBUG_DOT_INTERVAL_S;
      if (flightTimeS + DOT_TIME_EPSILON_S >= nextTargetTimeS) {
        appendDot(pos.x, pos.y, pos.z);
        const expectedCount =
          Math.floor((flightTimeS + DOT_TIME_EPSILON_S) / SHUTTLE_DEBUG_DOT_INTERVAL_S) + 1;
        if (expectedCount > dotCount) {
          dotCount = Math.min(MAX_DOTS, expectedCount);
        }
      }
    }
  };

  const markLanding = (x: number, z: number, inBounds: boolean): void => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) {
      return;
    }
    predictedRing.visible = false;
    landingRing.position.set(x, COURT_SURFACE_Y + LANDING_RING_Y_OFFSET_M, z);
    landingMaterial.color.setHex(inBounds ? LANDING_MARKER_IN_COLOR : LANDING_MARKER_OUT_COLOR);
    landingRing.visible = true;
  };

  const dispose = (): void => {
    pathGeometry.dispose();
    pathMaterial.dispose();
    dotGeometry.dispose();
    dotMaterial.dispose();
    ringGeometry.dispose();
    predictedMaterial.dispose();
    landingMaterial.dispose();
  };

  return {
    group,
    setDebugVisible,
    beginFlight,
    updatePredictedLanding,
    recordFlightStep,
    markLanding,
    clearTrajectory,
    dispose,
  };
}
