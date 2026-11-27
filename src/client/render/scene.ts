import * as THREE from 'three';
import {
  OUTER_FLOOR_COLOR,
  OUTER_FLOOR_DEPTH,
  OUTER_FLOOR_WIDTH,
  RENDERER_MAX_PIXEL_RATIO,
  SCENE_BG_COLOR,
  SHADOW_MAP_SIZE,
} from '@shared/config';
import { createCourtGroup } from './court';
import { createNetGroup } from './net';

/** Bundle holding Three.js arena scene, WebGL renderer, lights, and cleanup handler. */
export interface ArenaScene {
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
  /** Update renderer backing size after viewport resize. */
  resize(widthPx: number, heightPx: number): void;
  /** Release GPU geometries, materials, and renderer resources. */
  dispose(): void;
}

/**
 * Create the Phase 0 Three.js stadium scene, floor, lighting, and configured WebGLRenderer
 * matching GAME_SPEC §10.1 & §10.2.
 *
 * @param container DOM mount element receiving the WebGL `<canvas>`.
 */
export function createArenaScene(container: HTMLElement): ArenaScene {
  const widthPx = Math.max(1, container.clientWidth || window.innerWidth);
  const heightPx = Math.max(1, container.clientHeight || window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_BG_COLOR);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, RENDERER_MAX_PIXEL_RATIO));
  renderer.setSize(widthPx, heightPx);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const hemiLight = new THREE.HemisphereLight(0xeef6ff, 0x1e293b, 0.85);
  hemiLight.position.set(0, 12, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.85);
  dirLight.position.set(4.5, 11.5, 6.5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 30;
  dirLight.shadow.camera.left = -9;
  dirLight.shadow.camera.right = 9;
  dirLight.shadow.camera.top = 7;
  dirLight.shadow.camera.bottom = -7;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  const outerFloorGeometry = new THREE.PlaneGeometry(OUTER_FLOOR_WIDTH, OUTER_FLOOR_DEPTH);
  const outerFloorMaterial = new THREE.MeshStandardMaterial({
    color: OUTER_FLOOR_COLOR,
    roughness: 0.85,
    metalness: 0.05,
  });
  const outerFloor = new THREE.Mesh(outerFloorGeometry, outerFloorMaterial);
  outerFloor.rotation.x = -Math.PI / 2;
  outerFloor.receiveShadow = true;
  scene.add(outerFloor);

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const court = createCourtGroup(maxAnisotropy);
  scene.add(court.group);

  const net = createNetGroup(maxAnisotropy);
  scene.add(net.group);

  const resize = (nextWidthPx: number, nextHeightPx: number): void => {
    const w = Math.max(1, nextWidthPx);
    const h = Math.max(1, nextHeightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, RENDERER_MAX_PIXEL_RATIO));
    renderer.setSize(w, h);
  };

  const dispose = (): void => {
    outerFloorGeometry.dispose();
    outerFloorMaterial.dispose();
    court.dispose();
    net.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };

  return {
    scene,
    renderer,
    resize,
    dispose,
  };
}
