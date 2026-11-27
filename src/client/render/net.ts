import * as THREE from 'three';
import {
  COURT_HALF_WIDTH_DOUBLES,
  NET_CORD_HEIGHT,
  NET_DEPTH,
  NET_HEIGHT_CENTER,
  NET_HEIGHT_POST,
  NET_MESH_RIB_COUNT,
  NET_POST_COLOR,
  NET_POST_RADIUS,
  NET_TAPE_COLOR,
  NET_TAPE_HEIGHT,
  NET_TAPE_THICKNESS,
  NET_TEXTURE_HEIGHT_PX,
  NET_TEXTURE_WIDTH_PX,
} from '@shared/config';

/** Pure dimensional specification of the badminton net and posts in SI meters. */
export interface NetSpec {
  readonly widthZ: number;
  readonly topY: number;
  readonly postHeight: number;
  readonly depth: number;
  readonly tapeHeight: number;
  readonly postOffsetZ: number;
  readonly meshBodyHeight: number;
  readonly bottomY: number;
}

/** Managed Three.js net assembly and disposal handle. */
export interface NetGroupHandle {
  readonly group: THREE.Group;
  readonly topTapeMesh: THREE.Mesh;
  readonly postLeftMesh: THREE.Mesh;
  readonly postRightMesh: THREE.Mesh;
  dispose(): void;
}

/** Return BWF net dimensions in SI meters derived from `src/shared/config.ts`. */
export function getNetSpec(): NetSpec {
  return {
    widthZ: COURT_HALF_WIDTH_DOUBLES * 2,
    topY: NET_HEIGHT_CENTER,
    postHeight: NET_HEIGHT_POST,
    depth: NET_DEPTH,
    tapeHeight: NET_TAPE_HEIGHT,
    postOffsetZ: COURT_HALF_WIDTH_DOUBLES,
    meshBodyHeight: NET_DEPTH - NET_TAPE_HEIGHT,
    bottomY: NET_HEIGHT_CENTER - NET_DEPTH,
  };
}

function createNetMeshTexture(maxAnisotropy: number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = NET_TEXTURE_WIDTH_PX;
  canvas.height = NET_TEXTURE_HEIGHT_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(226, 232, 240, 0.78)';
  ctx.lineWidth = 2;

  const cellPx = 16;
  ctx.beginPath();
  for (let x = 0; x <= canvas.width; x += cellPx) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  for (let y = 0; y <= canvas.height; y += cellPx) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  if (maxAnisotropy >= 4) {
    texture.anisotropy = maxAnisotropy;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
  } else {
    texture.anisotropy = Math.max(1, maxAnisotropy);
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
  }
  texture.needsUpdate = true;
  return texture;
}

/**
 * Create the 3D badminton net, top white tape, bottom cord, vertical ribs, and two side posts.
 *
 * @param maxAnisotropy Renderer `getMaxAnisotropy()` capability value.
 */
export function createNetGroup(maxAnisotropy: number): NetGroupHandle {
  const spec = getNetSpec();
  const group = new THREE.Group();
  group.name = 'BadmintonNet';

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const tapeGeometry = new THREE.BoxGeometry(NET_TAPE_THICKNESS, spec.tapeHeight, spec.widthZ);
  const tapeMaterial = new THREE.MeshStandardMaterial({
    color: NET_TAPE_COLOR,
    roughness: 0.45,
    metalness: 0.05,
  });
  geometries.push(tapeGeometry);
  materials.push(tapeMaterial);

  const topTapeMesh = new THREE.Mesh(tapeGeometry, tapeMaterial);
  topTapeMesh.name = 'NetTopTape';
  topTapeMesh.position.set(0, spec.topY - spec.tapeHeight / 2, 0);
  topTapeMesh.castShadow = true;
  topTapeMesh.receiveShadow = true;
  group.add(topTapeMesh);

  const netBodyCenterY = spec.topY - spec.tapeHeight - spec.meshBodyHeight / 2;
  const netTexture = createNetMeshTexture(maxAnisotropy);
  if (netTexture) {
    textures.push(netTexture);
  }

  const netBodyGeometry = new THREE.PlaneGeometry(spec.widthZ, spec.meshBodyHeight);
  const netBodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: netTexture,
    transparent: true,
    opacity: netTexture ? 0.92 : 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.8,
  });
  geometries.push(netBodyGeometry);
  materials.push(netBodyMaterial);

  const netPlane = new THREE.Mesh(netBodyGeometry, netBodyMaterial);
  netPlane.name = 'NetMeshPlane';
  netPlane.rotation.y = Math.PI / 2;
  netPlane.position.set(0, netBodyCenterY, 0);
  group.add(netPlane);

  // Add subtle cross-ribs along Z so the mesh band remains visible edge-on from camera x = 0.
  const ribGeometry = new THREE.BoxGeometry(NET_TAPE_THICKNESS * 0.4, spec.meshBodyHeight, 0.012);
  const ribMaterial = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    transparent: true,
    opacity: 0.48,
    roughness: 0.7,
  });
  geometries.push(ribGeometry);
  materials.push(ribMaterial);

  for (let i = 1; i <= NET_MESH_RIB_COUNT; i += 1) {
    const t = i / (NET_MESH_RIB_COUNT + 1);
    const z = -spec.postOffsetZ + t * spec.widthZ;
    const rib = new THREE.Mesh(ribGeometry, ribMaterial);
    rib.position.set(0, netBodyCenterY, z);
    group.add(rib);
  }

  const cordGeometry = new THREE.BoxGeometry(
    NET_TAPE_THICKNESS * 0.65,
    NET_CORD_HEIGHT,
    spec.widthZ,
  );
  const cordMaterial = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.6,
    metalness: 0.05,
  });
  geometries.push(cordGeometry);
  materials.push(cordMaterial);

  const bottomCord = new THREE.Mesh(cordGeometry, cordMaterial);
  bottomCord.name = 'NetBottomCord';
  bottomCord.position.set(0, spec.bottomY + NET_CORD_HEIGHT / 2, 0);
  bottomCord.castShadow = true;
  group.add(bottomCord);

  const postGeometry = new THREE.CylinderGeometry(
    NET_POST_RADIUS,
    NET_POST_RADIUS,
    spec.postHeight,
    12,
  );
  const postMaterial = new THREE.MeshStandardMaterial({
    color: NET_POST_COLOR,
    roughness: 0.35,
    metalness: 0.65,
  });
  geometries.push(postGeometry);
  materials.push(postMaterial);

  const postLeftMesh = new THREE.Mesh(postGeometry, postMaterial);
  postLeftMesh.name = 'NetPostFar';
  postLeftMesh.position.set(0, spec.postHeight / 2, -spec.postOffsetZ);
  postLeftMesh.castShadow = true;
  postLeftMesh.receiveShadow = true;

  const postRightMesh = new THREE.Mesh(postGeometry, postMaterial);
  postRightMesh.name = 'NetPostNear';
  postRightMesh.position.set(0, spec.postHeight / 2, spec.postOffsetZ);
  postRightMesh.castShadow = true;
  postRightMesh.receiveShadow = true;

  group.add(postLeftMesh, postRightMesh);

  const dispose = (): void => {
    for (const g of geometries) {
      g.dispose();
    }
    for (const m of materials) {
      m.dispose();
    }
    for (const t of textures) {
      t.dispose();
    }
  };

  return {
    group,
    topTapeMesh,
    postLeftMesh,
    postRightMesh,
    dispose,
  };
}
