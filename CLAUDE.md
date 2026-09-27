# ALT Dashboard: handoff guide for Claude

A full rebuild of the user's classroom dashboard + ALT Planner as one PWA on GitHub Pages. **Phases 0–7 are done. Start at Phase 8.** The checklist is `docs/OVERHAUL_PLAN.md`: tick boxes as work lands, mark each phase ✅ with the date, and commit the plan with the phase.

## Where things are
- **This repo, branch `app`:** source code. Work and push here.
- **Branch `main`:** built site served by GitHub Pages. Don't edit it by hand. `.github/workflows/preview.yml` runs lint, typecheck, unit tests, e2e, then build, and publishes `app` builds to `main/next/`, giving the live preview at https://nagasakimark.github.io/dashboard/next/.
- **Live old site:** `/dashboard/` (tag `legacy-v1`). It stays untouched until the Phase 14 cutover.
- **Legacy references:**
  - `docs/legacy/dashboard-spec.md`: reconstructed spec of the old board, widgets, polls, games and JHS mode. **Phases 8–11 must match or improve on it.**
  - `docs/legacy/planner-recovered/`: old planner source.
  - `docs/legacy/data/jhs-books.json`: NH1–3 JHS grammar points and exercise sets from the old bundle; use it for Phase 10.
  - `docs/legacy/data/altopedia-nh2025.json`: raw Altopedia section data.
- **Old game and vocabulary code:** only in the minified bundle on tag `legacy-v1`: `assets/GameModal-*.js` (vocab cards `{english, japanese:{kanji,furigana}, image}`, about 1,175 images in `assets/`), `GamesPanel-*.js`, `JHSModal-*.js`, `Student-*.js`, `TeacherDashboard-*.js`. Extract data with Node: see how `jhs-books.json` was made, by importing the chunk as a module after stubbing asset URLs.

## Commands
```bash
npm ci
npm run dev        # http://localhost:5173/dashboard/
npm run lint && npm run typecheck && npm test
npx playwright install chromium   # once
npm run e2e        # desktop 1366, tablet 820 (touch), Pixel 7
```
E2E tests take screenshots into `test-results/shots/`; look at them to check the UI. `fixtures/private/` (the real user data) is gitignored and absent in the cloud; those tests skip automatically.

## Architecture and conventions
- **Stack:** Vite 8, React 19, TypeScript 6, Tailwind v4 (tokens in `src/styles/index.css`), React Router 8 (hash routes, `src/app/App.tsx`), Dexie, zod, TipTap 3, dnd-kit, @react-pdf/renderer, vite-plugin-pwa, Vitest, Playwright, oxlint and Prettier (`printWidth` 140, no semicolons, single quotes).
- **Data:** `src/data/schema.ts` (zod) and `src/data/db.ts` (Dexie `alt-dashboard` v1).
  - Always write through `save`, `saveMany`, `patch` and `remove` in `src/data/repo.ts`. They stamp `updatedAt`, and `remove` writes **tombstones**, which Phase 13 sync relies on.
  - Schema changes must be additive and default-valued, and must be added to `syncedTables` and export/import.
  - Live reads use `useLiveQuery`.
- **Other shared code:**
  - Legacy import: `src/data/importFile.ts` and `src/data/migrate/*`.
  - Settings: `src/data/settings.ts`.
  - UI kit: `src/components/ui` (Button, ButtonLink, Dialog, Menu, Tabs, Field/Input/Select/Switch, TagInput, toasts and confirm via `useFeedback`).
  - Page frame: `components/layout/Page`.
- **Schedule logic:** `src/features/schedule/{model,actions,upcoming,tally}.ts`. `upcoming.ts` gives real timetable times; the Phase 8 Upcoming Lessons widget must use it. Every schedule mutation returns an Undo; show it in a toast.
- **Student poll page:** it must answer at `/dashboard/student?room=12345`, because old QR codes use that URL (see `src/app/routes.ts`). The preview uses `#/student`.

### Gotchas learned so far
- Never wrap `<Button>` in `<Link>` or `<a>`; use `ButtonLink`.
- Don't mix `hidden` with the button's `inline-flex`; wrap it in `<span className="hidden sm:contents">`.
- The linter flags files that export non-components alongside components; put helpers in `.ts` files.
- Don't use comma-expression handlers (`() => (a(), b())`); use blocks.
- Hover-only controls need `[@media(hover:hover)]:opacity-0 group-hover:opacity-100` so they stay visible on touch screens.
- In e2e, scope clicks to the dialog (`getByRole('dialog', {name})`), since elements behind it still match. Wait for the URL after navigation-triggering actions, and match toasts via `getByRole('status').filter({hasText})`.
- On Windows the Python `\n` and `\U` escapes bit us; in the cloud (Linux) just use the Edit tool.
- Rich text is shown through `RichTextView`, which sanitises via the TipTap schema. Never inject raw HTML.

## Decisions (from the user; don't re-ask)
- **Sync:** Firebase Auth (Google) + Firestore, sync everything including rosters, optional and automated (Phase 13).
- **Firebase project:** `studentpoll-a9e39` (live polls already use its RTDB). The user has console access, but console changes (enabling Google sign-in, rules, authorised domains) must be given to them as exact steps.
- **Imports** overwrite existing data, with an automatic backup and undo. **Exports** include everything.
- **Out of scope:** dark mode. **Wanted:** a mobile layout, printable lesson plans and a PDF report (all done).
- **Old dashboard data** imports automatically from the same-origin browser databases (done).
- **Commits:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commit per phase and push to `app`.

## Next up: Phase 8 (classroom board)
Rebuild the board to the spec in `docs/legacy/dashboard-spec.md` §2:
- workspaces (the `workspaces` table)
- a draggable, resizable widget frame with lock, focus mode and a transparent overlay for Drawing
- templates, backgrounds (4 gradients + 24 wallpapers from `legacy-v1`, with daily rotation), the dock and the "Add widget" dialog
- all 16 widgets, **saving each widget's settings in `widget.config`** (the old app lost them)
- rosters in the `rosters` table, used by Random Name, Group Maker and Spinner
- Upcoming Lessons built on `upcoming.ts`

Then Phases 9–14 per the plan.
