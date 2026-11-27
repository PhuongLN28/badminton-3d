import * as THREE from 'three';
import {
  PLAYER_1_COLOR,
  PLAYER_2_COLOR,
  PLAYER_BODY_DEPTH,
  PLAYER_BODY_HALF_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_RACKET_COLOR,
  PLAYER_RACKET_MARKER_OFFSET,
  PLAYER_RACKET_MARKER_SIZE,
} from '@shared/config';
import type { PlayerIndex } from '@shared/types';

/** Managed Three.js placeholder player box + racket marker for Phases 1–5. */
export interface PlayerMeshHandle {
  readonly group: THREE.Group;
  /** Update world foot position (m) without allocating vectors. */
  setPosition(x: number, y: number, z?: number): void;
  dispose(): void;
}

/**
 * Create a colored box character (0.5 × 1.75 × 0.4 m) with a small racket block
 * facing toward the net, per GAME_SPEC §10.4.
 *
 * @param playerIndex `0` for P1 (blue), `1` for P2 (orange).
 * @param facing `+1` toward +X (P1), `-1` toward -X (P2).
 */
export function createPlayerMesh(playerIndex: PlayerIndex, facing: 1 | -1): PlayerMeshHandle {
  const group = new THREE.Group();
  group.name = playerIndex === 0 ? 'Player1Box' : 'Player2Box';

  const bodyColor = playerIndex === 0 ? PLAYER_1_COLOR : PLAYER_2_COLOR;
  const bodyGeometry = new THREE.BoxGeometry(
    PLAYER_BODY_HALF_WIDTH * 2,
    PLAYER_HEIGHT,
    PLAYER_BODY_DEPTH,
  );
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.55,
    metalness: 0.08,
  });

  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  bodyMesh.name = 'PlayerBody';
  bodyMesh.position.set(0, PLAYER_HEIGHT / 2, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  const racketGeometry = new THREE.BoxGeometry(
    PLAYER_RACKET_MARKER_SIZE.x,
    PLAYER_RACKET_MARKER_SIZE.y,
    PLAYER_RACKET_MARKER_SIZE.z,
  );
  const racketMaterial = new THREE.MeshStandardMaterial({
    color: PLAYER_RACKET_COLOR,
    roughness: 0.35,
    metalness: 0.2,
  });

  const racketMesh = new THREE.Mesh(racketGeometry, racketMaterial);
  racketMesh.name = 'PlayerRacketMarker';
  racketMesh.position.set(
    facing * PLAYER_RACKET_MARKER_OFFSET.x,
    PLAYER_RACKET_MARKER_OFFSET.y,
    PLAYER_RACKET_MARKER_OFFSET.z,
  );
  racketMesh.castShadow = true;
  group.add(racketMesh);

  const setPosition = (x: number, y: number, z = 0): void => {
    group.position.set(x, y, z);
  };

  const dispose = (): void => {
    bodyGeometry.dispose();
    bodyMaterial.dispose();
    racketGeometry.dispose();
    racketMaterial.dispose();
  };

  return {
    group,
    setPosition,
    dispose,
  };
}
