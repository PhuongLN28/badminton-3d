# DECISIONS.md — Nhật ký quyết định

> Ghi lại mọi quyết định kỹ thuật, nhất là chỗ **lệch khỏi GAME_SPEC / ROADMAP** hoặc **đổi tham số trong config.ts**.
> Một quyết định = một mục. Không xóa mục cũ; nếu đổi ý thì thêm mục mới và ghi "thay thế D-xxx".

## Template

### D-XXX — <tiêu đề ngắn> — <YYYY-MM-DD> — Trạng thái: Đề xuất | Đã duyệt | Thay thế bởi D-yyy

- **Bối cảnh**: vì sao phải quyết định (kèm số liệu đo được nếu có).
- **Phương án đã cân nhắc**: A … / B … / C …
- **Quyết định**: …
- **Hệ quả**: file/test bị ảnh hưởng, tham số mới, rủi ro.
- **Người duyệt**: người dùng (trong chat ngày …) / chưa duyệt.

---

## Các quyết định ban đầu (đã duyệt cùng spec)

### D-001 — Render 3D, gameplay 2.5D ở MVP — Đã duyệt
- **Bối cảnh**: yêu cầu "3D trên web" nhưng điều khiển kiểu side view (*Stick Figure Badminton*) dễ chơi nhất.
- **Quyết định**: Three.js, camera nhìn ngang, nhân vật di chuyển theo trục X + nhảy, cầu bay trong mặt phẳng z = 0.
  Code dùng vector 3D để mở khóa trục Z ở Phase 8a.

### D-002 — Lực cản v², tham số hóa bằng vận tốc giới hạn — Đã duyệt
- **Quyết định**: `a = g − (g/VT²)|v|v`, VT = 6.8 m/s. Không cần khối lượng. Đáp án trong `tests/fixtures/shuttle_reference.json`.

### D-003 — RK4 @120 Hz, cấm Euler — Đã duyệt
- **Bối cảnh**: đo được semi-implicit Euler @120 Hz lệch điểm rơi 44–52 cm; RK4 lệch 0.01 cm.

### D-004 — Smash cần điểm chạm ≥ 2.2 m; giao cầu dùng luật 1.15 m — Đã duyệt
- **Bối cảnh**: yêu cầu "smash chỉ khi nhảy hoặc cầu ở trên cao" và "chỉ được giao khi cầu dưới thắt lưng".
  Luật BWF hiện hành dùng độ cao cố định 1.15 m thay cho thắt lưng.

### D-005 — Đưa luật/tính điểm lên Phase 4, trước AI — Đã duyệt
- **Bối cảnh**: AI cần biết giao cầu, khi nào pha cầu kết thúc; online cũng cần luồng trận hoàn chỉnh.

### D-006 — Colyseus, server-authoritative, cầu mô phỏng tất định ở client — Đã duyệt
- **Quyết định**: client nhận sự kiện `hit` (v0 + tick) rồi tự mô phỏng cầu; snapshot 30 Hz chỉ để hiệu chỉnh.
  Tầng mạng qua interface `NetTransport` để có thể đổi sang Socket.io.

### D-007 — Âm thanh tổng hợp bằng code làm mặc định — Đã duyệt
- **Bối cảnh**: không phụ thuộc file âm thanh và giấy phép; có thể thay file CC0 sau.

### D-008 — Tự push lên GitHub sau mỗi commit — Đã duyệt
- **Quyết định**: remote `origin` = https://github.com/PhuongLN28/badminton-3d.git, nhánh `main`. Commit xong là push ngay,
  chỉ commit khi typecheck + test xanh, tag cuối phase dạng annotated và push kèm `--follow-tags`.
- **Hệ quả**: không force push, không sửa lịch sử đã push; muốn bỏ thay đổi thì dùng `git revert`. Agent không tự xử lý thông tin đăng nhập.

### D-009 — Bổ sung 4 gói devDependencies kỹ thuật cho Vite, ESLint v9 và Node — 2026-11-27 — Trạng thái: Đã duyệt
- **Bối cảnh**: Danh sách thư viện tại `AGENTS.md` §9 chưa liệt kê 4 gói devDependency kỹ thuật cần thiết để chạy Vite bundler, kiểm tra kiểu Node cho các file cấu hình / test kiến trúc, và cấu hình ESLint v9 flat config cho TypeScript.
- **Phương án đã cân nhắc**: A: Cài thiếu gói kỹ thuật (lỗi build/lint) / B: Bổ sung 4 gói devDependencies chuẩn gồm `vite`, `@types/node`, `@eslint/js`, `typescript-eslint`.
- **Quyết định**: Chọn B — cài `vite`, `@types/node`, `@eslint/js`, `typescript-eslint` ở `devDependencies` (chỉ phục vụ phát triển/build/lint, không đưa vào bundle client).
- **Hệ quả**: `package.json` có đủ toolchain Vite + TypeScript + ESLint v9 + Vitest + Playwright.
- **Người duyệt**: người dùng (trong chat ngày 2026-11-27).

### D-010 — Dùng `THREE.PCFShadowMap` trên Three.js 0.187.0 thay cho `PCFSoftShadowMap` đã bị gỡ — 2026-11-27 — Trạng thái: Đã duyệt
- **Bối cảnh**: Kiểm tra API thật của bản Three.js vừa cài (`0.187.0`, theo `AGENTS.md` §9) cho thấy `PCFSoftShadowMap` đã bị `@deprecated since r186` và tự động fallback kèm cảnh báo `warn('WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.')`.
- **Phương án đã cân nhắc**: A: Giữ `PCFSoftShadowMap` (phát sinh warning runtime mỗi khi tạo renderer) / B: Dùng `THREE.PCFShadowMap` trực tiếp.
- **Quyết định**: Chọn B — cấu hình `renderer.shadowMap.type = THREE.PCFShadowMap` trong `src/client/render/scene.ts`.
- **Hệ quả**: Khử hoàn toàn deprecation warning từ Three.js `0.187.0` mà giữ nguyên chất lượng đổ bóng PCF.
- **Người duyệt**: Tự động áp dụng theo luật kiểm tra phiên bản API trong `AGENTS.md` §9.

### D-011 — Smash khi nhảy = 60 × 1.08 = 64.8 m/s — 2026-11-27 — Trạng thái: Đã duyệt
- **Bối cảnh**: GAME_SPEC §5.3 đặt `JUMP_SMASH_SPEED_MULT = 1.08`, còn bảng §5.4 ghi "nhảy 65 m/s". 60 × 1.08 = 64.8, lệch 0.2 m/s. ROADMAP P3-U18 kiểm tỷ lệ tốc độ nhảy/đứng đúng 1.08.
- **Phương án đã cân nhắc**: A: cố định 65 m/s (tỷ lệ 1.0833, không khớp P3-U18) / B: nhân hệ số 1.08 vào tốc độ smash (64.8 m/s).
- **Quyết định**: Chọn B. Con số 65 trong §5.4 coi là làm tròn của 64.8.
- **Hệ quả**: `JUMP_SMASH_SPEED_MULT = 1.08` trong `config.ts`; `shots/resolveShot.ts` nhân hệ số khi `airborne`. Số đo tham chiếu: smash nhảy 64.8 m/s từ (−4.0, 3.1) có đích tối thiểu còn qua lưới là 3.7 m.
- **Người duyệt**: người dùng (trong chat ngày 2026-11-27).

### D-012 — Hệ số tốc độ theo timing chỉ áp cho SMASH và DRIVE — 2026-11-27 — Trạng thái: Đã duyệt
- **Bối cảnh**: GAME_SPEC §5.6 ghi hệ số tốc độ 1.05 / 1.00 / 0.90 theo PERFECT / GOOD / OK, trong đó 1.05 "chỉ smash/drive", nhưng không nói 0.90 áp cho cú nào. Đo mô phỏng (RK4 @120 Hz): nếu nhân 0.90 cho mọi cú thì cú nhẹ đánh "OK" luôn vào lưới: net shot qua lưới 1.424 m, low serve 1.508 m, block 1.408 m, drop 1.273 m (đều < 1.524 m); clear rơi ngắn tới 0.39 m.
- **Phương án đã cân nhắc**: A: nhân hệ số cho mọi cú / B: chỉ SMASH và DRIVE.
- **Quyết định**: Chọn B. SMASH: hệ số nhân vào `speed` cố định trước khi giải lý tưởng. DRIVE: nhân vào tốc độ sau khi giải (×0.9 cho điểm rơi 5.03 m thay vì 5.50 m, qua lưới 1.56 m, vẫn bay qua được).
- **Hệ quả**: `TIMING_SPEED_FACTOR_SHOTS = ['SMASH', 'DRIVE']` và `TIMING_PARAMS` trong `config.ts`; `shots/timing.ts` (`timingSpeedFactor`) và `shots/resolveShot.ts`. Cú nhẹ chỉ mất độ chính xác theo σ, không bị phạt tốc độ.
- **Người duyệt**: người dùng (trong chat ngày 2026-11-27).

### D-013 — Cách cộng nhiễu timing theo chế độ giải — 2026-11-27 — Trạng thái: Đã duyệt
- **Bối cảnh**: §5.6 yêu cầu cộng nhiễu vào đích, góc, clearance rồi giải lại với `assist = false`, nhưng góc và clearance không phải tham số đầu vào của mọi chế độ giải (§5.4).
- **Phương án đã cân nhắc**: A: cộng cả ba đại lượng cho mọi chế độ / B: cộng đại lượng nào là đầu vào của chế độ đó / C: chỉ nhiễu đích.
- **Quyết định**: Chọn B. `FIXED_ELEV`: σ góc cộng vào góc bắn (sau assist), σ đích cộng vào đích, rồi giải lại tốc độ. `FIXED_SPEED`: σ đích cộng vào đích trước khi giải lại, σ góc xoay `v0` sau khi giải. `TWO_POINT`: σ clearance và σ đích, không dùng σ góc (góc là ẩn số). Đích sau nhiễu có thể ≤ 0 hoặc không đạt được: solver vẫn trả `v0` hữu hạn kèm `solved = false`, không NaN, không ném lỗi, và không kẹp lại sau nhiễu (timing kém có thể ra ngoài hoặc vào lưới thật). Mỗi cú rút đúng 3 số chuẩn (12 uniform) từ RNG có seed để chuỗi ngẫu nhiên tất định.
- **Hệ quả**: `shots/resolveShot.ts`, `shots/shotSolver.ts`; test P3-U13, P3-U14, P3-U17.
- **Người duyệt**: người dùng (trong chat ngày 2026-11-27).

### D-014 — Đích cách lưới tối thiểu 0.2 m — 2026-11-27 — Trạng thái: Đã duyệt
- **Bối cảnh**: §5.7 chỉ kẹp đích "cách biên ít nhất 0.2 m" ở phía biên cuối. Aim về phía lưới trừ 0.3–0.8 m khỏi đích, nên đích có thể về ≤ 0 (rơi sang sân của chính người đánh) khi đổi cấu hình hoặc đặt đích nông. Ví dụ NET_SHOT 0.5 m với aim +1 cho đúng 0.5 − 0.3 = 0.2 m.
- **Phương án đã cân nhắc**: A: chỉ kẹp biên cuối (đích ≤ 6.5 m) / B: kẹp cả hai đầu, đích trong [0.2, 6.5] m tính từ lưới.
- **Quyết định**: Chọn B. `TARGET_MIN_DEPTH = 0.2 m` đối xứng với `TARGET_EDGE_MARGIN = 0.2 m`; `TARGET_MAX_DEPTH = COURT_HALF_LENGTH − TARGET_EDGE_MARGIN = 6.5 m`. Kẹp áp dụng trước khi cộng nhiễu timing.
- **Hệ quả**: `config.ts`; `shots/timing.ts` (`aimTargetDepth`, `clampTargetDepth`); P3-U17 (CLEAR 6.0 aim −1 → 6.5 vì 6.6 bị kẹp; NET_SHOT 0.5 aim +1 → 0.2).
- **Người duyệt**: người dùng (trong chat ngày 2026-11-27).

### D-015 — DRIVE đánh thấp tay sát lưới vẫn có thể vào lưới (giữ đúng spec) — 2026-11-27 — Trạng thái: Đã duyệt
- **Bối cảnh**: §5.5 giới hạn assist ở +20° so với góc gốc. DRIVE gốc 3°, nên tối đa 23°. Đo từ (−1.5, 0.6) (underhand, sát lưới): ở 23° cầu qua lưới ở 1.169 m < 1.524 m, nên vẫn chạm lưới (`adjusted = true`). Từ (−3.0, 0.6) thì đủ (1.68 m ở 23°).
- **Phương án đã cân nhắc**: A: giữ +20° đúng spec, chấp nhận lỗi người chơi khi đánh DRIVE quá sát lưới và quá thấp / B: tăng `ASSIST_ELEV_MAX_DEG` (lệch spec).
- **Quyết định**: Chọn A. Đây là hệ quả vật lý và luật chơi, không phải lỗi. Người chơi có LIFT và NET_SHOT cho vị trí này.
- **Hệ quả**: không đổi code; P3-U08 và các test solver không phụ thuộc trường hợp này. Ghi để lưu ý khi cân bằng AI ở Phase 5 (AI không nên chọn DRIVE ở vị trí này).
- **Người duyệt**: Đã duyệt; đã báo người dùng trong chat ngày 2026-11-27.

### D-016 — TWO_POINT: đích không đạt được và góc ≥ 45° coi là "quá cao" — 2026-11-27 — Trạng thái: Đã duyệt
- **Bối cảnh**: §5.5 nói độ cao qua lưới tăng đơn điệu theo góc, nhưng ở đầu trên không đúng. Ví dụ BLOCK từ (−3.0, 0.8): độ cao qua lưới là 8.78 m ở 75° nhưng chỉ 1.96 m ở 80° (vòng trong không đạt đích ở 40 m/s), còn 85° thì cầu không tới được lưới. Bisection ngoài cần biết phải hạ hay nâng góc.
- **Phương án đã cân nhắc**: A: coi mọi trường hợp không đạt là "quá thấp" (bisection chạy sai hướng ở góc lớn) / B: vòng trong không đạt đích ở tốc độ tối đa thì θ ≥ `SOLVER_TP_UNREACHABLE_SPLIT_DEG` (45°) coi là "quá cao", còn lại coi là "quá thấp".
- **Quyết định**: Chọn B.
- **Hệ quả**: `SOLVER_TP_UNREACHABLE_SPLIT_DEG = 45` trong `config.ts`; `shots/shotSolver.ts`; kiểm bằng P3-U09, P3-U10, P3-U11.
- **Người duyệt**: Đã duyệt cùng plan Phase 3, người dùng duyệt ngày 2026-11-27.

### D-017 — Thời điểm chạm sub-tick, TIME_EPSILON_S, kiểu vung dự phòng, hitbox tính từ chân — 2026-11-27 — Trạng thái: Đã duyệt
- **Bối cảnh**: (1) `contactTime` quyết định PERFECT/GOOD/OK mà cầu 60 m/s đi 0.5 m mỗi tick, nên độ phân giải 1 tick (8.3 ms) là thô so với ngưỡng PERFECT 35 ms. (2) `t = n·dt` so với 0.15 s và δ so với 0.035 / 0.070 s sai số dấu phẩy động ở biên. (3) Cầu không bay (idle/grounded) thì `predictUntil` không có kết quả. (4) §5.2 nói "so với chân nhân vật".
- **Phương án đã cân nhắc**: A: chấm theo tick nguyên / B: chấm theo phân số vào cầu `f` của swept sphere, `contactTimeS = (elapsed − W + f)·dt`.
- **Quyết định**: Chọn B. So sánh ngưỡng bằng `δ ≤ ngưỡng + TIME_EPSILON_S` (1e-9 s), không phải nới test. Khi cầu không `flying` thì `SWING_FALLBACK_KIND = 'mid'`. Dự đoán thêm điều kiện `p.y ≤ 0` để không trả `null` khi cầu sắp chạm sàn trước 0.15 s. Offset hitbox tính từ chân (`y_chân + offsetY`, `x + facing·offsetX`).
- **Hệ quả**: `config.ts` (`TIME_EPSILON_S`, `SWING_FALLBACK_KIND`); `player/hitbox.ts`, `shots/timing.ts`; P3-U04, P3-U12.
- **Người duyệt**: Đã duyệt cùng plan Phase 3, người dùng duyệt ngày 2026-11-27.

### D-018 — Hook test mới và trường `hit.timingOffsetS` — 2026-11-27 — Trạng thái: Đã duyệt
- **Bối cảnh**: HUD cần phân biệt "SỚM" và "MUỘN" khi timing là OK, nhưng client không được tự tính luật. E2E P3-E01 và P3-E02 cần tung cầu từ tay người chơi và đặt vị trí người nhận mà không phụ thuộc thời gian thực; thiếu hook này E2E dễ chập chờn. GAME_SPEC §13.2 chưa có hai hook này.
- **Phương án đã cân nhắc**: A: client tự suy ra sớm/muộn từ thời điểm bấm (vi phạm AGENTS §5) / B: thêm trường vào sự kiện `hit` và thêm hook test.
- **Quyết định**: Chọn B. `hit` thêm `timingOffsetS` (s, = thời điểm chạm − tâm cửa sổ ACTIVE; âm là sớm). `BadmintonTestHooks` thêm `tossShuttle(player)` và `setPlayerX(player, x)`; chỉ bật khi DEV hoặc `?test=1` như các hook khác. `testHooks.ts` chỉ chuyển tiếp tới callback tùy chọn, thiếu callback thì `console.warn`.
- **Hệ quả**: `types.ts`, `client/testHooks.ts` (WP1); `main.ts` nối callback ở gói sau. Cần cập nhật GAME_SPEC §13.2 khi chốt phase nếu người dùng muốn.
- **Người duyệt**: Đã duyệt cùng plan Phase 3, người dùng duyệt ngày 2026-11-27.

### D-019 — Kẹp tốc độ solver về 120 m/s; assist FIXED_SPEED tìm nhị phân trên số nguyên k — 2026-11-27 — Trạng thái: Đã duyệt
- **Bối cảnh**: §5.5 cho phép tìm tốc độ trong [1, 150] m/s nhưng `SHUTTLE_MAX_SPEED = 120` kẹp vận tốc khi mô phỏng, nên `v0` báo ra trên 120 sẽ không khớp vật lý. Về hiệu năng (P3-U20): TWO_POINT cần khoảng 112 lần bay thử (~16 000 bước RK4), ước tính 3–4.5 ms (ngưỡng 6 ms); FIXED_SPEED có assist khoảng 9 000 bước, ước tính 2–2.6 ms (ngưỡng 3 ms). Assist tuyến tính cần khoảng 15 lần giải, tìm nhị phân chỉ khoảng 6.
- **Phương án đã cân nhắc**: A: giữ [1, 150], không kẹp / B: kẹp cận trên về `min(150, SHUTTLE_MAX_SPEED)` và tìm nhị phân trên k.
- **Quyết định**: Chọn B. Đích assist tính bằng `base + k·ASSIST_DEPTH_STEP` (k nguyên, không cộng dồn sai số). Vì độ cao qua lưới đơn điệu theo đích nên nghiệm nhị phân trùng nghiệm của vòng lặp tuyến tính §5.5. Không nới ngưỡng P3-U20.
- **Hệ quả**: `config.ts` (`SOLVER_SPEED_MAX`, `ASSIST_DEPTH_STEP`); `shots/shotSolver.ts`, `shots/flightProbe.ts`.
- **Người duyệt**: Đã duyệt cùng plan Phase 3, người dùng duyệt ngày 2026-11-27.

### D-020 — Tung cầu tập bằng phím T với vy = 10 m/s; tách `rallySim.ts` và `simHost.ts` — 2026-11-27 — Trạng thái: Đã duyệt
- **Bối cảnh**: ROADMAP Phase 3 mục 8 yêu cầu phím `T` tung cầu từ tay P1 để tập. Tung lên với vy = 7 m/s có đỉnh 2.70 m nằm ngay trong hitbox overhead (đỉnh 2.78 m), nên cầu luôn vào hitbox khi mới bắt đầu ACTIVE và timing luôn "SỚM". Với vy = 10 m/s đỉnh ≈ 3.71 m và cầu rơi lại vào hitbox overhead sau khoảng 136 tick. `main.ts` đang 444 dòng và sẽ phình thêm nếu ghép luôn vung vợt/hit.
- **Phương án đã cân nhắc**: A: vy = 7 m/s, giữ nguyên `main.ts` / B: vy = 10 m/s, đưa lõi pha cầu về `src/shared/match/rallySim.ts` (tiền thân `matchSim` của Phase 4) và phần giữ state phía client về `src/client/simHost.ts`.
- **Quyết định**: Chọn B. `PRACTICE_TOSS_VY = 10 m/s` là tạm thời, sẽ thay bằng giao cầu ở Phase 4.
- **Hệ quả**: `config.ts`; file mới `rallySim.ts`, `simHost.ts`; `main.ts` thu gọn về render và phản ứng sự kiện. Ghi vào PROGRESS.md khi chốt phase.
- **Người duyệt**: Đã duyệt cùng plan Phase 3, người dùng duyệt ngày 2026-11-27.

### D-021 — P2-U18 đo trung vị 5 mẫu thay cho 1 mẫu — 2026-11-27 — Trạng thái: Đã duyệt
- **Bối cảnh**: P2-U18 đo một mẫu duy nhất 10 000 lần `stepShuttle` và yêu cầu `< 20` ms. Bình thường mẫu này đo được 1.9–2.9 ms, nhưng khi máy tải nặng (nhiều agent cùng chạy `npm ci` / vitest, vitest chạy song song nhiều file) đã có lần đo ra 31.77 ms, làm test đỏ ngẫu nhiên khoảng 1/3 số lần chạy. `shuttle.ts` không đổi kể từ Phase 2, nên nguyên nhân là nhiễu lập lịch CPU chứ không phải hồi quy hiệu năng.
- **Phương án đã cân nhắc**: A: giữ nguyên một mẫu và chỉ cho phép một tiến trình test chạy tại một thời điểm / B: đo 5 mẫu, mỗi mẫu 10 000 bước, lấy trung vị rồi so với ngưỡng.
- **Quyết định**: Chọn B. Giữ nguyên ngưỡng 20 ms, số bước mỗi mẫu (10 000) và phần làm nóng; không `retry`, không skip. Trung vị loại bỏ được mẫu bị nhiễu lẻ, nhất quán với cách đo trung vị của P3-U20.
- **Hệ quả**: chỉ `tests/unit/physics/shuttle.test.ts` (khối P2-U18) đổi; tên test và ID giữ nguyên. Một hồi quy hiệu năng thật vẫn làm trung vị vượt 20 ms nên test vẫn bắt được.
- **Người duyệt**: người dùng (trong chat ngày 2026-11-27).
