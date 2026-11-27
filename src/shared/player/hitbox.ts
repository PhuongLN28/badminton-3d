import {
  HITBOX_MID,
  HITBOX_OVERHEAD,
  HITBOX_UNDERHAND,
  SWING_FALLBACK_KIND,
  SWING_MID_MIN_HEIGHT,
  SWING_OVERHEAD_MIN_HEIGHT,
  SWING_PREDICT_LEAD_S,
  SWING_PREDICT_SLACK_TICKS,
  TIME_EPSILON_S,
} from '../config';
import { predictUntil } from '../physics/flight';
import type { PhysicsConfig, ShuttleState } from '../physics/shuttle';
import type { HitboxSpec, ReadonlyVec3, SwingKind, Vec3 } from '../types';
import type { PlayerState } from './playerSim';
import type { SwingState } from './swing';

/** Swing kinds that own a racket hitbox sphere (the serve touches the held shuttle directly). */
export type HitKind = Exclude<SwingKind, 'serve'>;

/** Player fields the hitbox needs. */
type HitboxPlayer = Readonly<Pick<PlayerState, 'x' | 'y' | 'z' | 'facing'>>;

/** Hitbox center scratch reused by `detectSwingHit` so it never allocates. */
const centerScratch: Vec3 = { x: 0, y: 0, z: 0 };

function hitboxSpecFor(kind: HitKind): Readonly<HitboxSpec> {
  if (kind === 'overhead') {
    return HITBOX_OVERHEAD;
  }
  if (kind === 'mid') {
    return HITBOX_MID;
  }
  return HITBOX_UNDERHAND;
}

/**
 * Classify the swing kind from the predicted shuttle height, per GAME_SPEC §5.2.
 *
 * @param heightAboveFeetM Predicted shuttle height above the player feet (m).
 * @returns `overhead` from 1.8 m, `mid` from 1.0 m, otherwise `underhand`; a non-finite height gives the fallback kind.
 */
export function classifySwingKind(heightAboveFeetM: number): HitKind {
  if (!Number.isFinite(heightAboveFeetM)) {
    return SWING_FALLBACK_KIND;
  }
  if (heightAboveFeetM >= SWING_OVERHEAD_MIN_HEIGHT) {
    return 'overhead';
  }
  if (heightAboveFeetM >= SWING_MID_MIN_HEIGHT) {
    return 'mid';
  }
  return 'underhand';
}

function reachesSwingLead(p: ReadonlyVec3, _v: ReadonlyVec3, tS: number): boolean {
  return tS >= SWING_PREDICT_LEAD_S - TIME_EPSILON_S || p.y <= 0;
}

/**
 * Predict the swing kind at the moment a swing button is pressed: simulate the shuttle forward by
 * `SWING_PREDICT_LEAD_S` (0.15 s, or until it lands) and classify its height above the player feet.
 * Runs once per button press, so it may allocate inside `predictUntil`.
 *
 * @param shuttle Current shuttle state (not modified).
 * @param player Swinging player; `player.y` is the feet height (m), including jump height.
 * @param dtS Simulation step duration (s).
 * @param cfg Shuttle physics parameters.
 * @returns The predicted kind, or `SWING_FALLBACK_KIND` when the shuttle is not flying.
 */
export function predictSwingKind(
  shuttle: Readonly<ShuttleState>,
  player: HitboxPlayer,
  dtS: number,
  cfg: Readonly<PhysicsConfig>,
): HitKind {
  if (shuttle.state !== 'flying') {
    return SWING_FALLBACK_KIND;
  }
  const result = predictUntil(
    shuttle,
    reachesSwingLead,
    SWING_PREDICT_LEAD_S + SWING_PREDICT_SLACK_TICKS * dtS,
    dtS,
    cfg,
  );
  if (result === null) {
    return SWING_FALLBACK_KIND;
  }
  return classifySwingKind(result.p.y - player.y);
}

/**
 * World position of the hitbox sphere center: `(x + facing * offsetX, feetY + offsetY, z)`.
 *
 * @param player Player feet position (m) and facing.
 * @param out Receives the center (m) and is returned.
 */
export function hitboxCenterOut(player: HitboxPlayer, kind: HitKind, out: Vec3): Vec3 {
  const spec = hitboxSpecFor(kind);
  out.x = player.x + player.facing * spec.offsetX;
  out.y = player.y + spec.offsetY;
  out.z = player.z;
  return out;
}

/** Hitbox sphere radius of a swing kind (m). */
export function hitboxRadius(kind: HitKind): number {
  return hitboxSpecFor(kind).radius;
}

/**
 * Entry fraction of the segment `p0 -> p1` into the sphere (center `c`, radius `rM`).
 * Only `+ - * /` and `Math.sqrt`; no allocation.
 *
 * @param p0 Segment start (m).
 * @param p1 Segment end (m).
 * @param c Sphere center (m).
 * @param rM Sphere radius (m).
 * @returns Smallest fraction in [0, 1] at which the segment is inside the sphere (0 when `p0` is already
 *   inside), or `null` when the segment never reaches the sphere.
 */
export function sweptSphereEntry(
  p0: ReadonlyVec3,
  p1: ReadonlyVec3,
  c: ReadonlyVec3,
  rM: number,
): number | null {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dz = p1.z - p0.z;
  const fx = p0.x - c.x;
  const fy = p0.y - c.y;
  const fz = p0.z - c.z;

  // Solve |f + t d|^2 = r^2 with the start point outside: a t^2 + 2 b t + cc = 0.
  const cc = fx * fx + fy * fy + fz * fz - rM * rM;
  if (cc <= 0) {
    return 0;
  }
  const b = fx * dx + fy * dy + fz * dz;
  if (!(b < 0)) {
    // Moving away from the center, or not moving: both roots are negative or there is none.
    return null;
  }
  const a = dx * dx + dy * dy + dz * dz;
  const disc = b * b - a * cc;
  if (!(disc >= 0)) {
    return null;
  }
  // Stable form of the smaller root: cc / (-b + sqrt(disc)), no cancellation because -b > 0.
  const t = cc / (Math.sqrt(disc) - b);
  return t >= 0 && t <= 1 ? t : null;
}

/**
 * Detect a racket hit for one tick: the swing must be ACTIVE, not yet have hit, own a hitbox kind
 * (not `serve`), and the shuttle segment `prevPos -> currPos` must enter the hitbox sphere at a
 * point on the player's own half (`contact.x * facing <= 0`). The caller sets `swing.hasHit`.
 *
 * Contact time since the ACTIVE span began is `(activeElapsedTicks + fraction) * dtS` (s), where the
 * returned fraction is the sub-tick position of the contact inside this tick's shuttle step.
 * No allocation; `outContact` is left untouched when the result is `null`.
 *
 * @param player Swinging player (feet position in m, facing).
 * @param prevPos Shuttle position before this tick's step (m).
 * @param currPos Shuttle position after this tick's step (m).
 * @param outContact Receives the contact point (m).
 * @returns Entry fraction in [0, 1] of the shuttle step, or `null` for no hit.
 */
export function detectSwingHit(
  player: HitboxPlayer,
  swing: Readonly<SwingState>,
  prevPos: ReadonlyVec3,
  currPos: ReadonlyVec3,
  outContact: Vec3,
): number | null {
  const kind = swing.kind;
  if (swing.phase !== 'ACTIVE' || swing.hasHit || kind === null || kind === 'serve') {
    return null;
  }
  hitboxCenterOut(player, kind, centerScratch);
  const fraction = sweptSphereEntry(prevPos, currPos, centerScratch, hitboxRadius(kind));
  if (fraction === null) {
    return null;
  }
  const cx = prevPos.x + (currPos.x - prevPos.x) * fraction;
  if (cx * player.facing > 0) {
    return null;
  }
  outContact.x = cx;
  outContact.y = prevPos.y + (currPos.y - prevPos.y) * fraction;
  outContact.z = prevPos.z + (currPos.z - prevPos.z) * fraction;
  return fraction;
}
