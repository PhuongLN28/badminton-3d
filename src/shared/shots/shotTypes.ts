import {
  MIN_NET_CLEARANCE,
  MIN_NET_CLEARANCE_POWER,
  NET_SHOT_MAX_HITTER_DIST,
  SHOT_PARAMS,
  SMASH_MIN_CONTACT_Y,
} from '../config';
import type { PressedSwingButton, ShotParams, ShotType, SwingKind } from '../types';

/**
 * Classify a swing into a shot type from the swing kind and the pressed button, per GAME_SPEC §5.3.
 *
 * - overhead: high CLEAR, power SMASH when the contact is high enough (else DRIVE), soft DROP.
 * - mid: high LIFT, power DRIVE, soft BLOCK.
 * - underhand: high LIFT, power DRIVE, soft NET_SHOT near the net (else BLOCK).
 * - serve: high and power HIGH_SERVE, soft LOW_SERVE.
 *
 * @param kind swing kind chosen at swing start
 * @param button pressed swing button
 * @param contactY contact height above the floor (m)
 * @param hitterAbsX distance of the hitter from the net, absolute value of x (m)
 */
export function classifyShot(
  kind: SwingKind,
  button: PressedSwingButton,
  contactY: number,
  hitterAbsX: number,
): ShotType {
  switch (kind) {
    case 'overhead':
      if (button === 'high') return 'CLEAR';
      if (button === 'soft') return 'DROP';
      return contactY >= SMASH_MIN_CONTACT_Y ? 'SMASH' : 'DRIVE';
    case 'mid':
      if (button === 'high') return 'LIFT';
      if (button === 'soft') return 'BLOCK';
      return 'DRIVE';
    case 'underhand':
      if (button === 'high') return 'LIFT';
      if (button === 'power') return 'DRIVE';
      return Math.abs(hitterAbsX) <= NET_SHOT_MAX_HITTER_DIST ? 'NET_SHOT' : 'BLOCK';
    case 'serve':
      return button === 'soft' ? 'LOW_SERVE' : 'HIGH_SERVE';
  }
}

/**
 * Parameter set of a shot type (elevation deg, speed m/s, clearance m, depths m), per GAME_SPEC §5.4.
 * @param shot shot type
 */
export function getShotParams(shot: ShotType): ShotParams {
  return SHOT_PARAMS[shot];
}

/**
 * Minimum clearance above the net top required by the assist check (m), per GAME_SPEC §5.5.
 * SMASH and DRIVE use the larger value, every other shot the smaller one.
 * @param shot shot type
 */
export function minNetClearanceFor(shot: ShotType): number {
  return shot === 'SMASH' || shot === 'DRIVE' ? MIN_NET_CLEARANCE_POWER : MIN_NET_CLEARANCE;
}
