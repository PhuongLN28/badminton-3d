# PROGRESS.md — Nhật ký tiến độ

> Agent cập nhật file này **cuối mỗi phase** (bước 7 của Phase Gate). Mục mới nhất đặt lên trên cùng.
> Người dùng đọc file này để biết dự án đang ở đâu.

## Trạng thái hiện tại

| Mục | Giá trị |
|---|---|
| Phase đang làm | 0 (chưa bắt đầu) |
| Phase đã xong | — |
| Tag gần nhất | — |
| Lệnh chạy thử | `npm install && npm run dev` rồi mở http://localhost:5173/?debug=1 |

## Mục lục phase

| Phase | Trạng thái | Unit/Integration | E2E | Ngày xong |
|---|---|---|---|---|
| 0 Khởi tạo | ⬜ | – | – | – |
| 1 Sân + hộp | ⬜ | – | – | – |
| 2 Vật lý cầu | ⬜ | – | – | – |
| 3 Cú đánh | ⬜ | – | – | – |
| 4 Luật + HUD | ⬜ | – | – | – |
| 5 AI | ⬜ | – | – | – |
| 6 Đồ họa + âm thanh | ⬜ | – | – | – |
| 7 Online | ⬜ | – | – | – |

<!-- Ký hiệu: ⬜ chưa làm · 🟨 đang làm · ✅ xong · ⚠️ xong nhưng còn lỗi đã biết -->

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
