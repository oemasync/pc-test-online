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
- Chromium only. Firefox removed the API; Safari never shipped it.
- Support is derived from `'getBattery' in navigator`.
- `chargingTime`/`dischargingTime` can be `Infinity` (unknown) or `0` (e.g. at 100% while charging); display `Infinity` as unknown.
- Level is quantized to 1% steps, so a single step cannot yield a meaningful rate; require >= 2 distinct level values in the sampling window.

## UX flow
1. On mount, check support. If false, show unsupported message (no crash).
2. Call `navigator.getBattery()`, render level/charging/times.
3. Subscribe to events to update live.
4. Sample level readings into a rolling window; compute drain/charge rate (least-squares slope) and ETA. Return null rate until the window spans >= 2 distinct levels.
5. User confirms specs match reality, then Pass (`complete`) or Fail (via TestLayout).

## Pass/Fail
- Pass: readings plausible and stable; user confirms (produces `complete`).
- Fail: API missing, values implausible (stuck level), or user reports mismatch.

## `details` keys recorded
- `supported: boolean`
- `levelPercent: number`
- `charging: boolean`
- `chargingTimeSeconds: number` (Infinity allowed)
- `dischargingTimeSeconds: number` (Infinity allowed)
- `ratePerSecond: number | null`
- `etaSeconds: number | null`
- `sampleCount: number`

## Logic notes
- `durationParts(seconds)` returns `{ hours, minutes, seconds } | null`; the UI localizes the labels.
- `reduceBatteryPhase` is exhaustive; unknown events throw.
