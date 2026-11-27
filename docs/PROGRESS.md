# PROGRESS.md — Nhật ký tiến độ

> Agent cập nhật file này **cuối mỗi phase** (bước 7 của Phase Gate). Mục mới nhất đặt lên trên cùng.
> Người dùng đọc file này để biết dự án đang ở đâu.

## Trạng thái hiện tại

| Mục | Giá trị |
|---|---|
| Phase đang làm | — (chờ bắt đầu Phase 1) |
| Phase đã xong | 0 |
| Tag gần nhất | `phase-0-done` |
| Lệnh chạy thử | `npm install && npm run dev` rồi mở http://localhost:5173/?debug=1 |

## Mục lục phase

| Phase | Trạng thái | Unit/Integration | E2E | Ngày xong |
|---|---|---|---|---|
| 0 Khởi tạo | ✅ | 6/6 | 2/2 | 2026-11-27 |
| 1 Sân + hộp | ⬜ | – | – | – |
| 2 Vật lý cầu | ⬜ | – | – | – |
| 3 Cú đánh | ⬜ | – | – | – |
| 4 Luật + HUD | ⬜ | – | – | – |
| 5 AI | ⬜ | – | – | – |
| 6 Đồ họa + âm thanh | ⬜ | – | – | – |
| 7 Online | ⬜ | – | – | – |

<!-- Ký hiệu: ⬜ chưa làm · 🟨 đang làm · ✅ xong · ⚠️ xong nhưng còn lỗi đã biết -->

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
