---
name: pc-test-online
description: "Browser app for testing PC hardware"
stack: [node, vue, typescript, vite]
ports:
  port_1: 5173
deps: [node, npm]
---

# pc-test-online

Browser app for testing PC hardware. Fully static, client-side only.

## Commands

```bash
npm ci
npm run dev          # Vite dev server
npm run build        # production build -> dist/
npm run preview      # preview production build
npm run lint
npm run format
npm run typecheck
npm test             # Vitest
npm run test:watch
npm run coverage
npm run e2e          # Playwright (Chromium, fake media devices)
npm run check        # all checks
```

Node: `.nvmrc` = 24, `engines.node >= 22`.

## Layout

```
src/                # Vue 3.5 + TS app
src/tests/<id>/     # test modules, auto-discovered
e2e/                # Playwright specs
dist/               # build output
docs/ARCHITECTURE.md  # module contract (foundation-owned)
```

## Contract

Test modules live in `src/tests/<id>/` and are auto-discovered. See `docs/ARCHITECTURE.md`
for the exact contract. Do not edit architecture docs from the platform lane.

## Conventions

- Everything stays in the browser: no backend, no telemetry, no network calls.
- Privacy: never add outbound requests or analytics.
- Security headers and CSP are defined in `nginx/default.conf`; keep them in sync with app needs.
- Commit as `oemasync <21226554+oemasync@users.noreply.github.com>`.
