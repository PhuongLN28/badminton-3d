import { SHOT_POPUP_DURATION_S, SHOT_POPUP_FADE_OUT_S } from '@shared/config';
import type { SimEvent } from '@shared/types';
import { VI } from './i18n/vi';

/** The `hit` simulation event shown by the popup. */
export type HitEvent = Extract<SimEvent, { type: 'hit' }>;

/** DOM popup that names the last shot, its speed and the timing grade (GAME_SPEC §5.6, §10.6). */
export interface ShotPopup {
  /** Show the popup for `SHOT_POPUP_DURATION_S`, replacing any popup still on screen. */
  show(ev: HitEvent): void;
  /**
   * Advance the hide timer; call once per rendered frame. Time is counted here, never with timers.
   * @param dtS Frame duration (s).
   */
  update(dtS: number): void;
  /** Remove the popup element. */
  dispose(): void;
}

const CLASS_BASE = 'shot-popup';
const CLASS_VISIBLE = 'shot-popup--visible';
const CLASS_LEAVING = 'shot-popup--leaving';
const TIMING_CLASSES = [
  'shot-popup--perfect',
  'shot-popup--good',
  'shot-popup--early',
  'shot-popup--late',
] as const;

type TimingClass = (typeof TIMING_CLASSES)[number];

/** Timing label and style class for a hit. An OK grade is early when the offset is negative. */
function timingView(ev: Readonly<HitEvent>): { label: string; cls: TimingClass } {
  if (ev.timing === 'PERFECT') {
    return { label: VI.shotPopup.timingPerfect, cls: 'shot-popup--perfect' };
  }
  if (ev.timing === 'GOOD') {
    return { label: VI.shotPopup.timingGood, cls: 'shot-popup--good' };
  }
  return ev.timingOffsetS < 0
    ? { label: VI.shotPopup.timingEarly, cls: 'shot-popup--early' }
    : { label: VI.shotPopup.timingLate, cls: 'shot-popup--late' };
}

/**
 * Create the shot popup (`data-testid="shot-popup"`), hidden until `show` is called.
 * @param parent Element that receives the popup.
 */
export function createShotPopup(parent: HTMLElement): ShotPopup {
  const root = document.createElement('div');
  root.className = CLASS_BASE;
  root.setAttribute('data-testid', 'shot-popup');
  root.setAttribute('role', 'status');

  const shotEl = document.createElement('div');
  shotEl.className = 'shot-popup__shot';
  shotEl.setAttribute('data-testid', 'shot-popup-shot');

  const timingEl = document.createElement('div');
  timingEl.className = 'shot-popup__timing';
  timingEl.setAttribute('data-testid', 'shot-popup-timing');

  root.append(shotEl, timingEl);
  parent.appendChild(root);

  let remainingS = 0;
  let leaving = false;

  const hide = (): void => {
    remainingS = 0;
    leaving = false;
    root.classList.remove(CLASS_VISIBLE, CLASS_LEAVING);
  };

  const show = (ev: HitEvent): void => {
    const view = timingView(ev);
    const name = VI.shotPopup.names[ev.shot];
    shotEl.textContent = `${name} ${Math.round(ev.speedKmh)} ${VI.shotPopup.speedUnit}`;
    timingEl.textContent = view.label;

    root.classList.remove(CLASS_VISIBLE, CLASS_LEAVING, ...TIMING_CLASSES);
    // Force a reflow so the pop-in animation restarts on a back-to-back hit.
    void root.offsetWidth;
    root.classList.add(CLASS_VISIBLE, view.cls);
    remainingS = SHOT_POPUP_DURATION_S;
    leaving = false;
  };

  const update = (dtS: number): void => {
    if (remainingS <= 0 || !Number.isFinite(dtS) || dtS <= 0) {
      return;
    }
    remainingS -= dtS;
    if (remainingS <= 0) {
      hide();
      return;
    }
    if (!leaving && remainingS <= SHOT_POPUP_FADE_OUT_S) {
      leaving = true;
      root.classList.add(CLASS_LEAVING);
    }
  };

  const dispose = (): void => {
    hide();
    root.remove();
  };

  return { show, update, dispose };
}
