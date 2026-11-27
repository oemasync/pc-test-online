# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.0] - 2026-11-27

### Added
- Rebuilt as a single-package Vue 3.5 + TypeScript + Vite application at the repository root.
- Twelve test modules: webcam, microphone, speakers, keyboard, mouse, touch, battery, system
  info, display (dead pixels / refresh rate), gamepad, CPU/GPU benchmark, motion sensors.
- Unit tests (Vitest) and Playwright E2E tests with fake media devices.
- Docker image (multi-stage) served by nginx on port 8080 with `/healthz`.
- CI: quality and E2E jobs, CodeQL, dependency review.
- MIT license.

### Changed
- All hardware testing now runs entirely in the browser; nothing leaves the user's device.

### Removed
- The Node.js/Express backend and the separate `frontend/` package.
- Telemetry and server-side test result storage.
- Legacy Cypress E2E setup.

## [1.0.0]

### Added
- Original MMIT computer testing suite.
