import {
  DEBUG_AUTO_RETURN_VX,
  DEBUG_AUTO_RETURN_VY,
  NET_BOUNCE_DAMPING_Y,
  NET_BOUNCE_DAMPING_Z,
  NET_BOUNCE_OFFSET_X,
  NET_BOUNCE_RESTITUTION_X,
  PLAYER_BODY_DEPTH,
  PLAYER_BODY_HALF_WIDTH,
  PLAYER_HEIGHT,
} from '../config';
import type { PlayerState } from '../player/playerSim';
import type { PlayerIndex, ReadonlyVec3 } from '../types';
import type { PhysicsConfig, ShuttleState, StepResult } from './shuttle';

function applyNetHit(
  state: ShuttleState,
  prevPos: ReadonlyVec3,
  prevVel: ReadonlyVec3,
  fNet: number,
  yCross: number,
  zCross: number,
  tick: number,
  outResult: StepResult,
): void {
  const vxBefore = prevVel.x + (state.vel.x - prevVel.x) * fNet;
  const signX = vxBefore !== 0 ? (vxBefore > 0 ? 1 : -1) : prevPos.x < 0 ? 1 : -1;
  const fromSide: PlayerIndex = prevPos.x < 0 ? 0 : 1;

  state.pos.x = -signX * NET_BOUNCE_OFFSET_X;
  state.pos.y = yCross;
  state.pos.z = zCross;

  const vyCross = prevVel.y + (state.vel.y - prevVel.y) * fNet;
  const vzCross = prevVel.z + (state.vel.z - prevVel.z) * fNet;
  state.vel.x = -NET_BOUNCE_RESTITUTION_X * vxBefore;
  state.vel.y = (vyCross < 0 ? vyCross : 0) * NET_BOUNCE_DAMPING_Y;
  state.vel.z = vzCross * NET_BOUNCE_DAMPING_Z;

  outResult.netHitEvent = {
    type: 'netHit',
    tick,
    heightM: yCross,
    fromSide,
  };
}

function applyFloorLand(
  state: ShuttleState,
  prevPos: ReadonlyVec3,
  fFloor: number,
  tick: number,
  outResult: StepResult,
): void {
  const xLand = prevPos.x + (state.pos.x - prevPos.x) * fFloor;
  const zLand = prevPos.z + (state.pos.z - prevPos.z) * fFloor;

  state.pos.x = xLand;
  state.pos.y = 0;
  state.pos.z = zLand;
  state.vel.x = 0;
  state.vel.y = 0;
  state.vel.z = 0;
  state.state = 'grounded';

  outResult.landEvent = {
    type: 'land',
    tick,
    x: xLand,
    z: zLand,
    subTickFraction: fFloor,
  };
}

/**
 * Resolve swept net (`x = 0`, `y < cfg.netHeight`, `|z| <= cfg.netHalfWidth`) and
 * floor (`y <= 0` when descending) collisions across `prevPos -> state.pos`.
 * When both occur in the same tick, the earlier sub-tick fraction is processed.
 */
export function resolveNetAndFloorCollisions(
  state: ShuttleState,
  prevPos: ReadonlyVec3,
  prevVel: ReadonlyVec3,
  cfg: Readonly<PhysicsConfig>,
  tick: number,
  outResult: StepResult,
): void {
  let hasNetHit = false;
  let fNet = 0;
  let yCross = 0;
  let zCross = 0;

  if (
    cfg.collideNet &&
    ((prevPos.x < 0 && state.pos.x >= 0) || (prevPos.x > 0 && state.pos.x <= 0)) &&
    state.pos.x !== prevPos.x
  ) {
    fNet = -prevPos.x / (state.pos.x - prevPos.x);
    yCross = prevPos.y + (state.pos.y - prevPos.y) * fNet;
    zCross = prevPos.z + (state.pos.z - prevPos.z) * fNet;
    if (
      yCross >= 0 &&
      yCross < cfg.netHeight &&
      zCross >= -cfg.netHalfWidth &&
      zCross <= cfg.netHalfWidth
    ) {
      hasNetHit = true;
    }
  }

  let hasFloorHit = false;
  let fFloor = 0;
  if (state.pos.y <= 0 && state.vel.y < 0) {
    hasFloorHit = true;
    fFloor = prevPos.y > 0 ? prevPos.y / (prevPos.y - state.pos.y) : 0;
  }

  if (hasNetHit && hasFloorHit) {
    if (fNet < fFloor) {
      applyNetHit(state, prevPos, prevVel, fNet, yCross, zCross, tick, outResult);
    } else {
      applyFloorLand(state, prevPos, fFloor, tick, outResult);
    }
    return;
  }

  if (hasNetHit) {
    applyNetHit(state, prevPos, prevVel, fNet, yCross, zCross, tick, outResult);
  } else if (hasFloorHit) {
    applyFloorLand(state, prevPos, fFloor, tick, outResult);
  }
}

function segmentAabbEntryFraction(
  p0x: number,
  p0y: number,
  p0z: number,
  dx: number,
  dy: number,
  dz: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number,
): number | null {
  let tMin = 0;
  let tMax = 1;

  // X slab
  if (dx > -1e-12 && dx < 1e-12) {
    if (p0x < minX || p0x > maxX) {
      return null;
    }
  } else {
    const inv = 1 / dx;
    let t1 = (minX - p0x) * inv;
    let t2 = (maxX - p0x) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    if (t1 > tMin) {
      tMin = t1;
    }
    if (t2 < tMax) {
      tMax = t2;
    }
    if (tMin > tMax) {
      return null;
    }
  }

  // Y slab
  if (dy > -1e-12 && dy < 1e-12) {
    if (p0y < minY || p0y > maxY) {
      return null;
    }
  } else {
    const inv = 1 / dy;
    let t1 = (minY - p0y) * inv;
    let t2 = (maxY - p0y) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    if (t1 > tMin) {
      tMin = t1;
    }
    if (t2 < tMax) {
      tMax = t2;
    }
    if (tMin > tMax) {
      return null;
    }
  }

  // Z slab
  if (dz > -1e-12 && dz < 1e-12) {
    if (p0z < minZ || p0z > maxZ) {
      return null;
    }
  } else {
    const inv = 1 / dz;
    let t1 = (minZ - p0z) * inv;
    let t2 = (maxZ - p0z) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    if (t1 > tMin) {
      tMin = t1;
    }
    if (t2 < tMax) {
      tMax = t2;
    }
    if (tMin > tMax) {
      return null;
    }
  }

  return tMin;
}

/**
 * Temporary Phase 2 swept segment-vs-AABB auto-return off a player's body box.
 * Triggers strictly once per contact (`shuttle.state === 'flying'` and `shuttle.vel.x * facing <= 0`)
 * and launches the shuttle toward the opposing court at `DEBUG_AUTO_RETURN_SPEED` and angle.
 */
export function resolvePlayerBoxAutoReturn(
  prevPos: ReadonlyVec3,
  shuttle: ShuttleState,
  players: readonly [Readonly<PlayerState>, Readonly<PlayerState>],
): PlayerIndex | null {
  if (shuttle.state !== 'flying') {
    return null;
  }

  const dx = shuttle.pos.x - prevPos.x;
  const dy = shuttle.pos.y - prevPos.y;
  const dz = shuttle.pos.z - prevPos.z;
  const halfDepth = PLAYER_BODY_DEPTH * 0.5;

  let bestPlayer: Readonly<PlayerState> | null = null;
  let bestT = 2;

  for (const player of players) {
    if (shuttle.vel.x * player.facing > 0) {
      continue;
    }

    const hitT = segmentAabbEntryFraction(
      prevPos.x,
      prevPos.y,
      prevPos.z,
      dx,
      dy,
      dz,
      player.x - PLAYER_BODY_HALF_WIDTH,
      player.x + PLAYER_BODY_HALF_WIDTH,
      player.y,
      player.y + PLAYER_HEIGHT,
      player.z - halfDepth,
      player.z + halfDepth,
    );

    if (hitT !== null && hitT < bestT) {
      bestT = hitT;
      bestPlayer = player;
    }
  }

  if (bestPlayer === null) {
    return null;
  }

  shuttle.pos.x = prevPos.x + dx * bestT;
  shuttle.pos.y = prevPos.y + dy * bestT;
  shuttle.pos.z = prevPos.z + dz * bestT;
  shuttle.vel.x = bestPlayer.facing * DEBUG_AUTO_RETURN_VX;
  shuttle.vel.y = DEBUG_AUTO_RETURN_VY;
  shuttle.vel.z = 0;

  return bestPlayer.playerIndex;
}
