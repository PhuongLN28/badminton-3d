# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The authoritative working rules live in `AGENTS.md` (written for Antigravity, equally binding here). They are imported below. Read them, plus `docs/PROGRESS.md`, before starting any work.

@AGENTS.md

Source docs, in priority order after user chat instructions: `AGENTS.md` > `docs/GAME_SPEC.md` (every number, formula and behavior) > `docs/ROADMAP.md` (phases, test IDs, browser checklists). `docs/PROGRESS.md` holds the current phase status. `docs/DECISIONS.md` records every deviation from spec. Docs and UI strings are in Vietnamese. Code identifiers are in English.

## Commands

```bash
npm run dev            # Vite on :5173 (strictPort); open /?debug=1 (overlay, lil-gui shot lab) and/or ?test=1 (test hooks)
npm run check          # typecheck + lint + vitest: the mandatory gate, must be 100% green
npm run test:e2e       # Playwright (Chromium); starts `npm run dev` itself, or reuses a server already on :5173
npm run build          # tsc --noEmit + vite build

npx vitest run tests/unit/physics/shuttle.test.ts   # one test file
npx vitest run -t "P2-U04"                          # one test by its ROADMAP ID
npx playwright test tests/e2e/phase2.spec.ts         # one e2e spec
npx playwright test -g "P2-E01"
```

`npm run ref:physics` regenerates `tests/fixtures/shuttle_reference.json` from `tools/shuttle_reference.py`. Run it only when the user asks. Never hand-edit the fixture.

## Architecture (big picture)

- **`src/shared/`**: pure, deterministic simulation code shared by the client and, from Phase 7, the Colyseus server. No `three`, DOM, `Math.random`, `Date.now` or `performance.now`. `tests/unit/architecture.test.ts` (P0-U05) scans for these with a plain text match, so even comments containing those strings fail. Time is measured in integer ticks (120 Hz × `GAME_SPEED`). Randomness comes from a seeded `math/rng.ts` (mulberry32). Every tunable value lives in `config.ts`.
- **Hot-path style**: sim functions mutate caller-owned state and scratch objects (`createShuttleScratch()`, `copyShuttleState`, `*Out(…, out)` helpers in `math/vec3.ts` and `math/quat.ts`) instead of allocating. Shared vectors are plain `{x,y,z}` objects. The physics step uses only `+ - * /` and `Math.sqrt`.
- **Shuttle physics** (`shared/physics/`): `shuttle.ts` handles RK4 `stepShuttle`, the `PhysicsConfig` flags (`gravityEnabled`, `dragEnabled`, `collideNet`, used by tests) and NaN/speed clamping. `collision.ts` handles swept net/floor collisions plus the temporary player-box bounce (`DEBUG_AUTO_RETURN`, to be disabled in Phase 3). `flight.ts` has `simulateFlight` and `predictUntil`, which reuse `stepShuttle`, so predictions (AI, shot solver, debug landing ring) match real flight exactly. `orientation.ts` keeps the shuttle nose aligned with velocity.
- **Client** (`src/client/`): `loop.ts` runs the fixed-timestep accumulator (`stepAccumulator` is the pure, tested part) and gives render code an interpolation `alpha`. Render code keeps prev/curr state copies and lerps between them; it reads sim state and never writes it. Until `match/matchSim.ts` exists (Phase 4), `main.ts` holds the sim state (`Phase2SimState`) and wires keyboard input → `stepPlayer`/`stepShuttle` → render, plus the test hooks.
- **Input**: keyboard (and later the AI and the network) produces `InputFrame`s only. `testHooks.ts` exposes `window.__BADMINTON__` (`step`, `setInput`, `spawnShuttle`, …; see GAME_SPEC §13.2). E2E tests drive the game through these hooks deterministically (pause → step n ticks) instead of waiting on real time.
- **Tests**: `tests/unit` mirrors `src/shared`. Physics tests import the JSON fixture directly and compare against its tolerances. Every test name includes its ROADMAP ID (e.g. `it('P2-U04 …')`). The `@shared/*` alias is defined in `tsconfig.json`, `vite.config.ts` and `vitest.config.ts`; keep all three in sync.

## Environment notes

- Windows dev machine. Both PowerShell and Git Bash are available. `ref:physics` calls `python3`.
- Three.js is pinned at 0.187. `PCFSoftShadowMap` was removed, so use `PCFShadowMap` (D-010). Check APIs against the installed version, not memory.
- **Drive-letter case matters.** If the process cwd is `c:\…` (lowercase, the tool default in Claude Code sessions), vitest 4.1.12 / vite 8.4.0 fails to load every test file with `TypeError: Cannot read properties of undefined (reading 'config')` (0 tests run). Always `cd "C:/Users/Admin/Documents/PhuongLN/game_cau_long/badminton-3d"` (uppercase `C:`) before `npm run check` / `vitest` / `test:e2e`. The same mismatch makes the Agent tool's `isolation: "worktree"` refuse the worktree, so create worktrees manually with `git worktree add` under `.claude/worktrees/` (git-ignored) and remove them after merging.

## Làm việc với đội sub-agent

> Nguồn: @tpnam.zzz. Luật của dự án (`AGENTS.md`, GAME_SPEC, ROADMAP) **luôn ưu tiên hơn** mục này. Chỗ nào mâu thuẫn thì theo luật dự án.

### 1. Điều phối viên (phiên AI chính)

- Phiên chính chạy **Opus 5.5** (đổi bằng `/model`).
- Hiểu yêu cầu, chia việc, giao cho sub-agent, tổng hợp kết quả, commit/push, gắn tag phase.
- Không tự tìm kiếm, tự kiểm tra hay tự làm phần việc chính.
- Giao việc một lần cho đủ: mục tiêu, phạm vi được sửa (file/thư mục), ràng buộc (dẫn mục `AGENTS.md` §5, §7, §9 liên quan), tiêu chí đạt (ID test trong ROADMAP), mẫu báo cáo. Sub-agent bắt đầu không có ngữ cảnh, nên phải ghi rõ file cần đọc.
- Mỗi tệp/phần chỉ một agent sửa tại một thời điểm.
- Quyết định về nghiệp vụ, quyền, dữ liệu, chi phí hoặc lệch spec thì hỏi người dùng (ghi đề xuất vào `docs/DECISIONS.md`).
- Công cụ không tạo được sub-agent thì AI tự đóng lần lượt từng vai, đúng thứ tự.

### 2. Đội hình

| Cấp · Vai | Model | Claude Code | Việc |
|---|---|---|---|
| 1 · Kiến trúc sư | Fable 5.2 (mạnh nhất, chỉ đọc) | `Plan`, `model: fable` | Lập Implementation Plan (file sẽ tạo/sửa, test theo ID, rủi ro), tiêu chí đạt; chẩn đoán lỗi khó; đánh giá SẴN SÀNG trước khi chốt phase |
| 2 · Reviewer | Opus 5.5 (mạnh, chỉ đọc) | `general-purpose`, `model: opus` | Duyệt độ đúng so với GAME_SPEC, phạm vi, luật kiến trúc §5; báo ĐẠT/CHƯA ĐẠT, lỗi theo mức Nghiêm trọng/Lớn/Nhỏ kèm vị trí và cách sửa |
| 3 · Thực thi | Sonnet 5.5 (trung bình) | `general-purpose`, `model: sonnet`, `isolation: worktree` | Viết test trước (đúng ID) rồi code, chỉ sửa đúng phạm vi; báo đã đổi gì và đã tự kiểm gì |
| 4 · Tìm kiếm | Haiku 5.5 (nhanh, chỉ đọc) | `Explore`, `model: haiku` | Tìm mã, mục spec, số liệu fixture; trả danh sách vị trí `file:dòng` kèm bằng chứng |
| 4 · Audit | Haiku 5.5 (nhanh) | `general-purpose`, `model: haiku`, `isolation: worktree` | Chạy `npm run check`, `npm run test:e2e`, `npm run build`; báo ĐẠT HẾT/CHƯA ĐẠT kèm số test xanh/tổng và output lỗi; không sửa |

Lưu ý riêng cho dự án:
- Agent Thực thi làm trong worktree (nhánh riêng). Điều phối viên merge vào `main` rồi mới commit/push theo `AGENTS.md` §13. Không để sub-agent tự push, tag hay sửa lịch sử.
- Vite dùng cổng 5173 với `strictPort`, nên **chỉ một** lần chạy `test:e2e` hoặc `npm run dev` tại một thời điểm.
- Không agent nào được xóa, skip, `.only` hay nới tolerance của test (§7), hoặc sửa `tests/fixtures/shuttle_reference.json`.

### 3. Quy tắc giao việc

1. Tìm kiếm → Tìm kiếm. Kiểm tra → Audit. Sửa/soạn → Thực thi.
2. Gọi Kiến trúc sư khi: lập plan đầu mỗi phase; đổi cấu trúc lớn (kiến trúc, giao thức mạng, hệ trục); việc chạm bảo mật/dữ liệu; lỗi sửa 2 lần chưa xong; trước khi chốt phase.
3. Lỗi do Audit/Reviewer tìm ra được chuyển nguyên văn cho đúng agent đã làm, lặp đến khi đạt.
4. Sau chẩn đoán của Kiến trúc sư vẫn chưa xong thì dừng và hỏi người dùng (khớp `AGENTS.md` §12).

### 4. Cổng phát hành (làm đúng thứ tự, gắn với Phase Gate §6)

Lưu bản / commit → Audit đạt hết → Reviewer đạt → Xem thử trên trình duyệt → Kiến trúc sư SẴN SÀNG → Phát hành → Xác minh môi trường thật

- **Commit**: theo §13, Thực thi tự chạy `npm run typecheck && npm run test` trước, chỉ commit khi xanh, push ngay.
- **Audit**: `npm run check` 100% xanh (kể cả test phase trước), `npm run test:e2e` xanh, không `console.error`.
- **Xem thử**: `npm run dev`, mở `http://localhost:5173/?debug=1`, làm hết checklist "Kiểm tra trên trình duyệt" của phase, chụp ảnh.
- **Phát hành**: cập nhật `docs/PROGRESS.md` (và `docs/DECISIONS.md` nếu lệch spec), commit `phase-N: …`, `git tag -a phase-N-done`, `git push origin main --follow-tags`.
- **Xác minh**: `git ls-remote --tags origin` thấy tag, `git status -sb` không còn "ahead".

Có lỗi ở bước nào thì sửa, lưu bản mới, chạy lại từ Audit. Kiểm không chạy được thì ghi rõ lý do (vào PROGRESS.md), không báo là đạt.

### 5. Việc không phải code

Giữ nguyên đội hình và cổng. Kiến trúc sư lập dàn ý; mỗi agent Thực thi soạn một phần riêng; Tìm kiếm lấy nguồn, số liệu; Audit kiểm số liệu, mẫu, chính tả; Reviewer duyệt nội dung. "Commit" là lưu bản có số phiên bản; "phát hành" là gửi bản cuối. Mẫu người dùng đưa (vd. template trong PROGRESS.md) luôn giữ nguyên bố cục.

### 6. Báo cáo cuối

Ngắn gọn: đã đổi gì, ai làm, kết quả kiểm (số test xanh/tổng), kết luận Reviewer/Kiến trúc sư, phần chưa xác minh, việc còn lại, hash commit cuối đã push. Sau đó **dừng**, không tự chuyển sang phase tiếp theo (§6 bước 9).
