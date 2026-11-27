import { describe, expect, it } from 'vitest';
import {
  DT,
  HITBOX_MID,
  HITBOX_OVERHEAD,
  HITBOX_UNDERHAND,
  HIT_NET_CONTACT_INSET_M,
  SWING_FALLBACK_KIND,
} from '@shared/config';
import { vec3 } from '@shared/math/vec3';
import {
  DEFAULT_PHYSICS_CONFIG,
  createShuttleScratch,
  createShuttleState,
  spawnShuttleState,
  stepShuttle,
  type ShuttleState,
} from '@shared/physics/shuttle';
import type { ShotType, Vec3 } from '@shared/types';
import { solveShot } from '../../../src/shared/shots/shotSolver';
import { getShotParams } from '../../../src/shared/shots/shotTypes';
import {
  classifySwingKind,
  detectSwingHit,
  hitboxCenterOut,
  hitboxRadius,
  predictSwingKind,
  sweptSphereEntry,
  type HitKind,
} from '../../../src/shared/player/hitbox';
import { createPlayerState } from '../../../src/shared/player/playerSim';
import {
  advanceSwing,
  createSwingState,
  swingTicksForOut,
  tryStartSwing,
  type SwingState,
} from '../../../src/shared/player/swing';

function distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Build a swing that is in its first ACTIVE tick for the given kind. */
function makeActiveSwing(kind: HitKind): SwingState {
  const ticks = swingTicksForOut(DT, { windup: 0, active: 0, recovery: 0 });
  const swing = createSwingState();
  expect(tryStartSwing(swing, 'power', kind, 0)).toBe(true);
  for (let i = 0; i < ticks.windup; i += 1) {
    advanceSwing(swing, ticks);
  }
  expect(swing.phase).toBe('ACTIVE');
  return swing;
}

function restingShuttleAt(y: number): ShuttleState {
  const shuttle = createShuttleState();
  spawnShuttleState(shuttle, vec3(-2.4, y, 0), vec3(0, 0, 0));
  return shuttle;
}

describe('Hitbox và phát hiện chạm cầu', () => {
  it('P3-U03 Swept: cầu 60 m/s đi xuyên hitbox giữa 2 tick (cả hai đầu mút nằm ngoài) vẫn bị phát hiện', () => {
    // Phần thuần: hình học đoạn p0 -> p1 so với hình cầu.
    const center = vec3(0, 2.3, 0);
    const r = 0.5;
    const p0 = vec3(0.25, 2.76, 0);
    const p1 = vec3(-0.22, 2.76, 0);
    expect(distance(p0, center)).toBeGreaterThan(r);
    expect(distance(p1, center)).toBeGreaterThan(r);

    const f = sweptSphereEntry(p0, p1, center, r);
    expect(f).not.toBeNull();
    expect(f as number).toBeGreaterThan(0);
    expect(f as number).toBeLessThan(1);
    // (0.25 - 0.47 f)^2 + 0.46^2 = 0.5^2  =>  f = (0.25 - sqrt(0.0384)) / 0.47
    expect(f as number).toBeCloseTo((0.25 - Math.sqrt(0.0384)) / 0.47, 9);
    const entryPoint = vec3(p0.x + (p1.x - p0.x) * (f as number), p0.y, 0);
    expect(distance(entryPoint, center)).toBeCloseTo(r, 9);

    // Các trường hợp biên của hình học.
    expect(sweptSphereEntry(vec3(0, 2.3, 0), vec3(1, 2.3, 0), center, r)).toBe(0); // bắt đầu trong cầu
    expect(sweptSphereEntry(vec3(0.3, 2.76, 0), vec3(-0.3, 3.06, 0), center, r)).toBeNull(); // lướt qua phía trên
    expect(sweptSphereEntry(vec3(2, 2.3, 0), vec3(1, 2.3, 0), center, r)).toBeNull(); // chưa tới
    expect(sweptSphereEntry(vec3(1, 2.3, 0), vec3(2, 2.3, 0), center, r)).toBeNull(); // bay ra xa
    expect(sweptSphereEntry(vec3(1, 2.3, 0), vec3(1, 2.3, 0), center, r)).toBeNull(); // đứng yên ngoài cầu
    expect(sweptSphereEntry(vec3(0.5, 2.3, 0), vec3(0.5, 2.3, 0), center, r)).toBe(0); // chạm mặt cầu
    expect(sweptSphereEntry(vec3(1.5, 2.3, 0), vec3(0.5, 2.3, 0), center, r)).toBeCloseTo(1, 12); // đến đúng mặt cầu ở cuối

    // Tích hợp: P1 đứng ở x = -2.6, tâm overhead (-2.4, 2.3). Cầu bay -x 60 m/s qua stepShuttle.
    const player = createPlayerState(0);
    const hitCenter = hitboxCenterOut(player, 'overhead', vec3());
    expect(hitCenter.x).toBeCloseTo(-2.4, 9);
    expect(hitCenter.y).toBeCloseTo(2.3, 9);

    const shuttle = createShuttleState();
    spawnShuttleState(shuttle, vec3(hitCenter.x + 0.25, hitCenter.y + 0.46, 0), vec3(-60, 0, 0));
    const prevPos = vec3(shuttle.pos.x, shuttle.pos.y, shuttle.pos.z);
    stepShuttle(shuttle, DT, DEFAULT_PHYSICS_CONFIG, createShuttleScratch(), 1);
    const currPos = vec3(shuttle.pos.x, shuttle.pos.y, shuttle.pos.z);

    const radius = hitboxRadius('overhead');
    expect(distance(prevPos, hitCenter)).toBeGreaterThan(radius);
    expect(distance(currPos, hitCenter)).toBeGreaterThan(radius);
    expect(prevPos.x - currPos.x).toBeGreaterThan(0.4); // khoảng 0.47 m mỗi tick, gần bằng bán kính hitbox

    const swing = makeActiveSwing('overhead');
    const contact = vec3();
    const fraction = detectSwingHit(player, swing, prevPos, currPos, contact);
    expect(fraction).not.toBeNull();
    expect(fraction as number).toBeGreaterThan(0);
    expect(fraction as number).toBeLessThan(1);
    expect(distance(contact, hitCenter)).toBeCloseTo(radius, 6);
    expect(contact.x).toBeLessThan(prevPos.x);
    expect(contact.x).toBeGreaterThan(currPos.x);

    // Chỉ phát hiện khi ACTIVE và chưa đánh trúng. Các pha khác: null và không ghi outContact.
    const untouched = vec3(7, 7, 7);
    const ticks = swingTicksForOut(DT, { windup: 0, active: 0, recovery: 0 });
    const windingUp = createSwingState();
    tryStartSwing(windingUp, 'power', 'overhead', 0);
    expect(detectSwingHit(player, windingUp, prevPos, currPos, untouched)).toBeNull();
    const recovering = makeActiveSwing('overhead');
    for (let i = 0; i < ticks.active; i += 1) advanceSwing(recovering, ticks);
    expect(recovering.phase).toBe('RECOVERY');
    expect(detectSwingHit(player, recovering, prevPos, currPos, untouched)).toBeNull();
    const alreadyHit = makeActiveSwing('overhead');
    alreadyHit.hasHit = true;
    expect(detectSwingHit(player, alreadyHit, prevPos, currPos, untouched)).toBeNull();
    expect(detectSwingHit(player, createSwingState(), prevPos, currPos, untouched)).toBeNull();
    expect(untouched).toEqual({ x: 7, y: 7, z: 7 });
  });

  it('P3-U04 Kiểu vung theo độ cao dự đoán: 2.5 -> overhead, 1.4 -> mid, 0.6 -> underhand', () => {
    expect(classifySwingKind(2.5)).toBe('overhead');
    expect(classifySwingKind(1.4)).toBe('mid');
    expect(classifySwingKind(0.6)).toBe('underhand');
    // Biên: >= 1.8 là overhead, >= 1.0 là mid, dưới 1.0 là underhand.
    expect(classifySwingKind(1.8)).toBe('overhead');
    expect(classifySwingKind(1.7999)).toBe('mid');
    expect(classifySwingKind(1.0)).toBe('mid');
    expect(classifySwingKind(0.99)).toBe('underhand');
    expect(classifySwingKind(Number.NaN)).toBe(SWING_FALLBACK_KIND);

    // predictSwingKind: cầu đứng yên rơi khoảng 0.109 m trong 0.15 s (cả lực cản và trọng lực).
    const player = createPlayerState(0);
    expect(predictSwingKind(restingShuttleAt(2.61), player, DT, DEFAULT_PHYSICS_CONFIG)).toBe(
      'overhead',
    );
    expect(predictSwingKind(restingShuttleAt(1.51), player, DT, DEFAULT_PHYSICS_CONFIG)).toBe(
      'mid',
    );
    expect(predictSwingKind(restingShuttleAt(0.71), player, DT, DEFAULT_PHYSICS_CONFIG)).toBe(
      'underhand',
    );
    // Điểm dự đoán nằm sau 0.15 s chứ không phải hiện tại: 1.85 hiện tại -> ~1.74 dự đoán -> mid.
    expect(predictSwingKind(restingShuttleAt(1.85), player, DT, DEFAULT_PHYSICS_CONFIG)).toBe(
      'mid',
    );

    // Độ cao tính so với chân: đang nhảy 0.5 m thì cùng độ cao thế giới cho kiểu thấp hơn.
    const jumper = createPlayerState(0);
    jumper.y = 0.5;
    jumper.grounded = false;
    expect(predictSwingKind(restingShuttleAt(2.61), jumper, DT, DEFAULT_PHYSICS_CONFIG)).toBe(
      'overhead',
    );
    expect(predictSwingKind(restingShuttleAt(2.2), jumper, DT, DEFAULT_PHYSICS_CONFIG)).toBe('mid');

    // Cầu sắp chạm sàn trước 0.15 s: dự đoán dừng ở sàn, độ cao 0 so với chân -> underhand.
    const nearFloor = createShuttleState();
    spawnShuttleState(nearFloor, vec3(-2.4, 0.05, 0), vec3(0, -3, 0));
    expect(predictSwingKind(nearFloor, player, DT, DEFAULT_PHYSICS_CONFIG)).toBe('underhand');

    // Cầu không bay (idle hoặc đã chạm sàn): kiểu dự phòng.
    const idle = createShuttleState();
    expect(idle.state).toBe('idle');
    expect(predictSwingKind(idle, player, DT, DEFAULT_PHYSICS_CONFIG)).toBe(SWING_FALLBACK_KIND);
    const grounded = restingShuttleAt(2.61);
    grounded.state = 'grounded';
    expect(predictSwingKind(grounded, player, DT, DEFAULT_PHYSICS_CONFIG)).toBe(
      SWING_FALLBACK_KIND,
    );

    // Tâm hitbox so với chân khớp bảng cấu hình, kể cả khi đang nhảy và theo hướng facing.
    const p2 = createPlayerState(1);
    p2.y = 0.3;
    const out = vec3();
    hitboxCenterOut(p2, 'mid', out);
    expect(out.x).toBeCloseTo(p2.x - HITBOX_MID.offsetX, 12);
    expect(out.y).toBeCloseTo(0.3 + HITBOX_MID.offsetY, 12);
    expect(hitboxRadius('overhead')).toBe(HITBOX_OVERHEAD.radius);
    expect(hitboxRadius('mid')).toBe(HITBOX_MID.radius);
    expect(hitboxRadius('underhand')).toBe(HITBOX_UNDERHAND.radius);
  });

  it('P3-U15 Chỉ đánh được cầu ở phía sân mình: cầu ở x = +0.1 thì P1 không thể đánh', () => {
    // P1 sát lưới nhất (x = -0.35): tâm hitbox mid ở x = +0.10, y = 1.40.
    const nearNet = createPlayerState(0, -0.35);
    expect(nearNet.x).toBeCloseTo(-0.35, 12);
    const center = hitboxCenterOut(nearNet, 'mid', vec3());
    expect(center.x).toBeCloseTo(0.1, 12);
    expect(center.y).toBeCloseTo(1.4, 12);

    const swing = makeActiveSwing('mid');
    const contact = vec3(9, 9, 9);
    const wrongSide = detectSwingHit(nearNet, swing, vec3(0.1, 1.7, 0), vec3(0.1, 1.1, 0), contact);
    expect(wrongSide).toBeNull();
    expect(contact).toEqual({ x: 9, y: 9, z: 9 });

    // Đối chứng: lùi P1 ra x = -0.55 thì đoạn tại x = -0.10 nằm trong hitbox và đánh được.
    const retreated = createPlayerState(0, -0.55);
    const okContact = vec3();
    const okFraction = detectSwingHit(
      retreated,
      makeActiveSwing('mid'),
      vec3(-0.1, 1.7, 0),
      vec3(-0.1, 1.1, 0),
      okContact,
    );
    expect(okFraction).not.toBeNull();
    expect(okContact.x).toBeCloseTo(-0.1, 12);
    expect(okContact.x * retreated.facing).toBeLessThanOrEqual(0);

    // P2 đối xứng: facing = -1 chỉ đánh được cầu ở x >= 0.
    const p2Near = createPlayerState(1, 0.35);
    expect(
      detectSwingHit(
        p2Near,
        makeActiveSwing('mid'),
        vec3(-0.1, 1.7, 0),
        vec3(-0.1, 1.1, 0),
        vec3(),
      ),
    ).toBeNull();
    const p2Back = createPlayerState(1, 0.55);
    expect(
      detectSwingHit(p2Back, makeActiveSwing('mid'), vec3(0.1, 1.7, 0), vec3(0.1, 1.1, 0), vec3()),
    ).not.toBeNull();

    // Cầu bay từ sân đối phương sang sân mình: phần đoạn ở phía x < 0 vẫn đánh được (GAME_SPEC §5.2),
    // điểm chạm là điểm cắt lưới x = 0 nếu điểm đó đã nằm trong hình cầu hitbox, đẩy 1 mm vào sân mình (HIT_NET_CONTACT_INSET_M).
    const crossing = createPlayerState(0, -0.35);
    const crossContact = vec3();
    const crossFraction = detectSwingHit(
      crossing,
      makeActiveSwing('mid'),
      vec3(0.8, 1.4, 0),
      vec3(-0.25, 1.4, 0),
      crossContact,
    );
    // Điểm vào hình cầu ở x = 0.60 (> 0) không tính; điểm (0, 1.4) cách tâm 0.10 < 0.5 nên chạm ở sát lưới, x = -facing·0.001.
    // (Hành vi cũ trả null cho ca này; đổi theo GAME_SPEC §5.2, người dùng đã duyệt.)
    expect(crossFraction).not.toBeNull();
    expect(crossFraction as number).toBeCloseTo(0.8 / 1.05, 12);
    expect(crossContact.x).toBeCloseTo(-crossing.facing * HIT_NET_CONTACT_INSET_M, 12);
    expect(crossContact.y).toBeCloseTo(1.4, 12);
    expect(crossContact.x * crossing.facing).toBeLessThanOrEqual(0);

    // Ca của Reviewer: P1 ở x = -0.35, vung mid ACTIVE (tâm (0.10, 1.40), r = 0.5). Đoạn (0.05, 1.75) -> (-0.45, 1.75):
    // điểm (0, 1.75) cách tâm 0.364 < 0.5 nên đánh được ngay tại điểm cắt lưới (fraction 0.1).
    const mid = hitboxRadius('mid');
    const reviewerCenter = hitboxCenterOut(crossing, 'mid', vec3());
    expect(distance(vec3(0, 1.75, 0), reviewerCenter)).toBeLessThan(mid);
    const reviewerContact = vec3();
    const reviewerFraction = detectSwingHit(
      crossing,
      makeActiveSwing('mid'),
      vec3(0.05, 1.75, 0),
      vec3(-0.45, 1.75, 0),
      reviewerContact,
    );
    expect(reviewerFraction).not.toBeNull();
    expect(reviewerFraction as number).toBeCloseTo(0.1, 12);
    expect(reviewerContact.x).toBeCloseTo(-crossing.facing * HIT_NET_CONTACT_INSET_M, 12);
    expect(reviewerContact.y).toBeCloseTo(1.75, 12);
    expect(reviewerContact.x * crossing.facing).toBeLessThanOrEqual(0);

    // Đoạn nằm hoàn toàn ở sân mình vẫn như cũ: đầu mút đầu trong hình cầu -> fraction 0 tại đầu mút.
    const ownSideContact = vec3();
    expect(
      detectSwingHit(
        crossing,
        makeActiveSwing('mid'),
        vec3(-0.2, 1.6, 0),
        vec3(-0.7, 1.6, 0),
        ownSideContact,
      ),
    ).toBe(0);
    expect(ownSideContact.x).toBeCloseTo(-0.2, 12);
    // Tick sau cú của Reviewer (-0.45 -> -0.95): cầu đã ra khỏi hình cầu (cách tâm 0.652 > 0.5) và đi xa dần -> null.
    expect(
      detectSwingHit(
        crossing,
        makeActiveSwing('mid'),
        vec3(-0.45, 1.75, 0),
        vec3(-0.95, 1.75, 0),
        vec3(),
      ),
    ).toBeNull();

    // P2 đối xứng: x = 0.35, facing = -1, tâm mid (-0.10, 1.40). Đoạn (-0.05, 1.75) -> (0.45, 1.75).
    const p2Crossing = createPlayerState(1, 0.35);
    const p2Contact = vec3();
    const p2Fraction = detectSwingHit(
      p2Crossing,
      makeActiveSwing('mid'),
      vec3(-0.05, 1.75, 0),
      vec3(0.45, 1.75, 0),
      p2Contact,
    );
    expect(p2Fraction).not.toBeNull();
    expect(p2Fraction as number).toBeCloseTo(0.1, 12);
    expect(p2Contact.x).toBeCloseTo(-p2Crossing.facing * HIT_NET_CONTACT_INSET_M, 12);
    expect(p2Contact.x * p2Crossing.facing).toBeLessThanOrEqual(0);

    // Điểm chạm sát mặt phẳng lưới phải đủ sâu vào sân mình để bộ giải thấy cầu cắt lưới: solveShot từ đúng các
    // điểm chạm vừa nhận (P1 và P2, assist bật). CLEAR, DRIVE, LIFT, DROP, SMASH phải giải được và có netCross.
    // BLOCK và NET_SHOT (TWO_POINT) có giới hạn góc sẵn có khi contact cao hơn mép lưới: chỉ đòi netCross và v0 hữu hạn.
    const netContacts: ReadonlyArray<readonly [1 | -1, Vec3]> = [
      [crossing.facing, reviewerContact],
      [p2Crossing.facing, p2Contact],
    ];
    const solvedShots: ShotType[] = ['CLEAR', 'DRIVE', 'LIFT', 'DROP', 'SMASH'];
    const twoPointShots: ShotType[] = ['BLOCK', 'NET_SHOT'];
    for (const [facing, contactPoint] of netContacts) {
      expect(contactPoint.x * facing).toBeLessThan(0);
      for (const shot of [...solvedShots, ...twoPointShots]) {
        const params = getShotParams(shot);
        const solution = solveShot({
          shot,
          contact: contactPoint,
          facing,
          targetDepth: params.defaultDepth,
          params,
          assist: true,
        });
        const label = `${shot} facing ${facing}`;
        expect(solution.flight.netCross, label).not.toBeNull();
        expect(Number.isFinite(solution.v0.x), label).toBe(true);
        expect(Number.isFinite(solution.v0.y), label).toBe(true);
        if (solvedShots.includes(shot)) {
          expect(solution.solved, label).toBe(true);
        }
      }
    }

    // Cả hai đầu mút ở sân đối phương: không đánh được, outContact giữ nguyên.
    const farContact = vec3(5, 5, 5);
    expect(
      detectSwingHit(
        crossing,
        makeActiveSwing('mid'),
        vec3(0.9, 1.4, 0),
        vec3(0.2, 1.4, 0),
        farContact,
      ),
    ).toBeNull();
    expect(farContact).toEqual({ x: 5, y: 5, z: 5 });
    const p2FarContact = vec3(5, 5, 5);
    expect(
      detectSwingHit(
        p2Crossing,
        makeActiveSwing('mid'),
        vec3(-0.9, 1.4, 0),
        vec3(-0.2, 1.4, 0),
        p2FarContact,
      ),
    ).toBeNull();
    expect(p2FarContact).toEqual({ x: 5, y: 5, z: 5 });

    // Cầu ~60 m/s (0.47 m/tick) qua lưới, cả hai đầu mút nằm ngoài hình cầu: dây cung của y = 1.85 chạy từ
    // x = -0.118 đến 0.318 nên điểm vào ở x > 0 (cách cũ loại cả đoạn và bỏ sót hẳn cú đánh). Điểm cắt lưới
    // (0, 1.85) cách tâm 0.461 < 0.5 nên nay vẫn đánh được, tại x = -facing·0.001.
    const fast = createShuttleState();
    spawnShuttleState(fast, vec3(0.34, 1.85, 0), vec3(-60, 0, 0));
    const fastPrev = vec3(fast.pos.x, fast.pos.y, fast.pos.z);
    stepShuttle(fast, DT, DEFAULT_PHYSICS_CONFIG, createShuttleScratch(), 1);
    const fastCurr = vec3(fast.pos.x, fast.pos.y, fast.pos.z);
    expect(fastPrev.x - fastCurr.x).toBeGreaterThan(0.4);
    expect(fastPrev.x).toBeGreaterThan(0);
    expect(fastCurr.x).toBeLessThan(0);
    expect(distance(fastPrev, reviewerCenter)).toBeGreaterThan(mid);
    expect(distance(fastCurr, reviewerCenter)).toBeGreaterThan(mid);
    expect(sweptSphereEntry(fastPrev, fastCurr, reviewerCenter, mid)).not.toBeNull(); // đoạn có chạm cầu
    const fastContact = vec3();
    const fastFraction = detectSwingHit(
      crossing,
      makeActiveSwing('mid'),
      fastPrev,
      fastCurr,
      fastContact,
    );
    expect(fastFraction).not.toBeNull();
    expect(fastFraction as number).toBeCloseTo(fastPrev.x / (fastPrev.x - fastCurr.x), 12);
    expect(fastContact.x).toBeCloseTo(-crossing.facing * HIT_NET_CONTACT_INSET_M, 12);
    expect(fastContact.x * crossing.facing).toBeLessThanOrEqual(0);
    expect(distance(fastContact, reviewerCenter)).toBeLessThanOrEqual(mid);

    // Điểm cắt lưới nằm ngoài hình cầu và phần còn lại cũng không chạm: vẫn là null.
    expect(
      detectSwingHit(
        crossing,
        makeActiveSwing('mid'),
        vec3(0.2, 2.3, 0),
        vec3(-0.25, 2.3, 0),
        vec3(),
      ),
    ).toBeNull();
  });
});
