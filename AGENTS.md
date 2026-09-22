# AGENTS.md — rubiks-cube

Pure SPA + SEO-oriented online Rubik's Cube game. Vue 3 + Pinia + TS + Vue Router + Transition. Mobile + Desktop + i18n. HITMAN-trilogy-style UI.

## Commands

- `npm run dev` — dev server
- `npx vite build` — verification build (use this, NOT `npm run build`)
- `npm run preview` — preview dist
- No test / lint / formatter configured. Do not add without asking.
- Known issue: `vue-tsc -b` fails with `TS7016` on `.vue` imports under TypeScript 6 (vue-tsc 3.3.11 is latest; decision: keep TS6). Do not try to fix; do not add `*.vue` shims.

## Browser testing (playwright MCP only)

- Real-browser verification ONLY via the `playwright` MCP. Do NOT use `playwright-cli`. Never guess at rendering — navigate and snapshot.
- Flow: `npx vite build`, serve `dist` node-direct (never via `npx.cmd`), `browser_navigate` to `http://127.0.0.1:<port>/...`, `browser_snapshot` for structure / `browser_click` + console-error check for interactions, then kill by PID plus a port-free proof.
- Prefer snapshot refs over screenshots; `browser_evaluate` for page state (timer, store) when snapshots cannot show it.

## Shell discipline (vite never terminates)

- `vite` / `vite dev` / `vite preview` (and npm scripts wrapping them) never exit on their own. NEVER run them in the foreground, NEVER pipe/collect inline, NEVER `&&`-chain after them. Detached launch only, with stdout/stderr redirected to files.
- Serve node-direct: `node ./node_modules/vite/bin/vite.js preview --port <virgin-port> --strictPort`. Never via `npx.cmd`.
- Every shell call gets an explicit timeout (≤120s). Probe the port with a bounded `TcpClient` check before launch; never stack a second server on a taken port; never touch foreign PIDs/ports. End every run with a hard kill by PID plus a port-free proof. A hang is a failure — no retry loops.

## State

- Stack: `pinia`, `vue-router` (v5 API), `vue-i18n` (v11), `three`, `@sandlada/breakpoint`, `@sandlada/material-design-css`, `tailwindcss@4` + `@tailwindcss/vite`.
- Structure: `src/router/` (`/`, `/game`, `/archive` + SEO guard), `src/i18n/locales/{en,zh-CN}.json`, `src/stores/game.ts` (cube logic/timer/autosave) + `src/stores/archive.ts` (localStorage saves) + `src/stores/theme.ts`, `src/three/cubeScene.ts` (dumb renderer), `src/components/CubeCanvas.vue` + `GameControls.vue` + `PauseOverlay.vue` + `SolvedOverlay.vue` + `LanguageSwitcher.vue` + `ThemeToggle.vue`, `src/pages/MenuPage.vue` + `GamePage.vue` + `ArchivePage.vue`.
- Sticker contract (both sides must match): faces `['U','D','F','B','L','R']`, colors 0..5 (white/yellow/green/blue/orange/red), row-major from outside; moves `UDLRFB` + `''`/`'`/`2` (clockwise from outside). View is fixed default (F+U visible) + hold-to-peek momentary offsets (pure `viewGroup`, never touches stickers); logical reorient is `store.setFrontFace()` (permutes stickers, records nothing) + `reset()` back to identity; F always equals the face in front of the viewer.
- Canvas↔store flow is one-way only: buttons/drag → `canvas.playMove()` → `move` emit → `store.applyMove()`; rebuilds only via explicit `reset()`. Never commit twice, never watch stickers into rebuilds.
- Theming: light default; class-based `dark:` variant (`@custom-variant` in `style.css`, `.dark` on `<html>` via `src/stores/theme.ts`, persisted `rubiks.theme.v1`). Base classes = light, `dark:` = dark look; red accent identical in both.

## TypeScript strictness (`tsconfig.app.json`)

`noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch` are on. No `enum`/namespaces/parameter properties; unused vars fail `npm run build`.

## Conventions (mandatory)

- `<script setup lang="ts">` only. No Options API.
- Path alias `@components/*` → `src/components/*` (wired in `vite.config.ts` + `tsconfig.app.json`); always import components via alias, never relative paths.
- Store/composable API naming: `find/insert/remove/update` + `one/many` + `by` + condition — e.g. `findOneById`, `findManyByStatus`, `insertMany`, `removeOneById`. Apply to Pinia stores and game-state helpers.
- Tailwind v4 (CSS-first, `@import "tailwindcss"`; no `tailwind.config.js`) + `@sandlada/material-design-css`. Use default breakpoints from `@sandlada/breakpoint` — do not define custom ones.
- three.js cube scene isolated in one component/service (`components/CubeCanvas*` or `three/*`); game logic (scramble, timer, save) in Pinia stores, never inside render loop.

## Architecture (implemented)

- `src/router/` + page-level `<Transition>`; each route sets SEO meta (title/description/lang + OG).
- i18n keys for all UI strings; no hardcoded user-facing text.
- Game HUD: fullscreen canvas + overlay HUD (timer, pause, scramble progress, save/resume). Main menu uses standard layout, not HUD.
- Game features: 2×2/3×3/4×4, scramble difficulty select, timer + pause + autosave, save/resume from archive, button + drag controls.
- Visual reference: HITMAN reboot-trilogy UI (minimal, high-contrast, thin type, corner-anchored HUD).
