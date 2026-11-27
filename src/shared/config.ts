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

/** Temporary Phase 2 flag enabling automatic player-box shuttle bounce-back, per ROADMAP Phase 2. */
export const DEBUG_AUTO_RETURN = true;

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
