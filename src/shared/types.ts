/** 3D vector in SI meters (or m/s). */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Immutable 3D vector view. */
export interface ReadonlyVec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Unit quaternion representing 3D orientation. */
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Swing action button requested in an input frame. */
export type SwingButton = 'high' | 'power' | 'soft' | null;

/** Aim direction along court depth (-1 back, 0 neutral, +1 forward toward net). */
export type AimDirection = -1 | 0 | 1;

/** Per-tick player input snapshot emitted by keyboard, AI, or network. */
export interface InputFrame {
  /** Horizontal movement intent in [-1, 1]. */
  moveX: number;
  /** True while jump is pressed. */
  jump: boolean;
  /** Swing button pressed on this tick, or null. */
  swing: SwingButton;
  /** Aim modifier along court depth. */
  aim: AimDirection;
}

/** Shot classification types, per GAME_SPEC §5.3. */
export type ShotType =
  | 'CLEAR'
  | 'LIFT'
  | 'SMASH'
  | 'DRIVE'
  | 'DROP'
  | 'BLOCK'
  | 'NET_SHOT'
  | 'HIGH_SERVE'
  | 'LOW_SERVE';

/** Swing animation / hitbox plane kind, per GAME_SPEC §5.2. */
export type SwingKind = 'overhead' | 'mid' | 'underhand' | 'serve';

/** Timing grade around center of ACTIVE swing window, per GAME_SPEC §5.6. */
export type TimingGrade = 'PERFECT' | 'GOOD' | 'OK';

/** Supported game modes, per GAME_SPEC §1. */
export type GameMode = 'pve' | 'local' | 'online';

/** AI difficulty presets, per GAME_SPEC §8.4. */
export type DifficultyPreset = 'easy' | 'normal' | 'hard';

/** Match state machine phases, per GAME_SPEC §7.4. */
export type MatchPhase =
  | 'MENU'
  | 'MATCH_INTRO'
  | 'SERVE_SETUP'
  | 'AWAIT_SERVE'
  | 'RALLY'
  | 'POINT_END'
  | 'GAME_END'
  | 'MATCH_END'
  | 'PAUSED';

/** Rally end fault/win reason codes, per GAME_SPEC §7.2. */
export type RallyEndReason =
  | 'IN'
  | 'OUT'
  | 'NET'
  | 'SERVE_SHORT'
  | 'SERVE_FAULT'
  | 'SERVE_TOO_HIGH'
  | 'DOUBLE_HIT'
  | 'REACH_OVER'
  | 'FORFEIT';

/** Player index (0 = P1 left, 1 = P2 right). */
export type PlayerIndex = 0 | 1;

/** Discrete events produced by MatchSim.step(). */
export type SimEvent =
  | {
      type: 'hit';
      tick: number;
      hitter: PlayerIndex;
      shot: ShotType;
      swing: SwingKind;
      timing: TimingGrade;
      contact: Vec3;
      v0: Vec3;
      speedKmh: number;
      targetDepth: number;
      adjusted: boolean;
    }
  | {
      type: 'netHit';
      tick: number;
      heightM: number;
      fromSide: PlayerIndex;
    }
  | {
      type: 'land';
      tick: number;
      x: number;
      z: number;
      subTickFraction: number;
    }
  | {
      type: 'rallyEnd';
      tick: number;
      winner: PlayerIndex;
      reason: RallyEndReason;
    }
  | {
      type: 'score';
      tick: number;
      scores: [number, number];
      games: [number, number];
      server: PlayerIndex;
    }
  | {
      type: 'gameEnd';
      tick: number;
      winner: PlayerIndex;
      scores: [number, number];
    }
  | {
      type: 'matchEnd';
      tick: number;
      winner: PlayerIndex;
      games: [number, number];
    }
  | {
      type: 'squeak';
      tick: number;
      player: PlayerIndex;
      x: number;
    }
  | {
      type: 'swing';
      tick: number;
      player: PlayerIndex;
      kind: SwingKind;
      button: Exclude<SwingButton, null>;
    }
  | {
      type: 'serve';
      tick: number;
      server: PlayerIndex;
      shot: 'HIGH_SERVE' | 'LOW_SERVE';
    };

/** Match rules and mode configuration, per GAME_SPEC §1 & §7.1. */
export interface MatchConfig {
  mode: GameMode;
  difficulty: DifficultyPreset;
  pointsToWin: 5 | 11 | 21;
  gamesToWin: 1 | 2;
  gameSpeed: number;
  seed: number;
}

/** Read-only player snapshot exposed via test hooks. */
export interface PlayerSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  swingState: 'READY' | 'WINDUP' | 'ACTIVE' | 'RECOVERY';
}

/** Read-only shuttle snapshot exposed via test hooks. */
export interface ShuttleSnapshot {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  state: 'idle' | 'flying' | 'grounded';
}

/** Read-only scoreboard snapshot exposed via test hooks. */
export interface ScoreSnapshot {
  points: [number, number];
  games: [number, number];
}

/** Deterministic snapshot exposed by BadmintonTestHooks.getState(), per GAME_SPEC §13.2. */
export interface TestSnapshot {
  phase: MatchPhase;
  tick: number;
  players: [PlayerSnapshot, PlayerSnapshot];
  shuttle: ShuttleSnapshot;
  score: ScoreSnapshot;
  server: PlayerIndex;
  lastEvents: SimEvent[];
}

/** Automated testing API attached on client when DEV or ?test=1 is active, per GAME_SPEC §13.2. */
export interface BadmintonTestHooks {
  getState(): TestSnapshot;
  getEvents(sinceTick?: number): SimEvent[];
  pause(): void;
  resume(): void;
  step(ticks: number): void;
  setSeed(seed: number): void;
  startMatch(cfg: Partial<MatchConfig>): void;
  spawnShuttle(p: Vec3, v: Vec3): void;
  forceLanding(x: number): void;
  setInput(player: PlayerIndex, input: Partial<InputFrame>, ticks?: number): void;
}
