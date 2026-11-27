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
