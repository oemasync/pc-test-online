# Contributing

## Setup

```bash
git clone https://github.com/oemasync/pc-test-online.git
cd pc-test-online
npm ci
npm run dev
```

Node 24 is recommended (see `.nvmrc`); `engines.node >= 22`.

## Conventions

- TypeScript throughout; run `npm run typecheck` before committing.
- Lint with `npm run lint`, format with `npm run format`.
- Tests live next to code; unit tests use Vitest, E2E uses Playwright.
- Keep everything client-side: no backend, no telemetry, no network calls.
- One change at a time; verify with `npm run check`.

## Adding a new test module

1. Read the module contract in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
2. Create `src/tests/<id>/` following the contract (component, composable, registration).
3. Add the test to the discovery list if required by the architecture.
4. Add unit tests in `src/tests/<id>/`.
5. Add an E2E spec under `e2e/` using the fake media device fixtures.
6. Run `npm run check` and `npm run e2e`.

## Pull requests

- Branch from `main`, keep PRs focused.
- Ensure CI is green.
