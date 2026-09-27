# Dashboard Overhaul Plan

A full rebuild of **nagasakimark.github.io/dashboard**: the classroom board, the ALT planner, games, polls and panels. It becomes one polished, installable PWA hosted on GitHub Pages.

Status: **Phases 0–13 built; launch prepared, waiting on your review** (started 2026-09-27). Each box gets ticked as it's done, and each phase ends with a commit.

---

## 0. Decisions (made 2026-09-27)

| # | Decision | Answer |
|---|----------|--------|
| D1 | Sync approach | **Option A: Firebase Auth (Google sign-in) + Firestore** |
| D2 | Where it lives | **Keep `nagasakimark.github.io/dashboard/`**, with source in the `dashboard` repo and a GitHub Actions deploy |
| D3 | Access to Firebase project `studentpoll-a9e39` | **Yes.** Use it for the poll security rules and for sync |
| D4 | Student names and rosters | **Sync everything**, rosters included |
| D5 | Schedule PDF report | **Improve it.** A redesigned, generated PDF that downloads as a real file (see Phase 4) |
| D6 | Old dashboard data | **Import automatically from the browser (same site).** Also accept workspace JSON files |

---

## What exists today (inventory)

**Deployed dashboard** (source lost, reconstructed from the build):
- **Classroom board:** multiple workspaces with draggable, resizable widgets, rotating backgrounds, and saved templates. The 16 widgets:
  - Time: Timer, Stopwatch, Clock
  - Students: Random Name, Group Maker, Scoreboard
  - Interactive: Poll
  - Fun: Dice, Spinner
  - Display: Text, Checklist, Upcoming Lessons, Traffic Light
  - Tools: Sound Level, Drawing, QR Code
- **Live polls:** run on Firebase Realtime Database. Students join with a 5-digit room code or QR at `#/student`. Question types are choice, multi-select, text and ranking. Results show as a bar chart, pie chart, word cloud, rating or average ranking, and past polls are archived.
- **Games:** 8 modes (Flashcards, Quiz, Corner Pop, Picture Reveal, Missing, Word Scramble, Spelling, Memory Match) using 58 vocabulary sets (Elementary and JHS) and about 1,175 images.
- **JHS Classroom Mode:** New Horizon 1–3 units, key sentences, new words, exercise sets (choice, reorder, cloze) and a grammar library.
- **Panels:** Activities (links to your other nagasakimark.github.io sites), Bookmarks, Textbook links, and Settings (workspaces, classes, templates, background rotation, export/import).
- **Local storage:** a browser database called `livepoll` (workspaces, settings, templates, textbooks).

**ALT Planner** (recovered from the sourcemaps in the dashboard repo, `planner/`, embedded as an iframe):
- Schedule in week, month, year and tally views, schools with several timetables each, lesson plans (Quill), textbooks and sections, a Curriculum checklist, Class History, a Dashboard page with todos, and a PDF report.
- **Local storage:** a browser database called `alt-planner-db`, version 8.

**Known bugs and gaps being fixed:**
- The Upcoming Lessons widget assumes every period starts at 8:00 and lasts 50 minutes, instead of using your school timetables.
- Planner imports wipe everything with no backup.
- The original planner's export leaves out textbook sections.
- Drag-and-drop doesn't work on touch screens.
- Class History has a note field that is never filled in.
- Three rich-text editors are installed.
- Two separate apps have separate storage and styling.
- The app can't be installed and doesn't work offline.
- Textbook covers are stored as ~100 KB base64 images.

**Your data (`data.json`)**, used as the migration test:
- 2 schools, 447 day assignments and 2,138 period entries (September 2024 to October 2026)
- 10 lesson plans, 6 textbooks (no sections yet), 2 curricula, 1 todo

---

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite 7 + React 19 + TypeScript** | React matches your existing code. TypeScript catches data-shape bugs, which were the root cause of most planner issues |
| Styling | **Tailwind CSS v4** + a small in-house component set | Consistent design across the board, the planner and the games |
| Routing | React Router (hash mode) | Works on GitHub Pages with no server rewrites |
| Local data | **Dexie** (IndexedDB) + **zod** schemas | Versioned migrations, indexed queries and live queries. Replaces the hand-rolled `setData`, which clears the store and re-adds everything on every save |
| Rich text | **TipTap** | One editor instead of three. It reads your existing Quill HTML as-is and prints cleanly |
| Drag and drop | **dnd-kit** | Works with touch, mouse and keyboard (HTML5 drag-and-drop doesn't work on phones) |
| PWA | **vite-plugin-pwa** (Workbox) | Installable, works offline, shows an "update available" prompt |
| Printing | Print stylesheets for lesson plans. **@react-pdf/renderer**, loaded only when needed, for the schedule report | Lesson plans print, or save as PDF, from the browser. The report downloads as a real PDF file |
| Polls and sync | **Firebase modular SDK**, loaded only when needed | Already used for polls |
| Tests | **Vitest** (logic, migration) + **Playwright** (end-to-end, phone and desktop screen sizes) | |
| Deploy | GitHub Actions → GitHub Pages | Push to `main` and it's live |

---

## Sync options (for reference; **A was chosen**)

The goal: sign in once on each device, then sync happens automatically in the background. Other teachers can use it with no API setup of their own.

**A. Firebase Auth (Google sign-in) + Firestore** ⭐ recommended
- **Signing in:** "Sign in with Google" once per device, and you stay signed in (Firebase keeps a long-lived session).
- **Setup:** you configure Firebase once. Other users just click sign in.
- **Syncing:** changes sync live between devices. Edits made offline queue up and send later. Each person's data is walled off by security rules.
- **Cost:** the free tier (1 GiB storage, 50k reads and 20k writes per day) is far more than one teacher needs.
- **Caveats:**
  - Your data lives in Google Cloud under your Firebase project, which matters for any student names (see D4).
  - Your Nagasaki City Workspace account's admin may block third-party sign-ins. If so, a personal Gmail account works the same way. I'll test this first.
  - Covers are stored inside the database, because Firebase file storage now needs a paid plan. Shrinking them makes this fine.

**B. Google Drive hidden app folder (`drive.appdata`)**
- Your data is a JSON file in a hidden folder in your own Drive. There's no database of mine anywhere.
- It uses a scope Google lists as non-sensitive (I'll confirm when setting it up), so other users don't face a scary warning screen.
- Downsides:
  - Browser-only apps get 1-hour access tokens. Renewing them is usually silent, but sometimes shows a popup.
  - It syncs the whole file on open and on save, not live.
  - If you edit on two devices, it can only merge whole records, not individual fields.

**C. Google Sheets** (your original idea). Not recommended:
- Its scope is rated "sensitive", so Google verification is needed before other people can use it.
- Nested data (lesson plans, curricula) fits spreadsheets badly.
- It has API quotas and the same token problem as B.

**D. No-account "sync code"** (can be added alongside A)
- Generate a secret code on the PC, then scan its QR on your phone. Data is encrypted on the device before upload, so even the database owner can't read it.
- No Google sign-in at all, but if you lose the code, the synced copy is lost.

Whichever you pick, sync is **optional and off by default**. The app works fully offline without it.

---

## Phases

### Phase 0 — Groundwork and safety ✅ (2026-09-27)
- [x] Find Node.js. It was at `D:\Program Files\NodeJS` (v24.21, npm 11) and already on the system PATH; shells opened before the install just don't see it yet
- [x] Tag the current deployed `dashboard` repo as `legacy-v1` so there's always a rollback point (pushed)
- [x] Create `archive/` in `alt-planner`. Moved in 33 unreferenced source files, `Desktop/` (C#), `electron/`, `main.js`, `preload.js`, `run.ps1`, `craco.config.js`, `features`, `config/`, `scripts/` and `alt-planner.sln`. Nothing deleted
- [x] Add `data.json`, `*backup*.json` and `calendar-export*.json` to `.gitignore` (`*.7z` was already ignored)
- [x] Save the recovered planner source to `legacy/planner-recovered/` as a reference, and commit it
- [x] Write a reconstructed feature spec from the build: [`legacy/dashboard-spec.md`](legacy/dashboard-spec.md)

### Phase 1 — New app foundation ✅ (2026-09-27)
- [x] Scaffold with Vite 8, React 19, TypeScript 6, Tailwind v4, oxlint and Prettier; base path `/dashboard/`. Source is on the **`app` branch** of `nagasakimark/dashboard`; the local copy is `C:\Users\marka\dashboard`
- [x] Design system: colour tokens (accent colour driven by Settings), Inter font, and components (Button, IconButton, Input, Select, Textarea, Switch, Field, Dialog/bottom sheet, confirm, Toast, Tabs, Menu, Card, Badge, EmptyState, Spinner)
- [x] App shell:
  - **Planner mode:** sidebar on desktop, icon rail on tablets, bottom tabs with a "More" sheet on phones
  - **Classroom mode:** full-screen `#/board` route (widgets arrive in Phase 8)
  - Standalone student entry that keeps `/dashboard/student?room=…` working
- [x] PWA: manifest, new icons (including maskable), offline precache (~505 KB), image cache on first use, update prompt, install prompt
- [x] GitHub Actions: lint, typecheck, unit tests, then e2e, then build and publish to `main/next/`, giving a live preview at **/dashboard/next/**
- [x] Vitest and Playwright (desktop 1366, tablet 820, Pixel 7)

### Phase 2 — Data layer ✅ (2026-09-27)
- [x] One Dexie database, `alt-dashboard`, holding:
  - `schools` (timetables embedded; they're small and always change with their school), `dayAssignments`, `periods`
  - `lessonPlans`, `textbooks`, `sections`
  - `curricula`, `curriculumItems`, `classProgress`
  - `todos`, `settings`, `workspaces`, `templates`, `rosters`
  - `bookmarks`, `tombstones`, `backups` (poll archives stay in Firebase)
- [x] Every record gets `id`, `createdAt` and `updatedAt`. Deletes are recorded in a `tombstones` table (rather than a `deletedAt` field), so normal queries stay simple and sync can still see deletions
- [x] Periods are stored as `{date, slot}` with the id `YYYY-MM-DD:slot`, indexed by date, class and lesson plan
- [x] zod schemas describe every table; imports are fully validated before anything is written
- [x] **Export:** one JSON file, `{ app: 'alt-dashboard', schemaVersion, exportedAt, data }`, containing everything
- [x] **Import:** preview (format, counts, problems), then an automatic backup, then a replace in one transaction, then **Undo**. Keeps the last 5 backups, with restore, download and delete; there's also "Back up now" and "Erase all data" (both undoable)
- [x] Settings page: profile name, accent colour, date format, week start, start screen, data and backups, install as an app

### Phase 3 — Legacy migration ✅ (2026-09-27)
- [ ] Detect the file format automatically:
  - dashboard-planner export (9 keys, like your `data.json`)
  - original planner export (6 keys)
  - old dashboard workspace JSON
  - the new format
- [x] Planner conversion:
  - Split the schedule keys into date and period
  - `special_X` school IDs → a day type (Paid Leave, Public Holiday and so on)
  - Keep `scheduleId: null`, and treat links to deleted timetables (43 days in your data) the same way: fall back to the school's first timetable
  - Turn lesson plan ID numbers into strings and relink the references; broken links are cleared and reported
  - Keep Quill HTML as it is (very old Quill Delta content is converted to paragraphs)
  - Shrink covers to about 300 px WebP
  - Carry curricula and todos across unchanged
  - **Extra:** "Other" periods with the summary "Lesson Planning" or "Marking" become those types (345 in your data), and classes you teach that were missing from a school's class list are added (20 in your data, including the odd 6-8 at lunch)
- [x] Show an import report (format, counts, warnings, notes, what's kept) before confirming. Importing a planner-only file keeps the board workspaces, templates, rosters and bookmarks already on the device; a workspace file just adds a workspace
- [x] **Same-site auto-import:** a Home banner (and a Settings button) offers a one-click import of the old `alt-planner-db`, `livepoll` and bookmark data, read-only with the originals untouched. Dashboard textbook links are merged into matching planner textbooks by title
- [x] Tests:
  - `data.json` as a local test file (gitignored, `fixtures/private/`): every period, day, class and plan link round-trips
  - small made-up test files for each legacy format (committed), plus end-to-end tests for the browser migration and cover shrinking

### Phase 4 — Planner: schools and schedule ✅ (2026-09-27)
- [x] Schools: name, colour, periods per day, lunch slot, JTEs, classes (quick "years 1–6 × 3 classes" generator, a JTE per class), several named timetables; archive or delete
- [x] Calendar:
  - Week view (each day its own column with real timetable times), month and year views
  - A phone view: a daily agenda with a day strip and swipe between days
  - Assign a school or day type to each day, with the timetable choice per day and a day note; weekends appear only when used
  - Extras: "copy this day to next week" and "copy this week to next week" (classes only, without notes)
- [x] Period editor:
  - Types: class (tap a class chip or type "5-1"), Lesson Planning, Marking and other types
  - Summary field, with "copy previous summary" (same class first, else the same year), which also brings the lesson plan link
  - Link a lesson plan (same-year plans first); curriculum item links come in Phase 6
  - Move or copy to any date and period from the editor
- [x] Move or copy periods by dragging (mouse, touch and keyboard): drop on a period to swap, hold Ctrl/Alt to copy. Every change shows an **Undo**
- [x] Tally view with presets (this week, last 4 weeks, this school year, "Up to now"), a school filter, per-class counts, JTE breakdown, activities and days off
- [x] **Improved PDF schedule report** (D5), generated as a real PDF file:
  - Pick a date range (with "Up to now", this school year, this month) and filter by school
  - Weekly timetable pages in school colours, with lesson titles and summaries (optional)
  - Summary page: totals, class counts per school/year/class, JTE breakdown, activities, days off and events
  - Your name, a generated date and page numbers on every page
  - A preview before you download
  - The PDF library loads only when you open the report; a Japanese font is downloaded (and cached offline) only when the report contains Japanese
- [x] *Carried to Phase 6:* curriculum progress per class in the report (done)

### Phase 5 — Lesson plans, textbooks and sections ✅ (2026-09-27)
- [x] Lesson plan library: search (title, tags and content), filters by school, year, textbook and tag, and a full-page TipTap editor that saves automatically
- [x] Attached resources: links and small files (up to 1.5 MB)
- [x] **Printable lesson plans:** a clean A4 print layout (title, school, year, textbook page, tags, content, resources, your name), one plan or a batch ("Select to print")
- [x] Textbooks: covers shrunk on upload, digital and ALTopedia links, sections (page, title, grammar, notes, digital and ALTopedia page links), lesson plans per section
- [x] Import sections from JSON (all the old formats: `page`/`unit`/`content`, `pageNumber`/`title`/`topic` and `Page Number`/`Section Name`/`Topic (Grammar)`)
- [x] **New Horizon 1–3 (2025) presets:** 145 key-sentence pages from ALTopedia, each with its grammar tag and a link to that page's activities. One-click "add textbook", or "fill sections from preset" for a textbook you already have (suggested automatically from its title)
  - ⚠️ Found while cross-checking: the old dashboard's bundled NH section list doesn't match the 2025 books (its NH1 runs to p.221 and many pages disagree), so it wasn't used. ALTopedia doesn't record unit names, so presets are listed by page rather than by unit
- [x] Extras: "New" lesson plan straight from a period (pre-filled and linked); "used in" list on each plan; old Quill formatting (alignment) carried over; content is sanitised through the editor schema before display

### Phase 6 — Curriculum manager v2 ✅ (2026-09-27)
- [x] Curricula with ordered, drag-to-reorder items (mouse, touch and keyboard). Your existing 2 curricula (24 items, with their ticks) migrate as they are
- [x] Items can **optionally** link to a textbook page and/or a lesson plan; a curriculum can optionally have a textbook, school and year
- [x] **Per-class progress:** a grid of items × classes with each class's next item highlighted (a per-class checklist on phones). Classes come from the year/school, or you pick them
- [x] Period editor: link a curriculum item (the class's next item is suggested); after saving, a prompt offers "Mark taught" for that class — never automatic
- [x] "Create curriculum from textbook": one item per section (works with the NH1–3 presets or any textbook)
- [x] *From Phase 4:* curriculum progress per class in the PDF report

### Phase 7 — Home and Class History ✅ (2026-09-27)
- [x] Home page: greeting with your name; a "happening now / next class" card using **real timetable times** (with the lesson plan and the class's next curriculum item); today's periods with a live "Now" marker; this week at a glance; to-dos (add, tick, edit in place, drag to reorder, clear done); curriculum progress; quick links
- [x] Class History:
  - Classes only (no special periods; lunch optional)
  - Search notes and lesson plans; filter by school, year, class and date range; grouped by month; CSV export
  - Click any class to edit it (including its lesson plan and curriculum links)
- [x] The "upcoming" logic is shared, ready for the board's Upcoming Lessons widget in Phase 8

### Phase 8 — Classroom board ✅ (2026-09-27)
- [x] Workspaces: add, rename, reorder and delete (with Undo), a switcher with ◀ ▶ and a list, export/import as JSON (old template files still import), plus background rotation
- [x] Widget frame: drag, resize (edges and corner, mouse and touch), lock, layering (bring to front / send to back), duplicate, reset size, focus mode (enlarges any widget over a dimmed board), and snap to a 20 px grid (can be turned off). Widgets from a bigger screen are pulled back into view
- [x] Templates: save, apply (with Undo), rename, export and delete
- [x] Rebuilt 15 widgets to the reconstructed spec, then polished them. **Every widget's settings are saved in `widget.config`**, as is state worth keeping (a running timer, scores, ticks, picked names, groups, drawings):
  - Time: Timer (with a real alarm sound, which the old one lacked), Stopwatch, Clock
  - Students: Random Name, Group Maker, Scoreboard
  - Fun: Dice, Spinner
  - Display: Text, Checklist, Traffic Light, Upcoming Lessons
  - Tools: Sound Level, Drawing (the eraser really erases now, and "Use widgets" lets clicks through), QR Code
  - Poll arrives with Phase 9; Poll widgets from the old board are kept (not drawn) until then
- [x] Upcoming Lessons reads the planner data directly, with correct times from `upcoming.ts` and a click-through to that week in the schedule
- [x] Class rosters (Board settings → Classes), shared by Random Name, Group Maker and Spinner, with an optional link to a planner class (suggested automatically when the name matches, e.g. "5-1"). New student widgets start on the class used last
- [x] Keyboard shortcuts (N, D, [ ], B, H, F, Esc, ?, arrow keys on a title bar) and a projector mode that hides every control
- [x] Backgrounds: the 4 gradients and 24 wallpapers from `legacy-v1`, converted to WebP (≈5.7 MB total, down from ≈60 MB) with thumbnails, cached offline on first use; daily rotation as before

### Phase 9 — Live polls ✅ (2026-09-27)
- [x] Firebase SDK updated to v12 (modular), loaded only when a poll opens. **Database security rules** written in [`firebase/database.rules.json`](firebase/database.rules.json), with the exact console steps in [`firebase/SETUP.md`](firebase/SETUP.md) (turn on anonymous sign-in, paste the rules). ⚠️ *Needs you:* those two console changes. Until then polls work the old, open way
  - The board signs in anonymously so a room belongs to the board that made it; students don't sign in. Students can only add one vote at a time, only to the running poll, of the right type and length. Rooms from the old dashboard keep working until the cutover
- [x] Teacher (the **Poll** widget on the board): poll builder (single, multiple with "Other", ranking, star rating 3–10, word cloud; allow re-voting), room code with a large QR ("Scan to join") and copy link, live results (bars, pie, word cloud, rating, average ranking), an archive of past polls, and CSV export (summary plus raw responses)
  - The room code is kept with the widget, so it survives reloads (the old one changed every browser session); "New room code" replaces it
- [x] Student page: `#/student` and `/dashboard/student?room=…` join flow (code check, waiting screen, all five ballot types with drag-or-arrows ranking on touch, "Vote submitted!", re-voting resets after 1.5 s, follows new questions), text stripped of HTML
- [x] Old rooms expire: any room nobody has opened for 7 days is deleted by the next board that opens a poll (the rules allow only that)
- [x] Tests run polls on a local backend (`localStorage.pollBackend = 'local'`), so e2e never touches the live database

### Phase 10 — Games and JHS Classroom Mode ✅ (2026-09-27)
- [x] Rebuilt the 8 game modes on a shared engine (`src/features/games/engine.ts`: shuffling, distractors, scrambling, memory pairs, streak/best/rounds with the best remembered per game), full screen at `#/games` (also from the board's dock, or press G):
  - Flashcards (flip, shuffle, restart, arrow keys), Quiz (picture → 4 words), Corner Pop (spoken word → 4 corner pictures), Picture Reveal (20 tiles), Missing (random or chosen cards, hide 1–N), Word Scramble (tap or type), Spelling (next letter / type / say it), Memory Match (picture–word, or word–Japanese for sets without pictures)
  - A 日本語 toggle shows Japanese (with readings where the data has them); games that need pictures are greyed out for sets without them
- [x] Vocabulary moved out of the bundle into one file per set (`public/games/sets/`): the **58 Picture Dictionary categories**, Let's Try 1–2 and New Horizon 5–6 units (with "with previous units", as before), plus **25 new JHS unit word lists** (NH1–3) so games work with JHS words too. Extraction is reproducible (`scripts/legacy/`)
- [x] **Custom word sets** (new `vocabSets` table, synced and exported): type or paste words with Japanese, pick pictures from the 1,000+ built-in images or upload your own (shrunk to 320 px)
- [x] 1,093 images converted to WebP (≤480 px, 10 MB in total). Set data and pictures load when a set opens and are then cached for offline use by the service worker
- [x] JHS Classroom Mode (`#/jhs`): NH1–3 exercise sets (reorder tiles, fill the blank, multiple choice) with Check answer, hint, Japanese translation and a teacher "Show answer"; a searchable grammar library. Links both ways with the NH presets from Phase 5 ("JHS exercises" on an NH textbook, "p.N in planner" in an exercise set) and to that unit's word games
  - ⚠️ The old JHS data has furigana flattened into the text (e.g. 動どう詞し); it's shown as it was, because splitting kanji from readings can't be done reliably without a dictionary. Source citations like "[1]" are removed

### Phase 11 — Panels and settings ✅ (2026-09-27)
- [x] **Links** (a planner page, and the board's dock or L): **Activities** (the 23 sites from the old panel, now editable: add, edit, reorder, remove with Undo, "Restore defaults"), **Bookmarks** (add with a picture link or upload, edit, reorder, remove) and **Textbooks** (the planner's textbooks with their digital and ALTopedia links, plus JHS mode for NH books; the old dashboard's textbook links were merged into these in Phase 3). Activities and bookmarks share the `bookmarks` table (new `kind` field)
- [x] Settings: profile name, accent colour, date format and start screen (Phase 2), a new **Classroom board** section (daily wallpaper rotation with today's preview, snap to grid) and **Games** (reset best streaks), data (export, import, backups, reset). Sync arrives with Phase 13

### Phase 12 — Mobile, accessibility and performance ✅ (2026-09-27)
- [x] Every screen checked at 375 px (phone) and 768 px (tablet) with real-looking data: no horizontal scrolling anywhere; the games header was tightened for phones. Touch targets are at least 28 px (WCAG 2.2 asks for 24)
- [x] Classroom mode works on tablets (the board e2e tests run at 820 px with touch, and widget controls stay visible on touch screens)
- [x] Accessibility: an automated **axe-core** check (WCAG 2.1 AA) now runs on 15 screens at desktop and phone sizes in CI (`e2e/a11y.spec.ts`). It found low contrast in the faint-text colour (now 4.9:1) and in the month view's other-month days (now shown with a muted background instead of fading); all serious issues are fixed. Keyboard focus rings, labelled controls and dialog focus handling were already in place
- [x] Performance: every mode and page is its own chunk, and heavy parts (PDF, Firebase, games, drag-and-drop for student ranking) load only when used. React is in a separate long-lived chunk. **Size budgets** are enforced in CI (`e2e/perf.spec.ts`, first-load JavaScript, gzip): planner home ≤ 250 KB (now 228), classroom board ≤ 280 KB (259), student poll page ≤ 95 KB (82, down from 127)
- [x] Offline check automated (`e2e/offline.spec.ts`): after the app installs its service worker, the planner, the board and a game set used earlier all load with the network off
  - ⚠️ *For you:* a real-device check (install on your phone, airplane mode, open each part) is still worth doing once at the cutover

### Phase 13 — Sync (Option A: Firebase + Google sign-in) ✅ code done (2026-09-27); ⚠️ needs your console steps and a two-device test
- [ ] ⚠️ *You:* turn on Google as a sign-in method, add `nagasakimark.github.io` to the authorised domains, create the Firestore database (Tokyo) and publish [`firebase/firestore.rules`](firebase/firestore.rules). Exact steps: [`firebase/SETUP.md`](firebase/SETUP.md) §3
- [ ] ⚠️ *You:* test sign-in with your Nagasaki City school account. If its admin blocks it, use a personal Gmail account (the steps say what the error looks like)
- [x] Cloud storage: one Firestore document per record at `users/{uid}/{table}/{id}` (the record as JSON, so nested lists like groups sync safely). This device's database stays the source of truth and works offline; changes made offline are sent when the connection returns
- [x] Security rules: each signed-in Google user can read and write only their own data (anonymous poll sessions can't); document shape is checked
- [x] Sync covers everything, class rosters included (D4); only settings that describe one device (last screen, open workspace) stay local
- [x] Records sync only when they change (pushes send what changed since the last push; pulls listen for what the server saw after a saved cursor), and **the most recent edit wins** per record. Deleted records carry a marker so deletions reach the other devices. Imports and backup restores make the cloud match (records restamped, cloud-only records deleted). Default records (first workspace, activities) have fixed ids and time 0, so a new device never overwrites or duplicates real data
- [x] Textbook covers are already ≈300 px WebP (Phase 3), well inside a document; lesson-plan files that would push a record past ~900 KB stay on their device (reported in Settings)
- [x] Background sync with a status indicator (Synced / Syncing / Offline / Sync problem) in the sidebar and the phone's **More** sheet
- [x] Settings → Sync between devices: sign in with Google and turn on, "Sync now", "Turn off and sign out" (data stays), and "Sign out and remove cloud data". Signing in upgrades the board's anonymous poll session, so poll rooms stay yours
- [x] Tests: the sync engine runs against a fake cloud with two "devices" (copying, newest-wins with clock skew, deletions, no echoes, device-only settings, cursors, import replacing the cloud). Firebase itself loads only when sync is on (the first-load budgets still pass)
- [ ] ⚠️ *You:* test with the PC and your phone together (steps in SETUP.md §3 "Try it")

### Phase 14 — Launch (prepared 2026-09-27; ⚠️ waiting on you)
- [ ] ⚠️ *You:* run your real data through the preview at `/dashboard/next/` and review it (Home offers the one-click import from the old dashboard and planner on the same site)
- [ ] ⚠️ *You (then one click):* switch `/dashboard/` over. **Ready:** the **Launch (switch /dashboard/)** workflow (Actions → Launch → Run workflow, choose `launch` and type it again) runs every test, publishes the new app at `/dashboard/` and keeps the old build at `/dashboard/legacy/` (the old planner stays at `/dashboard/planner/`). `rollback` restores the old dashboard and retires the new app's service worker. Both were dry-run against a copy of `main`: the new app, the old dashboard at `/legacy/` and `/dashboard/student?room=…` (old QR codes, via the new `404.html`) all load, and the new service worker leaves `/legacy/`, `/next/` and `/planner/` alone
- [x] Short user guide: in the app (**Help** in the menu) and in the README (plus launch and rollback instructions)
- [ ] ⚠️ *You:* go through `archive/` in `alt-planner` together and delete what isn't needed (that repository isn't attached to these sessions)

---

### Feedback round 1 ✅ (2026-09-27)
Your 18 points after trying the preview:
- [x] Sync: the "referer blocked" error comes from the API key's website list; SETUP.md §3 has the fix (add `studentpoll-a9e39.firebaseapp.com`). ⚠️ Needs you.
- [x] Home and schedule fit the window with no page scrolling; notes stay inside their periods; slimmer sidebar; full-height ‹ › week arrows.
- [x] Dialogs use the height they need; compact class picker in the period editor.
- [x] PDF report is the old Weekly Schedule Record (title, staff overview, two weeks a page, class stats) with no summary page.
- [x] Month and year views use light school tints.
- [x] Tally is the original table (school column groups, rotated classes, weekly rows, totals).
- [x] New Horizon Elementary 5 and 6 presets, filled by unit and recognised from titles like "NH5".
- [x] Activities refresh from nagasakimark.github.io; pictures keep their shape.
- [x] School editor rebuilt as a full page.
- [x] Settings has an Install app button (with steps for browsers that don't offer one).
- [x] Home: next class, today's classes (no empty periods), this week, classes taught and to-dos; no curriculum.
- [x] Board: the original white look; Textbooks, Activities, Games, Bookmarks and Background open as small windows above the dock.
- [x] Games: words shrink instead of wrapping; flashcards flip back before the next word; every mode tested with long words; real Let's Try and New Horizon covers; games open in a window over the board; no "+ previous units" badges.
- [x] Statiq Office on the sidebar and the dock (opens the installed app when link capturing is on).

## Out of scope unless you ask
Dark mode, repeating weekly timetables, Tauri or desktop builds, and multi-user or shared school accounts.
