import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  COURT_APRON_MARGIN,
  COURT_HALF_LENGTH,
  COURT_HALF_WIDTH_DOUBLES,
  COURT_HALF_WIDTH_SINGLES,
  DOUBLES_LONG_SERVICE_LINE,
  LINE_WIDTH,
  NET_DEPTH,
  NET_HEIGHT_CENTER,
  NET_HEIGHT_POST,
  NET_TAPE_HEIGHT,
  SHORT_SERVICE_LINE,
} from '@shared/config';
import { buildCourtLineRects, createCourtGroup } from '../../src/client/render/court';
import { createNetGroup, getNetSpec } from '../../src/client/render/net';

describe('Kích thước sân và lưới chuẩn BWF', () => {
  it('P1-U01 Hằng số sân: nửa sân 6.70, nửa rộng sân đơn 2.59, lưới 1.524, vạch giao cầu ngắn 1.98 và hình học vạch/lưới', () => {
    expect(COURT_HALF_LENGTH).toBe(6.7);
    expect(COURT_HALF_WIDTH_SINGLES).toBe(2.59);
    expect(COURT_HALF_WIDTH_DOUBLES).toBe(3.05);
    expect(SHORT_SERVICE_LINE).toBe(1.98);
    expect(DOUBLES_LONG_SERVICE_LINE).toBe(5.94);
    expect(LINE_WIDTH).toBe(0.04);
    expect(NET_HEIGHT_CENTER).toBe(1.524);
    expect(NET_HEIGHT_POST).toBe(1.55);
    expect(NET_DEPTH).toBe(0.76);
    expect(NET_TAPE_HEIGHT).toBe(0.075);

    const rects = buildCourtLineRects();
    expect(rects).toHaveLength(12);

    const byId = new Map(rects.map((rect) => [rect.id, rect]));

    const minX = Math.min(...rects.map((r) => r.minX));
    const maxX = Math.max(...rects.map((r) => r.maxX));
    const minZ = Math.min(...rects.map((r) => r.minZ));
    const maxZ = Math.max(...rects.map((r) => r.maxZ));

    expect(minX).toBeCloseTo(-6.7, 6);
    expect(maxX).toBeCloseTo(6.7, 6);
    expect(minZ).toBeCloseTo(-3.05, 6);
    expect(maxZ).toBeCloseTo(3.05, 6);

    const singlesNear = byId.get('sideline-singles-near')!;
    const singlesFar = byId.get('sideline-singles-far')!;
    expect(singlesNear.maxZ).toBeCloseTo(2.59, 6);
    expect(singlesNear.minZ).toBeCloseTo(2.55, 6);
    expect(singlesFar.minZ).toBeCloseTo(-2.59, 6);
    expect(singlesFar.maxZ).toBeCloseTo(-2.55, 6);

    const shortLeft = byId.get('short-service-left')!;
    const shortRight = byId.get('short-service-right')!;
    expect(shortLeft.maxX).toBeCloseTo(-1.98, 6);
    expect(shortLeft.minX).toBeCloseTo(-2.02, 6);
    expect(shortRight.minX).toBeCloseTo(1.98, 6);
    expect(shortRight.maxX).toBeCloseTo(2.02, 6);

    const longDoublesLeft = byId.get('long-service-doubles-left')!;
    const longDoublesRight = byId.get('long-service-doubles-right')!;
    expect(longDoublesLeft.minX).toBeCloseTo(-5.94, 6);
    expect(longDoublesLeft.maxX).toBeCloseTo(-5.9, 6);
    expect(longDoublesRight.maxX).toBeCloseTo(5.94, 6);
    expect(longDoublesRight.minX).toBeCloseTo(5.9, 6);

    const centerLeft = byId.get('center-line-left')!;
    const centerRight = byId.get('center-line-right')!;
    expect(centerLeft.minX).toBeCloseTo(-6.7, 6);
    expect(centerLeft.maxX).toBeCloseTo(-1.98, 6);
    expect(centerLeft.minZ).toBeCloseTo(-0.02, 6);
    expect(centerLeft.maxZ).toBeCloseTo(0.02, 6);
    expect(centerRight.minX).toBeCloseTo(1.98, 6);
    expect(centerRight.maxX).toBeCloseTo(6.7, 6);
    expect(centerRight.minZ).toBeCloseTo(-0.02, 6);
    expect(centerRight.maxZ).toBeCloseTo(0.02, 6);

    const court = createCourtGroup(1);
    const courtBox = new THREE.Box3().setFromObject(court.group);
    expect(courtBox.min.x).toBeCloseTo(-(COURT_HALF_LENGTH + COURT_APRON_MARGIN), 5);
    expect(courtBox.max.x).toBeCloseTo(COURT_HALF_LENGTH + COURT_APRON_MARGIN, 5);
    expect(courtBox.min.z).toBeCloseTo(-(COURT_HALF_WIDTH_DOUBLES + COURT_APRON_MARGIN), 5);
    expect(courtBox.max.z).toBeCloseTo(COURT_HALF_WIDTH_DOUBLES + COURT_APRON_MARGIN, 5);
    court.dispose();

    const netSpec = getNetSpec();
    expect(netSpec.widthZ).toBeCloseTo(6.1, 6);
    expect(netSpec.topY).toBeCloseTo(1.524, 6);
    expect(netSpec.postHeight).toBeCloseTo(1.55, 6);
    expect(netSpec.bottomY).toBeCloseTo(1.524 - 0.76, 6);

    const net = createNetGroup(1);
    const tapeBox = new THREE.Box3().setFromObject(net.topTapeMesh);
    expect(tapeBox.max.y).toBeCloseTo(1.524, 5);
    expect(tapeBox.min.y).toBeCloseTo(1.524 - 0.075, 5);
    expect(tapeBox.min.z).toBeCloseTo(-3.05, 5);
    expect(tapeBox.max.z).toBeCloseTo(3.05, 5);

    const postLeftBox = new THREE.Box3().setFromObject(net.postLeftMesh);
    const postRightBox = new THREE.Box3().setFromObject(net.postRightMesh);
    expect(postLeftBox.min.y).toBeCloseTo(0, 5);
    expect(postLeftBox.max.y).toBeCloseTo(1.55, 5);
    expect((postLeftBox.min.z + postLeftBox.max.z) / 2).toBeCloseTo(-3.05, 5);
    expect(postRightBox.min.y).toBeCloseTo(0, 5);
    expect(postRightBox.max.y).toBeCloseTo(1.55, 5);
    expect((postRightBox.min.z + postRightBox.max.z) / 2).toBeCloseTo(3.05, 5);
    net.dispose();
  });
});
