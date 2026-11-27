import {
  COURT_HALF_LENGTH,
  DEBUG_AUTO_RETURN,
  DEFAULT_GAME_SPEED,
  SHUTTLE_MAX_SPEED,
} from '@shared/config';
import type { Vec3 } from '@shared/types';
import { BooleanController, Controller, FunctionController, GUI, OptionController } from 'lil-gui';
import shuttleReference from '../../../tests/fixtures/shuttle_reference.json';
import { VI } from './i18n/vi';

/** Parameters emitted when launching a test shuttle from the debug lab. */
export interface ShuttleLaunchRequest {
  p0: Vec3;
  v0: Vec3;
  gravityEnabled: boolean;
  dragEnabled: boolean;
  collideNet: boolean;
}

/** Host callbacks wired into the Phase 2 shuttle physics lab GUI. */
export interface ShuttleLabCallbacks {
  onLaunch(req: ShuttleLaunchRequest): void;
  onReverseVelocity(): void;
  onClearTrail(): void;
  onToggleAutoReturn(enabled: boolean): void;
  onChangeGameSpeed(speed: number): void;
  onChangeCameraMode(mode: 'side' | 'closeup'): void;
}

/** Public handle for controlling the lil-gui shuttle physics lab. */
export interface ShuttleLabGuiHandle {
  isVisible(): boolean;
  setVisible(visible: boolean): void;
  launchCurrentPreset(): void;
  dispose(): void;
}

type PresetName = keyof typeof VI.shuttleLab.presets;

interface ShuttlePresetSpec {
  readonly x0: number;
  readonly y0: number;
  readonly speed: number;
  readonly elevationDeg: number;
  readonly gravityEnabled: boolean;
  readonly dragEnabled: boolean;
}

interface ShuttleLabState {
  preset: PresetName;
  x0: number;
  y0: number;
  speed: number;
  elevationDeg: number;
  gravityEnabled: boolean;
  dragEnabled: boolean;
  collideNet: boolean;
  autoReturn: boolean;
  gameSpeed: number;
  cameraMode: 'side' | 'closeup';
  launchCurrentPreset: () => void;
  reverseVelocity: () => void;
  clearTrail: () => void;
}

const GUI_WIDTH_PX = 310;
const MAX_LAUNCH_Y_M = 55;
const MIN_ELEVATION_DEG = -60;
const MAX_ELEVATION_DEG = 89;
const POS_STEP_M = 0.05;
const SPEED_ANGLE_STEP = 0.1;
const DEFAULT_PRESET: PresetName = 'clear_from_back';

const PRESETS: ReadonlyMap<PresetName, ShuttlePresetSpec> = (() => {
  const map = new Map<PresetName, ShuttlePresetSpec>();
  for (const entry of shuttleReference.cases) {
    if (!Object.prototype.hasOwnProperty.call(VI.shuttleLab.presets, entry.name)) {
      continue;
    }
    const name = entry.name as PresetName;
    map.set(name, {
      x0: entry.p0[0] ?? 0,
      y0: entry.p0[1] ?? 0,
      speed: entry.speed,
      elevationDeg: entry.elevation_deg,
      gravityEnabled: entry.gravity,
      dragEnabled: entry.drag,
    });
  }
  return map;
})();

function bindButton(controller: Controller, testId: string): FunctionController | null {
  if (controller instanceof FunctionController) {
    controller.$button.dataset.testid = testId;
    return controller;
  }
  return null;
}

function setControlTestId(controller: Controller, testId: string): void {
  if (controller instanceof OptionController) {
    controller.$select.dataset.testid = testId;
  } else if (controller instanceof BooleanController) {
    controller.$input.dataset.testid = testId;
  }
}

/**
 * Create the lil-gui "Bắn thử quả cầu" debug panel for testing shuttle physics presets and parameters.
 * @param initialVisible Whether the GUI starts visible (e.g. `?debug=1`).
 * @param callbacks Callbacks invoked on user launch, camera/speed switches, and trail actions.
 */
export function createShuttleLabGui(
  initialVisible: boolean,
  callbacks: ShuttleLabCallbacks,
): ShuttleLabGuiHandle {
  const initialSpec = PRESETS.get(DEFAULT_PRESET) ?? {
    x0: -5.0,
    y0: 2.6,
    speed: 46.9,
    elevationDeg: 45,
    gravityEnabled: true,
    dragEnabled: true,
  };

  let visible = initialVisible;
  let disposed = false;

  const launchCurrentPreset = (): void => {
    const rad = (state.elevationDeg * Math.PI) / 180;
    callbacks.onLaunch({
      p0: { x: state.x0, y: state.y0, z: 0 },
      v0: {
        x: state.speed * Math.cos(rad),
        y: state.speed * Math.sin(rad),
        z: 0,
      },
      gravityEnabled: state.gravityEnabled,
      dragEnabled: state.dragEnabled,
      collideNet: state.collideNet,
    });
  };

  let launchBtn: FunctionController | null = null;
  let reverseBtn: FunctionController | null = null;
  let clearTrailBtn: FunctionController | null = null;

  const state: ShuttleLabState = {
    preset: DEFAULT_PRESET,
    x0: initialSpec.x0,
    y0: initialSpec.y0,
    speed: initialSpec.speed,
    elevationDeg: initialSpec.elevationDeg,
    gravityEnabled: initialSpec.gravityEnabled,
    dragEnabled: initialSpec.dragEnabled,
    collideNet: true,
    autoReturn: DEBUG_AUTO_RETURN,
    gameSpeed: DEFAULT_GAME_SPEED,
    cameraMode: 'side',
    launchCurrentPreset: () => {
      launchCurrentPreset();
      launchBtn?.$button.blur();
    },
    reverseVelocity: () => {
      callbacks.onReverseVelocity();
      reverseBtn?.$button.blur();
    },
    clearTrail: () => {
      callbacks.onClearTrail();
      clearTrailBtn?.$button.blur();
    },
  };

  const gui = new GUI({ title: VI.shuttleLab.title, width: GUI_WIDTH_PX });
  gui.domElement.classList.add('shuttle-lab-gui');
  gui.domElement.setAttribute('data-testid', 'shuttle-lab-gui');

  const presetOptions: Record<string, PresetName> = {};
  for (const key of Object.keys(VI.shuttleLab.presets) as PresetName[]) {
    if (PRESETS.has(key)) {
      presetOptions[VI.shuttleLab.presets[key]] = key;
    }
  }

  const presetCtrl = gui.add(state, 'preset', presetOptions).name(VI.shuttleLab.presetLabel);
  setControlTestId(presetCtrl, 'shuttle-lab-preset');

  const x0Ctrl = gui
    .add(state, 'x0', -COURT_HALF_LENGTH, COURT_HALF_LENGTH, POS_STEP_M)
    .name(VI.shuttleLab.x0Label);
  const y0Ctrl = gui.add(state, 'y0', 0, MAX_LAUNCH_Y_M, POS_STEP_M).name(VI.shuttleLab.y0Label);
  const speedCtrl = gui
    .add(state, 'speed', 0, SHUTTLE_MAX_SPEED, SPEED_ANGLE_STEP)
    .name(VI.shuttleLab.speedLabel);
  const elevationCtrl = gui
    .add(state, 'elevationDeg', MIN_ELEVATION_DEG, MAX_ELEVATION_DEG, SPEED_ANGLE_STEP)
    .name(VI.shuttleLab.elevationLabel);
  const gravityCtrl = gui.add(state, 'gravityEnabled').name(VI.shuttleLab.gravityLabel);
  setControlTestId(gravityCtrl, 'shuttle-lab-gravity');
  const dragCtrl = gui.add(state, 'dragEnabled').name(VI.shuttleLab.dragLabel);
  setControlTestId(dragCtrl, 'shuttle-lab-drag');
  const collideNetCtrl = gui.add(state, 'collideNet').name(VI.shuttleLab.collideNetLabel);
  setControlTestId(collideNetCtrl, 'shuttle-lab-collide-net');
  const autoReturnCtrl = gui.add(state, 'autoReturn').name(VI.shuttleLab.autoReturnLabel);
  setControlTestId(autoReturnCtrl, 'shuttle-lab-auto-return');

  const gameSpeedCtrl = gui
    .add(state, 'gameSpeed', { '1.0x': 1.0, '1.15x': 1.15, '1.3x': 1.3 })
    .name(VI.shuttleLab.gameSpeedLabel);
  setControlTestId(gameSpeedCtrl, 'shuttle-lab-game-speed');

  const cameraModeCtrl = gui
    .add(state, 'cameraMode', {
      [VI.shuttleLab.cameraModes.side]: 'side',
      [VI.shuttleLab.cameraModes.closeup]: 'closeup',
    })
    .name(VI.shuttleLab.cameraModeLabel);
  setControlTestId(cameraModeCtrl, 'shuttle-lab-camera-mode');

  launchBtn = bindButton(
    gui.add(state, 'launchCurrentPreset').name(VI.shuttleLab.launchButton),
    'shuttle-lab-launch',
  );
  reverseBtn = bindButton(
    gui.add(state, 'reverseVelocity').name(VI.shuttleLab.reverseButton),
    'shuttle-lab-reverse',
  );
  clearTrailBtn = bindButton(
    gui.add(state, 'clearTrail').name(VI.shuttleLab.clearTrailButton),
    'shuttle-lab-clear-trail',
  );

  presetCtrl.onChange(() => {
    const nextSpec = PRESETS.get(state.preset);
    if (!nextSpec) {
      return;
    }
    state.x0 = nextSpec.x0;
    state.y0 = nextSpec.y0;
    state.speed = nextSpec.speed;
    state.elevationDeg = nextSpec.elevationDeg;
    state.gravityEnabled = nextSpec.gravityEnabled;
    state.dragEnabled = nextSpec.dragEnabled;
    x0Ctrl.updateDisplay();
    y0Ctrl.updateDisplay();
    speedCtrl.updateDisplay();
    elevationCtrl.updateDisplay();
    gravityCtrl.updateDisplay();
    dragCtrl.updateDisplay();
  });

  autoReturnCtrl.onChange(() => callbacks.onToggleAutoReturn(state.autoReturn));
  gameSpeedCtrl.onChange(() => callbacks.onChangeGameSpeed(state.gameSpeed));
  cameraModeCtrl.onChange(() => callbacks.onChangeCameraMode(state.cameraMode));

  const stopKeyPropagation = (event: KeyboardEvent): void => {
    if (event.code !== 'F3') {
      event.stopPropagation();
    }
  };
  gui.domElement.addEventListener('keydown', stopKeyPropagation);
  gui.domElement.addEventListener('keyup', stopKeyPropagation);

  if (!initialVisible) {
    gui.hide();
  }

  return {
    isVisible: () => visible,
    setVisible: (nextVisible: boolean) => {
      visible = nextVisible;
      gui.show(nextVisible);
    },
    launchCurrentPreset,
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      gui.domElement.removeEventListener('keydown', stopKeyPropagation);
      gui.domElement.removeEventListener('keyup', stopKeyPropagation);
      gui.destroy();
    },
  };
}
