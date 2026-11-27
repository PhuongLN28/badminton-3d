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
