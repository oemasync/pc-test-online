# pc-test-online

A browser-based hardware testing suite. Test your PC's webcam, microphone, speakers, keyboard,
mouse, touch, battery, display, gamepad, CPU/GPU and motion sensors directly in the browser —
no installs, no accounts, nothing leaves your machine.

[![CI](https://github.com/oemasync/pc-test-online/actions/workflows/ci.yml/badge.svg)](https://github.com/oemasync/pc-test-online/actions/workflows/ci.yml)

## Features

| Test | What it checks |
| --- | --- |
| Webcam | Camera access, live preview, resolution/frame rate, supported ranges, snapshot capture, device switching, covered/frozen-frame warnings |
| Microphone | Microphone access, live level, clipping/silence detection, noise floor, waveform and spectrum, recording/playback, device switching, audio processing constraints |
| Speakers | Audio output path: left/right/both channels, tone generator, frequency sweep, polarity, output device routing |
| Keyboard | Keyboard input events, simultaneous key presses, event log |
| Mouse | Mouse buttons, double-click interval, wheel directions/deltaMode, polling rate, drag, switch chatter |
| Touch | Multi-touch and pen input, simultaneous points, dead-zone coverage grid, pressure/tilt/size readouts |
| Battery | Battery charge level, charging state, time estimates, drain/charge rate |
| System info | CPU concurrency, device memory, platform/architecture, GPU renderer, screen geometry, storage, network, languages/timezone |
| Display | Dead/stuck pixels, gradient banding, backlight bleed/uniformity, sharpness, refresh rate, frame pacing, HDR/color gamut |
| Gamepad | Gamepad connection, buttons, axes, stick drift, circularity, trigger range, vibration |
| CPU/GPU benchmark | CPU (single/multi-thread), memory bandwidth, GPU fill-rate benchmarks with checksum verification |
| Motion sensors | Device orientation/motion, Generic Sensors, screen orientation, vibration availability |

## Privacy

Everything runs locally in your browser. No data is uploaded, no telemetry is collected, and there
is no backend. Hardware access (camera, microphone, sensors) is requested by the browser and
stays on your device.

## Browser support

- Chromium-based browsers (Chrome, Edge) are fully supported.
- Firefox and Safari support most tests but lack some APIs:
  - **Battery** (Battery Status API) is Chromium-only.
  - **Speaker output device selection** (`setSinkId`) is Chromium-only.
  - **Generic Sensors** (accelerometer, gyroscope, magnetometer, ambient-light-sensor) are Chromium-only.
  - **Gamepad** vibration and some axes vary by browser and OS.
- Camera and microphone require a secure context (HTTPS or `localhost`).

## Quick start

```bash
npm ci
npm run dev
```

Open the printed URL in your browser.

## Scripts

| Script | Description |
| --- | --- |
| `dev` | Start the Vite dev server |
| `build` | Production build to `dist/` |
| `preview` | Preview the production build |
| `lint` | Run ESLint |
| `format` | Run Prettier |
| `typecheck` | Run TypeScript checks |
| `test` | Run unit tests (Vitest) |
| `test:watch` | Run unit tests in watch mode |
| `coverage` | Run unit tests with coverage |
| `e2e` | Run Playwright E2E tests (Chromium, fake media devices) |
| `check` | Run all checks |

## Testing

Unit tests use Vitest. End-to-end tests use Playwright with Chromium and fake media devices so
camera/microphone tests run headlessly in CI.

```bash
npm test
npm run e2e
```

## Docker

```bash
docker build -t pc-test-online .
docker run --rm -p 8080:8080 pc-test-online
```

The container serves the app on port 8080 and exposes `/healthz`.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Coolify and plain Docker deployment.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) — Copyright (c) 2025-2026 oemasync.
