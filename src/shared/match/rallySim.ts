import { DT } from '../config';
import { resolvePlayerBoxAutoReturn } from '../physics/collision';
import { shuttleOrientation } from '../physics/orientation';
import { sanitizeAndClampShuttle, stepShuttle } from '../physics/shuttle';
import { detectSwingHit, predictSwingKind } from '../player/hitbox';
import { stepPlayer } from '../player/playerSim';
import {
  activeElapsedTicks,
  advanceSwing,
  moveFactorFor,
  swingTicksForOut,
  tryStartSwing,
} from '../player/swing';
import { buildHitEvent, resolveShot, type ShotContext } from '../shots/resolveShot';
import { classifyShot } from '../shots/shotTypes';
import { gradeTiming, timingOffsetS } from '../shots/timing';
import type { InputFrame, PlayerIndex, SimEvent } from '../types';
import type { RallyState } from './rallyState';

export {
  createRallyState,
  setRallyPlayerX,
  setRallySeed,
  spawnRallyShuttle,
  tossPracticeShuttle,
  type MutablePhysicsConfig,
  type RallyState,
} from './rallyState';

/** Entry fraction larger than any valid one in [0, 1], used as "no hit yet" (dimensionless). */
const NO_HIT_FRACTION = 2;

/** Advance a swing, then start a new one when the player presses a button while READY. */
function updateSwing(
  s: RallyState,
  player: PlayerIndex,
  input: Readonly<InputFrame>,
  tickNo: number,
  dtS: number,
): void {
  const swing = s.swings[player];
  advanceSwing(swing, s.ticks);
  const button = input.swing;
  if (button === null || swing.phase !== 'READY') {
    return;
  }
  const kind = predictSwingKind(s.shuttle, s.players[player], dtS, s.physicsCfg);
  if (tryStartSwing(swing, button, kind, input.aim)) {
    s.events.push({ type: 'swing', tick: tickNo, player, kind, button });
  }
}

/** Move one player with the swing slowdown and mirror the swing phase into the player state. */
function updatePlayer(
  s: RallyState,
  player: PlayerIndex,
  input: Readonly<InputFrame>,
  dtS: number,
): void {
  const swing = s.swings[player];
  const moveInput = s.moveInputs[player];
  moveInput.moveX = input.moveX * moveFactorFor(swing);
  moveInput.jump = input.jump;
  const state = s.players[player];
  stepPlayer(state, moveInput, dtS);
  state.swingState = swing.phase;
}

/**
 * Test one player's racket against the shuttle step `prevPos -> pos`. A candidate earlier than the
 * current best (strictly smaller entry fraction) replaces it, so a tie goes to the lower index.
 *
 * @returns The player's entry fraction when it beats `bestFraction`, otherwise `bestFraction`.
 */
function considerHit(s: RallyState, player: PlayerIndex, bestFraction: number): number {
  if (s.lastHitter === player) {
    return bestFraction;
  }
  const fraction = detectSwingHit(
    s.players[player],
    s.swings[player],
    s.shuttleScratch.prevPos,
    s.shuttle.pos,
    s.candidateContact,
  );
  if (fraction === null || fraction >= bestFraction) {
    return bestFraction;
  }
  s.bestContact.x = s.candidateContact.x;
  s.bestContact.y = s.candidateContact.y;
  s.bestContact.z = s.candidateContact.z;
  return fraction;
}

/** Solve and apply the hit of `player` at `s.bestContact`; the shuttle leaves with the new velocity. */
function applyHit(
  s: RallyState,
  player: PlayerIndex,
  fraction: number,
  tickNo: number,
  dtS: number,
): void {
  const swing = s.swings[player];
  const hitter = s.players[player];
  const kind = swing.kind;
  const button = swing.button;
  swing.hasHit = true;
  if (kind === null || button === null) {
    return;
  }

  const contactTimeS = (activeElapsedTicks(swing, s.ticks) + fraction) * dtS;
  const ctx: ShotContext = {
    shot: classifyShot(kind, button, s.bestContact.y, Math.abs(hitter.x)),
    swingKind: kind,
    contact: s.bestContact,
    facing: hitter.facing,
    airborne: !hitter.grounded,
    aim: swing.aim,
    grade: gradeTiming(contactTimeS),
    rng: s.rng,
    dtS,
  };
  try {
    const outcome = resolveShot(ctx);
    const shuttle = s.shuttle;
    shuttle.pos.x = s.bestContact.x;
    shuttle.pos.y = s.bestContact.y;
    shuttle.pos.z = s.bestContact.z;
    shuttle.vel.x = outcome.v0.x;
    shuttle.vel.y = outcome.v0.y;
    shuttle.vel.z = outcome.v0.z;
    sanitizeAndClampShuttle(shuttle, s.physicsCfg);
    s.lastHitter = player;
    s.events.push(buildHitEvent(tickNo, player, ctx, outcome, timingOffsetS(contactTimeS)));
  } catch (error) {
    console.warn('rallySim: shot resolution failed, hit ignored', error);
  }
}

/**
 * Advance the rally by one tick. Order within a tick:
 * 1. swings advance and new presses start (swing event);
 * 2. players move (half speed while swinging);
 * 3. the shuttle steps (netHit and land events; a landing releases the double-hit lock);
 * 4. racket hits are tested, earliest contact first, P1 on a tie (hit event);
 * 5. the temporary player-box bounce runs when enabled and nobody hit;
 * 6. the shuttle nose turns toward its velocity.
 * Allocates only when a swing starts or a hit is resolved. Never throws.
 *
 * @param inputs Input frame of P1 and P2.
 * @param dtS Step duration (s), `1 / 120 s` times the game speed; invalid values fall back to `DT`.
 * @returns The events of this tick in a reused array.
 */
export function stepRally(
  s: RallyState,
  inputs: readonly [Readonly<InputFrame>, Readonly<InputFrame>],
  dtS: number = DT,
): readonly SimEvent[] {
  const stepS = Number.isFinite(dtS) && dtS > 0 ? dtS : DT;
  const tickNo = s.tick + 1;
  const out = s.events;
  out.length = 0;
  swingTicksForOut(stepS, s.ticks);

  updateSwing(s, 0, inputs[0], tickNo, stepS);
  updateSwing(s, 1, inputs[1], tickNo, stepS);
  updatePlayer(s, 0, inputs[0], stepS);
  updatePlayer(s, 1, inputs[1], stepS);

  const shuttle = s.shuttle;
  if (shuttle.state === 'flying') {
    const result = stepShuttle(shuttle, stepS, s.physicsCfg, s.shuttleScratch, tickNo);
    if (result.netHitEvent !== null) {
      out.push(result.netHitEvent);
    }
    if (result.landEvent !== null) {
      out.push(result.landEvent);
      s.lastHitter = null;
    }
  }

  if (shuttle.state === 'flying') {
    let bestFraction = considerHit(s, 0, NO_HIT_FRACTION);
    let bestPlayer: PlayerIndex = 0;
    const fractionOfP2 = considerHit(s, 1, bestFraction);
    if (fractionOfP2 < bestFraction) {
      bestFraction = fractionOfP2;
      bestPlayer = 1;
    }
    if (bestFraction < NO_HIT_FRACTION) {
      applyHit(s, bestPlayer, bestFraction, tickNo, stepS);
    } else if (s.autoReturnEnabled) {
      resolvePlayerBoxAutoReturn(s.shuttleScratch.prevPos, shuttle, s.players);
    }
  }

  if (shuttle.state === 'flying') {
    shuttleOrientation(shuttle.quat, shuttle.vel, stepS, shuttle.quat);
  }

  s.tick = tickNo;
  return out;
}
