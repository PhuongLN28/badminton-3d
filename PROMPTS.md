# PROMPTS.md — Bộ prompt dùng với Antigravity

> File này dành cho **bạn** (người điều khiển agent). Sao chép prompt trong các khối code, thay phần `{...}`, dán vào ô chat của Antigravity.
> Luật chi tiết agent phải theo nằm trong `AGENTS.md`; prompt chỉ cần ngắn và chỉ đúng việc.

---

## 0. Chuẩn bị (làm một lần)

1. Giải nén `badminton-3d-agent-kit.zip`, bạn sẽ có thư mục `badminton-3d/` với **`AGENTS.md` nằm ở thư mục gốc** (đây chính là thư mục dự án):
   ```
   badminton-3d/
   ├── AGENTS.md
   ├── PROMPTS.md            (file này, giữ hoặc xóa đều được)
   ├── docs/  GAME_SPEC.md  ROADMAP.md  PROGRESS.md  DECISIONS.md  img/trajectories.png
   ├── tests/fixtures/shuttle_reference.json
   └── tools/shuttle_reference.py
   ```
2. Cài **Node.js LTS**, **Git**, **Google Chrome** (browser agent của Antigravity điều khiển Chrome). Python 3 chỉ cần khi muốn sinh lại dữ liệu vật lý.
3. Mở thư mục bằng Antigravity. Antigravity tự nạp `AGENTS.md` ở thư mục gốc làm rule cho mọi phiên. File đang khoảng 16 KB, dưới giới hạn 24 KB của Antigravity.
   *Nếu bản Antigravity của bạn chưa đọc `AGENTS.md`*: cập nhật IDE, hoặc tạo `.agents/rules/project.md` với nội dung:
   ```
   ---
   trigger: always_on
   ---
   @[AGENTS](../../AGENTS.md)
   ```
4. Thiết lập gợi ý: dùng chế độ **Planning** cho mỗi phase; cho phép agent chạy lệnh `npm`, `npx`, `git`; cho phép browser truy cập `localhost`.
   Thêm `git` vào danh sách lệnh terminal được tự chạy, nếu không agent sẽ hỏi bạn mỗi lần push.
5. **Đăng nhập Git trên máy** để agent push lên `https://github.com/PhuongLN28/badminton-3d.git` mà không bị hỏi mật khẩu.
   Cách dễ nhất: cài GitHub CLI rồi chạy `gh auth login` (chọn HTTPS và đồng ý dùng thông tin này cho Git).
   Git for Windows có sẵn Git Credential Manager, lần push đầu sẽ mở trình duyệt để đăng nhập.
   Agent được dặn **không bao giờ tự nhập token**: nếu push lỗi xác thực, nó sẽ dừng và nhờ bạn đăng nhập.
6. **Mỗi phase mở một conversation mới** để context sạch. Agent biết đang ở đâu nhờ `docs/PROGRESS.md` và git tag.

---

## 1. Prompt khởi động — Phase 0

```
Đọc kỹ AGENTS.md, docs/GAME_SPEC.md, docs/ROADMAP.md, docs/PROGRESS.md và docs/DECISIONS.md trước khi làm bất cứ việc gì.

Nhiệm vụ: thực hiện Phase 0 — Khởi tạo dự án, đúng theo docs/ROADMAP.md.

Trước khi code, hãy:
1. Tóm tắt trong 5 gạch đầu dòng: luật kiến trúc quan trọng nhất (AGENTS.md §5), các bước Phase Gate (§6), và 3 điều bị cấm (§10). Mục đích để tôi biết bạn đã hiểu luật.
2. Tạo Implementation Plan: file sẽ tạo, lệnh sẽ chạy, test sẽ viết theo đúng ID (P0-U01 … P0-E02). Chờ tôi duyệt.

Sau khi tôi duyệt:
3. Kết nối repo GitHub theo ROADMAP Phase 0 bước 0 và AGENTS.md §13: remote origin = https://github.com/PhuongLN28/badminton-3d.git, nhánh main. Commit đầu tiên là bộ tài liệu kit, push lên ngay. Nếu push lỗi xác thực thì dừng và báo tôi, không tự nhập token.
4. Viết test trước, code sau. Commit nhỏ theo từng việc, mỗi commit xong là push ngay.
5. Phase Gate: chạy `npm run check` và `npm run test:e2e`, báo số test xanh/tổng.
6. Mở trình duyệt tại http://localhost:5173/?debug=1, làm checklist "Kiểm tra trên trình duyệt" của Phase 0, chụp ảnh màn hình.
7. Cập nhật docs/PROGRESS.md theo template, commit "phase-0: ...", tạo annotated tag phase-0-done, push kèm tag (`git push origin main --follow-tags`).
8. Dừng lại và báo cáo (kèm hash commit cuối đã push). KHÔNG làm Phase 1.
```

---

## 2. Prompt chạy một phase (Phase 1 → 7)

Thay `{N}`, `{N-1}`, `{TÊN PHASE}`. Thêm phần "Ghi chú riêng" ở mục 2.1 nếu có.

```
Đọc AGENTS.md và docs/PROGRESS.md để nắm trạng thái hiện tại. Sau đó đọc phần Phase {N} trong docs/ROADMAP.md và các mục liên quan trong docs/GAME_SPEC.md.

Nhiệm vụ: thực hiện Phase {N} — {TÊN PHASE}.

Làm đúng quy trình AGENTS.md §6:
1. Kiểm tra đầu vào: `git status -sb` sạch và không ahead/behind origin, tag phase-{N-1}-done tồn tại, `npm run check` đang xanh. Nếu không đạt, báo tôi trước khi làm gì khác.
2. Implementation Plan: file tạo/sửa, liệt kê ĐỦ mọi test ID của Phase {N}, hằng số mới sẽ thêm vào src/shared/config.ts, rủi ro. Chờ tôi duyệt.
3. Viết test trước cho logic trong src/shared, tên test chứa đúng ID.
4. Code đến khi xanh. Commit nhỏ theo từng việc, mỗi commit xong là push ngay (AGENTS.md §13). Không xóa, skip hay nới tolerance test. Nếu cho rằng test hoặc spec sai: dừng, giải thích bằng số liệu, ghi đề xuất vào docs/DECISIONS.md và chờ tôi.
5. Phase Gate: `npm run check` và `npm run test:e2e` xanh 100% (kể cả test các phase trước), không có console.error.
6. Trình duyệt: làm hết checklist "Kiểm tra trên trình duyệt" của Phase {N}, chụp ảnh hoặc quay browser recording.
7. Cập nhật docs/PROGRESS.md (bảng kết quả theo từng ID, kèm số đo thực tế) và docs/DECISIONS.md nếu có chỗ lệch spec.
8. Commit "phase-{N}: ...", tạo annotated tag phase-{N}-done, `git push origin main --follow-tags`, xác nhận tag đã có trên GitHub.
9. Báo cáo ngắn: đã làm gì, test x/y xanh, hash commit cuối đã push, những gì tôi nên tự chơi thử. Sau đó dừng, không làm phase tiếp theo.

{GHI CHÚ RIÊNG CỦA PHASE, nếu có}
```

### 2.1 Ghi chú riêng nên dán thêm cho từng phase

**Phase 1 — Sân 3D và hai khối hộp**
```
Ghi chú riêng: kiểm tra kích thước sân bằng test (P1-U01), không chỉ bằng mắt. Ảnh chụp phải thấy rõ vạch giao cầu ngắn, lưới và hai hộp ở hai bên.
```

**Phase 2 — Vật lý quả cầu** (phase quan trọng nhất)
```
Ghi chú riêng:
- Mọi giá trị kỳ vọng đọc từ tests/fixtures/shuttle_reference.json, không chép tay số vào test.
- Bắt buộc RK4. Thêm test chứng minh semi-implicit Euler lệch > 20 cm (P2-U07) để sau này không ai "tối ưu" nhầm.
- Trong PROGRESS.md, thêm bảng so sánh từng case của fixture: giá trị kỳ vọng và giá trị đo được.
- Chụp ảnh quỹ đạo Clear có trail (debug) và so sánh với docs/img/trajectories.png: phải thấy lao nhanh, khựng lại, rơi gần như thẳng đứng.
```

**Phase 3 — Vung vợt và các kiểu đánh**
```
Ghi chú riêng: sau khi test xanh, tự chơi local 2 người trong trình duyệt khoảng 5 phút bằng các phím, rồi ghi vào PROGRESS.md 3 điều về cảm giác chơi còn chưa ổn (kèm số đo nếu có). Chưa sửa, chỉ ghi lại để tôi quyết định.
```

**Phase 4 — Luật, tính điểm, luồng trận**
```
Ghi chú riêng: luồng trận phải đi qua state machine (GAME_SPEC §7.4). Không đặt luật trong HUD. Test P4-U14 (trận ngẫu nhiên 20 000 tick) phải tất định với seed cố định.
```

**Phase 5 — AI**
```
Ghi chú riêng: bot chỉ được xuất InputFrame. Chạy bot đấu bot và ghi vào PROGRESS.md bảng thống kê: tỷ lệ thắng từng cặp độ khó, độ dài pha cầu trung bình, phân bố loại cú, tỷ lệ PERFECT/GOOD/OK. Ghi cảm nhận khi tự chơi với từng mức.
```

**Phase 6 — Nhân vật, animation, âm thanh, UI**
```
Ghi chú riêng: không tải tài nguyên từ Internet. Mặc định dùng người que dựng bằng code và âm thanh tổng hợp. Nếu muốn dùng model hoặc âm thanh CC0, liệt kê nguồn và giấy phép rồi hỏi tôi trước. Đo FPS bằng debug overlay và ghi vào PROGRESS.md.
```

**Phase 7 — PvP online**
```
Ghi chú riêng:
- Kiểm tra API Colyseus theo đúng phiên bản đã cài (đọc tài liệu chính thức của phiên bản đó), không viết theo trí nhớ.
- Làm theo thứ tự: protocol + validate → transport giả lập trong bộ nhớ → test P7-I01 → server thật → client → e2e.
- Hook debug phía server chỉ bật khi NODE_ENV=test.
- Viết hướng dẫn chạy 2 người trên 2 máy cùng mạng LAN vào README.
```

**Phase 8 — Mở rộng (chọn từng mục)**
```
Thực hiện Phase 8{a|b|c|d|e|f} — {tên mục} trong docs/ROADMAP.md. Vì ROADMAP chỉ có mô tả ngắn, hãy viết trước danh sách test ID chi tiết (P8x-U01…) vào ROADMAP và chờ tôi duyệt cùng Implementation Plan. Sau đó làm theo quy trình AGENTS.md §6 như các phase khác.
```

---

## 3. Prompt nghiệm thu lại một phase (không thêm tính năng)

Dùng khi bạn nghi ngờ agent báo "xong" nhưng chưa chắc chắn.

```
Nghiệm thu Phase {N}. Không viết tính năng mới.
1. Chạy lại `npm run check` và `npm run test:e2e` từ đầu, báo số liệu.
2. Đối chiếu từng test ID trong ROADMAP Phase {N} với file test thật. Liệt kê: ID còn thiếu; ID có nhưng kiểm tra yếu hơn mô tả (tolerance lớn hơn, thiếu assert, không đọc fixture).
3. Kiểm tra luật kiến trúc AGENTS.md §5 trên code của phase này: import three/window/Math.random trong src/shared, magic number ngoài config.ts, cấp phát trong vòng lặp nóng, logic game trong code render.
4. Mở trình duyệt, làm lại checklist của Phase {N}, chụp ảnh.
5. Báo cáo dạng bảng: Đạt / Chưa đạt / Đề xuất. Sau đó sửa các mục chưa đạt (mỗi lỗi có test tái hiện), chạy lại Phase Gate, cập nhật PROGRESS.md.
```

---

## 4. Prompt báo lỗi (bug)

```
Bug: {mô tả ngắn}
Chế độ: {PvE Dễ/Thường/Khó | local | online}
Cách tái hiện: {các bước, phím bấm, tỷ số lúc đó}
Kỳ vọng: {...}
Thực tế: {...}   (đính kèm ảnh hoặc video nếu có)

Yêu cầu:
1. Tìm nguyên nhân gốc, giải thích ngắn trước khi sửa.
2. Viết test tái hiện, đặt tên "BUG-{số}: ...", chạy để thấy test ĐỎ.
3. Sửa tối thiểu cho test chuyển XANH. `npm run check` và `npm run test:e2e` vẫn xanh toàn bộ.
4. Kiểm tra lại trên trình duyệt theo đúng các bước tái hiện, chụp ảnh.
5. Ghi vào docs/PROGRESS.md mục "Lỗi đã sửa". Không sửa những thứ không liên quan.
```

---

## 5. Prompt chỉnh cảm giác chơi (tuning)

```
Tôi muốn chỉnh cảm giác chơi: {ví dụ: "nhịp game chậm", "smash chưa đủ uy lực", "bot Khó vẫn dễ thắng", "net shot khó trúng"}.

1. Đo hiện trạng bằng số (debug overlay hoặc script bot đấu bot): {chỉ số liên quan, ví dụ thời gian bay của Clear, tỷ lệ thắng}.
2. Đề xuất 2–3 phương án. Mỗi phương án nêu tham số nào trong src/shared/config.ts đổi từ giá trị nào sang giá trị nào, và test/fixture nào bị ảnh hưởng.
3. Ưu tiên chỉnh GAME_SPEED, tham số cú đánh, hitbox, độ khó AI. Chỉ đổi SHUTTLE_TERMINAL_VELOCITY khi thật cần: khi đó phải sửa VT trong tools/shuttle_reference.py, chạy `npm run ref:physics` để sinh lại fixture, và cập nhật các con số tham chiếu trong docs/GAME_SPEC.md.
4. Chờ tôi chọn. Sau đó áp dụng, ghi docs/DECISIONS.md, chạy lại toàn bộ test.
```

---

## 6. Prompt kéo agent về đúng luật

```
Dừng lại. Bạn vừa {sửa/skip/nới test | thêm thư viện ngoài danh sách | làm sang phase sau | dùng Euler cho quả cầu | đặt logic game trong code render | gọi alert()}.
Đọc lại AGENTS.md mục {số mục}. Hoàn tác thay đổi đó bằng git, giải thích ngắn vì sao nó xảy ra, rồi đề xuất cách làm đúng luật. Chờ tôi xác nhận trước khi làm tiếp.
```

---

## 7. Prompt tiếp tục khi phiên trước bị ngắt

```
Phiên trước bị ngắt giữa Phase {N}. Đọc AGENTS.md, docs/PROGRESS.md, kết quả `git log --oneline -20`, `git status -sb` và `git fetch origin`.
Tóm tắt: việc nào của Phase {N} đã xong (có commit và test xanh), commit nào chưa push, việc nào dở dang, test ID nào còn thiếu.
Nếu có commit chưa push mà test đang xanh thì push lên trước.
Đề xuất kế hoạch hoàn thành phần còn lại, chờ tôi duyệt, rồi tiếp tục đúng quy trình AGENTS.md §6.
```

---

## 8. Prompt review code trước khi sang phase mới (tùy chọn)

```
Đóng vai reviewer khó tính. Review toàn bộ thay đổi từ tag phase-{N-1}-done đến HEAD (`git diff phase-{N-1}-done..HEAD`). Không sửa code.
Tiêu chí: đúng spec; luật kiến trúc AGENTS.md §5; tính tất định; hiệu năng vòng lặp (cấp phát, thuật toán chậm); xử lý NaN; độ phủ test so với ROADMAP; dễ đọc.
Trả về danh sách vấn đề xếp theo mức: Nghiêm trọng / Nên sửa / Gợi ý. Mỗi vấn đề có file:dòng và đề xuất cách sửa.
```

---

## 9. Mẹo khi điều khiển agent

- **Duyệt plan thật kỹ**: plan tốt phải liệt kê đủ test ID của phase. Thiếu ID nào thì yêu cầu bổ sung trước khi cho code.
- Bạn có thể **comment trực tiếp lên artifact** (plan, walkthrough) trong Antigravity thay vì gõ prompt mới.
- Đừng cho agent làm liền nhiều phase. Mỗi phase dừng lại, bạn **tự chơi thử 5 phút**, rồi mới sang phase sau.
- Hỏng nặng thì quay lại mốc an toàn: `git checkout phase-{N}-done` (hoặc dùng chức năng undo theo checkpoint của Antigravity).
  Vì mọi commit đều đã lên GitHub, muốn bỏ thay đổi hỏng thì yêu cầu agent dùng `git revert`, không force push.
- Xem tiến độ từ bất kỳ đâu: mở https://github.com/PhuongLN28/badminton-3d, xem tab Commits và Tags.
- Phase 2 quyết định "chất" của game. Nếu cầu bay chưa giống `docs/img/trajectories.png` thì đừng sang Phase 3.
- Muốn đổi luật chơi hay thông số: sửa `docs/GAME_SPEC.md` trước (hoặc yêu cầu agent sửa và ghi `DECISIONS.md`), rồi mới yêu cầu code. Spec là nguồn sự thật.
