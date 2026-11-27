import * as THREE from 'three';
import {
  COURT_APRON_MARGIN,
  COURT_HALF_LENGTH,
  COURT_HALF_WIDTH_DOUBLES,
  COURT_HALF_WIDTH_SINGLES,
  COURT_LINE_COLOR_HEX,
  COURT_MAT_COLOR,
  COURT_MAT_COLOR_HEX,
  COURT_SURFACE_Y,
  COURT_TEXTURE_HEIGHT_PX,
  COURT_TEXTURE_WIDTH_PX,
  DOUBLES_LONG_SERVICE_LINE,
  LINE_WIDTH,
  SHORT_SERVICE_LINE,
} from '@shared/config';

/** Identifier for each painted BWF badminton court boundary or service line segment. */
export type CourtLineId =
  | 'baseline-left'
  | 'baseline-right'
  | 'sideline-doubles-near'
  | 'sideline-doubles-far'
  | 'sideline-singles-near'
  | 'sideline-singles-far'
  | 'short-service-left'
  | 'short-service-right'
  | 'long-service-doubles-left'
  | 'long-service-doubles-right'
  | 'center-line-left'
  | 'center-line-right';

/** Axis-aligned court marking rectangle in world SI meters. */
export interface CourtLineRect {
  readonly id: CourtLineId;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

/** Managed Three.js court group and GPU disposal handle. */
export interface CourtGroupHandle {
  readonly group: THREE.Group;
  readonly matMesh: THREE.Mesh;
  readonly texture: THREE.CanvasTexture | null;
  dispose(): void;
}

/**
 * Compute world-space rectangles (m) for all 12 white badminton court lines
 * following BWF outer-edge convention in GAME_SPEC §2.
 */
export function buildCourtLineRects(): CourtLineRect[] {
  const halfLen = COURT_HALF_LENGTH;
  const halfWidDoubles = COURT_HALF_WIDTH_DOUBLES;
  const halfWidSingles = COURT_HALF_WIDTH_SINGLES;
  const shortLine = SHORT_SERVICE_LINE;
  const longDoubles = DOUBLES_LONG_SERVICE_LINE;
  const w = LINE_WIDTH;
  const halfW = w / 2;

  return [
    {
      id: 'baseline-left',
      minX: -halfLen,
      maxX: -halfLen + w,
      minZ: -halfWidDoubles,
      maxZ: halfWidDoubles,
    },
    {
      id: 'baseline-right',
      minX: halfLen - w,
      maxX: halfLen,
      minZ: -halfWidDoubles,
      maxZ: halfWidDoubles,
    },
    {
      id: 'sideline-doubles-near',
      minX: -halfLen,
      maxX: halfLen,
      minZ: halfWidDoubles - w,
      maxZ: halfWidDoubles,
    },
    {
      id: 'sideline-doubles-far',
      minX: -halfLen,
      maxX: halfLen,
      minZ: -halfWidDoubles,
      maxZ: -halfWidDoubles + w,
    },
    {
      id: 'sideline-singles-near',
      minX: -halfLen,
      maxX: halfLen,
      minZ: halfWidSingles - w,
      maxZ: halfWidSingles,
    },
    {
      id: 'sideline-singles-far',
      minX: -halfLen,
      maxX: halfLen,
      minZ: -halfWidSingles,
      maxZ: -halfWidSingles + w,
    },
    {
      id: 'short-service-left',
      minX: -(shortLine + w),
      maxX: -shortLine,
      minZ: -halfWidDoubles,
      maxZ: halfWidDoubles,
    },
    {
      id: 'short-service-right',
      minX: shortLine,
      maxX: shortLine + w,
      minZ: -halfWidDoubles,
      maxZ: halfWidDoubles,
    },
    {
      id: 'long-service-doubles-left',
      minX: -longDoubles,
      maxX: -(longDoubles - w),
      minZ: -halfWidDoubles,
      maxZ: halfWidDoubles,
    },
    {
      id: 'long-service-doubles-right',
      minX: longDoubles - w,
      maxX: longDoubles,
      minZ: -halfWidDoubles,
      maxZ: halfWidDoubles,
    },
    {
      id: 'center-line-left',
      minX: -halfLen,
      maxX: -shortLine,
      minZ: -halfW,
      maxZ: halfW,
    },
    {
      id: 'center-line-right',
      minX: shortLine,
      maxX: halfLen,
      minZ: -halfW,
      maxZ: halfW,
    },
  ];
}

function createCourtTexture(
  matWidthX: number,
  matDepthZ: number,
  maxAnisotropy: number,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = COURT_TEXTURE_WIDTH_PX;
  canvas.height = COURT_TEXTURE_HEIGHT_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  ctx.fillStyle = COURT_MAT_COLOR_HEX;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const halfMatX = matWidthX / 2;
  const halfMatZ = matDepthZ / 2;
  const scaleX = canvas.width / matWidthX;
  const scaleZ = canvas.height / matDepthZ;

  ctx.fillStyle = COURT_LINE_COLOR_HEX;
  for (const rect of buildCourtLineRects()) {
    const px = (rect.minX + halfMatX) * scaleX;
    const py = (rect.minZ + halfMatZ) * scaleZ;
    const pw = (rect.maxX - rect.minX) * scaleX;
    const ph = (rect.maxZ - rect.minZ) * scaleZ;
    ctx.fillRect(px, py, pw, ph);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;

  if (maxAnisotropy >= 4) {
    texture.anisotropy = maxAnisotropy;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
  } else {
    // Avoid oblique mipmap blur on 4 cm service lines when software WebGL reports low anisotropy.
    texture.anisotropy = Math.max(1, maxAnisotropy);
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
  }

  texture.needsUpdate = true;
  return texture;
}

/**
 * Build the 3D badminton court mat with crisp BWF white markings.
 *
 * @param maxAnisotropy Renderer `getMaxAnisotropy()` capability value.
 */
export function createCourtGroup(maxAnisotropy: number): CourtGroupHandle {
  const matWidthX = (COURT_HALF_LENGTH + COURT_APRON_MARGIN) * 2;
  const matDepthZ = (COURT_HALF_WIDTH_DOUBLES + COURT_APRON_MARGIN) * 2;

  const group = new THREE.Group();
  group.name = 'BadmintonCourt';

  const geometry = new THREE.PlaneGeometry(matWidthX, matDepthZ);
  const texture = createCourtTexture(matWidthX, matDepthZ, maxAnisotropy);

  const material = new THREE.MeshStandardMaterial({
    color: texture ? 0xffffff : COURT_MAT_COLOR,
    map: texture,
    roughness: 0.72,
    metalness: 0.02,
  });

  const matMesh = new THREE.Mesh(geometry, material);
  matMesh.name = 'CourtMat';
  matMesh.rotation.x = -Math.PI / 2;
  matMesh.position.y = COURT_SURFACE_Y;
  matMesh.receiveShadow = true;
  group.add(matMesh);

  const dispose = (): void => {
    geometry.dispose();
    material.dispose();
    texture?.dispose();
  };

  return {
    group,
    matMesh,
    texture,
    dispose,
  };
}
