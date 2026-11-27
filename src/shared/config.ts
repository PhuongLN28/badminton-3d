import type {
  HitboxSpec,
  ShotParams,
  ShotType,
  SwingKind,
  TimingGrade,
  TimingParams,
} from './types';

/** Fixed simulation frequency (Hz), per GAME_SPEC §3. */
export const PHYSICS_HZ = 120;

/** Fixed simulation step duration (s), per GAME_SPEC §3. */
export const DT = 1 / PHYSICS_HZ;

/** Maximum frame delta clamp (s) to prevent spiral of death when tab pauses, per GAME_SPEC §3. */
export const MAX_FRAME_DELTA = 0.1;

/** Default simulation speed multiplier (dimensionless), per GAME_SPEC §3. */
export const DEFAULT_GAME_SPEED = 1.0;

/** Floating-point tolerance (s) when consuming accumulated time steps. */
export const ACCUMULATOR_EPSILON = 1e-12;

/** Default deterministic RNG seed for offline matches and initialization. */
export const DEFAULT_RNG_SEED = 20261127;

/** Half-length of the badminton court along the X axis (m), per GAME_SPEC §2. */
export const COURT_HALF_LENGTH = 6.7;

/** Half-width of the doubles court along the Z axis (m), per GAME_SPEC §2. */
export const COURT_HALF_WIDTH_DOUBLES = 3.05;

/** Half-width of the singles court along the Z axis (m), per GAME_SPEC §2. */
export const COURT_HALF_WIDTH_SINGLES = 2.59;

/** Distance from net to the short service line (m), per GAME_SPEC §2. */
export const SHORT_SERVICE_LINE = 1.98;

/** Distance from net to the doubles long service line (m), per GAME_SPEC §2. */
export const DOUBLES_LONG_SERVICE_LINE = 5.94;

/** Court boundary line thickness (m), per GAME_SPEC §2. */
export const LINE_WIDTH = 0.04;

/** Net top height at court center (m), per GAME_SPEC §2. */
export const NET_HEIGHT_CENTER = 1.524;

/** Net post height at court sides (m), per GAME_SPEC §2. */
export const NET_HEIGHT_POST = 1.55;

/** Vertical height of the net mesh drop (m), per GAME_SPEC §2. */
export const NET_DEPTH = 0.76;

/** White top tape height of the net (m), per GAME_SPEC §2. */
export const NET_TAPE_HEIGHT = 0.075;

/** Total outer stadium floor width along the X axis (m), per GAME_SPEC §10.2. */
export const OUTER_FLOOR_WIDTH = 20.0;

/** Total outer stadium floor depth along the Z axis (m), per GAME_SPEC §10.2. */
export const OUTER_FLOOR_DEPTH = 12.0;

/** Maximum horizontal player running speed (m/s), per GAME_SPEC §6.1. */
export const PLAYER_MAX_SPEED = 5.0;

/** Horizontal ground acceleration of player (m/s^2), per GAME_SPEC §6.1. */
export const PLAYER_ACCEL = 30.0;

/** Horizontal ground deceleration of player (m/s^2), per GAME_SPEC §6.1. */
export const PLAYER_DECEL = 40.0;

/** Horizontal acceleration multiplier while airborne (dimensionless), per GAME_SPEC §6.1. */
export const PLAYER_AIR_CONTROL = 0.5;

/** Initial upward jump velocity (m/s), per GAME_SPEC §6.1. */
export const JUMP_V0 = 4.2;

/** Downward gravity applied to players (m/s^2), per GAME_SPEC §6.1. */
export const PLAYER_GRAVITY = 16.0;

/** Minimum distance from net plane x = 0 that players must keep (m), per GAME_SPEC §6.1. */
export const PLAYER_NET_MARGIN = 0.35;

/** Maximum distance behind x = 0 a player can retreat (m), per GAME_SPEC §6.1. */
export const PLAYER_BACK_LIMIT = 8.0;

/** Visual player height (m), per GAME_SPEC §6.1. */
export const PLAYER_HEIGHT = 1.75;

/** Half-width of player collision box along X (m), per GAME_SPEC §6.1. */
export const PLAYER_BODY_HALF_WIDTH = 0.25;

/** Depth of player collision box along Z (m), per GAME_SPEC §10.4. */
export const PLAYER_BODY_DEPTH = 0.4;

/** Camera vertical field of view (deg), per GAME_SPEC §10.5. */
export const CAMERA_FOV_DEG = 40;

/** Camera near clipping plane distance (m). */
export const CAMERA_NEAR = 0.1;

/** Camera far clipping plane distance (m). */
export const CAMERA_FAR = 100.0;

/** Default side-view camera world position (m), per GAME_SPEC §10.5. */
export const CAMERA_DEFAULT_POS = { x: 0, y: 3.2, z: 15.5 } as const;

/** Default camera look-at target point (m), per GAME_SPEC §10.5. */
export const CAMERA_DEFAULT_LOOK_AT = { x: 0, y: 2.2, z: 0 } as const;

/** Minimum visible half-width along court X axis on narrow viewports (m), per GAME_SPEC §10.5. */
export const CAMERA_MIN_VISIBLE_HALF_X = 7.6;

/** Maximum WebGL renderer pixel ratio cap (dimensionless), per GAME_SPEC §10.1. */
export const RENDERER_MAX_PIXEL_RATIO = 2;

/** Directional shadow map resolution (px), per GAME_SPEC §10.1. */
export const SHADOW_MAP_SIZE = 2048;

/** Arena background clear hex color. */
export const SCENE_BG_COLOR = 0x101824;

/** Outer floor hex color, per GAME_SPEC §10.2. */
export const OUTER_FLOOR_COLOR = 0x1e293b;

/** Court mat surface hex color, per GAME_SPEC §10.2. */
export const COURT_MAT_COLOR = 0x166534;

/** Player 1 primary hex color, per GAME_SPEC §10.4. */
export const PLAYER_1_COLOR = 0x257de0;

/** Player 2 primary hex color, per GAME_SPEC §10.4. */
export const PLAYER_2_COLOR = 0xf47230;

/** Initial distance of each player from the net along X (m), per GAME_SPEC §7.3. */
export const PLAYER_INITIAL_X = 2.6;

/** Ground clamp threshold for player vertical landing (m) to avoid float residue. */
export const PLAYER_GROUND_EPSILON = 1e-9;

/** Green apron border width extending outside doubles boundary lines (m). */
export const COURT_APRON_MARGIN = 0.6;

/** Vertical lift of court mat above outer stadium floor (m) to avoid z-fighting. */
export const COURT_SURFACE_Y = 0.002;

/** Court canvas texture width along X (px). */
export const COURT_TEXTURE_WIDTH_PX = 2048;

/** Court canvas texture height along Z (px). */
export const COURT_TEXTURE_HEIGHT_PX = 1024;

/** Court mat CSS hex color for CanvasTexture drawing. */
export const COURT_MAT_COLOR_HEX = '#166534';

/** Court boundary line CSS hex color for CanvasTexture drawing. */
export const COURT_LINE_COLOR_HEX = '#ffffff';

/** Radius of cylindrical net posts placed at z = ±3.05 m (m). */
export const NET_POST_RADIUS = 0.025;

/** Metallic hex color of the two net posts. */
export const NET_POST_COLOR = 0x94a3b8;

/** White top net tape hex color. */
export const NET_TAPE_COLOR = 0xf8fafc;

/** Thickness along X of the top white net tape box (m) so it stays visible from side view. */
export const NET_TAPE_THICKNESS = 0.028;

/** Height of the bottom net cord trim (m). */
export const NET_CORD_HEIGHT = 0.016;

/** Number of thin cross-ribs along Z so net body remains visible edge-on from x = 0. */
export const NET_MESH_RIB_COUNT = 9;

/** Net mesh alpha CanvasTexture width along Z (px). */
export const NET_TEXTURE_WIDTH_PX = 1024;

/** Net mesh alpha CanvasTexture height along Y (px). */
export const NET_TEXTURE_HEIGHT_PX = 256;

/** Dimensions of placeholder racket block attached to box players in Phases 1–5 (m). */
export const PLAYER_RACKET_MARKER_SIZE = { x: 0.22, y: 0.34, z: 0.04 } as const;

/** Local offset from player feet to placeholder racket center (m). */
export const PLAYER_RACKET_MARKER_OFFSET = { x: 0.34, y: 1.15, z: 0.16 } as const;

/** Hex color of the placeholder racket block. */
export const PLAYER_RACKET_COLOR = 0xfef08a;

/** Gravitational acceleration acting on the shuttle (m/s^2), per GAME_SPEC §4.1. */
export const GRAVITY = 9.81;

/** Shuttlecock terminal velocity in air (m/s), per GAME_SPEC §4.1. */
export const SHUTTLE_TERMINAL_VELOCITY = 6.8;

/** Characteristic aerodynamic decay length L = VT^2 / g (m), per GAME_SPEC §4.1. */
export const SHUTTLE_CHAR_LENGTH =
  (SHUTTLE_TERMINAL_VELOCITY * SHUTTLE_TERMINAL_VELOCITY) / GRAVITY;

/** Maximum allowed shuttle speed clamp (m/s) for safety and anti-NaN, per GAME_SPEC §4.1. */
export const SHUTTLE_MAX_SPEED = 120;

/** Maximum absolute coordinate clamp for shuttle position (m) to prevent float overflow. */
export const SHUTTLE_MAX_POS_COORD = 1_000_000_000;

/** Minimum shuttle speed required to update nose orientation (m/s), per GAME_SPEC §4.1. */
export const SHUTTLE_MIN_SPEED_FOR_ORIENT = 0.05;

/** Exponential slerp rate for aligning shuttle cork nose with velocity (1/s), per GAME_SPEC §4.5. */
export const SHUTTLE_ORIENT_RATE = 40;

/** Horizontal separation offset applied after a net collision (m), per GAME_SPEC §4.4. */
export const NET_BOUNCE_OFFSET_X = 0.02;

/** Horizontal restitution factor on net collision (dimensionless), per GAME_SPEC §4.4. */
export const NET_BOUNCE_RESTITUTION_X = 0.15;

/** Downward vertical velocity damping factor on net collision (dimensionless), per GAME_SPEC §4.4. */
export const NET_BOUNCE_DAMPING_Y = 0.5;

/** Lateral velocity damping factor on net collision (dimensionless), per GAME_SPEC §4.4. */
export const NET_BOUNCE_DAMPING_Z = 0.3;

/** Whether net cord roll-over randomness is enabled (disabled for MVP), per GAME_SPEC §4.4. */
export const NET_CORD_ENABLED = false;

/** Default maximum simulated flight duration before stopping (s). */
export const FLIGHT_DEFAULT_MAX_TIME_S = 10.0;

/** Temporary Phase 2 flag enabling automatic player-box shuttle bounce-back; disabled in Phase 3, per ROADMAP Phase 3. */
export const DEBUG_AUTO_RETURN = false;

/** Launch speed for temporary Phase 2 player-box auto-return (m/s), per ROADMAP Phase 2. */
export const DEBUG_AUTO_RETURN_SPEED = 30.0;

/** Launch elevation angle for temporary Phase 2 player-box auto-return (deg), per ROADMAP Phase 2. */
export const DEBUG_AUTO_RETURN_ANGLE_DEG = 50.0;

/** Horizontal launch speed component for Phase 2 player-box auto-return (m/s). */
export const DEBUG_AUTO_RETURN_VX =
  DEBUG_AUTO_RETURN_SPEED * Math.cos((DEBUG_AUTO_RETURN_ANGLE_DEG * Math.PI) / 180);

/** Vertical launch speed component for Phase 2 player-box auto-return (m/s). */
export const DEBUG_AUTO_RETURN_VY =
  DEBUG_AUTO_RETURN_SPEED * Math.sin((DEBUG_AUTO_RETURN_ANGLE_DEG * Math.PI) / 180);

/** Visual magnification factor for rendered shuttlecock mesh (dimensionless), per GAME_SPEC §10.3. */
export const SHUTTLE_VISUAL_SCALE = 2.5;

/** Unscaled cork hemisphere radius of the shuttlecock (m), per GAME_SPEC §10.3. */
export const SHUTTLE_CORK_RADIUS = 0.013;

/** Unscaled inner skirt radius at cork base (m), per GAME_SPEC §10.3. */
export const SHUTTLE_SKIRT_RADIUS_INNER = 0.013;

/** Unscaled outer skirt radius at feather tips (m), per GAME_SPEC §10.3. */
export const SHUTTLE_SKIRT_RADIUS_OUTER = 0.032;

/** Unscaled feather skirt length along -Y local axis (m), per GAME_SPEC §10.3. */
export const SHUTTLE_SKIRT_LENGTH = 0.065;

/** Radial segment count for the shuttlecock skirt geometry, per GAME_SPEC §10.3. */
export const SHUTTLE_SKIRT_SEGMENTS = 16;

/** Warm ivory hex color for the shuttlecock cork base. */
export const SHUTTLE_CORK_COLOR = 0xfff8e7;

/** Accent band hex color around the cork-skirt collar. */
export const SHUTTLE_BAND_COLOR = 0x1d4ed8;

/** Base radius of the ground blob shadow directly beneath the shuttle (m). */
export const SHUTTLE_BLOB_SHADOW_RADIUS = 0.18;

/** Shuttle height at which the ground blob shadow fades to minimum opacity (m). */
export const SHUTTLE_BLOB_SHADOW_MAX_HEIGHT = 9.0;

/** Maximum blob shadow opacity when the shuttle is near floor level (dimensionless). */
export const SHUTTLE_BLOB_SHADOW_MAX_OPACITY = 0.55;

/** Minimum blob shadow opacity at high altitude (dimensionless). */
export const SHUTTLE_BLOB_SHADOW_MIN_OPACITY = 0.12;

/** Duration of the trailing flight ribbon behind the shuttle (s), per GAME_SPEC §10.3. */
export const SHUTTLE_TRAIL_DURATION_S = 0.3;

/** Time interval between debug trajectory sample dots (s), per GAME_SPEC §10.3. */
export const SHUTTLE_DEBUG_DOT_INTERVAL_S = 0.1;

/** Inner radius of the floor landing marker ring (m). */
export const LANDING_MARKER_INNER_RADIUS = 0.14;

/** Outer radius of the floor landing marker ring (m). */
export const LANDING_MARKER_OUTER_RADIUS = 0.22;

/** Floor landing marker hex color when the landing point is IN bounds. */
export const LANDING_MARKER_IN_COLOR = 0x22c55e;

/** Floor landing marker hex color when the landing point is OUT of bounds. */
export const LANDING_MARKER_OUT_COLOR = 0xef4444;

/** Shuttle height weight used for dynamic side-camera look-at Y (dimensionless), per GAME_SPEC §10.5. */
export const CAMERA_LOOK_Y_SHUTTLE_FACTOR = 0.6;

/** Maximum vertical look-at target height for the dynamic side camera (m), per GAME_SPEC §10.5. */
export const CAMERA_LOOK_Y_MAX = 4.5;

/** Shuttle height threshold above which the camera pulls back along Z (m), per GAME_SPEC §10.5. */
export const CAMERA_HIGH_SHUTTLE_Y = 6.0;

/** Pulled-back camera Z distance when shuttle exceeds high-altitude threshold (m), per GAME_SPEC §10.5. */
export const CAMERA_HIGH_SHUTTLE_Z = 18.0;

/** Exponential damping rate for smooth dynamic camera motion (1/s), per GAME_SPEC §10.5. */
export const CAMERA_DAMPING_RATE = 8.0;

/** Local offset from shuttle position for the debug close-up inspection camera (m). */
export const CAMERA_CLOSEUP_OFFSET = { x: 0, y: 0.25, z: 2.2 } as const;

/** Maximum number of recent SimEvents retained in ring/rolling buffer for test hooks. */
export const MAX_STORED_EVENTS = 512;

// ---------------------------------------------------------------------------
// Phase 3: swing, hitbox, shot table, solver and timing (GAME_SPEC §5)
// ---------------------------------------------------------------------------

/** Swing wind-up duration before the ACTIVE span starts (s), per GAME_SPEC §5.1. */
export const SWING_WINDUP = 0.05;

/** Swing ACTIVE span duration while the hitbox is enabled (s), per GAME_SPEC §5.1. */
export const SWING_ACTIVE = 0.2;

/** Swing recovery duration after the ACTIVE span (s), per GAME_SPEC §5.1. */
export const SWING_RECOVERY = 0.25;

/** Horizontal move factor applied while the swing phase is not READY (dimensionless), per GAME_SPEC §5.1. */
export const SWING_MOVE_FACTOR = 0.5;

/** Look-ahead used to predict the shuttle height at swing start: wind-up plus half the ACTIVE span (s), per GAME_SPEC §5.2. */
export const SWING_PREDICT_LEAD_S = SWING_WINDUP + SWING_ACTIVE / 2;

/** Predicted height above the feet from which a swing is overhead (m), per GAME_SPEC §5.2. */
export const SWING_OVERHEAD_MIN_HEIGHT = 1.8;

/** Predicted height above the feet from which a swing is mid rather than underhand (m), per GAME_SPEC §5.2. */
export const SWING_MID_MIN_HEIGHT = 1.0;

/** Swing kind used when the shuttle is not flying at swing start (proposal, see DECISIONS D-017). */
export const SWING_FALLBACK_KIND: Exclude<SwingKind, 'serve'> = 'mid';

/** Overhead hitbox relative to the feet: forward offset, center height, radius (m), per GAME_SPEC §5.2. */
export const HITBOX_OVERHEAD: HitboxSpec = { offsetX: 0.2, offsetY: 2.3, radius: 0.5 };

/** Mid hitbox relative to the feet: forward offset, center height, radius (m), per GAME_SPEC §5.2. */
export const HITBOX_MID: HitboxSpec = { offsetX: 0.45, offsetY: 1.4, radius: 0.5 };

/** Underhand hitbox relative to the feet: forward offset, center height, radius (m), per GAME_SPEC §5.2. */
export const HITBOX_UNDERHAND: HitboxSpec = { offsetX: 0.5, offsetY: 0.6, radius: 0.55 };

/** Forward offset of the held shuttle from the server feet along facing (m), per GAME_SPEC §5.2 and §7.3. */
export const SERVE_CONTACT_OFFSET_X = 0.35;

/** Height of the held shuttle above the server feet (m), per GAME_SPEC §5.2 and §7.3. */
export const SERVE_CONTACT_Y = 1.0;

/** Upward launch speed of the temporary practice toss on key T (m/s), per ROADMAP Phase 3 item 8 and DECISIONS D-020. */
export const PRACTICE_TOSS_VY = 10.0;

/** Tolerance when comparing tick-derived times with spec thresholds (s), per DECISIONS D-017. */
export const TIME_EPSILON_S = 1e-9;

/** Extra simulation steps allowed past the swing lead so the height prediction always fires (ticks), per DECISIONS D-017. */
export const SWING_PREDICT_SLACK_TICKS = 2;

/** Minimum contact height for a power overhead swing to become SMASH (m), per GAME_SPEC §5.3 and D-004. */
export const SMASH_MIN_CONTACT_Y = 2.2;

/** Maximum hitter distance from the net for an underhand soft swing to become NET_SHOT (m), per GAME_SPEC §5.3. */
export const NET_SHOT_MAX_HITTER_DIST = 2.5;

/** Smash speed multiplier when the hitter is airborne (dimensionless), 60 m/s becomes 64.8 m/s, per GAME_SPEC §5.3 and D-011. */
export const JUMP_SMASH_SPEED_MULT = 1.08;

/** Minimum net clearance required by the assist check for ordinary shots (m), per GAME_SPEC §5.5. */
export const MIN_NET_CLEARANCE = 0.05;

/** Minimum net clearance required by the assist check for SMASH and DRIVE (m), per GAME_SPEC §5.5. */
export const MIN_NET_CLEARANCE_POWER = 0.1;

/** Smallest legal landing depth measured from the net (m), per DECISIONS D-014. */
export const TARGET_MIN_DEPTH = 0.2;

/** Distance kept between the landing target and the back boundary line (m), per GAME_SPEC §5.7. */
export const TARGET_EDGE_MARGIN = 0.2;

/** Largest legal landing depth measured from the net (m), per GAME_SPEC §5.7. */
export const TARGET_MAX_DEPTH = COURT_HALF_LENGTH - TARGET_EDGE_MARGIN;

/**
 * Shot parameter table keyed by shot type, per GAME_SPEC §5.4, §5.5 and §5.7.
 * Elevation in deg, speed in m/s, clearance and depths in m measured from the net.
 * `depthRange` is a reference span from the spec; shots without one use the full legal depth span.
 * It is informational only and never clamps the landing depth.
 */
export const SHOT_PARAMS: Readonly<Record<ShotType, ShotParams>> = {
  CLEAR: {
    solveMode: 'FIXED_ELEV',
    elevationDeg: 45,
    defaultDepth: 6.0,
    depthRange: [5.6, 6.4],
    minNetClearance: MIN_NET_CLEARANCE,
    aimDeltaM: 0.6,
  },
  LIFT: {
    solveMode: 'FIXED_ELEV',
    elevationDeg: 55,
    defaultDepth: 6.0,
    depthRange: [TARGET_MIN_DEPTH, TARGET_MAX_DEPTH],
    minNetClearance: MIN_NET_CLEARANCE,
    aimDeltaM: 0.6,
  },
  SMASH: {
    solveMode: 'FIXED_SPEED',
    speed: 60,
    defaultDepth: 4.5,
    depthRange: [3.0, 5.5],
    minNetClearance: MIN_NET_CLEARANCE_POWER,
    aimDeltaM: 0.8,
  },
  DRIVE: {
    solveMode: 'FIXED_ELEV',
    elevationDeg: 3,
    defaultDepth: 5.0,
    depthRange: [TARGET_MIN_DEPTH, TARGET_MAX_DEPTH],
    minNetClearance: MIN_NET_CLEARANCE_POWER,
    aimDeltaM: 0.8,
  },
  DROP: {
    solveMode: 'FIXED_ELEV',
    elevationDeg: 10,
    defaultDepth: 1.4,
    depthRange: [0.8, 1.9],
    minNetClearance: MIN_NET_CLEARANCE,
    aimDeltaM: 0.3,
  },
  BLOCK: {
    solveMode: 'TWO_POINT',
    clearance: 0.2,
    defaultDepth: 1.5,
    depthRange: [TARGET_MIN_DEPTH, TARGET_MAX_DEPTH],
    minNetClearance: MIN_NET_CLEARANCE,
    aimDeltaM: 0.3,
  },
  NET_SHOT: {
    solveMode: 'TWO_POINT',
    clearance: 0.08,
    defaultDepth: 0.5,
    depthRange: [TARGET_MIN_DEPTH, TARGET_MAX_DEPTH],
    minNetClearance: MIN_NET_CLEARANCE,
    aimDeltaM: 0.3,
  },
  HIGH_SERVE: {
    solveMode: 'FIXED_ELEV',
    elevationDeg: 55,
    defaultDepth: 6.3,
    depthRange: [TARGET_MIN_DEPTH, TARGET_MAX_DEPTH],
    minNetClearance: MIN_NET_CLEARANCE,
    aimDeltaM: 0.6,
  },
  LOW_SERVE: {
    solveMode: 'TWO_POINT',
    clearance: 0.1,
    defaultDepth: 2.3,
    depthRange: [TARGET_MIN_DEPTH, TARGET_MAX_DEPTH],
    minNetClearance: MIN_NET_CLEARANCE,
    aimDeltaM: 0.3,
  },
};

/** Lower bound of the speed search for FIXED_ELEV solving (m/s), per GAME_SPEC §5.5. */
export const SOLVER_SPEED_MIN = 1;

/** Upper bound of the speed search for FIXED_ELEV solving (m/s), per GAME_SPEC §5.5; clamped to SHUTTLE_MAX_SPEED at run time, see D-019. */
export const SOLVER_SPEED_MAX = 150;

/** Lower bound of the angle search for FIXED_SPEED solving (deg), per GAME_SPEC §5.5. */
export const SOLVER_ANGLE_MIN_DEG = -60;

/** Upper bound of the angle search for FIXED_SPEED solving (deg), per GAME_SPEC §5.5. */
export const SOLVER_ANGLE_MAX_DEG = 10;

/** Lower bound of the outer angle search for TWO_POINT solving (deg), per GAME_SPEC §5.5. */
export const SOLVER_TP_ANGLE_MIN_DEG = -30;

/** Upper bound of the outer angle search for TWO_POINT solving (deg), per GAME_SPEC §5.5. */
export const SOLVER_TP_ANGLE_MAX_DEG = 85;

/** Lower bound of the inner speed search for TWO_POINT solving (m/s), per GAME_SPEC §5.5. */
export const SOLVER_TP_SPEED_MIN = 0.5;

/** Upper bound of the inner speed search for TWO_POINT solving (m/s), per GAME_SPEC §5.5. */
export const SOLVER_TP_SPEED_MAX = 40;

/** Landing position tolerance that stops the bisection early (m), per GAME_SPEC §5.5. */
export const SOLVER_LAND_TOL = 0.002;

/** Net crossing height tolerance that stops the TWO_POINT outer bisection early (m), per GAME_SPEC §5.5. */
export const SOLVER_NET_TOL = 0.002;

/** Maximum bisection iterations per search loop (count), safety bound. */
export const SOLVER_MAX_ITER = 60;

/** TWO_POINT angle at or above which an unreachable landing counts as "too high" (deg), per DECISIONS D-016. */
export const SOLVER_TP_UNREACHABLE_SPLIT_DEG = 45;

/** First bracket half-width around a warm-start speed guess, as a fraction of the guess (dimensionless), per GAME_SPEC §5.5. */
export const SOLVER_WARM_START_HALF_WIDTH_RATIO = 0.05;

/** Elevation increase per retry when the assist lifts a FIXED_ELEV shot over the net (deg), per GAME_SPEC §5.5. */
export const ASSIST_ELEV_STEP_DEG = 2;

/** Maximum total elevation increase applied by the assist (deg), per GAME_SPEC §5.5. */
export const ASSIST_ELEV_MAX_DEG = 20;

/** Depth increase per retry when the assist pushes a FIXED_SPEED shot deeper (m), per GAME_SPEC §5.5. */
export const ASSIST_DEPTH_STEP = 0.1;

/** Deepest landing depth the assist may reach, 0.3 m short of the back boundary line (m), per GAME_SPEC §5.5. */
export const ASSIST_DEPTH_MAX = COURT_HALF_LENGTH - 0.3;

/** Largest contact time offset from the ACTIVE span center that still grades PERFECT (s), per GAME_SPEC §5.6. */
export const TIMING_PERFECT_MAX_S = 0.035;

/** Largest contact time offset from the ACTIVE span center that still grades GOOD (s), per GAME_SPEC §5.6. */
export const TIMING_GOOD_MAX_S = 0.07;

/** Error model per timing grade: depth sigma (m), angle sigma (deg), clearance sigma (m), speed factor (-), per GAME_SPEC §5.6. */
export const TIMING_PARAMS: Readonly<Record<TimingGrade, TimingParams>> = {
  PERFECT: { targetSigmaM: 0, angleSigmaDeg: 0, clearanceSigmaM: 0, speedFactor: 1.05 },
  GOOD: { targetSigmaM: 0.25, angleSigmaDeg: 1.0, clearanceSigmaM: 0.03, speedFactor: 1.0 },
  OK: { targetSigmaM: 0.6, angleSigmaDeg: 3.0, clearanceSigmaM: 0.08, speedFactor: 0.9 },
};

/** Shots that receive the timing speed factor; softer shots ignore it, per DECISIONS D-012. */
export const TIMING_SPEED_FACTOR_SHOTS: readonly ShotType[] = ['SMASH', 'DRIVE'];

/** Constant subtracted from the sum of four uniforms to center the Irwin-Hall approximation (dimensionless), per GAME_SPEC §5.6. */
export const IRWIN_HALL_OFFSET = 2;

/** Scale of the centered Irwin-Hall sum of four uniforms to unit variance (dimensionless), per GAME_SPEC §5.6. */
export const IRWIN_HALL_SCALE = Math.sqrt(3);

/** Conversion factor from m/s to km/h (dimensionless), per GAME_SPEC §5.8. */
export const KMH_PER_MS = 3.6;

/** Display duration of the shot and timing popup (s), per GAME_SPEC §10.6. */
export const SHOT_POPUP_DURATION_S = 1.2;

/** Hitbox debug wireframe color while the hitbox is disabled, hex, per GAME_SPEC §13.1. */
export const HITBOX_COLOR_IDLE = 0x9ca3af;

/** Hitbox debug wireframe color while the swing is ACTIVE, hex, per GAME_SPEC §13.1. */
export const HITBOX_COLOR_ACTIVE = 0x22c55e;

/** Segment count of the hitbox debug wireframe sphere (count), per GAME_SPEC §13.1. */
export const HITBOX_WIRE_SEGMENTS = 16;
