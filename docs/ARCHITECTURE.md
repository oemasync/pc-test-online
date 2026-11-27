# Architecture

## Overview
Single-package Vue 3 + TypeScript app. Test modules are discovered via a plugin-style registry.

## Core contract

### Types (`src/core/types.ts`)
- `TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'`
- `TestResult { id; status; startedAt?; finishedAt?; durationMs; details; note? }`
- `TestModule { id; order; icon; titleKey; descriptionKey; component; isSupported? }`

### Registry (`src/core/registry.ts`)
Discovers modules with `import.meta.glob('../tests/*/index.ts', { eager: true })`. Each module's `index.ts` default-exports a `TestModule`. Adding a module requires no shared-file edits.

### Locales
Per module `src/tests/<id>/locales/{en,es}.json`, merged under `tests.<id>` by `src/i18n/` via `import.meta.glob`. Shell strings live in `src/i18n/locales/{en,es}.json`.

### Routes
`/` overview grid, `/test/:id` one test, `/summary` results. Unknown id renders 404. Prev/next follow `order`.

### Results store (`src/core/results.ts`)
Operations: `start`, `pass`, `fail`, `skip`, `reset`, `elapsed`. Persists to `sessionStorage` with try/catch fallback to memory.

### Report (`src/core/report.ts`)
`buildReport()` returns app version, timestamp, user agent, results. Export JSON via Blob; print-friendly `/summary` uses `window.print()` with print CSS.

### Shared UI (`src/ui/`)
`TestLayout.vue`, `DeviceSelect.vue`, `PermissionPrompt.vue`, `StatusLight.vue`, `StatTile.vue`.

### Lib (`src/lib/`)
`media.ts`: `getUserMedia` wrapper mapping DOMException to `MediaErrorKind`; `useDevices(kind)`; `useMediaStream()`. `audio.ts`: shared AudioContext resumed on user gesture.
