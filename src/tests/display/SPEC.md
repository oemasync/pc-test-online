# Display Test Module

## Purpose

The `display` module checks whether a monitor/panel is suitable for PC use. It covers
dead or stuck pixels, backlight bleed and uniformity, gradient banding, fine-pattern
sharpness and scaling, refresh rate and frame pacing, and HDR/color-gamut capability.

## Browser APIs

All names below are the standard MDN-documented APIs. No vendor-prefixed variants are used.

- Fullscreen API:
  - `Element.requestFullscreen()`
  - `Document.exitFullscreen()`
  - `Document.fullscreenElement`
  - `fullscreenchange` and `fullscreenerror` events
  - `Escape` exits fullscreen by user-agent behavior
- Animation frame timing:
  - `window.requestAnimationFrame(callback)`
  - `DOMHighResTimeStamp` callback argument
  - `performance.now()`
- Capability media queries:
  - `window.matchMedia('(dynamic-range: high)')`
  - `window.matchMedia('(color-gamut: p3)')`
  - `window.matchMedia('(color-gamut: rec2020)')`
  - `MediaQueryList.matches`
  - `MediaQueryList.addEventListener('change', listener)`
- Device scaling:
  - `window.devicePixelRatio`

## Browser-support caveats

- Fullscreen must be requested from a user gesture. It can be rejected by the browser
  or unavailable in embedded/locked-down contexts.
- Mobile browsers, especially iOS Safari, have limited or no fullscreen support for
  arbitrary elements.
- `requestAnimationFrame` is throttled or paused in background tabs, so refresh-rate
  measurement is only meaningful while the page is visible.
- rAF can also be throttled by battery saver, background-tab policy, or iframe
  containment. The measured rate is therefore a floor: keep the tab focused and on
  the display under test, and treat a lower-than-expected result as "at least this
  rate" rather than a failure.
- `dynamic-range` and `color-gamut` media queries report capability, not whether HDR
  content is actually being displayed.
- `devicePixelRatio` can be fractional and can change when moving between displays.
- The module must degrade gracefully and never crash when an API is unavailable.

## UX flow

1. The module page explains each sub-test and offers a start action.
2. Dead/stuck pixel test:
   - User starts fullscreen color cycling.
   - The selected container calls `requestFullscreen()`.
   - Solid colors cycle through black, white, red, green, blue, gray.
   - `ArrowRight`, `Space`, or click advances; `ArrowLeft` goes back; `Escape` exits.
   - The user inspects the panel and marks any visible defect.
3. Gradient banding test displays smooth gradients for visual inspection.
4. Backlight-bleed/uniformity test displays a black screen in fullscreen.
5. Sharpness test displays 1px checkerboard and line patterns scaled to
   `devicePixelRatio`.
6. Refresh-rate test collects `requestAnimationFrame` intervals, removes outliers,
   reports median interval, estimated Hz, and nearest standard rate.
7. Frame-pacing test reports jitter statistics for the collected intervals.
8. Capability test reports dynamic range, color gamut, and likely HDR support.
9. The user marks defects found; those values are recorded in `details`.

## Pass/Fail meaning

- Pass: no visible defects were marked and required browser capabilities were read.
- Fail: one or more defects were marked, or a required test could not be performed.
- Skip: user chose not to run the module.

## Recorded `details` keys

- `colorsTested`: number
- `defectsFound`: number
- `defectColors`: comma-separated string of colors with marked defects
- `refreshRateHz`: number
- `nearestStandardRefreshRateHz`: number
- `frameSampleCount`: number
- `rejectedFrameCount`: number
- `medianFrameIntervalMs`: number
- `jitterMs`: number
- `minFrameIntervalMs`: number
- `maxFrameIntervalMs`: number
- `dynamicRange`: `"standard"` or `"high"`
- `colorGamut`: `"srgb"`, `"p3"`, or `"rec2020"`
- `devicePixelRatio`: number
- `fullscreenSupported`: boolean
- `gradientBandingObserved`: boolean
- `backlightBleedObserved`: boolean
- `sharpnessDefectObserved`: boolean

## Pure logic exports

- `DISPLAY_COLORS`: readonly color sequence.
- `createColorSequenceState(index)`: creates color state.
- `nextColorIndex(current)`, `previousColorIndex(current)`: wrap-around index math.
- `selectColorIndex(index)`: clamped direct selection.
- `advanceColorSequence(state, event)`: color sequence state machine.
- `frameIntervalsFromTimestamps(timestamps)`: rAF timestamp to interval conversion.
- `removeOutlierIntervals(intervals)`: outlier rejection.
- `estimateRefreshRate(intervals)`: median interval, Hz, and nearest standard rate.
- `nearestStandardRate(hz)`: nearest value in 48/50/60/75/85/90/100/120/144/165/240/360.
- `jitterStats(intervals)`: frame-pacing statistics.
- `displayCapabilityFromMediaQueries(snapshot)`: HDR/gamut classification.
- `normalizeDevicePixelRatio(value)`: device-pixel-ratio helper.
- `buildDisplayDetails(input)`: converts module inputs into `details`.
