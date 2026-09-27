# ALT Dashboard

Classroom board, lesson planner, curriculum tracker, vocabulary games and live polls for Assistant Language Teachers, as one installable web app (PWA).

- **Live:** https://nagasakimark.github.io/dashboard/
- **Preview (this branch):** https://nagasakimark.github.io/dashboard/next/

## Branches

| Branch | Contents |
|---|---|
| `app` | Source code (this branch) |
| `main` | Built site served by GitHub Pages. `/next/` is published automatically from `app` by `.github/workflows/preview.yml` |

The pre-overhaul site is tagged `legacy-v1`.

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
