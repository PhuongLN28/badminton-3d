import * as THREE from 'three';
import { HITBOX_COLOR_ACTIVE, HITBOX_COLOR_IDLE, HITBOX_WIRE_SEGMENTS } from '@shared/config';
import { hitboxCenterOut, hitboxRadius, type HitKind } from '@shared/player/hitbox';
import type { SwingState } from '@shared/player/swing';
import type { Vec3 } from '@shared/types';

/** Player fields needed to place a hitbox sphere: feet position (m) and facing (+1 / -1). */
export interface HitboxDebugPlayer {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly facing: 1 | -1;
}

/**
 * Per-frame input of the hitbox debug draw. Structural, so a rally state exposing `players` and
 * `swings` can be passed straight in. Read only: the debug draw never writes simulation state.
 */
export interface HitboxDebugInput {
  readonly players: readonly [HitboxDebugPlayer, HitboxDebugPlayer];
  readonly swings: readonly [Readonly<SwingState>, Readonly<SwingState>];
}

/** Managed Three.js wireframe racket hitbox spheres of both players (`?debug=1`). */
export interface HitboxDebugHandle {
  readonly group: THREE.Group;
  /** Show or hide every hitbox sphere (follows the debug overlay toggle). */
  setVisible(visible: boolean): void;
  /**
   * Place and color the spheres from the current simulation state; no allocation.
   * READY: all three kinds in the idle color. Swinging: only the chosen kind, in the active
   * color during ACTIVE and in the idle color during WINDUP / RECOVERY.
   */
  update(input: HitboxDebugInput): void;
  /** Release GPU geometry and materials. */
  dispose(): void;
}

const HIT_KINDS: readonly HitKind[] = ['overhead', 'mid', 'underhand'];
const PLAYER_COUNT = 2;
const SPHERE_HEIGHT_SEGMENTS = Math.max(2, Math.floor(HITBOX_WIRE_SEGMENTS / 2));
const DEBUG_RENDER_ORDER = 10;
const WIRE_OPACITY = 0.85;

/** Index of a hit kind inside `HIT_KINDS` (the swing kind `serve` owns no sphere). */
function hitKindIndex(kind: SwingState['kind']): number {
  if (kind === 'overhead') {
    return 0;
  }
  if (kind === 'mid') {
    return 1;
  }
  if (kind === 'underhand') {
    return 2;
  }
  return -1;
}

/**
 * Create the pre-allocated hitbox wireframes: 3 spheres (overhead, mid, underhand) per player that
 * share one unit-sphere geometry (scaled to the hitbox radius) and two materials (idle, active).
 */
export function createHitboxDebug(): HitboxDebugHandle {
  const group = new THREE.Group();
  group.name = 'HitboxDebugDraw';
  group.visible = false;

  const unitSphere = new THREE.SphereGeometry(1, HITBOX_WIRE_SEGMENTS, SPHERE_HEIGHT_SEGMENTS);
  const wireGeometry = new THREE.WireframeGeometry(unitSphere);
  unitSphere.dispose();

  const idleMaterial = new THREE.LineBasicMaterial({
    color: HITBOX_COLOR_IDLE,
    transparent: true,
    opacity: WIRE_OPACITY,
    depthTest: false,
    depthWrite: false,
  });
  const activeMaterial = new THREE.LineBasicMaterial({
    color: HITBOX_COLOR_ACTIVE,
    transparent: true,
    opacity: WIRE_OPACITY,
    depthTest: false,
    depthWrite: false,
  });

  // Flat list indexed by `player * HIT_KINDS.length + kindIndex`.
  const spheres: THREE.LineSegments[] = [];
  for (let player = 0; player < PLAYER_COUNT; player += 1) {
    for (const kind of HIT_KINDS) {
      const sphere = new THREE.LineSegments(wireGeometry, idleMaterial);
      sphere.name = `Hitbox_P${player + 1}_${kind}`;
      sphere.scale.setScalar(hitboxRadius(kind));
      sphere.renderOrder = DEBUG_RENDER_ORDER;
      sphere.frustumCulled = false;
      sphere.visible = false;
      group.add(sphere);
      spheres.push(sphere);
    }
  }

  const centerScratch: Vec3 = { x: 0, y: 0, z: 0 };

  const setVisible = (visible: boolean): void => {
    group.visible = visible;
  };

  const update = (input: HitboxDebugInput): void => {
    if (!group.visible) {
      return;
    }
    for (let player = 0; player < PLAYER_COUNT; player += 1) {
      const state = input.players[player];
      const swing = input.swings[player];
      if (state === undefined || swing === undefined) {
        continue;
      }
      const ready = swing.phase === 'READY';
      const chosen = ready ? -1 : hitKindIndex(swing.kind);
      for (let k = 0; k < HIT_KINDS.length; k += 1) {
        const kind = HIT_KINDS[k];
        const sphere = spheres[player * HIT_KINDS.length + k];
        if (kind === undefined || sphere === undefined) {
          continue;
        }
        const shown = ready || k === chosen;
        sphere.visible = shown;
        if (!shown) {
          continue;
        }
        hitboxCenterOut(state, kind, centerScratch);
        sphere.position.set(centerScratch.x, centerScratch.y, centerScratch.z);
        sphere.material = !ready && swing.phase === 'ACTIVE' ? activeMaterial : idleMaterial;
      }
    }
  };

  const dispose = (): void => {
    group.removeFromParent();
    wireGeometry.dispose();
    idleMaterial.dispose();
    activeMaterial.dispose();
  };

  return { group, setVisible, update, dispose };
}
