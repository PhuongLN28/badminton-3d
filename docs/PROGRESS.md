# PROGRESS.md — Nhật ký tiến độ

> Agent cập nhật file này **cuối mỗi phase** (bước 7 của Phase Gate). Mục mới nhất đặt lên trên cùng.
> Người dùng đọc file này để biết dự án đang ở đâu.

## Trạng thái hiện tại

| Mục | Giá trị |
|---|---|
| Phase đang làm | — (chờ bắt đầu Phase 2) |
| Phase đã xong | 1 |
| Tag gần nhất | `phase-1-done` |
| Lệnh chạy thử | `npm install && npm run dev` rồi mở http://localhost:5173/?debug=1 |

## Mục lục phase

| Phase | Trạng thái | Unit/Integration | E2E | Ngày xong |
|---|---|---|---|---|
| 0 Khởi tạo | ✅ | 6/6 | 2/2 | 2026-11-27 |
| 1 Sân + hộp | ✅ | 8/8 | 3/3 | 2026-11-27 |
| 2 Vật lý cầu | ⬜ | – | – | – |
| 3 Cú đánh | ⬜ | – | – | – |
| 4 Luật + HUD | ⬜ | – | – | – |
| 5 AI | ⬜ | – | – | – |
| 6 Đồ họa + âm thanh | ⬜ | – | – | – |
| 7 Online | ⬜ | – | – | – |

<!-- Ký hiệu: ⬜ chưa làm · 🟨 đang làm · ✅ xong · ⚠️ xong nhưng còn lỗi đã biết -->

---

### Phase 1 — Sân 3D và hai khối hộp — 2026-11-27

**Đã làm**
- Bổ sung hằng số kích thước hiển thị sân, lưới, băng trắng đỉnh lưới, nan lưới và khối vợt tạm vào `src/shared/config.ts` (`97cbedf`).
- Dựng sân cầu lông 3D chuẩn BWF trong `src/client/render/court.ts` (thảm xanh có viền lề `0.60 m`, `CanvasTexture` `2048 × 1024`, đầy đủ 12 vạch trắng `4 cm` gồm biên đơn/đôi, vạch giao cầu ngắn `±1.98 m`, vạch giao cầu dài đánh đôi `±5.94 m`, vạch giữa sân) và lưới 3D trong `src/client/render/net.ts` (băng trắng đỉnh `7.5 cm` ở `1.524 m`, thân lưới alpha + nan dọc, dây đáy, 2 cột thép ở `z = ±3.05 m` cao `1.55 m`).
- Cài đặt mô phỏng di chuyển & nhảy tất định trong `src/shared/player/playerSim.ts` (`fe2973c`): gia tốc `30 m/s²`, giảm tốc `40 m/s²`, tốc độ tối đa `5.0 m/s`, hệ số trên không `0.5`, nhảy `JUMP_V0 = 4.2 m/s` với trọng lực `16 m/s²` (chống nhảy kép), giới hạn biên sân `[-8.0, -0.35]` cho P1 và `[0.35, 8.0]` cho P2.
- Cài đặt `KeyboardInputController` trong `src/client/input/keyboard.ts` (`2838cc3`) ánh xạ theo `KeyboardEvent.code` cho chế độ tạm `local` P1 (`A/D/W/J/K/L`) và P2 (`←/→/↑/Numpad1-3` hoặc `, . /`), hủy phím đối nhau (`moveX = 0`), giải phóng toàn bộ phím khi `blur` / ẩn tab.
- Tạo khối hộp nhân vật P1 xanh dương / P2 cam kèm khối nhỏ biểu thị vợt (`src/client/render/playerMesh.ts`), nối vào `src/client/render/scene.ts`, nội suy vị trí `lerp(prev, curr, alpha)` và hook `setInput` trong `src/client/main.ts`, hiển thị tọa độ `P1 (x, y)` và `P2 (x, y)` trên bảng gỡ lỗi `F3` (`f5a59f1`).

**Kết quả test**

| ID | Mô tả ngắn | Kết quả | Ghi chú (số đo thực tế) |
|---|---|---|---|
| P1-U01 | Hằng số & hình học sân/lưới | ✅ | `6.70 / 2.59 / 3.05 / 1.98 / 5.94 / 0.04 / 1.524 / 1.55 m`; `buildCourtLineRects()` đủ 12 vạch đúng biên; `THREE.Box3` lưới rộng `6.10 m`, băng đỉnh `1.524 m`, cột `1.55 m` |
| P1-U02 | Chạy tiến 1 s từ đứng yên | ✅ | `vx` đạt `5.0 m/s` (±1%) tại tick `20` (`≈ 0.167 s`, trong giới hạn ±1 tick) |
| P1-U03 | Thả phím khi đang 5 m/s | ✅ | Dừng hoàn toàn (`vx = 0`) sau quãng đường `0.3125 m` (±0.03 m) |
| P1-U04 | Nhảy & chặn nhảy kép | ✅ | Đỉnh đạt `≈ 0.551 m` (±0.01 m), thời gian bay `63 tick = 0.525 s` (±1 tick); giữ nhảy liên tục cho quỹ đạo `y, vy, grounded` giống hệt |
| P1-U05 | Giới hạn biên sân | ✅ | 600 tick ép biên: P1 dừng đúng `[-8.0, -0.35]`, P2 dừng đúng `[0.35, 8.0]` |
| P1-U06 | Input đối nhau & `blur` | ✅ | `KeyA+KeyD` và `←+→` cho `moveX = 0`; `blur` thả hết phím; one-shot swing bỏ qua `repeat` |
| P1-U07 | Tất định 600 tick | ✅ | Hai lần chạy cùng chuỗi input ngẫu nhiên (seed `987654`) cho SHA-256 hash trùng khớp tuyệt đối |
| P1-U08 | Gia tốc trên không | ✅ | Tỷ số `airborne.vx / grounded.vx = 0.5` (`PLAYER_AIR_CONTROL`) |
| P1-E01 | Nhấn `D` 500 ms (60 tick) | ✅ | `players[0].x` tăng từ `-2.6` (vẫn `≤ -0.35`); `0 console.error` |
| P1-E02 | Nhấn `W` nhảy & đáp đất | ✅ | Tại tick `31`: `y > 0.5`, `grounded = false`; sau `35 tick` thêm quay về `y = 0`, `grounded = true`; `0 console.error` |
| P1-E03 | P2 nhấn `←` 500 ms (60 tick) | ✅ | `players[1].x` giảm từ `2.6` về phía lưới (`≥ 0.35`); `0 console.error` |

Tổng: `npm run check` 14/14 xanh (P0: 6 + P1: 8) · `npm run test:e2e` 5/5 xanh (P0: 2 + P1: 3) · `npm run build` xanh (`138.42 kB` gzip) · `console.error: 0`

**Git**: commit code cuối `f5a59f1` (`P1: render 3D court lines, net, player boxes, interpolation and e2e tests`) · commit chốt phase và tag `phase-1-done` đã push ✅

**Kiểm tra trên trình duyệt**
- [x] Mở `http://localhost:5173/?debug=1&test=1` (`1280×720`) qua browser subagent (`phase1_side_view.png`): thấy rõ mặt thảm sân xanh, đầy đủ vạch trắng (rõ hai vạch giao cầu ngắn `±1.98 m`, biên đơn/đôi, vạch giao cầu dài, vạch giữa sân), lưới + băng trắng + 2 cột giữa sân, khối hộp xanh P1 (`-2.60, 0.00`) bên trái, khối hộp cam P2 (`2.60, 0.00`) bên phải, cùng bảng `GỠ LỖI (F3)`.
- [x] Chạy hết cỡ hai bên về phía lưới (`KeyD` + `ArrowLeft` trong `90 tick`, `phase1_net_stop.png`): P1 dừng tại `-0.35, 0.00` (`vx = 0`), P2 dừng tại `0.35, 0.00` (`vx = 0`), không xuyên qua lưới.
- [x] Giữ đồng thời `KeyA` + `KeyD` trong `30 tick`: P1 hãm về `vx = 0` và đứng yên; giữ `KeyA` rồi kích hoạt `window` `blur` và `step(30)`: tọa độ P1 giữ nguyên `-2.7458... m`, `vx = 0`, không kẹt phím; `0 console.error`, `0 pageerror`. (Do `webview_browser` của subagent không hỗ trợ `page.evaluate`/`keydown` giữ phím nên 3 thao tác tương tác này được kiểm chứng bằng Chromium qua Playwright.)

**Người dùng nên tự thử**
- Chạy `npm run dev`, mở `http://localhost:5173/?debug=1` trên Chrome: thử điều khiển P1 (`A`/`D`/`W`) và P2 (`←`/`→`/`↑`), chạy hết cỡ vào lưới để kiểm tra chặn biên `±0.35 m`, bấm giữ `A+D` cùng lúc, và chuyển tab (`Alt+Tab`) trong lúc đang giữ phím để chắc chắn không bị kẹt phím khi quay lại.

**Lỗi đã biết / nợ kỹ thuật**
- Không có.

**Lệch so với spec** (chi tiết trong DECISIONS.md)
- Không phát sinh lệch spec mới trong Phase 1.

**Đề xuất refactor (chưa làm)**
- Không có.

**Chuyển sang phase sau**
- Phase 2: Vật lý quả cầu (`physics/shuttle.ts` RK4, `collision.ts`, `orientation.ts`, `flight.ts`), đối chiếu `tests/fixtures/shuttle_reference.json`, mesh quả cầu + bóng tròn + trail, bảng `lil-gui` bắn thử và nảy tạm thời với hộp người chơi.

---

### Phase 0 — Khởi tạo dự án — 2026-11-27

**Đã làm**
- Kết nối GitHub `https://github.com/PhuongLN28/badminton-3d.git` (nhánh `main`), cấu hình credential helper `!gh auth git-credential`, tạo `.gitignore`, pull commit khởi tạo `06cf390`, commit và push bộ tài liệu kit (`aebe9c3`).
- Thiết lập toolchain đầy đủ trong `package.json`, `tsconfig.json` (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, alias `@shared/*`), `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`, `.prettierrc`, `public/CREDITS.md`, `src/server/index.ts`.
- Cài đặt dependencies (`three@0.187.0`, `lil-gui`, `vite`, `typescript`, `vitest`, `@playwright/test`, `eslint`, `prettier`, `tsx`, `concurrently` và trình duyệt Chromium của Playwright).
- Viết phần khung `src/shared/` thuần TS: `config.ts`, `types.ts`, `math/vec3.ts`, `math/rng.ts` (`mulberry32`).
- Viết vòng lặp fixed timestep 120 Hz (`src/client/loop.ts`, `stepAccumulator`, `MAX_FRAME_DELTA = 0.1 s`, `alpha` nội suy, tự pause khi ẩn tab).
- Dựng cảnh Three.js (`src/client/render/scene.ts`, `camera.ts`) gồm sàn ngoài 20×12 m, mặt thảm sân, `HemisphereLight` + `DirectionalLight`, xử lý resize chống méo; bổ sung debug overlay (`?debug=1` / `F3`, chuỗi tiếng Việt trong `src/client/ui/i18n/vi.ts`) và test hooks (`src/client/testHooks.ts`, `window.__BADMINTON__`).

**Kết quả test**

| ID | Mô tả ngắn | Kết quả | Ghi chú (số đo thực tế) |
|---|---|---|---|
| P0-U01 | Loop: 60 frame × 1/60 s | ✅ | Chạy chính xác `120` tick |
| P0-U02 | Loop: 1 frame 0.5 s (tab bị treo) | ✅ | Kẹp còn `0.1 s` → chạy đúng `12` tick (`alpha` trong `[0, 1)`) |
| P0-U03 | Loop: `alpha` nội suy | ✅ | Toàn bộ các mức delta và 1000 mẫu giả ngẫu nhiên cho `alpha` trong `[0, 1)` |
| P0-U04 | RNG seed (`mulberry32`) | ✅ | 1000 số cùng seed khớp tuyệt đối, khác seed cho dãy khác, mọi giá trị trong `[0, 1)` |
| P0-U05 | Kiến trúc `src/shared` thuần | ✅ | Quét 4 file trong `src/shared`: 0 vi phạm (`three`, `window.`, `document.`, `Math.random`, `Date.now`, `performance.now`) |
| P0-U06 | Toán `vec3` | ✅ | `add`, `sub`, `scale`, `dot`, `length`, `normalize` đều đạt; `normalize(0,0,0)` trả `(0,0,0)`, không `NaN` |
| P0-E01 | Tải trang `/` trên Chromium | ✅ | `<canvas>` hiển thị đầy đủ; 0 `console.error`, 0 `pageerror` trong 3 s |
| P0-E02 | Mở `/?test=1` | ✅ | `window.__BADMINTON__` tồn tại; `getState().tick` tăng liên tục và `pause()` + `step(15)` tăng đúng `15` tick |

Tổng: `npm run check` 6/6 xanh · `npm run test:e2e` 2/2 xanh · `npm run build` xanh (bundle JS 134.00 kB gzip) · `console.error: 0`

**Git**: commit code cuối `7e54adc` (`P0: add Three.js scene, debug overlay, test hooks and e2e tests`) · commit chốt phase và tag `phase-0-done` đã push ✅

**Kiểm tra trên trình duyệt**
- [x] Mở `http://localhost:5173/?debug=1` (`1280×720`): thấy rõ sàn tối, thảm sân xanh, ánh sáng và bảng `GỠ LỖI (F3)` (`Tick` tăng liên tục, 0 `console.error`). Lưu ý môi trường browser subagent chạy software WebGL nên đo được `1.0–5.3 FPS` (thấp hơn ~60 FPS trên trình duyệt có GPU thật). Ảnh chụp: `phase0_debug_1280x720.png`.
- [x] Co/giãn cửa sổ (`640×720` → `1280×720`) và bấm `F3`: hình sân giữ đúng tỷ lệ không bị kéo méo, phím `F3` bật/tắt overlay bình thường. Ảnh chụp: `phase0_resize_640x720.png`.

**Người dùng nên tự thử**
- Chạy `npm run dev`, mở `http://localhost:5173/?debug=1` trên Chrome máy thật để xác nhận FPS ~60 với GPU phần cứng, bấm `F3` để ẩn/hiện bảng debug và kéo co giãn chiều ngang/dọc cửa sổ.

**Lỗi đã biết / nợ kỹ thuật**
- Không có. (Thông số FPS ~60 cần người dùng tự kiểm tra trên Chrome có GPU thật do browser subagent chạy chế độ software/webview headless).

**Lệch so với spec** (chi tiết trong DECISIONS.md)
- `D-009`: Bổ sung 4 gói `devDependencies` kỹ thuật (`vite`, `@types/node`, `@eslint/js`, `typescript-eslint`) đã được duyệt.
- `D-010`: Dùng `THREE.PCFShadowMap` thay cho `PCFSoftShadowMap` đã bị gỡ trong Three.js `0.187.0`.

**Đề xuất refactor (chưa làm)**
- Không có.

**Chuyển sang phase sau**
- Phase 1: Bổ sung hằng số/hình học vạch sân chi tiết (đơn + đôi, vạch giao cầu, lưới, 2 cột), viết `src/shared/player/playerSim.ts`, `src/client/input/keyboard.ts`, hai khối hộp P1/P2 và chạy bộ test `P1-U01`..`P1-E03`.

---

## Template cho mỗi phase (sao chép xuống dưới, điền nội dung)

### Phase N — <tên> — <YYYY-MM-DD>

**Đã làm**
- …

**Kết quả test**

| ID | Mô tả ngắn | Kết quả | Ghi chú (số đo thực tế) |
|---|---|---|---|
| PN-U01 | … | ✅ / ❌ | … |

Tổng: `npm run check` xx/xx xanh · `npm run test:e2e` xx/xx xanh · console.error: 0

**Git**: commit cuối `<hash>` · tag `phase-N-done` đã push ✅ / chưa push ❌ (lý do: …)

**Kiểm tra trên trình duyệt**
- [x] … (ảnh chụp / recording: tên file hoặc link artifact)

**Người dùng nên tự thử**
- …

**Lỗi đã biết / nợ kỹ thuật**
- …

**Lệch so với spec** (chi tiết trong DECISIONS.md)
- …

**Đề xuất refactor (chưa làm)**
- …

**Chuyển sang phase sau**
- …
