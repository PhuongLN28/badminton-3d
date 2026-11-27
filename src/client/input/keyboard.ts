import type { AimDirection, InputFrame, PlayerIndex, SwingButton } from '@shared/types';

/** Minimal keyboard event shape supported by `KeyboardInputController` (DOM or Node test). */
export interface KeyEventLike {
  readonly code: string;
  readonly repeat?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
  preventDefault?: () => void;
}

/** Minimal event target interface compatible with `window` and Node `EventTarget`. */
export interface KeyboardListenerTarget {
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

const P1_SWING_CODES: Readonly<Record<string, Exclude<SwingButton, null>>> = {
  KeyJ: 'high',
  KeyK: 'power',
  KeyL: 'soft',
};

const P2_SWING_CODES: Readonly<Record<string, Exclude<SwingButton, null>>> = {
  Numpad1: 'high',
  Comma: 'high',
  Numpad2: 'power',
  Period: 'power',
  Numpad3: 'soft',
  Slash: 'soft',
};

const GAME_CODES = new Set<string>([
  'KeyA',
  'KeyD',
  'KeyW',
  'KeyJ',
  'KeyK',
  'KeyL',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'Numpad1',
  'Comma',
  'Numpad2',
  'Period',
  'Numpad3',
  'Slash',
]);

function computeMoveX(leftHeld: boolean, rightHeld: boolean): number {
  return (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0);
}

function computeAim(moveX: number, facing: 1 | -1): AimDirection {
  if (moveX === 0) {
    return 0;
  }
  return moveX * facing > 0 ? 1 : -1;
}

/**
 * Stateful keyboard mapper translating `KeyboardEvent.code` into P1 & P2 `InputFrame`s
 * per GAME_SPEC §6.2 without per-tick heap allocations.
 */
export class KeyboardInputController {
  private readonly pressedCodes = new Set<string>();
  private readonly pendingSwing: [SwingButton, SwingButton] = [null, null];
  private readonly frames: [InputFrame, InputFrame] = [
    { moveX: 0, jump: false, swing: null, aim: 0 },
    { moveX: 0, jump: false, swing: null, aim: 0 },
  ];

  /** Process a key press by `event.code`. */
  public handleKeyDown(event: KeyEventLike): void {
    const { code } = event;
    if (!GAME_CODES.has(code)) {
      return;
    }

    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault?.();
    }

    this.pressedCodes.add(code);

    if (event.repeat) {
      return;
    }

    const p1Swing = P1_SWING_CODES[code];
    if (p1Swing !== undefined) {
      this.pendingSwing[0] = p1Swing;
    }

    const p2Swing = P2_SWING_CODES[code];
    if (p2Swing !== undefined) {
      this.pendingSwing[1] = p2Swing;
    }
  }

  /** Process a key release by `event.code`. */
  public handleKeyUp(event: KeyEventLike): void {
    this.pressedCodes.delete(event.code);
  }

  /** Release every held key and queued swing (called on `blur` or hidden tab). */
  public handleBlur(): void {
    this.pressedCodes.clear();
    this.pendingSwing[0] = null;
    this.pendingSwing[1] = null;
  }

  /** Inspect current input frames without clearing one-shot swing presses. */
  public peekFrames(): readonly [InputFrame, InputFrame] {
    this.updateFrame(0, 'KeyA', 'KeyD', 'KeyW', 1, false);
    this.updateFrame(1, 'ArrowLeft', 'ArrowRight', 'ArrowUp', -1, false);
    return this.frames;
  }

  /** Read current input frames for one simulation tick and consume one-shot swing presses. */
  public consumeFrames(): readonly [InputFrame, InputFrame] {
    this.updateFrame(0, 'KeyA', 'KeyD', 'KeyW', 1, true);
    this.updateFrame(1, 'ArrowLeft', 'ArrowRight', 'ArrowUp', -1, true);
    return this.frames;
  }

  private updateFrame(
    index: PlayerIndex,
    leftCode: string,
    rightCode: string,
    jumpCode: string,
    facing: 1 | -1,
    consumeSwing: boolean,
  ): void {
    const frame = this.frames[index];
    const moveX = computeMoveX(
      this.pressedCodes.has(leftCode),
      this.pressedCodes.has(rightCode),
    );
    frame.moveX = moveX;
    frame.jump = this.pressedCodes.has(jumpCode);
    frame.aim = computeAim(moveX, facing);
    frame.swing = this.pendingSwing[index];
    if (consumeSwing) {
      this.pendingSwing[index] = null;
    }
  }
}

/**
 * Attach DOM `keydown`, `keyup`, `blur`, and optional `visibilitychange` listeners
 * to drive a `KeyboardInputController`, returning a cleanup function.
 */
export function attachKeyboardListeners(
  target: KeyboardListenerTarget,
  controller: KeyboardInputController,
  visibilityTarget?: {
    readonly hidden?: boolean;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  },
): () => void {
  const onKeyDown: EventListener = (rawEvent) => {
    const event = rawEvent as Event & Partial<KeyEventLike>;
    if (typeof event.code === 'string') {
      controller.handleKeyDown({
        code: event.code,
        repeat: event.repeat ?? false,
        ctrlKey: event.ctrlKey ?? false,
        metaKey: event.metaKey ?? false,
        altKey: event.altKey ?? false,
        preventDefault: () => rawEvent.preventDefault(),
      });
    }
  };

  const onKeyUp: EventListener = (rawEvent) => {
    const event = rawEvent as Event & Partial<KeyEventLike>;
    if (typeof event.code === 'string') {
      controller.handleKeyUp({ code: event.code });
    }
  };

  const onBlur: EventListener = () => {
    controller.handleBlur();
  };

  const onVisibilityChange: EventListener = () => {
    if (visibilityTarget?.hidden) {
      controller.handleBlur();
    }
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', onBlur);
  visibilityTarget?.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
    target.removeEventListener('blur', onBlur);
    visibilityTarget?.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
