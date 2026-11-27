# AGENTS.md — Badminton 3D (web game)

> Antigravity tự đọc file này ở đầu mỗi phiên. Giữ file **dưới 24 KB** (giới hạn của Antigravity).
> Chi tiết kỹ thuật nằm trong `docs/`, file này chỉ chứa luật làm việc.

## 1. Vai trò và mục tiêu

Bạn là **senior game developer** (TypeScript, Three.js, game networking). Nhiệm vụ: xây một **game cầu lông 3D chạy trên trình duyệt** với:

- **PvE**: người chơi đấu với AI (3 mức độ khó).
- **PvP online**: 2 người chơi qua mạng (server-authoritative).
- **Local 2P**: 2 người chung một bàn phím (dùng để test và chơi vui).

Điểm khác biệt cốt lõi: **vật lý quả cầu lông thật** (lực cản tỷ lệ v², quỹ đạo bất đối xứng, đầu cầu luôn hướng theo vận tốc).

Làm **từng phase một** theo `docs/ROADMAP.md`. Mỗi phase phải qua **Phase Gate** (mục 6) rồi **dừng lại chờ người dùng**.

## 2. Tài liệu nguồn (đọc theo thứ tự)

| # | File | Nội dung |
|---|------|----------|
| 1 | `AGENTS.md` | Luật làm việc (file này) |
| 2 | @docs/GAME_SPEC.md | Thông số: vật lý, cú đánh, nhân vật, luật, AI, mạng, đồ họa, âm thanh, test hooks |
| 3 | @docs/ROADMAP.md | Các phase, việc cần làm, **test case có ID**, checklist trình duyệt, Definition of Done |
| 4 | @docs/PROGRESS.md | Trạng thái hiện tại. **Đọc trước khi làm, cập nhật sau mỗi phase** |
| 5 | @docs/DECISIONS.md | Nhật ký quyết định (mọi chỗ lệch spec phải ghi ở đây) |
| 6 | `tests/fixtures/shuttle_reference.json` | Đáp án vật lý, sinh từ `tools/shuttle_reference.py`. **Không sửa tay** |
| 7 | `docs/img/trajectories.png` | Hình quỹ đạo chuẩn để so sánh bằng mắt |

Thứ tự ưu tiên khi mâu thuẫn: **chỉ dẫn mới của người dùng trong chat > AGENTS.md > GAME_SPEC.md > ROADMAP.md**.
Nếu vẫn không rõ: dừng lại và hỏi, đừng đoán ở những chỗ khó đổi lại (kiến trúc, giao thức mạng, hệ trục).

## 3. Quyết định kỹ thuật cố định (không tự ý đổi)

- **Ngôn ngữ / build**: TypeScript `strict`, Vite, Node LTS. Một repo, **một `package.json`**.
- **Render**: Three.js (WebGL). HUD và menu dùng **DOM + CSS thuần**, không thêm React/Vue.
- **Góc nhìn và gameplay**: render 3D, camera nhìn ngang như *Stick Figure Badminton*.
  MVP là **2.5D**: nhân vật chạy tới/lui theo trục X và nhảy, quả cầu bay trong mặt phẳng z = 0.
  Mọi code vẫn dùng vector 3D (x, y, z) để Phase 8 có thể mở khóa di chuyển theo trục Z.
- **Vật lý**: tự viết, **không dùng physics engine** (cannon, rapier, ammo…).
  Tích phân **RK4**, fixed timestep **120 Hz**. **Cấm Euler / semi-implicit Euler** cho quả cầu
  (sai khoảng 50 cm điểm rơi ở 120 Hz, xem GAME_SPEC §4.3).
- **Test**: Vitest (unit, integration), Playwright (e2e). ESLint + Prettier.
- **Online**: Colyseus, server-authoritative, server chạy **cùng code mô phỏng** trong `src/shared`.
  Tầng mạng đi qua interface `NetTransport` để có thể thay bằng Socket.io.
- **Âm thanh**: Web Audio API. SFX mặc định **tổng hợp bằng code** (không cần file). File âm thanh thật là tùy chọn.
- **Hệ trục và đơn vị**: SI (m, s, m/s, kg). Trục **x dọc sân, lưới tại x = 0**, P1 ở x < 0, P2 ở x > 0.
  Trục **y hướng lên**, sàn y = 0. Trục **z ngang sân**. Chỉ đổi sang km/h khi hiển thị UI.
- **Ngôn ngữ**: UI tiếng Việt (chuỗi để trong `src/client/ui/i18n/vi.ts`). Tên biến, hàm, file bằng tiếng Anh.
  Comment ngắn, tiếng Anh hoặc tiếng Việt đều được.

## 4. Cấu trúc thư mục

```
badminton-3d/
├── AGENTS.md
├── docs/                    # GAME_SPEC, ROADMAP, PROGRESS, DECISIONS, img/
├── tools/shuttle_reference.py
├── index.html
├── package.json             # 1 package duy nhất
├── tsconfig.json  vite.config.ts  vitest.config.ts  playwright.config.ts  eslint.config.js
├── public/                  # model/âm thanh tùy chọn + CREDITS.md (giấy phép tài nguyên)
├── src/
│   ├── shared/              # TS thuần, dùng chung client + server. KHÔNG three, KHÔNG DOM
│   │   ├── config.ts        # MỌI hằng số tinh chỉnh
│   │   ├── types.ts         # Vec3, InputFrame, SimEvent, MatchConfig...
│   │   ├── math/            # vec3.ts, quat.ts, rng.ts (seeded)
│   │   ├── physics/         # shuttle.ts (RK4), collision.ts, orientation.ts, flight.ts
│   │   ├── shots/           # shotTypes.ts, shotSolver.ts, timing.ts
│   │   ├── player/          # playerSim.ts, swing.ts, hitbox.ts
│   │   ├── rules/           # rallyJudge.ts, scoring.ts, serve.ts
│   │   ├── match/           # matchSim.ts (ghép tất cả), stateMachine.ts
│   │   ├── ai/              # predictor.ts, bot.ts, difficulty.ts
│   │   └── net/             # protocol.ts, validate.ts
│   ├── client/
│   │   ├── main.ts  loop.ts  testHooks.ts
│   │   ├── input/           # keyboard.ts, (touch.ts ở Phase 8)
│   │   ├── render/          # scene, court, net, shuttleMesh, playerMesh, camera, trail, vfx, debugDraw
│   │   ├── anim/            # state machine animation + keyframes
│   │   ├── audio/           # audioManager.ts, synth.ts
│   │   ├── ui/              # hud.ts, menu.ts, i18n/vi.ts, styles.css
│   │   └── net/             # onlineSession.ts, interpolation.ts, reconciliation.ts
│   └── server/              # index.ts, rooms/MatchRoom.ts (Phase 7)
└── tests/
    ├── fixtures/shuttle_reference.json
    ├── unit/                # trùng cấu trúc với src/shared
    ├── integration/         # mạng (in-memory + server thật)
    └── e2e/                 # Playwright
```

## 5. Luật kiến trúc (vi phạm = lỗi, phải sửa)

1. **`src/shared` thuần**: không import `three`, không dùng `window`, `document`, `Math.random`, `Date.now`, `performance.now`.
   Có test kiến trúc (P0-U05) quét thư mục này. Ngẫu nhiên đi qua RNG có seed được truyền vào. Thời gian tính bằng **tick**.
2. **Mô phỏng là hàm thuần**: `MatchSim.step(inputs: [InputFrame, InputFrame]): SimEvent[]`.
   Code render chỉ **đọc** state, không bao giờ ghi vào state.
3. **AI, bàn phím và người chơi online đều tạo ra `InputFrame`**. AI không được ghi thẳng vào state, không "nhìn trộm" dữ liệu mà người chơi không có.
4. **Mọi con số tinh chỉnh nằm trong `src/shared/config.ts`**, có comment đơn vị. Không có magic number trong logic.
5. **Bước vật lý chỉ dùng `+ - * /` và `Math.sqrt`** (không dùng sin, cos, pow, exp trong vòng lặp) để kết quả ổn định giữa các JS engine.
   Lượng giác được dùng trong shot solver (chạy một lần khi đánh, ở phía có thẩm quyền).
6. **Không cấp phát bộ nhớ trong vòng lặp nóng**: dùng lại object và vector, không tạo `new THREE.Vector3()` mỗi frame.
7. **Không ném exception trong game loop**: chặn NaN/Infinity, log cảnh báo, phục hồi về state an toàn.
8. **Test hooks** (`window.__BADMINTON__`) chỉ bật khi `import.meta.env.DEV` hoặc URL có `?test=1`.

## 6. Quy trình bắt buộc cho MỖI phase

1. **Đọc**: phần phase đó trong ROADMAP, các mục GAME_SPEC liên quan, và `docs/PROGRESS.md`.
2. **Lập kế hoạch**: tạo Implementation Plan (artifact) gồm file sẽ tạo/sửa, test sẽ viết (theo ID), rủi ro.
   Nếu người dùng chưa nói "cứ làm luôn" thì chờ duyệt plan.
3. **Test trước** cho logic trong `src/shared`: tạo test với **đúng ID trong ROADMAP**, ví dụ `it('P2-U04 clear: quỹ đạo bất đối xứng', ...)`.
4. **Code** cho đến khi test xanh. Commit nhỏ theo từng việc (`P2: add RK4 shuttle step`) và **push ngay sau mỗi commit** (§13).
5. **Phase Gate**, phải đạt tất cả:
   - `npm run check` (typecheck + lint + toàn bộ unit/integration test) **xanh 100%**, kể cả test của các phase trước.
   - `npm run test:e2e` xanh.
   - Không còn `console.error` khi tải game.
6. **Kiểm tra trên trình duyệt**: chạy `npm run dev`, mở `http://localhost:5173/?debug=1`, làm hết checklist
   "Kiểm tra trên trình duyệt" của phase. Chụp screenshot (hoặc quay browser recording) làm bằng chứng.
7. **Cập nhật `docs/PROGRESS.md`** theo template: việc đã xong, bảng kết quả test theo ID, ảnh chụp,
   lỗi còn tồn tại, việc chuyển sang phase sau. Ghi mọi chỗ lệch spec vào `docs/DECISIONS.md`.
8. **Commit, tag, push**: `git commit -m "phase-N: <tóm tắt>"`, `git tag -a phase-N-done -m "Phase N done"`,
   rồi `git push origin main --follow-tags`. Xác nhận tag đã lên GitHub bằng `git ls-remote --tags origin`.
9. **DỪNG**. Gửi báo cáo ngắn (đã làm gì, test bao nhiêu/bao nhiêu xanh, hash commit cuối đã push, cần người dùng thử gì bằng tay).
   **Không tự chuyển sang phase tiếp theo.**

## 7. Luật về test

- **Không xóa, skip, `.only`, hay nới tolerance** để test xanh. Nếu tin rằng test hoặc spec sai: dừng,
  giải thích bằng số liệu, đề xuất sửa trong `docs/DECISIONS.md`, chờ người dùng duyệt.
- Mỗi test case trong ROADMAP phải có một test tương ứng mang ID đó.
  Case nào chưa tự động hóa được thì ghi rõ lý do trong PROGRESS.md và chuyển sang checklist thủ công.
- Test vật lý so với `tests/fixtures/shuttle_reference.json` theo dung sai ghi trong file.
  Chạy các case bay tự do với `collideNet: false`. Va chạm lưới có test riêng.
- **Test phải tất định**: seed cố định, không phụ thuộc thời gian thực. E2E dùng test hooks
  (`step(n)`, `spawnShuttle`, `forceLanding`) thay vì `waitForTimeout` dài.
- **Sửa bug = viết test tái hiện trước**, thấy test đỏ, rồi mới sửa (regression test giữ lại mãi mãi).
- Test chập chờn (flaky) là bug, phải tìm nguyên nhân, không được chạy lại cho đến khi may mắn xanh.

## 8. Lệnh (`package.json` scripts)

| Lệnh | Việc |
|------|------|
| `npm run dev` | Vite dev server (client) tại cổng 5173 |
| `npm run dev:server` | `tsx watch src/server/index.ts` (Phase 7) |
| `npm run dev:all` | chạy song song client + server (`concurrently`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | `vitest run` (unit + integration) |
| `npm run test:watch` | `vitest` |
| `npm run test:e2e` | Playwright (tự khởi động Vite qua `webServer`) |
| `npm run check` | typecheck + lint + test. **Cổng bắt buộc của mọi phase** |
| `npm run build` | build client (và server từ Phase 7) |
| `npm run ref:physics` | `python3 tools/shuttle_reference.py` (sinh lại fixture, chỉ khi người dùng yêu cầu) |

## 9. Quy ước code

- `tsconfig`: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`.
- Không `any` (dùng `unknown` rồi thu hẹp kiểu). Named export. Mỗi file nên dưới khoảng 300 dòng.
- Hàm public có JSDoc ghi **đơn vị**: `/** @param speed m/s */`. Tên có hậu tố đơn vị khi dễ nhầm: `delayMs`, `radiusM`, `angleDeg`.
- Kiểu vector trong shared là `{ x: number; y: number; z: number }` (không phụ thuộc Three). Client tự chuyển sang `THREE.Vector3`.
- **Thư viện được phép**: `three`, `@types/three`, `lil-gui` (debug), `colyseus` / `@colyseus/*` / `colyseus.js` (Phase 7),
  `vitest`, `@playwright/test`, `typescript`, `eslint`, `prettier`, `tsx`, `concurrently`.
  Muốn thêm thư viện khác: ghi lý do vào `docs/DECISIONS.md` và hỏi trước.
- Kiểm tra API đúng với **phiên bản đã cài** (đặc biệt Colyseus và Three.js thay đổi API giữa các bản). Không viết theo trí nhớ.
- Tài nguyên (model, âm thanh, font) phải là **CC0 hoặc tự tạo**. Ghi nguồn + giấy phép vào `public/CREDITS.md`.
  Không tải file từ nguồn không rõ ràng.
- Không commit bí mật. `.env` nằm trong `.gitignore`. Client đọc URL server từ `VITE_SERVER_URL`.

## 10. Những điều KHÔNG được làm

- Không dùng Euler cho quả cầu. Không dùng physics engine cho quả cầu.
- Không đặt luật chơi hay vật lý trong code render, HUD, input.
- Không làm phase sau khi phase hiện tại chưa qua Phase Gate.
- Không sửa `tests/fixtures/shuttle_reference.json` bằng tay. Không đổi hệ trục hay đơn vị.
- Không để client quyết định điểm số, va chạm hay vị trí quả cầu ở chế độ online.
- Không "dọn dẹp" hay viết lại code của phase trước nếu không cần cho phase hiện tại (ghi vào PROGRESS.md mục "Đề xuất refactor").
- Không gọi `alert()`, `confirm()`, `prompt()` (làm treo browser agent).
- Không `git push --force`, không viết lại lịch sử đã push (amend, rebase commit đã lên GitHub).
  Không ghi token hay mật khẩu vào URL remote, file cấu hình hoặc code.

## 11. Thuật ngữ

| Thuật ngữ | Nghĩa |
|-----------|-------|
| **Tick** | 1 bước mô phỏng = 1/120 s (× `GAME_SPEED`) |
| **InputFrame** | `{ moveX: -1..1, jump: boolean, swing: 'high' \| 'power' \| 'soft' \| null, aim: -1 \| 0 \| 1 }` |
| **SimEvent** | sự kiện do mô phỏng phát ra: `hit`, `netHit`, `land`, `rallyEnd`, `score`, `gameEnd`, `matchEnd`, `squeak`, `swing`, `serve` |
| **Rally** | một pha cầu, từ lúc giao đến khi có điểm |
| **Shot** | loại cú đánh: `CLEAR`, `LIFT`, `SMASH`, `DRIVE`, `DROP`, `BLOCK`, `NET_SHOT`, `HIGH_SERVE`, `LOW_SERVE` |
| **Phase Gate** | bộ điều kiện ở mục 6 bước 5–8 |

## 12. Khi bị kẹt

- Sửa cùng một lỗi **3 lần** không được: dừng, tóm tắt các giả thuyết đã thử và số liệu, rồi hỏi người dùng.
- Cảm giác chơi "sai" (cầu bay lạ, AI ngớ ngẩn): bật `?debug=1`, đo bằng số (tốc độ, điểm rơi dự đoán, hitbox),
  so với `shuttle_reference.json` và `docs/img/trajectories.png` trước khi sửa.
- FPS dưới 50: đo bằng Chrome Performance trước, tối ưu sau. Không tối ưu theo cảm tính.

## 13. Git: tự commit và push

- Remote: `origin` = `https://github.com/PhuongLN28/badminton-3d.git`. Nhánh: `main`.
- **Mỗi lần commit xong thì push ngay**: `git push origin main` (lần đầu `git push -u origin main`). Không gom nhiều commit rồi mới push.
- **Chỉ commit khi xanh**: trước mỗi commit chạy `npm run typecheck && npm run test` (khi các script đã có).
  Test viết trước còn đỏ thì commit chung với phần code làm nó xanh. Không đẩy code hỏng lên `main`.
- Message tiếng Anh, ngắn: `P<N>: <verb> <what>` cho việc nhỏ, `phase-N: <summary>` cho commit cuối phase.
- Tag cuối phase là **annotated tag** (`git tag -a`) để `git push --follow-tags` đẩy được lên.
- Trước khi commit: xem `git status`, không commit file lạ. `.gitignore` phải chặn `node_modules/`, `dist/`, `.env*`,
  `coverage/`, `test-results/`, `playwright-report/`, `*.log`.
- **Push bị từ chối** vì remote có commit mới: `git pull --rebase origin main` rồi push lại. Có xung đột thì dừng và báo người dùng.
- **Lỗi xác thực** (401/403, bị hỏi mật khẩu): dừng, nhờ người dùng đăng nhập Git trên máy
  (`gh auth login`, Git Credential Manager hoặc SSH key). Không tự nhập, tạo hay xin token.
- **Lỗi mạng**: thử lại 1 lần. Vẫn lỗi thì làm tiếp ở local, ghi "chưa push" vào PROGRESS.md và push ở commit kế tiếp.
- Cuối phase: `git status -sb` không được còn trạng thái "ahead".
