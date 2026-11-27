# PROGRESS.md — Nhật ký tiến độ

> Agent cập nhật file này **cuối mỗi phase** (bước 7 của Phase Gate). Mục mới nhất đặt lên trên cùng.
> Người dùng đọc file này để biết dự án đang ở đâu.

## Trạng thái hiện tại

| Mục | Giá trị |
|---|---|
| Phase đang làm | — (chờ bắt đầu Phase 4) |
| Phase đã xong | 3 |
| Tag gần nhất | `phase-3-done` |
| Lệnh chạy thử | `npm install && npm run dev` rồi mở http://localhost:5173/?debug=1 |

## Mục lục phase

| Phase | Trạng thái | Unit/Integration | E2E | Ngày xong |
|---|---|---|---|---|
| 0 Khởi tạo | ✅ | 6/6 | 2/2 | 2026-11-27 |
| 1 Sân + hộp | ✅ | 8/8 | 3/3 | 2026-11-27 |
| 2 Vật lý cầu | ✅ | 18/18 | 2/2 | 2026-11-27 |
| 3 Cú đánh | ✅ | 20/20 | 2/2 (chập chờn khi máy tải nặng, xem nợ) | 2026-11-27 |
| 4 Luật + HUD | ⬜ | – | – | – |
| 5 AI | ⬜ | – | – | – |
| 6 Đồ họa + âm thanh | ⬜ | – | – | – |
| 7 Online | ⬜ | – | – | – |

<!-- Ký hiệu: ⬜ chưa làm · 🟨 đang làm · ✅ xong · ⚠️ xong nhưng còn lỗi đã biết -->

---

### Phase 3 — Vung vợt và các kiểu đánh — 2026-11-27

**Đã làm**
- Sửa môi trường (`0baed8b`): thêm `CLAUDE.md` và `.gitignore` các worktree của agent. Phát hiện `vitest` chạy 0 test khi thư mục làm việc có chữ ổ đĩa `c:` viết thường, nên mọi lệnh phải `cd` bằng đường dẫn có `C:` viết HOA.
- Gói WP1 (`6a7e589`): bổ sung toàn bộ hằng số vung vợt, hitbox, bảng cú đánh, timing, solver vào `src/shared/config.ts`, kiểu mới trong `src/shared/types.ts`, khung hook `tossShuttle`/`setPlayerX` trong `src/client/testHooks.ts`, tắt `DEBUG_AUTO_RETURN = false`, ghi quyết định D-011..D-020 vào `docs/DECISIONS.md`.
- Gói WP2b (`c030609`): phân loại cú đánh đủ 12 ô GAME_SPEC §5.3 trong `src/shared/shots/shotTypes.ts`; chấm timing PERFECT/GOOD/OK, aim, kẹp đích và nhiễu Irwin–Hall trong `src/shared/shots/timing.ts` (`P3-U05`, `P3-U12`, `P3-U13`).
- Gói WP2a (`a46c86c`): state machine vung vợt READY → WINDUP → ACTIVE → RECOVERY trong `src/shared/player/swing.ts`; chọn kiểu vung bằng dự đoán độ cao, hitbox swept sphere chỉ đánh phía sân mình, khóa chạm 2 lần trong `src/shared/player/hitbox.ts` (`P3-U01`, `P3-U03`, `P3-U04`, `P3-U15`).
- Gói WP2c (`2df204c`): shot solver bisection 3 chế độ `FIXED_ELEV` / `FIXED_SPEED` / `TWO_POINT` kèm kiểm tra lưới (assist) trong `src/shared/shots/shotSolver.ts`, `flightProbe.ts`, `solverSearch.ts`, `solverModes.ts` (`P3-U06`..`P3-U11`, `P3-U20`).
- Gói WP4a (`f53ea15`): vẽ hitbox debug (`src/client/render/hitboxDebug.ts`), popup tên cú + km/h + timing (`src/client/ui/shotPopup.ts`), thông tin vung vợt trên `debugOverlay.ts`, chuỗi tiếng Việt trong `vi.ts`, `styles.css`.
- Sửa độ ổn định `P2-U18` (`dc43ebe`, `68f5ff8`): đo giá trị nhỏ nhất của 5 mẫu thay cho 1 mẫu, giữ nguyên ngưỡng 20 ms (D-021).
- Gói WP3 (`ad32006`): pipeline `src/shared/shots/resolveShot.ts` (chọn cú, aim, timing, nhiễu, giải cú đánh), lõi pha cầu `src/shared/match/rallySim.ts` + `rallyState.ts` (tiền thân `matchSim` của Phase 4), chuyển 2 hằng cục bộ vào `config.ts` (`P3-U02`, `P3-U14`, `P3-U16`..`P3-U19`).
- Gói WP4b (`7affca3`): tách `src/client/simHost.ts` khỏi `src/client/main.ts` (444 → 322 dòng), nối vung vợt/hit/popup vào client, phím `T` tung cầu tập, hook `tossShuttle`/`setPlayerX`, e2e `tests/e2e/phase3.spec.ts` (`P3-E01`, `P3-E02`).
- Sửa lỗi do Reviewer (`e44abe5`, `008f95c`): chấp nhận phần đoạn cầu ở sân mình khi đoạn cắt lưới trong hitbox (lỗi Nhỏ #1), rồi đẩy điểm chạm sát mặt lưới `HIT_NET_CONTACT_INSET_M = 0.001 m` vào sân mình để solver luôn thấy cầu cắt lưới (sửa thoái lùi lỗi Lớn do `e44abe5` gây ra), xem D-023.
- Reviewer: ĐẠT toàn bộ Phase 3 (`0baed8b..7affca3`). Review `e44abe5` CHƯA ĐẠT (lỗi Lớn: điểm chạm x = 0 làm solver hỏng), đã sửa ở `008f95c`; review `008f95c` ĐẠT. Audit kiểm tĩnh đạt: không có chuỗi cấm trong `src/shared`, không `.only`/`.skip`, fixture không đổi, đủ 22 ID.

**Kết quả test**

| ID | Mô tả ngắn | Kết quả | Ghi chú (số đo thực tế) |
|---|---|---|---|
| P3-U01 | Dòng thời gian vung | ✅ | `120 Hz`: WINDUP/ACTIVE/RECOVERY = `6/24/30` tick; ACTIVE tick `6..29` (`0.05 → 0.25 s`), READY ở tick `60` (`0.50 s`); nhấn lần 2 ở ACTIVE/RECOVERY trả `false`, timeline không đổi |
| P3-U02 | Hitbox bật/tắt đúng cửa sổ ACTIVE | ✅ | A: đúng `1 hit` (nhấn tick 32, ACTIVE từ 38, hit tick 50) dù cầu nằm trong hitbox nhiều tick; B (cầu 60 m/s qua hitbox lúc WINDUP): `0 hit`; C (không nhấn): `0 hit`; D (cầu chậm 3 m/s qua lưới, P1 `x = −0.35`, mid): `1 hit` tick 41, `contact.x = −0.001`, BLOCK rơi `x = 1.500`, `0 netHit` |
| P3-U03 | Swept sphere, cầu 60 m/s | ✅ | Hai đầu mút cách tâm `0.52355` và `0.50990 m` (> r = 0.5), phân số vào swept `0.114980`; tích hợp `stepShuttle` 60 m/s (`0.4752 m/tick`): `f = 0.113534`, điểm chạm cách tâm đúng `0.5 m` |
| P3-U04 | Chọn kiểu vung theo độ cao dự đoán | ✅ | `2.5 / 1.4 / 0.6 m` → overhead / mid / underhand; biên `1.8` → overhead, `1.0` → mid, `0.99` → underhand; dự đoán `+0.15 s` từ `y = 2.61 / 1.51 / 0.71` ra `2.50049 / 1.40049 / 0.60049`; cầu idle/grounded → `mid` (D-017) |
| P3-U05 | Bảng phân loại GAME_SPEC §5.3 | ✅ | Đủ 12 ô; biên `2.2 m` → SMASH, `2.2 − 1e-6` → DRIVE; `\|x\| = 2.5` → NET_SHOT, `2.5 + 1e-6` → BLOCK; `x` âm dùng giá trị tuyệt đối |
| P3-U06 | Solver CLEAR | ✅ | `(−5.0, 2.6)`, 45°, đích 6.0: `46.845 m/s` (fixture `46.9 ± 0.3`), rơi `5.9984` (± 5 cm), `adjusted = false`, P2 đối xứng từng bit |
| P3-U07 | Solver DROP | ✅ | `(−4.5, 2.6)`, 10°, đích 1.2: `11.3137 m/s` (± 0.1), rơi `1.2011` |
| P3-U08 | Solver SMASH + lưới | ✅ | `(−4.0, 2.7)`, 60 m/s, yêu cầu đích 3.0: `adjusted = true`, đích thực tế `4.4` (∈ [4.3, 4.5]), qua lưới `1.62434` (≥ 1.624), rơi `4.3996`, góc `−14.44°` |
| P3-U09 | Solver NET_SHOT (TWO_POINT) | ✅ | `(−0.5, 1.2)`, clearance 0.08, đích 0.5: `67.256°` (± 0.5), `3.4584 m/s` (± 0.05), qua lưới `1.60223` ∈ [1.584, 1.624], rơi `0.50104` |
| P3-U10 | Solver LOW_SERVE (TWO_POINT) | ✅ | `(−2.2, 1.05)`, clearance 0.10, đích 2.3: `26.152°`, `9.1600 m/s`, qua lưới `1.62526`, rơi `2.29923` (> 1.98) |
| P3-U11 | Solver BLOCK (TWO_POINT) | ✅ | `(−3.0, 0.8)`, clearance 0.20, đích 1.5: `37.776°`, `9.3754 m/s`, qua lưới `1.72427`, rơi `1.50109` |
| P3-U12 | Chấm timing | ✅ | `0.10` → PERFECT; `0.03`, `0.17` → GOOD; `0.0`, `0.20` → OK; `0.065`, `0.135` → PERFECT; ±1e-6 ngoài biên đổi hạng đúng; `offset(0.03) < 0` |
| P3-U13 | Phân phối nhiễu Irwin–Hall | ✅ | Seed `20261127`, 2000 mẫu σ = 0.6: mean `0.019980` (± 0.05), std `0.606804` (± 10%) |
| P3-U14 | PERFECT không có nhiễu | ✅ | 100 cú CLEAR PERFECT cùng RNG tiến dần: `land.x` và `v0` giống hệt từng bit; đối chứng GOOD cho ≥ 2 giá trị khác (D-022) |
| P3-U15 | Chỉ đánh phía sân mình | ✅ | Cầu ở `x = +0.1`: P1 không đánh được (đúng ROADMAP); đoạn cắt lưới từ sân đối phương vào sân mình trong hitbox → hit tại `x = −facing·0.001`; cầu 60 m/s qua lưới (cả hai đầu mút ngoài hitbox) vẫn bắt được; từ điểm chạm đó `solveShot`: CLEAR/DRIVE/LIFT/DROP/SMASH `solved = true` (D-023) |
| P3-U16 | Chống chạm 2 lần | ✅ | Cầu đặt lại vào hitbox khi swing còn ACTIVE, hoặc vung lại sau READY khi `lastHitter = 0`: `0 hit` thêm; đối chứng `spawnRallyShuttle` (reset khóa): `1 hit` |
| P3-U17 | Aim và kẹp đích | ✅ | CLEAR `6.0`: aim `+1` → `5.4`, `−1` → `6.5` (6.6 bị kẹp); SMASH `6.0` aim `−1` → `6.5`; NET_SHOT `0.5` aim `+1` → `0.2`; pipeline: `targetDepth = 6.5`, `noisyTargetDepth ≠ 6.5` (nhiễu cộng sau khi kẹp) |
| P3-U18 | Smash nhảy | ✅ | SMASH PERFECT đứng `(−4, 2.7)`: `63.0 m/s`, `−14.438°`; nhảy `(−4, 3.25)`: `68.04 m/s`, `−18.087°`; tỷ lệ tốc độ `1.08` (9 chữ số), góc nhảy dốc hơn |
| P3-U19 | Sự kiện `hit` | ✅ | Đủ 12 trường (GAME_SPEC §5.8 + `timingOffsetS`); SMASH overhead PERFECT, contact `(−2.4, 2.8)`, `226.8 km/h = \|v0\|·3.6` (9 chữ số) |
| P3-U20 | Hiệu năng solver | ✅ | Trung vị 100 lần (ms), nhiều lần chạy khi máy bận: FIXED_ELEV `0.64–1.40` (cả bộ `1.15`) < 3; FIXED_SPEED + assist `0.76–1.29` (cả bộ `1.48`) < 3; TWO_POINT `1.03–2.14` (cả bộ `2.40`) < 6. Bản chưa tối ưu TWO_POINT: `4.33–5.60` |
| P3-E01 | Tung cầu vào vùng overhead, `swing: 'power'` đúng tick | ✅ | `tossShuttle(0)`, cầu vào hitbox ở tick `136`, nhấn power tại `N−19`: SMASH PERFECT `226.8 km/h`, contact `(−2.250, 2.777)`, rơi `x = 4.499` bên P2, `0 console.error` |
| P3-E02 | Rally tự động 6 cú bằng hook | ✅ | 6 hit xen kẽ `[0,1,0,1,0,1]`, đều CLEAR PERFECT: `81 / 191 / 204 / 205 / 205 / 205 km/h`, tọa độ hữu hạn, `0 console.error`. Có lần timeout khi máy tải nặng (xem nợ kỹ thuật) |

Tổng: `npm run check` 52/52 xanh (P0: 6 + P1: 8 + P2: 18 + P3: 20, 18 file test, xác nhận lại trên `008f95c`) · `npm run test:e2e` 9 test (P0: 2 + P1: 3 + P2: 2 + P3: 2), **chập chờn khi máy tải nặng**: audit trên `7affca3` (máy rảnh, dùng lại dev server) 9/9 ba lần liên tiếp (`25.5 / 24.6 / 22.9 s`); agent WP4b (cổng phụ) 9/9 ba lần nhưng hai lần đầu fail `7/9` và `4/9` do timeout; audit trên `e44abe5` (máy bận vì Reviewer chạy song song, còn sót một tiến trình Vite) `8/9` (P1-E02 timeout lúc dựng trang), `9/9`, `6/9` (P0-E01 `waitForTimeout` vượt 30 s, P2-E02 "Target page closed", P3-E02 `page.evaluate` timeout); mọi lỗi đều là timeout, không có assertion sai, không có `console.error`; **chưa chạy lại e2e trên `008f95c`** (commit này chỉ đổi hitbox, config và unit test) · `npm run build` xanh (`166.67 kB` gzip, Phase 2: `159.83 kB`) · `console.error: 0` khi tải `/?debug=1&test=1`

**Git**: commit code cuối `008f95c` (`P3: inset net-plane contacts into own court so the solver sees the net crossing`) · commit chốt phase và tag `phase-3-done` đã push ✅

**Kiểm tra trên trình duyệt** (Chrome, GPU Intel Iris Xe, 60 FPS khi tab có focus; `http://localhost:5173/?debug=1&test=1`)
- [x] Thử đủ 3 nút ở cả 3 độ cao (hook + phím thật `T`/`J`/`K`/`L`, P2 phím `,`): ra SMASH, CLEAR, DROP, NET_SHOT, LIFT, DRIVE, BLOCK; popup đúng tên cú + km/h + timing (vd. "DROP 13 km/h / PERFECT!", "SMASH 227 km/h / PERFECT!").
- [x] Net shot GOOD từ `x = −1.2` rơi `x = 0.201` (qua lưới rồi rơi ngay); drop PERFECT rơi `1.400` (trước vạch giao cầu ngắn `1.98`); smash PERFECT `227 km/h` cắm dốc, rơi `4.499`.
- [x] Smash aim về lưới (đích `3.7`) từ `x = −6.0 / −5.0 / −4.0`: `adjusted = true`, đích bị đẩy ra `4.30 / 4.50 / 4.20`.
- [x] Timing: SMASH GOOD lệch `0.4–0.6 m` (rơi `3.89–4.72`); DROP OK (sớm `0.074 s`) vào lưới; PERFECT rơi đúng đích.
- [x] Debug (`F3`): chỉ hitbox của kiểu vung đang dùng chuyển xanh trong ACTIVE, các hitbox còn lại xám; overlay "Đang đánh · Trên cao"; quỹ đạo debug + chấm `0.1 s` + vòng dự đoán điểm rơi cập nhật sau mỗi cú.
- [x] Di chuyển: chạy hết cỡ vào lưới dừng ở `±0.35`; nhảy đỉnh `0.551 m`; lùi ra `−6.33 / 6.02` bình thường.
- [x] 0 `console.error` khi tải lại trang.
- Ảnh: `screenshot-1795773491361-0.jpg` (hitbox xanh khi ACTIVE), `screenshot-1795773504228-1.jpg` (quỹ đạo smash), `screenshot-1795773517434-2.jpg` (popup DROP PERFECT), cả ba nằm trong `C:\Users\Admin\AppData\Local\Temp\claude-chrome-screenshots-1RIQN4\`; smoke test WP4b: `smoke_active_hitbox.png`, `smoke_popup_smash.png`; GIF `phase3_browser_check.gif` (thư mục Downloads của Chrome). Các tệp này nằm ngoài repo.
- **Giới hạn của lần kiểm này**: mục "5 phút tự chơi" chỉ làm được gần đúng. Khoảng 10 cú bằng phím thật (công cụ gửi phím trễ `0.5–1 s` mỗi lần và không giữ phím được) cộng khoảng 40 cú tất định qua hook. Cần người dùng tự chơi thật để đánh giá cảm giác.

**Người dùng nên tự thử**
- Chạy `npm run dev`, mở `http://localhost:5173/?debug=1`, bấm `T` để tung cầu từ tay P1, rồi bấm `J` / `K` / `L` đúng lúc cầu rơi vào tầm vợt: cầu ở cao ra CLEAR / SMASH / DROP, cầu ở giữa ra LIFT / DRIVE / BLOCK. Xem popup tên cú, km/h và PERFECT / GOOD / SỚM / MUỘN.
- Đứng sát lưới rồi bấm `L` khi cầu rơi chậm để thử NET_SHOT (cầu phải qua mép lưới rồi rơi ngay). Chú ý điều số 2 ở phần cảm giác chơi bên dưới.
- Chạy ra cuối sân (`x` khoảng `−5` đến `−6`), giữ `D` (về phía lưới) rồi bấm `K` khi cầu ở cao: smash phải cắm dốc, nhanh, bị đẩy sâu hơn để qua lưới.
- Đánh sớm/muộn để thấy cú ra ngoài hoặc vào lưới; đánh PERFECT thì rơi đúng đích.
- Chơi phía P2 bằng phím `←` / `→` / `↑` và `,` `.` `/` (hoặc Numpad 1–3): cầu phải ở phía sân P2 (sau khi P1 đánh sang).
- Bấm `F3` quan sát hitbox chuyển xanh trong 0.2 s khi vung, và quỹ đạo debug sau mỗi cú.
- Chơi tự do vài phút và cho biết cảm giác 3 điều bên dưới có đáng sửa không.

**Cảm giác chơi chưa ổn (chưa sửa, chờ người dùng quyết)**
1. **Popup SỚM/MUỘN ngược với hành động người chơi.** Bấm muộn (cầu đã nằm trong hitbox khi ACTIVE bắt đầu) thì `contactTime = 0` nên ra OK "SỚM": 4/4 lần bấm phím thật đều có offset `−0.100 s`. Bấm sớm 8 tick (lead 26) ra offset `+0.060 s` (GOOD; nếu là OK sẽ hiện "MUỘN"). Nhãn mô tả vị trí điểm chạm trong cửa sổ ACTIVE, không mô tả việc người chơi bấm sớm hay muộn.
2. **Net shot không thể PERFECT với cầu rơi từ cao.** Bấm đúng nhịp (lead 18) thì độ cao dự đoán ≥ 1.0 m nên vung `mid` ra BLOCK OK (contact `1.63`). NET_SHOT chỉ ra khi bấm muộn hơn: lead 14 GOOD rơi `0.20`; lead 10 và 6 OK; lead 2 rơi về sân mình `x = −0.68`.
3. **Cú thấp tay lỗi nhiều.** DRIVE thấp tay contact `0.47 m` ở `x = −2.25` vào lưới (`h = 1.24`) dù assist `+20°`; DROP OK vào lưới; khoảng 16% NET_SHOT OK có đích sau nhiễu ≤ 0 (Reviewer đo). Giải lại TWO_POINT sau nhiễu có lúc `8–9 ms`, vượt ngân sách 6 ms của GAME_SPEC §14.

**Lỗi đã biết / nợ kỹ thuật**
- **E2E chập chờn khi máy tải nặng** (D-024): timeout 30 s ở P0-E01, P1-E02, P2-E02, P3-E02; thời gian chạy cùng một test dao động `1.8 → 47 s`. Chưa tìm ra nguyên nhân (chẩn đoán dừng giữa chừng theo yêu cầu người dùng). Giả thuyết chưa kiểm: Vite khởi động lạnh, 4 worker Chromium WebGL tranh CPU, test chờ thời gian thực, test nặng chiếm worker. Lần sau: chạy e2e khi máy rảnh, không chạy agent song song; hướng sửa cần cân nhắc là `workers` cố định, làm nóng Vite, bỏ chờ thời gian thực.
- **BLOCK sát lưới thành lốp gần thẳng đứng**: contact `(−0.001, 1.5925)` → `34.4 m/s`, góc khoảng 85°, đỉnh khoảng `9 m`, rơi `1.50 m`, do TWO_POINT phải vượt `NET + 0.20` khi chỉ cách lưới 1 mm. Không phạm luật; bản `7affca3` cũng ra lốp `16.4 m/s`. Đổi hành vi này cần một D-xxx mới (lệch GAME_SPEC §5.4/§5.5).
- BLOCK/NET_SHOT từ contact sát lưới mà cao hơn `NET + clearance`: `solved = false`, góc bị kẹp `−30°` (giới hạn TWO_POINT có sẵn).
- Hiệu năng solver ở ca có nhiễu: TWO_POINT NET_SHOT đích `0.05 m` không assist trung vị `5.88 ms`, max `8.33 ms`; `resolveShot` NET_SHOT OK p95 `7.76 ms`, max `9.39 ms`. `P3-U20` chỉ đo ca chuẩn.
- Sự kiện `swing` phát ở tick nhấn (đầu WINDUP), trong khi SFX `swing` của GAME_SPEC §12 kích hoạt lúc bắt đầu ACTIVE: Phase 6 cần dời `0.05 s`.
- `GAME_SPEED = 1.3` làm tròn tick vung thành `5/18/23` (`0.054/0.195/0.249 s`), tâm ACTIVE lệch; `swingTicksForOut` tính lại mỗi tick nên đổi tốc độ giữa lúc vung sẽ đổi timeline.
- Bảng `lil-gui` tắt lực cản/trọng lực: `stepShuttle` dùng `rally.physicsCfg`, còn solver/probe luôn dùng `DEFAULT_PHYSICS_CONFIG`, nên đánh cầu ở chế độ vật lý tùy chỉnh sẽ lệch đích (chỉ ảnh hưởng debug).
- Tick cầu chạm sàn thì bỏ qua dò hit (`src/shared/match/rallySim.ts` chỉ dò khi cầu còn `flying`); ảnh hưởng gần 0, Phase 4 cần biết.
- `P3-U18` kiểm hệ số `×1.08` ở mức `resolveShot` (cờ `airborne` truyền tay), chưa có test `stepRally` chứng minh `airborne = !grounded`.
- `src/client/simHost.ts` có `phase: 'RALLY'` và `score` cứng, sẽ thay khi có `matchSim` (Phase 4).
- GAME_SPEC §13.2 chưa ghi 2 hook mới `tossShuttle`, `setPlayerX` (đã có D-018); chờ người dùng quyết có cập nhật spec không.
- `npx prettier --check` báo cảnh báo trên nhiều file (CRLF do `core.autocrlf=true`), có sẵn từ trước, không nằm trong `npm run check`.
- Một số commit có trailer `Co-Authored-By: Claude Sonnet 5.5` (model thực của agent Thực thi) thay vì Opus 5.5.

**Lệch so với spec** (chi tiết trong DECISIONS.md)
- `D-011`: smash khi nhảy = `60 × 1.08 = 64.8 m/s` (số `65` trong §5.4 coi là làm tròn), để khớp P3-U18.
- `D-012`: hệ số tốc độ theo timing (`1.05 / 1.00 / 0.90`) chỉ áp cho SMASH và DRIVE.
- `D-013`: nhiễu timing cộng vào đại lượng là đầu vào của từng chế độ giải; đích sau nhiễu không kẹp lại; mỗi cú rút đúng 12 số uniform từ RNG.
- `D-014`: đích kẹp trong `[0.2, 6.5] m` tính từ lưới (thêm cận dưới `TARGET_MIN_DEPTH = 0.2`).
- `D-015`: DRIVE thấp tay sát lưới vẫn có thể vào lưới, giữ đúng giới hạn assist `+20°` của spec.
- `D-016`: TWO_POINT, đích không đạt được ở góc ≥ 45° coi là "quá cao" để bisection chạy đúng hướng.
- `D-017`: chấm `contactTime` theo phân số sub-tick của swept sphere, `TIME_EPSILON_S = 1e-9`, kiểu vung dự phòng `mid`, hitbox tính từ chân.
- `D-018`: thêm trường `hit.timingOffsetS` và hook test `tossShuttle`, `setPlayerX`.
- `D-019`: kẹp tốc độ solver về `120 m/s`; assist FIXED_SPEED tìm nhị phân trên số nguyên `k`.
- `D-020`: phím `T` tung cầu tập với `vy = 10 m/s`; tách `rallySim.ts` và `simHost.ts`.
- `D-021`: `P2-U18` đo giá trị nhỏ nhất của 5 mẫu thay cho 1 mẫu, giữ ngưỡng 20 ms.
- `D-022`: cú PERFECT (σ = 0) dùng nguyên nghiệm lý tưởng, không giải lại không-assist; RNG vẫn rút đủ 12 số.
- `D-023`: đoạn cầu cắt lưới trong hitbox được nhận phần ở sân mình; điểm chạm sát lưới đẩy vào sân mình `0.001 m`.
- `D-024`: chốt Phase 3 khi e2e còn chập chờn dưới tải nặng, ghi vào nợ kỹ thuật (lệch Phase Gate).

**Đề xuất refactor (chưa làm)**
- `src/shared/config.ts` 571 dòng: tách bảng cú/solver/timing sang file con (vẫn nằm trong config, re-export).
- `src/shared/physics/shuttle.ts` 352 dòng và `src/client/main.ts` 322 dòng: nhỉnh hơn mức nên dưới khoảng 300.
- Đã làm trong Phase 3 vì cần cho phase này: tách `simHost.ts` khỏi `main.ts` (444 → 322 dòng), tách `rallyState.ts`, `solverSearch.ts`, `solverModes.ts`.

**Chuyển sang phase sau**
- Phase 4: `rules/rallyJudge.ts`, `rules/scoring.ts`, `rules/serve.ts` (gồm `serviceCourt`), `match/stateMachine.ts`, `match/matchSim.ts` bọc `rallySim`; thay phím `T` bằng giao cầu thật; HUD, menu tối thiểu, tạm dừng; `simHost.ts` bỏ `phase` và `score` cứng.
- Xử lý tick cầu chạm sàn đang bỏ qua dò hit trong `rallySim.ts`; thêm test `stepRally` cho `airborne = !grounded`.
- Nếu người dùng quyết định sửa, xử lý 3 điều cảm giác chơi ở phần trên (nhãn SỚM/MUỘN, NET_SHOT PERFECT, cú thấp tay); cập nhật GAME_SPEC §13.2 cho 2 hook mới nếu được duyệt.
- Chẩn đoán e2e chập chờn khi máy rảnh (D-024) trước khi thêm e2e của Phase 4.

---

### Phase 2 — Vật lý quả cầu — 2026-11-27

**Đã làm**
- Bổ sung hằng số vật lý quả cầu (`GRAVITY = 9.81`, `SHUTTLE_TERMINAL_VELOCITY = 6.8`, `SHUTTLE_CHAR_LENGTH ≈ 4.714`, `SHUTTLE_MAX_SPEED = 120`, `SHUTTLE_ORIENT_RATE = 40`), va chạm lưới, hiển thị mesh/bóng/trail/vòng điểm rơi, `DEBUG_AUTO_RETURN`, và camera động vào `src/shared/config.ts`, kèm toán học quaternion (`quatFromUnitVectorsOut`, `slerpQuatOut`, `rotateLocalYByQuatOut`) trong `src/shared/math/quat.ts` (`305a7cb`).
- Cài đặt bộ tích phân RK4 120 Hz chỉ dùng `+ - * /` và `Math.sqrt` (cấm sin/cos/pow/exp trong vòng lặp, dùng `ShuttleScratch` không cấp phát bộ nhớ) trong `src/shared/physics/shuttle.ts`, va chạm swept lưới/sàn và nảy hộp người chơi tạm thời trong `src/shared/physics/collision.ts`, hướng mũi cầu theo vận tốc trong `src/shared/physics/orientation.ts`, `simulateFlight`/`predictUntil` trong `src/shared/physics/flight.ts`, cùng toàn bộ unit test `P2-U01`..`P2-U18` (`c13219e`).
- Dựng mesh quả cầu 3D (`SHUTTLE_VISUAL_SCALE = 2.5`, nút bần + dải xanh + váy 16 lông vũ `CanvasTexture`) và blob shadow dưới sàn trong `src/client/render/shuttleMesh.ts`, vệt bay `0.3 s` trong `src/client/render/trail.ts`, debug path + chấm `0.1 s` + vòng dự đoán/điểm rơi trong `src/client/render/debugDraw.ts`, camera động + chế độ cận cảnh trong `src/client/render/camera.ts`, bổ sung thông số cầu lên `src/client/ui/debugOverlay.ts` và bảng `lil-gui` "Bắn thử quả cầu" trong `src/client/ui/shuttleLabGui.ts`, `vi.ts`, `styles.css` (`9be7318`).
- Bổ sung `updatePredictedLanding` vào `src/client/render/debugDraw.ts`, tích hợp mô phỏng quả cầu không cấp phát bộ nhớ vào `src/client/main.ts` (bao gồm hook `spawnShuttle`, đồng bộ `F3`, tái sử dụng `MAX_FRAME_DELTA`), và viết test E2E `P2-E01`..`P2-E02` trong `tests/e2e/phase2.spec.ts` (`50be389`, `5d9aab4`).

**Kết quả test**

| ID | Mô tả ngắn | Kết quả | Ghi chú (số đo thực tế) |
|---|---|---|---|
| P2-U01 | `fall_from_rest` (`t = 0.5/1/2/3 s`) | ✅ | Khớp `samples` và `VT·tanh(gt/VT)`: sai số vị trí tối đa `4.49e-6 m`, sai số tốc độ tương đối tối đa `8.36e-7` (`0.000084% ≤ 0.5%`) |
| P2-U02 | `horizontal_decay_no_gravity` | ✅ | `L = 4.714 m`; khớp `samples` và nghiệm giải tích: sai số vị trí tối đa `1.26e-5 m`, sai số tốc độ tương đối tối đa `5.58e-7` (`0.000056%`) |
| P2-U03 | `parabola_no_drag` | ✅ | Tầm xa `10.19368 m` (fixture `10.1937 m`), tỷ lệ xuống/lên `1.0000` (fixture `1.000`) |
| P2-U04 | `clear_from_back` | ✅ | `land.x = 6.00274 m`, `tLand = 2.49481 s`, `descOverAscRatio = 0.4857 < 0.6`, `descentAngleDeg = 85.073° ≥ 80°`, `landSpeed = 6.67836 m/s` (trong 5% của `6.8 m/s`) |
| P2-U05 | Toàn bộ 13 case `landed === true` (`collideNet: false`) | ✅ | Toàn bộ `tLand`, `land.x`, `land.z`, `apex`, `netCross` đều nằm trong dung sai fixture (`≤ 1 cm`, `≤ 0.01 s`, `≤ 0.5%`) |
| P2-U06 | `smash_fast_reference` qua lưới | ✅ | Tốc độ qua lưới `27.55089 m/s` (`42.39%` tốc độ đầu `65 m/s`, `< 45%`) |
| P2-U07 | Độ chính xác RK4 vs semi-implicit Euler `@120 Hz` | ✅ | `smash_fast_reference`: RK4 lệch `0.00017 m` (`0.017 cm < 1 cm`); semi-implicit Euler lệch `0.5156 m` (`51.56 cm > 20 cm`) |
| P2-U08 | Độc lập timestep (`60 Hz` vs `240 Hz`) | ✅ | Chênh lệch điểm rơi `@60 Hz` vs `@240 Hz` `< 1 cm` cho `smash_fast_reference` và `clear_from_back` |
| P2-U09 | Hướng mũi cầu (`ORIENT_RATE = 40`) | ✅ | Clear/smash/drop sau `0.05 s` (`\|v\| > 3 m/s`): `dot(nose, v̂) > 0.99`; đảo `180°` sau `0.1 s`: `dot > 0.98`; `\|v\| < 0.05` và `v = 0` giữ hướng cũ, không NaN |
| P2-U10 | `smash_into_net` (`collideNet: true`) | ✅ | Phát `1 netHit` tại `heightM = 1.2960 m` (`fromSide = 0`, fixture `1.2961 m`), rơi về phía P1 tại `x = -0.7794 m` (`∈ [-1.0, 0)`, `tLand = 0.4030 s`) |
| P2-U11 | Chống xuyên lưới (`65 m/s`) | ✅ | Bắn thẳng vào lưới từ cả 2 phía (`~0.54 m/tick`): đều phát đúng `1 netHit` dưới `1.524 m` |
| P2-U12 | `net_shot` (`collideNet: true`) | ✅ | `0 netHit` (qua lưới `1.6025 m > 1.524 m`) và rơi khớp fixture (`0.5000 m`) |
| P2-U13 | Chạm sàn nội suy | ✅ | `clear_from_back`: phát đúng `1 land`, `state = 'grounded'`, `vel = (0,0,0)`, đứng yên tuyệt đối ở `120 tick` sau |
| P2-U14 | Chống NaN/Infinity và kẹp biên | ✅ | `v = 0`, `v = 500 → 120 m/s`, `NaN/Infinity`, `p = 1e6` và `1e308` đều hữu hạn trong biên |
| P2-U15 | `GAME_SPEED = 1.2` | ✅ | Điểm rơi lệch `≤ 1 cm`, số tick bay giảm theo tỷ lệ `1/1.2` (`±1 tick`) |
| P2-U16 | Tất định từng bit | ✅ | Hai lần chạy `clear_from_back` và `smash_into_net` trùng khớp tuyệt đối qua `Object.is` |
| P2-U17 | Nảy hộp người chơi tạm thời | ✅ | Bật khỏi hộp P2 ở `30 m/s @ 50°` (`vx < 0`) và hộp P1 (`vx > 0`), đúng `1` lần mỗi va chạm |
| P2-U18 | Hiệu năng `10,000 × stepShuttle` (Node) | ✅ | 3 lần chạy: `[2.9122, 2.5129, 1.8994] ms` (trung vị `2.5129 ms`, max `2.9122 ms < 20 ms`) |
| P2-E01 | `spawnShuttle` theo `clear_from_back` | ✅ | Sau `step(360)`: `shuttle.state === 'grounded'`, điểm rơi khớp fixture trong `±1 cm`, đúng `1` sự kiện `land`, `0` lỗi |
| P2-E02 | Bắn 20 quả liên tiếp (`/?test=1&debug=1`) | ✅ | Xoay vòng 15 case fixture (xen kẽ `60`/`360 tick`): mọi tọa độ hữu hạn, `0 console.error`, `0 pageerror` |

Tổng: `npm run check` 32/32 xanh (P0: 6 + P1: 8 + P2: 18, 11 file test) · `npm run test:e2e` 7/7 xanh (P0: 2 + P1: 3 + P2: 2) · `npm run build` xanh (`159.83 kB` gzip) · `console.error: 0`

**So sánh 15 case trong `tests/fixtures/shuttle_reference.json` (RK4 @120 Hz vs đáp án tham chiếu `dt = 1/4000 s`)**

- `fall_from_rest` (samples `t = 0.5, 1, 2, 3 s`): sai số vị trí tối đa `4.49e-6 m`, sai số tốc độ tương đối tối đa `8.36e-7` (`0.000084%`).
- `horizontal_decay_no_gravity` (samples `t = 0.1, 0.25, 0.5 s`): sai số vị trí tối đa `1.26e-5 m`, sai số tốc độ tương đối tối đa `5.58e-7` (`0.000056%`).

| Case (`collideNet: false`) | `tLand` (exp / đo) | `land.x` (exp / đo) | `apex (x, y)` (exp / đo) | `netCross (y, v)` (exp / đo) | `landSpeed` (exp / đo) | `descAngle°` (exp / đo) | `ratio` (exp / đo) |
|---|---|---|---|---|---|---|---|
| `parabola_no_drag` | 1.4416 / 1.44160 | 10.1937 / 10.19368 | (5.0965, 2.5484) / (5.09684, 2.54842) | null / null | 10.000 / 10.00000 | 45.00 / 45.000 | 1.000 / 1.0000 |
| `clear_from_back` | 2.4948 / 2.49481 | 6.0028 / 6.00274 | (2.4062, 8.2506) / (2.40586, 8.25063) | (7.2115, 9.69) / (7.21143, 9.68995) | 6.678 / 6.67836 | 85.07 / 85.073 | 0.486 / 0.4857 |
| `clear_from_mid` | 2.2617 / 2.26167 | 6.0046 / 6.00462 | (2.5621, 7.0045) / (2.56162, 7.00451) | (5.8247, 10.206) / (5.82466, 10.20557) | 6.604 / 6.60384 | 83.54 / 83.540 | 0.568 / 0.5680 |
| `lift_underhand` | 2.0764 / 2.07643 | 5.9939 / 5.99388 | (3.3282, 5.504) / (3.32837, 5.50405) | (2.6735, 14.878) / (2.67341, 14.87910) | 6.454 / 6.45371 | 82.23 / 82.227 | 0.552 / 0.5521 |
| `smash_standing` | 0.4222 / 0.42220 | 4.4121 / 4.41192 | (-4.0, 2.7) / (-4.0, 2.7) | (1.6273, 25.122) / (1.62723, 25.12622) | 10.026 / 10.02696 | 27.59 / 27.591 | null / null |
| `smash_jump` | 0.3611 / 0.36113 | 3.6123 / 3.61221 | (-4.0, 3.1) / (-4.0, 3.1) | (1.6342, 24.576) / (1.63417, 24.58011) | 11.328 / 11.32850 | 29.38 / 29.378 | null / null |
| `smash_into_net` | 0.3281 / 0.32809 | 3.0025 / 3.00235 | (-4.0, 2.7) / (-4.0, 2.7) | (1.2961, 22.662) / (1.29603, 22.66367) | 11.929 / 11.92953 | 27.39 / 27.386 | null / null |
| `smash_fast_reference` | 0.6372 / 0.63717 | 6.5004 / 6.50023 | (-4.0, 3.0) / (-4.0, 3.0) | (2.2575, 27.548) / (2.25750, 27.55089) | 7.629 / 7.62925 | 35.56 / 35.562 | null / null |
| `drop_shot` | 1.0509 / 1.05089 | 1.1964 / 1.19635 | (-2.9353, 2.7531) / (-2.93631, 2.75307) | (1.6842, 5.521) / (1.68414, 5.52138) | 5.916 / 5.91590 | 63.94 / 63.943 | 2.641 / 2.6429 |
| `net_shot` | 0.9207 / 0.92069 | 0.5000 / 0.50000 | (-0.1288, 1.6629) / (-0.12862, 1.66290) | (1.6026, 1.564) / (1.60248, 1.56405) | 4.880 / 4.88025 | 80.66 / 80.659 | 1.694 / 1.6926 |
| `low_serve` | 0.9551 / 0.95505 | 2.2983 / 2.29830 | (-0.1492, 1.6274) / (-0.14859, 1.62744) | (1.6234, 5.060) / (1.62328, 5.05966) | 5.312 / 5.31171 | 59.35 / 59.347 | 1.193 / 1.1928 |
| `high_serve` | 2.3411 / 2.34113 | 6.3038 / 6.30381 | (3.4426, 6.9611) / (3.44287, 6.96113) | (4.0408, 15.436) / (4.04069, 15.43814) | 6.606 / 6.60574 | 84.40 / 84.400 | 0.507 / 0.5070 |
| `drive_flat` | 0.8019 / 0.80191 | 5.4981 / 5.49805 | (-0.3512, 1.5821) / (-0.35298, 1.58208) | (1.5799, 16.008) / (1.57984, 16.00901) | 6.207 / 6.20678 | 41.84 / 41.836 | 2.208 / 2.2104 |

- `smash_into_net` với `collideNet: true`: `netHitCount = 1`, `netHit.heightM = 1.2960 m` (`fromSide = 0`), `land.x = -0.7794 m`, `tLand = 0.4030 s`.
- Semi-implicit Euler `@120 Hz` trên `smash_fast_reference`: `eulerLandX = 5.9848 m` vs fixture `6.5004 m` → sai số `0.5156 m` (`51.56 cm > 20 cm`).

**Git**: commit code cuối `5d9aab4` (`P2: reuse MAX_FRAME_DELTA constant for camera render dt`) · commit chốt phase và tag `phase-2-done` đã push ✅

**Kiểm tra trên trình duyệt** (`http://localhost:5173/?debug=1&test=1`, `1280×720`)
- [x] Bắn Clear (`clear_from_back`): lao nhanh lúc đầu (chấm `0.1 s` thưa), hãm gần đỉnh `(2.41, 8.25)`, chấm `0.1 s` dày dần và rơi gần như thẳng đứng (`~85°`) xuống `x = 6.0027 m`, khớp hình thái `docs/img/trajectories.png` (`phase2_clear_midflight.png`, `phase2_clear_trajectory.png`).
- [x] Bắn Smash (`smash_jump` rơi dốc ở `x = 3.612 m`) và `smash_into_net` (`collideNet = true`): cầu đập lưới tại `y = 1.296 m` và rơi về phía người đánh ở `x = -0.779 m` (`phase2_smash_into_net.png`).
- [x] Nhìn gần (`Cận cảnh cầu`): nút bần + dải xanh luôn đi trước vận tốc `(14.89, 14.00)` (`phase2_closeup_cork_first.png`); bấm `Đảo chiều 180°` và chạy `12 tick` (`0.10 s`): đầu cầu lật mượt sang dẫn hướng vận tốc đảo `(-10.33, -10.54)` (`phase2_closeup_turnover.png`).
- [x] Bóng tròn dưới cầu (`ShuttleBlobShadow`) co giãn và đổi độ mờ theo độ cao, cùng vòng dự đoán xanh lam / vòng điểm rơi xanh lá trên mặt sân giúp đoán chính xác vị trí rơi (`phase2_clear_midflight.png`, `phase2_clear_trajectory.png`).
- [x] Đứng hộp P2 chắn đường cầu (`smash_jump` vào vùng P2 `x = 2.6 m`): tại tick `31` (`x = 2.35, y = 0.644`) cầu bật ngược về `-X` với `v = (-19.284, 22.981)`, `+35 tick` bay qua lưới tới `x = -0.864, y = 4.165` (`phase2_p2_box_bounce.png`); toàn bộ phiên kiểm tra có `0 console.error`, `0 pageerror`.

**Người dùng nên tự thử**
- Chạy `npm run dev`, mở `http://localhost:5173/?debug=1` trên Chrome: chọn các mẫu trong bảng `Bắn thử quả cầu` (như `Clear cuối sân`, `Smash trúng lưới`, `Net shot sát lưới`, `Drop cuối sân`), bật/tắt `Lực cản v²`, `Va chạm lưới`, `Nảy hộp người chơi`, đổi góc nhìn `Cận cảnh cầu` và nhấn `Đảo chiều 180°` khi cầu đang bay, cũng như di chuyển hộp P2 (`←`/`→`/`↑`) ra chắn đường cầu để thấy cầu tự bật lại.

**Lỗi đã biết / nợ kỹ thuật**
- Không có. (Lưu ý môi trường headless software WebGL khi chụp ảnh cho FPS thấp hơn ~60 FPS trên trình duyệt có GPU thật.)

**Lệch so với spec** (chi tiết trong DECISIONS.md)
- Không phát sinh lệch spec mới trong Phase 2.

**Đề xuất refactor (chưa làm)**
- Tách phần vòng lặp mô phỏng / test hook trong `src/client/main.ts` (444 dòng) khi sang Phase 4 ghép `MatchSim`.

**Chuyển sang phase sau**
- Phase 3: Vung vợt (`player/swing.ts`), hitbox swept sphere (`player/hitbox.ts`), phân loại cú đánh & bảng thông số (`shots/shotTypes.ts`), bộ giải cú đánh (`shots/shotSolver.ts`), timing & aim (`shots/timing.ts`), popup sự kiện `hit`, và tắt `DEBUG_AUTO_RETURN`.

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
