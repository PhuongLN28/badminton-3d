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
