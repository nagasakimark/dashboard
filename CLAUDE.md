# ALT Dashboard: handoff guide for Claude

A full rebuild of the user's classroom dashboard + ALT Planner as one PWA on GitHub Pages. **Phases 0–13 are built and Phase 14 is prepared. What's left needs the user:** Firebase console steps and a two-device sync test (Phase 13), reviewing the preview with real data, running the Launch workflow (never without their go-ahead), and tidying `alt-planner/archive/`. The checklist is `docs/OVERHAUL_PLAN.md`: tick boxes as work lands, mark each phase ✅ with the date, and commit the plan with the phase.

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
npx playwright install chromium   # once (in the cloud, skip this and set PW_CHROMIUM=/opt/pw-browsers/chromium instead)
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
- `main.tsx` and the student page import UI components from their own files (`@/components/ui/Card`…), not the `@/components/ui` barrel, which pulls in React Router. `e2e/perf.spec.ts` enforces first-load size budgets; `e2e/a11y.spec.ts` runs axe on every main screen (new screens should be added to its list).
- Rich text is shown through `RichTextView`, which sanitises via the TipTap schema. Never inject raw HTML.

## Decisions (from the user; don't re-ask)
- **Sync:** Firebase Auth (Google) + Firestore, sync everything including rosters, optional and automated (Phase 13).
- **Firebase project:** `studentpoll-a9e39` (live polls already use its RTDB). The user has console access, but console changes (enabling Google sign-in, rules, authorised domains) must be given to them as exact steps.
- **Imports** overwrite existing data, with an automatic backup and undo. **Exports** include everything.
- **Out of scope:** dark mode. **Wanted:** a mobile layout, printable lesson plans and a PDF report (all done).
- **Old dashboard data** imports automatically from the same-origin browser databases (done).
- **Commits:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commit per phase and push to `app`.

## Board (Phase 8) notes
- Code lives in `src/features/board/`. Widget metadata (sizes, categories) is in `model.ts`, components in `registry.ts`, and each widget's saved config and defaults in `widgets/configs.ts`. Widget type strings are the old app's names ("Random Name", "QR Code"…) so migrated workspaces load as they are.
- A widget gets `config` (saved settings merged over defaults) and `update(changes)`; put anything worth keeping in config. `useWidgets` holds the active workspace's widgets locally and autosaves 400 ms after changes.
- Unknown widget types are kept but not drawn (the old board's Poll widgets wait for Phase 9: add `Poll` to `WIDGET_META` and the registry).
- `getByRole` names match substrings: "Scoreboard settings" also matches "Board settings", so use `exact: true`.

## Polls (Phase 9) notes
- `src/features/polls/`: `db.ts` is a tiny realtime-DB interface with a Firebase backend (`firebaseDb.ts`, lazy) and a local one (`localDb.ts`, used when `localStorage.pollBackend === 'local'`; all poll e2e tests use it). `session.ts` holds the room and poll logic, `model.ts` the results maths and CSV.
- The rules are in `docs/firebase/`. The user has to apply them in the console by following `docs/firebase/SETUP.md`; ask whether they have before relying on anonymous-auth ownership.

## Games and JHS (Phase 10) notes
- `src/features/games/` (modes in `modes/`, lazy) and `src/features/jhs/`. Built-in data is static under `public/games/` (sets, img, jhs) with a bundled index in `src/content/games/sets.json`; regenerate with `node scripts/legacy/extract-vocab.mjs && node scripts/legacy/extract-jhs.mjs && python3 scripts/legacy/convert-images.py` (needs Pillow and the `legacy-v1` tag).
- Custom sets live in the `vocabSets` table (Dexie v2).

## Sync (Phase 13) notes
- `src/features/sync/`: `engine.ts` (pure, tested with a fake cloud), `cloud.ts` (Firebase Auth + Firestore, lazy), `SyncProvider.tsx` (runs it when `localStorage['sync:enabled'] === '1'`), `SyncBadge.tsx`.
- Anything that writes records must still go through `repo.ts` so `updatedAt` and tombstones are right; sync relies on them. Seeded defaults should use fixed ids and `updatedAt: 0`. Settings that describe one device go in `DEVICE_ONLY_SETTINGS`.
- Whole-database replaces must go through `replaceAllData` (it fires `DATA_REPLACED`, which makes the cloud match).

## Launch (Phase 14) notes
- `.github/workflows/launch.yml` (manual, typed confirmation): `launch` publishes to `main` root with the old build at `/legacy/`; `rollback` undoes it with a self-removing service worker. A `.app-files` list in `main` tracks the new app's files so re-launches clean up after themselves. Never run it without the user's go-ahead.
- The build writes `404.html` (for `/dashboard/student?room=…`), and the service worker's navigation fallback skips `/legacy/`, `/next/` and `/planner/`.


