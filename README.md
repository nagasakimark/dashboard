# ALT Dashboard

Classroom board, lesson planner, curriculum tracker, vocabulary games and live polls for Assistant Language Teachers, as one installable web app (PWA).

- **Live:** https://nagasakimark.github.io/dashboard/
- **Preview (this branch):** https://nagasakimark.github.io/dashboard/next/

## Using it

The app has a short guide built in (**Help** in the menu). In brief:

- **Start:** your data stays in the browser and works offline. Home offers a one-click import from the old dashboard and ALT Planner on the same site; **Settings → Your data** imports and exports files, with automatic backups and undo.
- **Planner:** schools with real timetables, a week/month/year schedule (drag to move, Ctrl/Alt-drag to copy, undo everywhere), lesson plans that print, textbooks with New Horizon presets, per-class curriculum progress, class history and a PDF report.
- **Classroom board:** workspaces of 16 widgets (timers, name picker, groups, scores, dice, spinner, text, checklist, traffic light, upcoming lessons, noise meter, drawing, QR code and live polls). Widget settings are remembered. Press **?** on the board for shortcuts, **H** for projector mode.
- **Live polls:** add the Poll widget; students scan its QR code (old QR codes still work).
- **Games:** eight vocabulary games on 180+ word sets and your own sets, plus **JHS Classroom Mode** for New Horizon 1–3.
- **Sync (optional):** sign in with Google in Settings to keep devices in step. One-time Firebase console steps are in [`docs/firebase/SETUP.md`](docs/firebase/SETUP.md).

## Branches

| Branch | Contents                                                                                                             |
| ------ | -------------------------------------------------------------------------------------------------------------------- |
| `app`  | Source code (this branch)                                                                                            |
| `main` | Built site served by GitHub Pages. `/next/` is published automatically from `app` by `.github/workflows/preview.yml` |

The pre-overhaul site is tagged `legacy-v1`.

### Launching and rolling back

`/dashboard/` is switched by hand with the **Launch (switch /dashboard/)** workflow (Actions → Launch → Run workflow):

- **launch** runs every check, then publishes the new app at `/dashboard/` and keeps the old dashboard at `/dashboard/legacy/` (the old planner stays at `/dashboard/planner/`, the preview at `/dashboard/next/`). Run it again to publish later versions.
- **rollback** puts the old dashboard back at `/dashboard/` and replaces the new app's service worker with one that removes itself, so browsers stop showing the cached new app.

Type the action again in the _confirm_ box; anything else changes nothing.

## Development

Requires Node 24+.

```bash
npm install
npm run dev          # http://localhost:5173/dashboard/
npm test             # unit tests (Vitest)
npm run e2e          # end-to-end tests (Playwright; desktop, tablet and phone)
npm run lint && npm run typecheck
npm run build        # production build in dist/
```

In Claude Code cloud sessions, run the e2e tests with `PW_CHROMIUM=/opt/pw-browsers/chromium npm run e2e` instead of installing a browser.

## Stack

Vite, React 19, TypeScript, Tailwind CSS v4, React Router (hash routing), Dexie (IndexedDB), zod, vite-plugin-pwa (Workbox), Vitest and Playwright.

## Layout

```
src/
  app/            shell, routing, PWA prompts
  components/ui/  design-system components (Button, Dialog, Tabs, Menu…)
  components/layout/
  features/       one folder per area (board, schedule, lessons, curriculum…)
  lib/            small shared helpers
  styles/         Tailwind entry and design tokens
e2e/              Playwright tests
```
