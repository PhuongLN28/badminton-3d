# ROADMAP.md — Lộ trình theo phase, test case và Definition of Done

> Quy ước ID test: `P<phase>-U<nn>` = unit, `P<phase>-I<nn>` = integration, `P<phase>-E<nn>` = e2e (Playwright).
> Mỗi ID phải xuất hiện trong tên một test. Giá trị kỳ vọng vật lý **đọc từ `tests/fixtures/shuttle_reference.json`**, không chép tay.
> Kết thúc mỗi phase: làm đủ **Phase Gate** trong `AGENTS.md` §6 rồi **dừng**.

## Tổng quan

| Phase | Tên | Tương ứng lộ trình MVP gốc | Kết quả chơi được |
|---|---|---|---|
| 0 | Khởi tạo dự án | — | Trang trắng có cảnh 3D, vòng lặp, bộ test chạy |
| 1 | Sân + 2 khối hộp | Bước 1 | Hai hộp chạy tới/lui, nhảy trên sân 3D |
| 2 | Vật lý quả cầu | Bước 2 | Bắn cầu thử, thấy quỹ đạo thật, cầu nảy lại khi chạm hộp |
| 3 | Vung vợt và cú đánh | Bước 3 | Đánh qua lại bằng 3 nút, có smash, drop, net shot |
| 4 | Luật, tính điểm, luồng trận | một phần Bước 5 (đưa lên sớm vì AI và online đều cần) | Chơi hết một trận 2 người 1 máy |
| 5 | AI | Bước 4 | Đấu máy 3 mức độ |
| 6 | Nhân vật, animation, âm thanh, UI | Bước 5 | Trông và nghe như một game thật |
| 7 | PvP online | — | 2 người chơi qua mạng |
| 8 | Hoàn thiện và mở rộng (tùy chọn) | — | 3D đầy đủ, cảm ứng, triển khai |

---

## Phase 0 — Khởi tạo dự án

**Mục tiêu**: bộ khung chạy được, công cụ test sẵn sàng, luật kiến trúc được kiểm tra tự động.

**Việc cần làm**
0. **Kết nối GitHub** (AGENTS.md §13): `git init -b main`, tạo `.gitignore`, `git remote add origin https://github.com/PhuongLN28/badminton-3d.git`.
   Nếu `git ls-remote origin` cho thấy remote đã có commit (README/LICENSE tạo trên GitHub) thì chạy
   `git pull origin main --allow-unrelated-histories --no-edit` trước. Commit đầu tiên là bộ tài liệu kit (`chore: add agent kit docs`), rồi `git push -u origin main`.
1. Vite + TypeScript (vanilla). Cài `three`, `@types/three`, `lil-gui`, `vitest`, `@playwright/test`, `eslint`, `prettier`, `tsx`, `concurrently`. Chạy `npx playwright install chromium`.
2. Tạo cấu trúc thư mục theo `AGENTS.md` §4, `tsconfig` strict, alias `@shared/*` → `src/shared/*`.
3. `src/shared/config.ts` (khung, có hằng số Phase 0–1), `types.ts`, `math/vec3.ts`, `math/rng.ts` (mulberry32).
4. `src/client/loop.ts`: fixed timestep 120 Hz, accumulator, `MAX_FRAME_DELTA = 0.1 s`, `alpha` nội suy. Logic tính số tick là hàm thuần để test được.
5. Cảnh Three.js: nền, mặt phẳng sàn, ánh sáng, camera side view. Xử lý resize.
6. Debug overlay hiện FPS và tick (`?debug=1`, phím `F3`).
7. `src/client/testHooks.ts` (khung): `getState`, `pause`, `resume`, `step`.
8. Scripts `package.json` theo `AGENTS.md` §8. `playwright.config.ts` có `webServer` chạy `npm run dev`.
9. Tạo `docs/PROGRESS.md` và `docs/DECISIONS.md` nếu chưa có (đã có template sẵn).

**Test tự động**

| ID | Kiểm tra | Kỳ vọng |
|---|---|---|
| P0-U01 | Loop: 60 frame, mỗi frame 1/60 s | đúng 120 tick |
| P0-U02 | Loop: 1 frame 0.5 s (tab bị treo) | kẹp còn 0.1 s → đúng 12 tick, không hơn |
| P0-U03 | Loop: alpha nội suy | luôn trong [0, 1) |
| P0-U04 | RNG seed | cùng seed → cùng dãy 1000 số; khác seed → khác; mọi giá trị trong [0, 1) |
| P0-U05 | Kiến trúc | không file nào trong `src/shared` chứa `from 'three'`, `window.`, `document.`, `Math.random`, `Date.now`, `performance.now` |
| P0-U06 | vec3 | add, sub, scale, dot, length, normalize (vector 0 → trả 0, không NaN) |
| P0-E01 | Tải trang | có `<canvas>`, không có `console.error` trong 3 s |
| P0-E02 | `?test=1` | `window.__BADMINTON__` tồn tại, `getState().tick` tăng theo thời gian |

**Kiểm tra trên trình duyệt**
- [ ] Mở `/?debug=1`: thấy sàn, ánh sáng, FPS khoảng 60. Chụp ảnh.
- [ ] Thu nhỏ/phóng to cửa sổ: hình không méo.

**Definition of Done**: `npm run check` và `npm run test:e2e` xanh. PROGRESS.md đã cập nhật. Tag `phase-0-done`.
Code và tag đã có trên GitHub (`git ls-remote --tags origin` thấy `phase-0-done`), `git status -sb` không còn "ahead".
Từ Phase 1 trở đi, "Definition of Done: như trên" cũng bao gồm điều kiện đã push này.

---

## Phase 1 — Sân 3D và hai khối hộp (Bước 1)

**Mục tiêu**: sân đúng kích thước, lưới, 2 người chơi dạng hộp chạy tới/lui và nhảy.

**Việc cần làm**
1. Hằng số sân và người chơi trong `config.ts` (GAME_SPEC §2, §6.1).
2. Vẽ sân: thảm, vạch (đơn + đôi, vạch giao cầu ngắn, vạch giao cầu dài đánh đôi), lưới, 2 cột.
3. `src/shared/player/playerSim.ts`: gia tốc, giảm tốc, tốc độ tối đa, nhảy, trọng lực riêng, giới hạn biên (không qua lưới).
4. `src/client/input/keyboard.ts`: ánh xạ phím P1 / P2 theo `KeyboardEvent.code`, xử lý phím đối nhau, `blur` thả phím. Tạo `InputFrame`.
5. Hai hộp màu (P1 xanh dương bên trái, P2 cam bên phải), nội suy vị trí khi render.
6. Chế độ tạm `local` (chưa có luật): cả hai người điều khiển được.

**Test tự động**

| ID | Kiểm tra | Kỳ vọng |
|---|---|---|
| P1-U01 | Hằng số sân | nửa sân 6.70, nửa rộng sân đơn 2.59, lưới 1.524, vạch giao cầu ngắn 1.98 |
| P1-U02 | Giữ phím tiến 1 s từ đứng yên | vận tốc = 5.0 m/s (±1%). Thời điểm đạt tốc độ tối đa ≈ 0.167 s (±1 tick) |
| P1-U03 | Thả phím khi đang 5 m/s | dừng sau 0.3125 m (±0.03 m) |
| P1-U04 | Nhảy | đỉnh = 0.551 m (±0.01), thời gian bay = 0.525 s (±1 tick). Nhấn nhảy lần 2 khi đang bay: không có tác dụng |
| P1-U05 | Biên | P1 không vượt x > −0.35; P2 không vượt x < 0.35; không lùi quá 8.0 m |
| P1-U06 | Input | trái + phải cùng lúc → `moveX = 0`; sự kiện `blur` → mọi phím thả |
| P1-U07 | Tất định | cùng chuỗi input 600 tick chạy 2 lần → state giống hệt (so sánh hash) |
| P1-U08 | Trên không | gia tốc ngang khi đang bay = 50% gia tốc mặt đất |
| P1-E01 | Nhấn `D` 500 ms | `getState().players[0].x` tăng |
| P1-E02 | Nhấn `W` | có thời điểm `y > 0`, sau đó quay về 0 |
| P1-E03 | P2 nhấn `←` 500 ms | `players[1].x` giảm (tiến về lưới) |

**Kiểm tra trên trình duyệt**
- [ ] Ảnh chụp side view: lưới ở giữa, vạch trắng rõ, P1 trái, P2 phải.
- [ ] Chạy hết cỡ về phía lưới: dừng trước lưới, không xuyên qua.
- [ ] Giữ cả `A` và `D`: đứng yên. Chuyển tab rồi quay lại: không bị kẹt phím.

**Definition of Done**: như Phase 0, tag `phase-1-done`.

---

## Phase 2 — Vật lý quả cầu (Bước 2)

**Mục tiêu**: quả cầu chịu trọng lực + lực cản v², RK4 120 Hz, va chạm sàn/lưới, mũi cầu hướng theo vận tốc. Cầu nảy lại khi chạm hộp người chơi (tạm thời).

**Việc cần làm**
1. `physics/shuttle.ts`: `accel`, `stepShuttle` (RK4, scratch vector), cờ `gravityEnabled`, `dragEnabled` cho test.
2. `physics/collision.ts`: swept test sàn (nội suy điểm chạm) và lưới (GAME_SPEC §4.4). Phát `land`, `netHit`.
3. `physics/orientation.ts`: quaternion mũi cầu, slerp làm mượt (GAME_SPEC §4.5).
4. `physics/flight.ts`: `simulateFlight`, `predictUntil`.
5. Đọc `tests/fixtures/shuttle_reference.json` trong test (import JSON).
6. Mesh quả cầu (nút bần + váy), `SHUTTLE_VISUAL_SCALE`, blob shadow, trail, vòng đánh dấu điểm rơi.
7. Bảng `lil-gui` "Bắn thử": chọn case trong fixture hoặc nhập p0, tốc độ, góc → bắn.
8. **Tạm thời** (cờ `DEBUG_AUTO_RETURN`, sẽ tắt ở Phase 3): cầu đi vào hộp thân người chơi thì bật ngược về phía đối phương với v0 cố định (30 m/s, góc 50°).
9. Hook test `spawnShuttle(p, v)`.

**Test tự động**

| ID | Kiểm tra | Kỳ vọng |
|---|---|---|
| P2-U01 | Case `fall_from_rest` | tại t = 0.5 / 1 / 2 / 3 s: vận tốc và vị trí khớp `samples` (sai số tương đối ≤ 0.5%). Đồng thời khớp công thức `v = VT·tanh(g t/VT)` |
| P2-U02 | Case `horizontal_decay_no_gravity` | khớp `samples`; công thức `v = v0/(1 + v0 t/L)`, `s = L ln(1 + v0 t/L)`, L = 4.714 m |
| P2-U03 | Case `parabola_no_drag` | tầm xa 10.194 m (±1 cm), tỷ lệ xuống/lên ≈ 1.00 (±0.03). Chứng minh bất đối xứng là do lực cản |
| P2-U04 | Case `clear_from_back` | điểm rơi, đỉnh, thời gian bay khớp fixture. **Tỷ lệ quãng xuống/quãng lên < 0.6** (fixture 0.486). **Góc rơi ≥ 80°** (fixture 85°). Vận tốc chạm sàn trong 5% của VT |
| P2-U05 | Tất cả case bay tự do trong fixture (`collideNet: false`) | `t_land`, `land.x`, `apex`, `net_cross.y` trong dung sai của fixture |
| P2-U06 | Case `smash_fast_reference` | tốc độ khi qua lưới < 45% tốc độ đầu (giảm tốc mạnh) |
| P2-U07 | Độ chính xác bộ tích phân | RK4 @120 Hz so với fixture: lệch điểm rơi < 1 cm. Thêm test chứng minh semi-implicit Euler @120 Hz lệch > 20 cm (để không ai "tối ưu" nhầm) |
| P2-U08 | Độc lập timestep | RK4 @60 Hz và @240 Hz cho điểm rơi lệch nhau < 1 cm |
| P2-U09 | Hướng mũi cầu (ORIENT_RATE = 40) | các case clear, smash, drop trong fixture: mọi tick có \|v\| > 3 m/s (sau 0.05 s đầu) thì `dot(nose, v̂) > 0.99`. Đảo chiều vận tốc 180°: sau 0.1 s `dot > 0.98`. \|v\| < 0.05: giữ hướng cũ, không NaN |
| P2-U10 | Case `smash_into_net` với `collideNet: true` | phát `netHit` đúng 1 lần ở độ cao ≈ 1.296 m (±1 cm), cầu rơi xuống phía x < 0 trong [−1.0, 0) (với phản hồi va chạm ở GAME_SPEC §4.4, mô phỏng tham chiếu cho x ≈ −0.78 m) |
| P2-U11 | Chống xuyên lưới | cầu 65 m/s bắn thẳng vào lưới (0.54 m/tick) vẫn phát `netHit` |
| P2-U12 | Case `net_shot` với `collideNet: true` | không có `netHit` (qua lưới 1.60 > 1.524) |
| P2-U13 | Chạm sàn | điểm rơi nội suy lệch < 1 cm so với fixture. Sự kiện `land` phát đúng 1 lần, sau đó `state = 'grounded'` và cầu đứng yên |
| P2-U14 | Chống NaN | v = 0, v = 500 m/s (bị kẹp về 120), p rất lớn: không NaN/Infinity |
| P2-U15 | `GAME_SPEED = 1.2` | cùng điểm rơi (±1 cm), thời gian bay tính bằng tick giảm theo tỷ lệ 1/1.2 (±1 tick) |
| P2-U16 | Tất định | chạy cùng case 2 lần → mọi vị trí giống hệt từng bit |
| P2-U17 | Nảy tạm thời | cầu bay vào hộp P2 → vận tốc đổi sang hướng −x, vẫn đúng 1 lần mỗi lần chạm |
| P2-U18 | Hiệu năng | 10 000 lần `stepShuttle` < 20 ms (Node) |
| P2-E01 | `spawnShuttle` theo case `clear_from_back` | sau `step(360)`: `shuttle.state === 'grounded'`, có đúng 1 sự kiện `land` |
| P2-E02 | Không lỗi console khi bắn 20 quả liên tiếp | 0 `console.error` |

**Kiểm tra trên trình duyệt**
- [ ] Bắn Clear: cầu lao nhanh, chậm dần, **rơi gần như thẳng đứng**. Chấm trail (debug) dày dần về cuối. So sánh với `docs/img/trajectories.png`. Chụp ảnh.
- [ ] Bắn Smash: cầu cắm xuống nhanh. Bắn `smash_into_net`: cầu đập lưới, rơi về phía người đánh.
- [ ] Nhìn gần (debug camera): **nút bần luôn đi trước**, lật nhanh khi đổi hướng.
- [ ] Bóng tròn dưới cầu giúp đoán điểm rơi.
- [ ] Đứng hộp P2 chắn đường cầu: cầu bật lại.

**Definition of Done**: như trên, tag `phase-2-done`. Ghi vào PROGRESS.md bảng so sánh số liệu fixture và kết quả đo.

---

## Phase 3 — Vung vợt và các kiểu đánh (Bước 3)

**Mục tiêu**: 3 nút đánh, hitbox bật 0.2 s, phân loại cú, shot solver, timing, aim. Tắt `DEBUG_AUTO_RETURN`.

**Việc cần làm**
1. `player/swing.ts`: state machine READY → WINDUP → ACTIVE → RECOVERY (GAME_SPEC §5.1).
2. `player/hitbox.ts`: chọn kiểu vung bằng dự đoán độ cao, hitbox swept sphere, chỉ đánh phía sân mình, khóa chạm 2 lần.
3. `shots/shotTypes.ts`: bảng phân loại (§5.3) và bảng thông số (§5.4) đặt trong config.
4. `shots/shotSolver.ts`: 3 chế độ giải + kiểm tra lưới (§5.5).
5. `shots/timing.ts`: chấm PERFECT / GOOD / OK, nhiễu Irwin–Hall (§5.6). Aim (§5.7).
6. Sự kiện `hit` đầy đủ (§5.8). Popup tên cú + km/h + timing.
7. Debug: vẽ hitbox, điểm rơi dự đoán ngay sau mỗi cú.
8. Tạm thời: phím `T` (local) tung cầu từ tay P1 để tập đánh qua lại (sẽ thay bằng giao cầu ở Phase 4).

**Test tự động**

| ID | Kiểm tra | Kỳ vọng |
|---|---|---|
| P3-U01 | Dòng thời gian vung | nhấn ở tick 0 → ACTIVE từ 0.05 s đến 0.25 s, READY lại ở 0.50 s. Nhấn lần 2 giữa chừng: bị bỏ qua |
| P3-U02 | Hitbox | cầu đi qua hitbox overhead trong ACTIVE → đúng 1 `hit`. Ngoài ACTIVE → 0 `hit` |
| P3-U03 | Swept | cầu 60 m/s đi xuyên hitbox giữa 2 tick vẫn được phát hiện |
| P3-U04 | Kiểu vung | độ cao dự đoán 2.5 → overhead; 1.4 → mid; 0.6 → underhand |
| P3-U05 | Bảng phân loại | đủ mọi ô trong GAME_SPEC §5.3, ví dụ: (overhead, Power, chạm 2.6 m) → SMASH; (overhead, Power, chạm 2.0 m) → DRIVE; (underhand, Soft, \|x\| = 1.5) → NET_SHOT; (underhand, Soft, \|x\| = 4) → BLOCK |
| P3-U06 | Solver CLEAR | từ (−5.0, 2.6), đích 6.0 → tốc độ 46.9 (±0.3), mô phỏng lại rơi trong 5 cm quanh đích |
| P3-U07 | Solver DROP | từ (−4.5, 2.6), góc 10°, đích 1.2 → 11.3 m/s (±0.1) |
| P3-U08 | Solver SMASH + lưới | từ (−4.0, 2.7), 60 m/s, yêu cầu đích 3.0 → `adjusted = true`, đích thực tế trong [4.3, 4.5], qua lưới ≥ 1.624 m, rơi trong sân |
| P3-U09 | Solver NET_SHOT (TWO_POINT) | từ (−0.5, 1.2), clearance 0.08, đích 0.5 → góc 67.3° (±0.5), tốc độ 3.46 (±0.05), qua lưới trong [1.584, 1.624] |
| P3-U10 | Solver LOW_SERVE | từ (−2.2, 1.05), clearance 0.10, đích 2.3 → góc 26.1° (±0.5), 9.16 m/s (±0.05), rơi > 1.98 |
| P3-U11 | Solver BLOCK | từ (−3.0, 0.8), clearance 0.20, đích 1.5 → góc 37.8° (±0.5), 9.37 m/s (±0.05) |
| P3-U12 | Timing | chạm tại 0.10 s → PERFECT; 0.03 s hoặc 0.17 s → GOOD; 0.0 s hoặc 0.20 s → OK |
| P3-U13 | Phân phối nhiễu | 2000 mẫu với σ = 0.6: trung bình trong ±0.05, độ lệch chuẩn trong ±10% |
| P3-U14 | PERFECT không có nhiễu | 100 cú PERFECT cùng đầu vào → điểm rơi giống nhau |
| P3-U15 | Chỉ đánh phía mình | cầu ở x = +0.1: P1 không thể đánh |
| P3-U16 | Chống chạm 2 lần | P1 vừa đánh xong, cầu quay lại vùng hitbox P1 (giả lập) → không có `hit` thứ 2 |
| P3-U17 | Aim | giữ về phía lưới khi CLEAR → đích giảm 0.6 m; đích luôn được kẹp trong sân (cách biên 0.2 m) trước khi cộng nhiễu |
| P3-U18 | Smash nhảy | đang bay → tốc độ × 1.08; điểm chạm cao hơn → góc cắm dốc hơn so với đứng |
| P3-U19 | Sự kiện hit | có đủ trường; `speedKmh = \|v0\| × 3.6` |
| P3-U20 | Hiệu năng solver | trung vị 100 lần giải: FIXED_ELEV / FIXED_SPEED < 3 ms, TWO_POINT < 6 ms |
| P3-E01 | Hook: tung cầu vào vùng overhead của P1, đặt input `swing: 'power'` đúng tick | sự kiện `hit` với `shot = 'SMASH'`, cầu rơi bên P2 |
| P3-E02 | Rally tự động bằng hook | P1 và P2 đánh qua lại 6 cú bằng input kịch bản, không lỗi console |

**Kiểm tra trên trình duyệt**
- [ ] Local 2 người: thử đủ 3 nút ở cả 3 độ cao. Popup đúng tên cú.
- [ ] Net shot vừa qua mép lưới rồi rơi ngay. Drop rơi trước vạch giao cầu ngắn. Smash cắm dốc, rất nhanh.
- [ ] Smash từ cuối sân với góc dốc: cú bị đẩy sâu hơn để qua lưới.
- [ ] Đánh sớm/muộn: thỉnh thoảng ra ngoài hoặc vào lưới. Đánh PERFECT: chính xác.
- [ ] Debug: hitbox chuyển xanh trong 0.2 s khi vung. Quay một browser recording ngắn.

**Definition of Done**: như trên, tag `phase-3-done`.

---

## Phase 4 — Luật, tính điểm, luồng trận, HUD

**Mục tiêu**: chơi hết một trận 2 người 1 máy đúng luật.

**Việc cần làm**
1. `rules/rallyJudge.ts` (§7.2), `rules/scoring.ts` (§7.1), `rules/serve.ts` (§7.3, gồm `serviceCourt` cho chế độ 3D).
2. `match/stateMachine.ts` và `match/matchSim.ts`: ghép player, swing, shuttle, rules thành `step(inputs) → events`.
3. Giao cầu thật (thay phím `T` tạm). Vị trí giao/nhận. Khóa nhảy khi giao.
4. HUD: bảng điểm, người giao, popup lý do, popup cú đánh. Menu tối thiểu: "2 người 1 máy", cấu hình điểm (5 / 11 / 21) và số ván.
5. Tạm dừng (`Esc`), tự pause khi ẩn tab.
6. Hook `startMatch`, `forceLanding`.

**Test tự động**

| ID | Kiểm tra | Kỳ vọng |
|---|---|---|
| P4-U01 | Rơi trong sân P2 (x = 3.0) sau cú của P1 | P1 được điểm, lý do IN |
| P4-U02 | Rơi x = 6.8 sau cú của P1 | P2 được điểm, lý do OUT |
| P4-U03 | Vạch tính là trong | x = 6.70 → IN; x = 6.701 → OUT; x = −6.70 → IN |
| P4-U04 | Chạm lưới rồi rơi bên người đánh | người đánh thua, lý do NET |
| P4-U05 | Giao cầu | rơi x = 1.5 → SERVE_SHORT (người giao thua); x = 1.98 → hợp lệ; x = 2.0 → hợp lệ; x = 6.8 → OUT |
| P4-U06 | Độ cao giao | chạm 1.14 m → hợp lệ; 1.16 m → SERVE_TOO_HIGH |
| P4-U07 | Tính điểm rally | người thắng pha cầu +1 và giao tiếp |
| P4-U08 | Kết thúc ván | 21: 20–20 → 21–20 chưa xong, 22–20 xong, 29–29 → 30–29 xong. 11: 10–10 → 12–10 xong, 14–14 → 15–14 xong. 5: 4–4 → 6–4 xong, 6–6 → 7–6 xong |
| P4-U09 | Trận 3 ván | 1–1 → chơi ván 3; 2–0 → hết trận |
| P4-U10 | `serviceCourt` (cho 3D) | điểm người giao chẵn → ô phải; lẻ → ô trái |
| P4-U11 | Máy trạng thái | chuyển không hợp lệ (vd. RALLY → MENU) bị từ chối; POINT_END kéo dài 1.5 s rồi sang SERVE_SETUP |
| P4-U12 | Vị trí giao | người giao ở x = ∓2.6, người nhận ở ±3.0 sau SERVE_SETUP |
| P4-U13 | Lỗi tức thời | REACH_OVER và DOUBLE_HIT (giả lập) kết thúc pha cầu ngay, đúng người thua |
| P4-U14 | Trận ngẫu nhiên dài | input ngẫu nhiên có seed, 20 000 tick: không exception, điểm không giảm, tổng điểm = số pha cầu đã kết thúc |
| P4-U15 | Tất định cấp trận | cùng seed và input → cùng chuỗi sự kiện |
| P4-E01 | Menu → "2 người 1 máy" → P1 nhấn `J` giao cầu | trạng thái chuyển sang RALLY |
| P4-E02 | `forceLanding(3.0)` trong RALLY | HUD (`data-testid="score-p1"`) tăng 1 và hiện popup lý do |
| P4-E03 | `Esc` | tick đứng yên khi pause, chạy lại khi tiếp tục |
| P4-E04 | Chơi nhanh bằng hook đến hết ván 5 điểm | hiện màn kết quả với người thắng đúng |

**Kiểm tra trên trình duyệt**
- [ ] Chơi một ván 5 điểm local. Các popup "CẦU RA NGOÀI", "CHẠM LƯỚI", "GIAO CẦU NGẮN" hiện đúng lúc.
- [ ] Biểu tượng người giao chuyển đúng sau mỗi điểm.
- [ ] Chụp màn hình HUD và màn kết quả.

**Definition of Done**: như trên, tag `phase-4-done`.

---

## Phase 5 — AI đối thủ (Bước 4)

**Mục tiêu**: chế độ đấu máy với 3 mức độ, bot chơi "hợp lý" và không gian lận.

**Việc cần làm**
1. `ai/predictor.ts` (ứng viên điểm đánh, điểm rơi), `ai/bot.ts` (vòng quyết định §8.2, chọn cú §8.3), `ai/difficulty.ts` (§8.4).
2. Bot giao cầu, bỏ cầu ra ngoài, về vị trí cơ sở.
3. Menu "Chơi với máy" → chọn độ khó. Debug vẽ kế hoạch AI.
4. Công cụ `tests/integration/botVsBot.test.ts` chạy các trận bot đấu bot trong Node.

**Test tự động**

| ID | Kiểm tra | Kỳ vọng |
|---|---|---|
| P5-U01 | Độ chính xác dự đoán (nhiễu 0) | 50 cú ngẫu nhiên có seed: điểm đánh dự đoán khớp thực tế trong 2 cm |
| P5-U02 | Chọn ứng viên | cầu Clear cao, bot kịp tới → chọn overhead; không kịp → mid hoặc underhand |
| P5-U03 | Bot Khó di chuyển | Clear tới x = 6.0: bot tới điểm đứng (±0.3 m) trước khi cầu tới |
| P5-U04 | Về vị trí cơ sở | trong 1.2 s sau khi đánh, bot ở trong ±0.5 m quanh x = ±3.4 |
| P5-U05 | Bỏ cầu ra ngoài | cầu dự đoán ra ngoài 0.6 m: bot Khó không vung ≥ 95% trong 100 lần; bot Dễ vẫn vung ≥ 30% |
| P5-U06 | Thời gian phản xạ | bot Dễ không đổi input trong 380 ms sau cú đánh của đối thủ |
| P5-U07 | Phân phối cú | 1000 quyết định trong tình huống "overhead, cách lưới 3 m": tần suất trong ±5% trọng số cấu hình |
| P5-U08 | Không gian lận | bot chỉ trả về `InputFrame`; test kiến trúc: `ai/*` không import hàm ghi state của `playerSim` / `matchSim` |
| P5-U09 | Bot đấu bot | Khó vs Khó, 20 pha cầu: trung bình ≥ 3 cú mỗi pha. Khó vs Dễ, 30 ván 5 điểm: Khó thắng ≥ 80% (timeout test 60 s) |
| P5-U10 | Bot giao cầu | tới lượt bot giao: giao trong vòng 2 s |
| P5-U11 | Không rung lắc | bot đứng chờ: `moveX` không đổi dấu quá 2 lần trong 1 s |
| P5-E01 | PvE Thường, người chơi đứng yên 20 s | bot ghi ≥ 1 điểm, game chạy tiếp không lỗi |
| P5-E02 | Đổi độ khó trong menu | `getState()` cho thấy đúng preset |

**Kiểm tra trên trình duyệt**
- [ ] Chơi với bot Dễ, Thường, Khó (mỗi mức ít nhất 1 ván 5 điểm). Ghi cảm nhận vào PROGRESS.md.
- [ ] Bot không đứng rung, không chạy lố, có smash khi cầu cao gần lưới, biết bỏ cầu ra ngoài (Khó).
- [ ] Bật debug: kế hoạch AI hiển thị hợp lý. Quay browser recording 1 pha cầu dài.

**Definition of Done**: như trên, tag `phase-5-done`. **Đây là bản MVP chơi được đầy đủ offline.**

---

## Phase 6 — Nhân vật, animation, âm thanh, giao diện (Bước 5)

**Mục tiêu**: thay hộp bằng nhân vật có animation, thêm âm thanh, hiệu ứng và UI hoàn chỉnh.

**Việc cần làm**
1. Người que 3D có vợt (GAME_SPEC §10.4), animation state machine (§6.3), crossfade, đồng bộ khung chạm cầu với hitbox.
2. Hoàn thiện cầu, sân, lưới, ánh sáng, bóng đổ. Camera động (§10.5). Hiệu ứng (§10.6).
3. `audio/audioManager.ts`, `audio/synth.ts` (§12), ánh xạ sự kiện → âm thanh, pan stereo, mở khóa audio khi có thao tác đầu tiên.
4. UI đầy đủ (§11): menu, cài đặt (lưu localStorage), hướng dẫn, tạm dừng, kết quả + thống kê.
5. `public/CREDITS.md` nếu có dùng tài nguyên ngoài.

**Test tự động**

| ID | Kiểm tra | Kỳ vọng |
|---|---|---|
| P6-U01 | Ánh xạ animation | đứng yên trên đất → idle; chạy về lưới → run_forward; lùi → run_back; trên không → jump; đang vung overhead → swing_overhead; ... đủ các trạng thái |
| P6-U02 | Khung chạm cầu | thời điểm "vợt chạm" của mỗi animation vung = tâm cửa sổ ACTIVE (±1 tick) |
| P6-U03 | Ánh xạ âm thanh | `hit` SMASH → `hit_smash`; DROP / NET_SHOT / BLOCK / LOW_SERVE → `hit_soft`; còn lại → `hit_normal`; `rallyEnd` → `whistle`; `gameEnd` → `applause`; `netHit` → `net` |
| P6-U04 | Giới hạn squeak | đổi hướng liên tục 2 s ở 5 m/s → tối đa 6 lần `squeak` |
| P6-U05 | Không có AudioContext | `AudioManager` không ném lỗi, chạy im lặng |
| P6-U06 | Cài đặt | lưu và đọc lại từ localStorage; localStorage lỗi → dùng mặc định |
| P6-U07 | i18n | mọi key dùng trong UI đều có trong `vi.ts` (quét mã nguồn) |
| P6-E01 | Ảnh màn hình trận đấu | canvas không trống (độ biến thiên pixel > ngưỡng), 0 `console.error` |
| P6-E02 | Điều hướng mọi màn hình menu bằng chuột và bàn phím | đúng chữ tiếng Việt, nút có `data-testid` |
| P6-E03 | Bấm nút đầu tiên | `AudioContext.state === 'running'` (Chromium) |

**Kiểm tra trên trình duyệt**
- [ ] Animation mượt, vợt chạm cầu đúng lúc nhìn thấy, không trượt chân rõ rệt.
- [ ] Âm thanh: smash nghe "chát" to hơn, drop nghe "bộp" nhẹ, có tiếng giày khi đổi hướng gấp, còi khi hết pha cầu, vỗ tay khi hết ván.
- [ ] Camera theo cầu khi Clear cao, không chóng mặt. Cầu bay khỏi khung: có mũi tên chỉ báo.
- [ ] FPS ≥ 55 ở `?debug=1` trên máy dev. Chụp ảnh menu, trận đấu, kết quả.

**Definition of Done**: như trên, tag `phase-6-done`.

---

## Phase 7 — PvP online

**Mục tiêu**: 2 người chơi qua mạng, server có thẩm quyền, chơi mượt với độ trễ ≤ 150 ms.

**Việc cần làm**
1. `src/shared/net/protocol.ts`, `validate.ts` (§9.2). Interface `NetTransport` + transport giả lập trong bộ nhớ (cấu hình được độ trễ, jitter, mất gói).
2. Server Colyseus: `MatchRoom` chạy `MatchSim`, nhận input, gửi `snap` 30 Hz và `ev`, mã phòng, ghép ngẫu nhiên, ready, reconnect 20 s, bỏ cuộc. `/health`.
3. Client `onlineSession.ts`: prediction + reconciliation (người chơi mình), interpolation (đối thủ), mô phỏng cầu từ sự kiện `hit` (§9.3). Ping.
4. UI online: Tạo phòng (hiện mã + nút copy), Nhập mã, Ghép ngẫu nhiên, phòng chờ (ready), thông báo mất kết nối.
5. `npm run dev:all`. Ghi hướng dẫn chạy và triển khai vào README.

**Test tự động**

| ID | Kiểm tra | Kỳ vọng |
|---|---|---|
| P7-U01 | Protocol | encode/decode giữ nguyên dữ liệu. Input sai kiểu / ngoài khoảng (vd. `mx = 5`, `sw = 'hack'`) bị kẹp hoặc bỏ |
| P7-U02 | Thứ tự input | `seq` cũ hơn seq đã xử lý bị bỏ; > 120 input/s bị cắt |
| P7-U03 | Reconciliation | sau khi nhận state server và áp dụng lại input chưa xác nhận: vị trí client = vị trí server mô phỏng cùng input (±1 mm) |
| P7-U04 | Interpolation | đối thủ được vẽ ở thời điểm (hiện tại − 100 ms); thiếu snapshot thì ngoại suy tối đa 250 ms rồi đứng yên |
| P7-U05 | Mã phòng | 5 ký tự, chỉ trong bảng chữ cho phép, không trùng giữa các phòng đang mở |
| P7-I01 | Mạng giả lập 80 ms ± 20 ms, mất 2% gói, 30 s chơi kịch bản | sai lệch vị trí người chơi client–server p95 < 5 cm; vị trí cầu p95 < 10 cm; điểm số 2 client giống nhau |
| P7-I02 | Server thật (cổng ngẫu nhiên) + 2 client Node | tạo phòng → mã; vào bằng mã; cả hai ready → bắt đầu; P1 giao → cả hai nhận `ev.hit`; `debug:forceLanding` → cả hai nhận cùng tỷ số |
| P7-I03 | Client thứ 3 vào phòng đủ người | bị từ chối, lỗi `ROOM_FULL` |
| P7-I04 | P2 mất kết nối | phòng PAUSED; vào lại trong 20 s → tiếp tục đúng tỷ số; quá 20 s → P1 thắng do bỏ cuộc |
| P7-I05 | Thẩm quyền server | client gửi message lạ (vd. `setScore`, `pos`) → bị bỏ qua, state server không đổi |
| P7-I06 | Băng thông | đo trong 30 s: < 15 KB/s mỗi client |
| P7-E01 | Playwright 2 browser context | A tạo phòng, đọc mã từ UI; B nhập mã; cả hai ready; A giao cầu; sau `forceLanding` cả hai HUD hiện cùng tỷ số |

**Kiểm tra trên trình duyệt**
- [ ] Hai tab cùng máy: tạo phòng, vào phòng, chơi một ván 5 điểm.
- [ ] DevTools giả lập mạng chậm (thêm độ trễ): vẫn chơi được, người chơi của mình phản hồi tức thì, đối thủ và cầu không giật mạnh.
- [ ] Đóng một tab giữa trận rồi mở lại trong 20 s: trận tiếp tục.
- [ ] **Người dùng tự thử**: hai máy khác nhau trong cùng mạng LAN.

**Definition of Done**: như trên, tag `phase-7-done`.

---

## Phase 8 — Hoàn thiện và mở rộng (tùy chọn, làm theo yêu cầu)

Mỗi mục là một phase con riêng (8a, 8b…). Cũng phải có plan, test và Phase Gate.

| Mục | Nội dung | Test chính |
|---|---|---|
| 8a. 3D đầy đủ | Mở khóa trục Z: di chuyển trái/phải sân, camera sau lưng người chơi (tùy chọn), aim trái/phải, ô giao cầu chéo theo chẵn/lẻ, biên dọc sân đơn | rallyJudge với \|z\| > 2.59 → OUT; giao sai ô chéo → lỗi; AI dự đoán theo cả z |
| 8b. Cảm ứng | Nút ảo trên mobile (joystick trái, 3 nút đánh phải), layout dọc | e2e với `hasTouch`, giả lập thiết bị di động |
| 8c. Lag compensation | Server tua lại cầu tối đa 150 ms khi xét hitbox | mạng giả lập 150 ms: tỷ lệ đánh trúng ≥ 90% so với 0 ms |
| 8d. Triển khai | Client lên host tĩnh, server lên host Node có WebSocket, biến môi trường, CORS | smoke test với URL thật |
| 8e. Hiệu năng | Kiểm tra theo GAME_SPEC §14 | đo và ghi kết quả vào PROGRESS.md |
| 8f. Thêm nội dung | Replay pha cầu cuối, slow-motion điểm quyết định, chọn màu nhân vật, bảng xếp hạng | tùy mục |
