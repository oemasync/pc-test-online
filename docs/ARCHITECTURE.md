# pc-test-online architecture

## Overview

Single-package Vue 3 + TypeScript app. Test modules are discovered via a plugin-style registry.

## Core contract

### Types (`src/core/types.ts`)

- `TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'`
- `TestResult { id; status; startedAt?; finishedAt?; durationMs; details: Record<string,string|number|boolean>; note? }`
- `TestModule { id; order; icon; titleKey; descriptionKey; component; isSupported? }`

`component` is `() => Promise<Component | { default: Component }>`.

`icon` is a single emoji (or short text) rendered as-is in the overview grid card.

### Registry (`src/core/registry.ts`)

Discovers modules with `import.meta.glob('../tests/*/index.ts', { eager: true })`. Each module's `index.ts` default-exports a `TestModule`. Adding a module requires no shared-file edits.

Validation: duplicate `id` or an `id` that does not match its directory name throws.

### Locales

Per module `src/tests/<id>/locales/{en,es}.json`, merged under `tests.<id>` by `src/i18n/` via `import.meta.glob`. Shell strings live in `src/i18n/locales/{en,es}.json`.

Convention keys:

- `tests.<id>.title`
- `tests.<id>.description`

### Routes

`/` overview grid, `/test/:id` one test, `/summary` results. Unknown id renders 404. Prev/next follow `order`.

### Results store (`src/core/results.ts`)

Operations: `start`, `pass`, `fail`, `skip`, `reset`, `elapsed`. Persists to `sessionStorage` with try/catch fallback to memory.

Who calls `start`: the test route view calls `start(id)` on mount when status is `pending`, and on Retest.

### Report (`src/core/report.ts`)

`buildReport()` returns app version, timestamp, user agent, results. Export JSON via Blob; print-friendly `/summary` uses `window.print()` with print CSS.

### Shared UI (`src/ui/`)

`TestLayout.vue`, `DeviceSelect.vue`, `PermissionPrompt.vue`, `StatusLight.vue`, `StatTile.vue`.

`TestLayout` props:

- `testId: string`
- `title: string`
- `details?: Record<string, string | number | boolean>` passed to pass/fail/skip.
- `canPass?: boolean` (default true) disables Pass until criteria met.

Action buttons: Pass, Fail, Skip, Retest. Fail reveals a note textarea; confirming calls `fail(id, details, note)`.

### Lib (`src/lib/`)

`media.ts`: `getUserMedia` wrapper mapping to `MediaErrorKind`; `useDevices(kind)`; `useMediaStream()` (stops all tracks on stop and unmount). `audio.ts`: shared `AudioContext` resumed on user gesture.

## Module author guide

### Minimal module

`src/tests/example/index.ts`:

```ts
import type { TestModule } from '@/core/types'

const mod: TestModule = {
  id: 'example',
  order: 50,
  icon: '🧪',
  titleKey: 'tests.example.title',
  descriptionKey: 'tests.example.description',
  component: () => import('./ExampleTest.vue'),
}

export default mod
```

`src/tests/example/ExampleTest.vue`:

```vue
<template>
  <TestLayout
    test-id="example"
    :title="t('tests.example.title')"
    :details="details"
    :can-pass="passed"
  >
    <p>{{ t('tests.example.body') }}</p>
    <template #instructions>{{ t('tests.example.instructions') }}</template>
  </TestLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TestLayout from '@/ui/TestLayout.vue'

const { t } = useI18n()
const count = ref(0)
const passed = computed(() => count.value >= 1)
const details = computed(() => ({ count: count.value }))
</script>
```

`src/tests/example/locales/en.json`:

```json
{
  "title": "Example test",
  "description": "An example module.",
  "body": "Do the thing.",
  "instructions": "Follow the steps."
}
```

`src/tests/example/locales/es.json`:

```json
{
  "title": "Prueba de ejemplo",
  "description": "Un módulo de ejemplo.",
  "body": "Haz la cosa.",
  "instructions": "Sigue los pasos."
}
```

## Device helpers

- `useMediaStream()` / `useDevices(kind)` / `getAudioContext()` / `resumeAudioContext()` / `PermissionPrompt`.

## E2E conventions

- Playwright: Chromium with `--use-fake-device-for-media-stream` and `--use-fake-ui-for-media-stream`.
- webServer: `npm run build && npm run preview` on port 4173.
- Shell guarantees `data-testid`s: `pass-button`, `fail-button`, `skip-button`, `reset-button`, `export-button`, `retest-button`, `fail-confirm-button`, `status-light-<id>` (with `data-status`).
- Reach a module at `/test/<id>`.
- Set `E2E_PORT` env var to run on a non-default port (default 4173).

## Testing helpers

Use `src/test-utils/mount.ts` `mountWithPlugins` to mount components with i18n and router.

## Unsupported modules

An unsupported module is shown greyed with a reason and a one-click Skip. It is never hidden silently.
