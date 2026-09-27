# Legacy dashboard: reconstructed feature spec

Reconstructed on 2026-09-27 from the minified build at `nagasakimark/dashboard@legacy-v1` (the source is lost; the dashboard shipped no sourcemaps). The planner part has real source in `planner-recovered/`.

**Rebuild contract:** the new app must do everything listed here, or do it better. Items marked 🐞 are bugs or gaps to fix. Items marked 💡 are improvements planned in `OVERHAUL_PLAN.md`.

---

## 1. App shell and routing

- Vite + React SPA at base `/dashboard/`, with the Inter font.
- `index.html` and `404.html` are identical. The 404 fallback lets deep paths load the SPA. A `?redirect=` query param is also supported via `history.replaceState`.
- **Routes:** `/dashboard/student` (or `/student`) loads the **Student poll page**. Every other path loads the **Teacher Dashboard**.
  - ⚠️ Student QR codes encode `https://nagasakimark.github.io/dashboard/student?room=12345`. **This path must keep working.**
- The planner was a separate CRA build at `/dashboard/planner/`, opened in a full-screen iframe modal (the "Planner" button).

## 2. Teacher Dashboard (classroom board)

### Layout
- A full-screen background (see §2.5), with widgets freely placed on top.
- **Top left:** a settings (cog) button and a clock (HH:MM, updated every 30 s).
- **Top right:** a workspace switcher (◀ name, index/total, + add ▶).
- **Bottom dock**, which springs in:
  - the first 6 widgets as quick-add buttons (Timer, Stopwatch, Clock, Random Name, Group Maker, Scoreboard)
  - **More Widgets**, which opens the categorised Add Widget dialog
  - panel toggles: **Textbooks**, **Activities**, **Games**, **Planner**, **Bookmarks**, **Background**
- **Focus mode:** clicking a widget's focus button enlarges it over a dimmed overlay. Clicking the overlay exits. Widgets get `isFocused` and scale their content up.

### Workspaces (IndexedDB `livepoll` → `workspaces`)
- Record: `{ id: 'workspace-<ts>', name, widgets: Widget[], bgIndex }`. The default is `workspace-1` / "Workspace 1".
- Widget: `{ id: '<type-slug>-<ts>', type, x, y, width, height, z, locked }`. Sanitised on load: unknown types are dropped, and sizes are clamped to at least the widget's minimum.
- Autosaves 400 ms after changes. The active workspace id is stored in `settings.activeWorkspace`.
- Actions: add, switch, previous/next (wraps around), rename, delete (never the last one), clear, apply template.
- New widgets cascade: x = 60 + (n·45 mod 400), y = 40 + (n·45 mod 260). Drawing always opens full-screen at 0,0.
- 🐞 **Widget settings are not saved.** All widget configuration (timer length, team names, spinner segments, checklist items and so on) is React state only and is lost on reload or workspace switch. 💡 Store per-widget `config` in the workspace record.

### Widget frame
- Drag (react-draggable), resize, bring to front on click, lock, close, focus, and a settings toggle (gear), which swaps the widget body for its settings view.
- Registry flags: `w,h` (design size), `minW,minH`, `preserveAspectRatio` (default true), `scaleContent` (default true: the body is scaled to fit), `transparentWindow` (Drawing only), and `category`.
- Widgets can call `requestResize({width,height})` (Scoreboard grows as teams are added).

### 2.1 Widget catalogue

| Widget | Category | Default / min size | Behaviour | Settings |
|---|---|---|---|---|
| **Timer** | time | 212×220 | Countdown ring (SVG); Start/Pause, Reset. At 0 shows "TIME'S UP" with a red tint | Presets 1/3/5/10/15/30 m; custom 1–180 min; 6 ring colours; "Play alarm when done" (default on). 🐞 The alarm flag has no visible sound implementation |
| **Stopwatch** | time | 212×220 | Start/Pause, Lap (while running), Reset; lap list newest first | Show milliseconds (default on) |
| **Clock** | time | 288×156 (min 240×156), no scaling | Digital (large, AM/PM suffix) or analog | Analog; 24-hour; show seconds (default on); show date (default on) |
| **Random Name** | students | 248×264 | Rolls names for ~1.5 s (18 × 80 ms) then picks one; history of the last 20 | Use a saved Class or manual names (one per line); "Remove name after picked" + reset |
| **Group Maker** | students | 288×352 | Shuffle into N groups (round-robin), coloured cards, Reshuffle | Class or manual list; 2–10 groups; naming: numbered / colours / animals |
| **Scoreboard** | students | 236×190, no scaling | Teams with ± buttons, optional proportional score bars; auto-grows height | 2–8 teams (name + colour); increment 1/5/10/25/100; show bars; reset all |
| **Poll** | interact | 340×440 | Live Firebase poll (see §3) | Room code, copy, QR, new room code |
| **Dice** | fun | 212×220 | 1–6 dice; rolling animation; total shown when there's more than one die; d6 drawn with pips, others as numbers | Dice count 1–6; sides 4/6/8/10/12/20 |
| **Spinner** | fun | 360×460 (min 320×400), no scaling | Colour wheel, 4 s eased spin; labels shown when ≤ 8 segments, numbers when > 8 | Class or custom segments (2–12); "Remove selected option after spin" + reset |
| **Text** | display | 280×180 | Announcement text: edit ⇄ display mode | Font size 16–120; text and background colour; bold; align left/centre/right |
| **Checklist** | display | 300×360 (min 280×320), no scaling | Title, progress bar, x/y completed, click to toggle; `[label](url)` lines become links | Title; items (one per line) |
| **Upcoming Lessons** | display | 360×320 (min 300×280), no scaling | Reads planner DB `alt-planner-db` v8 (assignments, schedule, schools, lessonPlans); shows the next N items with date · period, title, class badge in school colour, school name; refresh; click → planner | Items to show 3–8 (default 5); show lesson summary (default on); include special events. 🐞 Period times are hard-coded as 08:00 + (period−1)·50 min instead of using school timetables |
| **Traffic Light** | display | 180×260 (min 156×220), no scaling | Click a light to activate or deactivate it | Show labels; label text for red/yellow/green |
| **Sound Level** | tools | 220×236, no scaling | Microphone FFT average → 0–100% bar with threshold line, or emoji mode (🟢🟡🔴); Start/Stop listening | Sensitivity 0.5–3×; threshold 30–90% (default 70); style bar/emoji; reset peak |
| **Drawing** | tools | full-screen overlay, transparent | react-sketch-canvas with a floating toolbar: pen colours, brush sizes, eraser, white-canvas toggle, undo/redo, clear, download PNG | — 🐞 The eraser draws white strokes, so it paints white over the transparent overlay instead of erasing |
| **QR Code** | tools | 228×260 | QR for any URL; copy button | URL; size 100–300; colour |

### 2.2 Classes (rosters), stored in `livepoll.settings.classes`
- `{ id: 'class-<ts>', name, type: 'names' | 'number', students: string[], count }`. A "number" class yields students "1"…"N" (N between 1 and 200).
- Used by Random Name, Group Maker and Spinner. The last chosen class is remembered in `settings.lastChosenStudentClassId`.

### 2.3 Templates (`livepoll` → `templates`)
- `{ id: 'tmpl-<ts>', name, workspaceName, widgets, bgIndex, createdAt }`. Save from a workspace, apply to a workspace, delete.
- **Export JSON** for a workspace: `{ version: 2, name, widgets, bgIndex, exportedAt }` → `<name>-template.json`. **Import JSON** accepts any object with a `widgets` array.

### 2.4 Settings panel (tabs)
- **Workspaces:** active workspace, switch, rename, delete, save template, use template here, saved templates library, export/import JSON, clear, "Export Active Workspace".
- **Classes:** add a class by names (one per line) or by number of students; edit or remove.
- **General:** "Display & Planner": rotate background daily; open planner; workspace cleanup.

### 2.5 Backgrounds
- 4 gradients (indigo→purple, light grey, lavender→pink, slate dark) plus 24 wallpaper photos, each with a thumbnail. Missing thumbnails are generated at 160×90 on idle.
- **Rotate Daily** (default on): wallpaper index = day-of-year mod number of images. Choosing a background manually turns rotation off. Stored in `settings.rotateDailyBackground`, and `bgIndex` is stored per workspace.

## 3. Live polls (Firebase Realtime Database)

- **Project:** `studentpoll-a9e39`, RTDB `asia-southeast1`. No authentication is used, so rules must be open or path-based. 💡 Audit the rules in Phase 9.
- **Data layout:**
  - `rooms/{code}/meta`: `{ sessionId, code, isActiveSession, lastSeenAt }`, with a heartbeat every 30 s
  - `rooms/{code}/currentPoll`: `{ id, question, type, answers[], allowCustom, allowMultiple, maxStars, status: idle|active|ended, startedAt }`
  - `rooms/{code}/votes/{pollId}/{pushId}`: single `{type,value}`, multiple `{type,values[],customValue}`, rank `{type,ranking[]}`, rating `{type,value}`, wordcloud `{type,value}`; each also has `createdAt`
  - `rooms/{code}/archive/{pollId}`: `{ poll, votes, voteCount, endedAt, archivedAt }`
  - `roomCodeHistory/{code}`: codes are never reused
- **Room codes:** 5 digits (10000–99999). A code is unique if it has never been used; up to 40 attempts. The code stays the same for the browser session (`sessionStorage.pollSessionRoomCode` / `pollSessionId`), and "Generate New Room Code" replaces it.
- **Teacher flow:** build (question; type single/multiple/rank/rating/wordcloud; 2+ options for choice types; max stars 5–10; "Allow re-voting") → Start → live view (vote count; End → archived; New → idle) → optional QR (large, "Scan to join") → archive browser → CSV export (summary plus raw responses).
- **Result views:** bar, pie (donut with total in the centre), word cloud, rating distribution, average ranking. The view options available depend on the poll type.
- **Student page:** enter a 5-digit code (or `?room=`) → checks the room exists and `isActiveSession` → waits for a poll → votes (select, multi-select + custom, drag to reorder, stars, free text) → "Vote Submitted!". With re-voting on, the form resets after 1.5 s. The student view updates when a new poll starts.
- Text is stripped of HTML before sending.

## 4. Games (Games panel → Elementary tab)

- **8 modes:**
  - Flashcards: flip through vocabulary cards
  - Quiz: 4-choice image-to-word
  - Corner Pop: pick the matching picture from the four corners
  - Picture Reveal: uncover the hidden image tile by tile
  - Missing: remember which cards disappeared (random or chosen cards, N on screen, hide K)
  - Word Scramble: unscramble the letters
  - Spelling: reveal letters one by one
  - Memory Match: match image–word pairs (choose pairs, count moves)
- Common UI: streak / best / rounds counters, "Try again!", "Need at least four cards".
- **Vocab card:** `{ english, japanese: { kanji, furigana }, image }`, with images at `assets/images/categories/<Category>/<Word>.jpg`.
- **58 categories:** Annual Events, Daily Life, Days of the Week, Location Words, Present Tense (+5th/6th grade), Problems with Living Things, Stationery, Thoughts & Appearances, Actions (+5th/6th), Activities, Adjectives, Animals, Body, Bugs, Clothes, Club Activities, Colors, Daily Activities, Dates, Descriptors, Dessert, Directions, Drinks, Family, Feelings, Food, For the Environment, Frequency, Fruits and Vegetables, Holidays, Ingredients, Instruments, Jobs, Meals, Months, Nature, Numbers, Past Tense, People, Personalities, Positions, School, School Events, Sea Animals, Seasons, Shapes, Sports, Subjects, Tastes, Things, Town, Weather, Weekdays, World.
- Games can also use JHS textbook vocabulary ("Choose a Textbook", optionally "With previous units").
- Detailed per-mode rules are re-derived from the bundle (`GameModal-*.js`) in Phase 10.

## 5. JHS Classroom Mode (Games panel → JHS tab → JHSModal)

- **Data** (`jhsData-*.js`): New Horizon 1, 2 and 3, each with `{ curriculum_title, cover image, ancillary_sections[], units[] }`.
  - Units have `sections[]` / `parts[]` with `section_name`, `page`, `new_words[{english_word, japanese_translation…}]` and `key_sentences[{ks_number, english_key_sentence, japanese_grammar_description, english_explanation, example_1, example_2, explanation (markdown), exercises[]}]`.
  - It also contains a flat section list `{ "Page Number", "Section Name", "Topic (Grammar)" }` (125 entries). This is the same format the planner's "Import JSON" accepts. 💡 Use it to cross-check the Altopedia section data (Phase 5).
- **Exercises:** `cloze` (fill the blank), `reorder` (word tiles), `choice` (options); each has an answer and a hint. Teacher reveal shows the model answer, and there's a Check Answer button.
- **UI:** choose a textbook → exercise sets grid or grammar library (grammar points, topics) → run a set with Previous/Next, hints, Japanese/teacher notes, and examples.

## 6. Panels

- **Textbooks** (`livepoll.textbooks`): `{ id: 'tb-<ts>', title, url, thumbnail (dataURL ≤ 2 MB) }`; add, remove, open in a new tab. 💡 Merge with the planner's textbooks.
- **Bookmarks** (`localStorage.customBookmarks`): `{ name, url, image? }[]`; add, remove.
- **Activities** (hard-coded links to `https://nagasakimark.github.io` + path, each with an image):
  Tescodle `/tescodle`, World Heritage Guesser `/worldheritageguesser`, Tomachi Store `/tomachistore`, Digital English Board `/digitalenglishboard`, Splatoon `/splatoon`, Classroom Polls `/poll`, Cash Register 2 `/cashregister2`, Trick or Treat `/trickortreat`, Magic Soup `/witchsoup`, Hamanomachi 2 `/hamanomachi2`, Hamanomachi 2 Audio `/hamanomachi2audio`, Champon Maker 2 `/champon2`, Worksheet Generator `/worksheetgenerator`, How do you spell…? `/howdoyouspell`, Wordle `/wordle`, Japan Guesser `/japanguesser`, Globe Guesser `/globeguesser`, Shape Runner `/shaperunner/`, ALT Planner `/ALTPlanner/`, Cash Register `/cashregister/`, Sorting Hat `/sortinghat/`, Champon `/champon`, Hamanomachi `/hamanomachi`.

## 7. Local storage summary (for migration)

| Store | Where | Contents |
|---|---|---|
| `livepoll` v1 (IndexedDB) | `workspaces` (keyPath `id`) | workspaces + widgets |
| | `settings` (keyPath `key`) | `activeWorkspace`, `classes`, `rotateDailyBackground`, `lastChosenStudentClassId` |
| | `templates` (keyPath `id`) | workspace templates |
| | `textbooks` (keyPath `id`) | textbook links |
| `alt-planner-db` v8 (IndexedDB) | 9 stores | planner data (see `planner-recovered/services/indexedDB.js`) |
| `localStorage` | `customBookmarks` | bookmarks |
| `sessionStorage` | `pollSessionRoomCode`, `pollSessionId` | current poll room |
