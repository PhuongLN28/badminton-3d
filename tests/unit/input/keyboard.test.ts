import { describe, expect, it, vi } from 'vitest';
import {
  attachKeyboardListeners,
  KeyboardInputController,
} from '../../../src/client/input/keyboard';

function dispatchKey(
  target: EventTarget,
  type: 'keydown' | 'keyup',
  code: string,
  repeat = false,
): Event {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, 'code', { value: code });
  Object.defineProperty(event, 'repeat', { value: repeat });
  target.dispatchEvent(event);
  return event;
}

describe('Bộ điều khiển bàn phím KeyboardInputController', () => {
  it('P1-U06 Input: giữ trái + phải cùng lúc cho moveX = 0; sự kiện blur thả mọi phím', () => {
    const controller = new KeyboardInputController();
    const target = new EventTarget();
    const detach = attachKeyboardListeners(target, controller);

    // P1: A + D đồng thời -> moveX = 0, nhả A -> moveX = +1, aim = +1
    dispatchKey(target, 'keydown', 'KeyA');
    expect(controller.peekFrames()[0].moveX).toBe(-1);
    expect(controller.peekFrames()[0].aim).toBe(-1);

    dispatchKey(target, 'keydown', 'KeyD');
    expect(controller.peekFrames()[0].moveX).toBe(0);
    expect(controller.peekFrames()[0].aim).toBe(0);

    dispatchKey(target, 'keyup', 'KeyA');
    expect(controller.peekFrames()[0].moveX).toBe(1);
    expect(controller.peekFrames()[0].aim).toBe(1);

    // P2: ArrowLeft + ArrowRight đồng thời -> moveX = 0; đang giữ nhảy và đánh
    dispatchKey(target, 'keydown', 'ArrowLeft');
    expect(controller.peekFrames()[1].moveX).toBe(-1);
    expect(controller.peekFrames()[1].aim).toBe(1); // P2 facing -1 -> tiến về lưới = +1

    dispatchKey(target, 'keydown', 'ArrowRight');
    expect(controller.peekFrames()[1].moveX).toBe(0);
    expect(controller.peekFrames()[1].aim).toBe(0);

    dispatchKey(target, 'keydown', 'KeyW');
    dispatchKey(target, 'keydown', 'ArrowUp');
    dispatchKey(target, 'keydown', 'KeyJ');
    dispatchKey(target, 'keydown', 'Comma');

    const beforeBlur = controller.peekFrames();
    expect(beforeBlur[0].jump).toBe(true);
    expect(beforeBlur[0].swing).toBe('high');
    expect(beforeBlur[1].jump).toBe(true);
    expect(beforeBlur[1].swing).toBe('high');

    // Sự kiện blur -> thả sạch toàn bộ phím của cả P1 và P2
    target.dispatchEvent(new Event('blur'));

    const afterBlur = controller.consumeFrames();
    expect(afterBlur[0]).toEqual({ moveX: 0, jump: false, swing: null, aim: 0 });
    expect(afterBlur[1]).toEqual({ moveX: 0, jump: false, swing: null, aim: 0 });

    // Kiểm tra các phím đánh khác của P1 & P2 và one-shot swing (không lặp khi giữ)
    const preventSpy = vi.fn();
    controller.handleKeyDown({ code: 'KeyK', repeat: false, preventDefault: preventSpy });
    controller.handleKeyDown({ code: 'Period', repeat: false, preventDefault: preventSpy });
    expect(preventSpy).toHaveBeenCalledTimes(2);

    const consumed = controller.consumeFrames();
    expect(consumed[0].swing).toBe('power');
    expect(consumed[1].swing).toBe('power');

    // Repeat keydown không phát sinh thêm cú đánh
    controller.handleKeyDown({ code: 'KeyK', repeat: true });
    const afterConsume = controller.consumeFrames();
    expect(afterConsume[0].swing).toBeNull();
    expect(afterConsume[1].swing).toBeNull();

    // Phím L và Slash -> soft
    controller.handleKeyDown({ code: 'KeyL', repeat: false });
    controller.handleKeyDown({ code: 'Slash', repeat: false });
    const softConsumed = controller.consumeFrames();
    expect(softConsumed[0].swing).toBe('soft');
    expect(softConsumed[1].swing).toBe('soft');

    detach();
  });
});
