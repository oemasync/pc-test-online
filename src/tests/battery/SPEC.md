# Battery module

## What it measures
The Battery Status API exposed by the browser: current charge level, charging
state, and estimated times to full/empty. The module also samples the level over
a short window to estimate the instantaneous drain/charge rate and derive an ETA.

## Browser APIs (MDN names)
- `navigator.getBattery()` -> `Promise<BatteryManager>` (Battery Status API).
- `BatteryManager.charging: boolean`
- `BatteryManager.chargingTime: number` (seconds, `Infinity` if not charging / unknown)
- `BatteryManager.dischargingTime: number` (seconds, `Infinity` if charging / unknown)
- `BatteryManager.level: number` (0.0 .. 1.0)
- Events: `chargingchange`, `chargingtimechange`, `dischargingtimechange`, `levelchange`.

## Browser-support caveats
- Chromium only. Firefox removed the API for privacy; Safari never shipped it.
- `isSupported` is derived from `'getBattery' in navigator`.
- Values can be `Infinity`; handle without crashing.
- `chargingTime`/`dischargingTime` may be `Infinity` or 0; treat as "unknown".

## UX flow
1. On mount, check `isSupported`. If false, show unsupported message (no crash).
2. Call `navigator.getBattery()`, render level/charging/times.
3. Subscribe to `levelchange`/`chargingchange` (and time-change events) to update live.
4. Sample level readings into a rolling window; compute drain/charge rate and ETA.
5. User confirms specs match reality, then Pass or Fail (via TestLayout).

## Pass/Fail
- Pass: readings are plausible and stable; user confirms.
- Fail: API missing, values implausible (e.g. level stuck, NaN), or user reports mismatch.

## `details` keys recorded
- `supported: boolean`
- `levelPercent: number`
- `charging: boolean`
- `chargingTimeSeconds: number`
- `dischargingTimeSeconds: number`
- `ratePerSecond: number` (level fraction per second; signed)
- `etaSeconds: number` (to full if charging, to empty if discharging; -1 if unknown)
- `sampleCount: number`
" content">