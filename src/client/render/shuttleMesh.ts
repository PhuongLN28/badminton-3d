import * as THREE from 'three';
import {
  COURT_SURFACE_Y,
  SHUTTLE_BAND_COLOR,
  SHUTTLE_BLOB_SHADOW_MAX_HEIGHT,
  SHUTTLE_BLOB_SHADOW_MAX_OPACITY,
  SHUTTLE_BLOB_SHADOW_MIN_OPACITY,
  SHUTTLE_BLOB_SHADOW_RADIUS,
  SHUTTLE_CORK_COLOR,
  SHUTTLE_CORK_RADIUS,
  SHUTTLE_SKIRT_LENGTH,
  SHUTTLE_SKIRT_RADIUS_INNER,
  SHUTTLE_SKIRT_RADIUS_OUTER,
  SHUTTLE_SKIRT_SEGMENTS,
  SHUTTLE_VISUAL_SCALE,
} from '@shared/config';
import type { Quat, ReadonlyVec3 } from '@shared/types';

const SKIRT_TEX_W = 512;
const SKIRT_TEX_H = 256;
const SHADOW_TEX_SIZE = 128;
const COLLAR_HEIGHT_M = 0.004;
const COLLAR_Y_M = -0.001;
const SHADOW_Y_M = COURT_SURFACE_Y + 0.002;
const SHADOW_MAX_EXTRA_SCALE = 0.6;
const SHADOW_OPACITY_DELTA = SHUTTLE_BLOB_SHADOW_MIN_OPACITY - SHUTTLE_BLOB_SHADOW_MAX_OPACITY;

/** Managed Three.js 3D shuttlecock mesh and ground blob shadow handle. */
export interface ShuttleMeshHandle {
  readonly group: THREE.Group;
  readonly shadowMesh: THREE.Mesh;
  /**
   * Update shuttlecock world transform and blob shadow without allocating objects.
   * @param pos World position in meters.
   * @param quat Orientation quaternion aligning `+Y` cork nose along velocity.
   * @param visible Whether both shuttlecock and blob shadow should render.
   */
  updateTransform(pos: ReadonlyVec3, quat: Readonly<Quat>, visible: boolean): void;
  /** Release all GPU geometries, materials, and procedural textures. */
  dispose(): void;
}

function buildCanvasTexture(
  w: number,
  h: number,
  wrapRepeatS: boolean,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  draw(ctx, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (wrapRepeatS) {
    texture.wrapS = THREE.RepeatWrapping;
  }
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function strokeSeg(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawSkirtFeathers(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  const count = SHUTTLE_SKIRT_SEGMENTS;
  const cellW = w / count;
  const baseHalfW = cellW * 0.56;
  const tipHalfW = cellW * 0.36;
  const vaneGrad = ctx.createLinearGradient(0, 0, 0, h);
  vaneGrad.addColorStop(0, 'rgba(255, 255, 255, 0.94)');
  vaneGrad.addColorStop(0.55, 'rgba(248, 250, 252, 0.85)');
  vaneGrad.addColorStop(1, 'rgba(241, 245, 249, 0.76)');

  // 16 overlapping translucent feather vanes; v=1 (y=0) is cork base, v=0 (y=h) is flared tip.
  ctx.fillStyle = vaneGrad;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
  ctx.lineWidth = 1.25;
  for (let i = 0; i < count; i += 1) {
    const cx = (i + 0.5) * cellW;
    ctx.beginPath();
    ctx.moveTo(cx - baseHalfW, 0);
    ctx.lineTo(cx + baseHalfW, 0);
    ctx.lineTo(cx + baseHalfW * 0.94, h * 0.72);
    ctx.quadraticCurveTo(cx + tipHalfW, h * 0.96, cx, h);
    ctx.quadraticCurveTo(cx - tipHalfW, h * 0.96, cx - baseHalfW * 0.94, h * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 16 crisp central feather stems (rachis) + 2 cross-stitch thread rings.
  ctx.fillStyle = 'rgba(248, 250, 252, 0.98)';
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
  ctx.lineWidth = 1;
  for (let i = 0; i < count; i += 1) {
    const cx = (i + 0.5) * cellW;
    ctx.beginPath();
    ctx.moveTo(cx - 1.8, 0);
    ctx.lineTo(cx + 1.8, 0);
    ctx.lineTo(cx + 0.6, h * 0.93);
    ctx.lineTo(cx - 0.6, h * 0.93);
    ctx.closePath();
    ctx.fill();
    strokeSeg(ctx, cx, 0, cx, h * 0.93);
  }
  for (const ratio of [0.2, 0.38]) {
    const y = h * ratio;
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.55)';
    ctx.lineWidth = 3.5;
    strokeSeg(ctx, 0, y + 1, w, y + 1);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.lineWidth = 2.5;
    strokeSeg(ctx, 0, y, w, y);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.75)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < count; i += 1) {
      const cx = (i + 0.5) * cellW;
      strokeSeg(ctx, cx - 4, y - 3.5, cx + 4, y + 3.5);
      strokeSeg(ctx, cx + 4, y - 3.5, cx - 4, y + 3.5);
    }
  }
}

function drawBlobShadow(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const half = w / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
  grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.18)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function addPart(
  parent: THREE.Object3D,
  name: string,
  geom: THREE.BufferGeometry,
  mat: THREE.Material,
  y = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = name;
  mesh.position.y = y;
  parent.add(mesh);
  return mesh;
}

function isPoseFinite(pos: ReadonlyVec3, quat: Readonly<Quat>): boolean {
  return (
    Number.isFinite(pos.x) &&
    Number.isFinite(pos.y) &&
    Number.isFinite(pos.z) &&
    Number.isFinite(quat.x) &&
    Number.isFinite(quat.y) &&
    Number.isFinite(quat.z) &&
    Number.isFinite(quat.w)
  );
}

/**
 * Create the 3D shuttlecock mesh (scaled by `SHUTTLE_VISUAL_SCALE` with cork along `+Y`
 * and feathered skirt along `-Y`) together with its ground blob shadow mesh.
 */
export function createShuttleMesh(): ShuttleMeshHandle {
  const group = new THREE.Group();
  group.name = 'Shuttlecock';
  const visualRoot = new THREE.Group();
  visualRoot.name = 'ShuttleVisualRoot';
  visualRoot.scale.setScalar(SHUTTLE_VISUAL_SCALE);
  group.add(visualRoot);

  const corkGeom = new THREE.SphereGeometry(
    SHUTTLE_CORK_RADIUS,
    16,
    12,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  const corkCapGeom = new THREE.CircleGeometry(SHUTTLE_CORK_RADIUS, 16);
  corkCapGeom.rotateX(Math.PI / 2);
  const corkMat = new THREE.MeshStandardMaterial({
    color: SHUTTLE_CORK_COLOR,
    roughness: 0.55,
    metalness: 0.04,
    emissive: SHUTTLE_CORK_COLOR,
    emissiveIntensity: 0.12,
  });
  addPart(visualRoot, 'ShuttleCork', corkGeom, corkMat);
  addPart(visualRoot, 'ShuttleCorkCap', corkCapGeom, corkMat);

  const bandGeom = new THREE.CylinderGeometry(
    SHUTTLE_CORK_RADIUS * 1.03,
    SHUTTLE_CORK_RADIUS * 1.03,
    COLLAR_HEIGHT_M,
    16,
  );
  const bandMat = new THREE.MeshStandardMaterial({
    color: SHUTTLE_BAND_COLOR,
    roughness: 0.4,
    metalness: 0.1,
    emissive: SHUTTLE_BAND_COLOR,
    emissiveIntensity: 0.15,
  });
  addPart(visualRoot, 'ShuttleCollarBand', bandGeom, bandMat, COLLAR_Y_M);

  const skirtGeom = new THREE.CylinderGeometry(
    SHUTTLE_SKIRT_RADIUS_INNER,
    SHUTTLE_SKIRT_RADIUS_OUTER,
    SHUTTLE_SKIRT_LENGTH,
    SHUTTLE_SKIRT_SEGMENTS,
    1,
    true,
  );
  const skirtTex = buildCanvasTexture(SKIRT_TEX_W, SKIRT_TEX_H, true, drawSkirtFeathers);
  const skirtMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: skirtTex,
    transparent: true,
    opacity: skirtTex ? 1.0 : 0.85,
    alphaTest: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.5,
    metalness: 0.02,
    emissive: 0xf8fafc,
    emissiveIntensity: 0.22,
  });
  addPart(visualRoot, 'ShuttleSkirt', skirtGeom, skirtMat, -SHUTTLE_SKIRT_LENGTH / 2);

  const shadowGeom = new THREE.PlaneGeometry(
    SHUTTLE_BLOB_SHADOW_RADIUS * 2,
    SHUTTLE_BLOB_SHADOW_RADIUS * 2,
  );
  const shadowTex = buildCanvasTexture(SHADOW_TEX_SIZE, SHADOW_TEX_SIZE, false, drawBlobShadow);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: shadowTex ? 0xffffff : 0x000000,
    map: shadowTex,
    transparent: true,
    opacity: SHUTTLE_BLOB_SHADOW_MAX_OPACITY,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
  shadowMesh.name = 'ShuttleBlobShadow';
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.set(0, SHADOW_Y_M, 0);

  const updateTransform = (pos: ReadonlyVec3, quat: Readonly<Quat>, visible: boolean): void => {
    if (!isPoseFinite(pos, quat)) {
      group.visible = false;
      shadowMesh.visible = false;
      return;
    }
    group.visible = visible;
    shadowMesh.visible = visible;
    group.position.set(pos.x, pos.y, pos.z);
    group.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    shadowMesh.position.set(pos.x, SHADOW_Y_M, pos.z);

    const heightRatio =
      Math.max(0, Math.min(pos.y, SHUTTLE_BLOB_SHADOW_MAX_HEIGHT)) / SHUTTLE_BLOB_SHADOW_MAX_HEIGHT;
    const shadowScale = 1 + heightRatio * SHADOW_MAX_EXTRA_SCALE;
    shadowMesh.scale.set(shadowScale, shadowScale, 1);
    shadowMat.opacity = SHUTTLE_BLOB_SHADOW_MAX_OPACITY + SHADOW_OPACITY_DELTA * heightRatio;
  };

  const dispose = (): void => {
    for (const g of [corkGeom, corkCapGeom, bandGeom, skirtGeom, shadowGeom]) g.dispose();
    for (const m of [corkMat, bandMat, skirtMat, shadowMat]) m.dispose();
    skirtTex?.dispose();
    shadowTex?.dispose();
  };

  return { group, shadowMesh, updateTransform, dispose };
}
