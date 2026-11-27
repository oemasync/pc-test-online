# Mouse Test Module

## What it measures
Mouse input: buttons (left, middle, right, back, forward), double-click interval, wheel directions (up/down/left/right) and deltaMode, pointer polling rate, drag, and switch chatter (double-trigger from one physical click).

## Browser APIs (MDN-accurate)
- `MouseEvent.button` (0 left, 1 middle, 2 right, 3 back, 4 forward)
- `MouseEvent.buttons`, `MouseEvent.movementX/Y`
- `WheelEvent.deltaX`, `.deltaY`, `.deltaMode` (0 pixel, 1 line, 2 page)
- `PointerEvent` with `getCoalescedEvents()` for high-resolution pointermove samples
- `pointermove`, `pointerdown`, `pointerup`, `dblclick`, `dragstart`/`drag`/`dragend`
- `contextmenu` event (suppressed in test area)
- Navigation suppression for back/forward buttons (buttons 3/4) via `preventDefault` on `mousedown`/`auxclick`

## Browser support caveats
- Back/forward buttons (3/4) are not present on all mice; module reports not-tested and allows Skip.
- `getCoalescedEvents()` is Chromium-oriented; other browsers fall back to one sample per event, lowering the estimate.
- Wheel `deltaMode` varies by browser/OS; readout shows raw mode.
- Polling-rate estimate requires sustained movement; idle mice report nothing.
- Chatter detection threshold is heuristic (default 50 ms).

## UX flow
1. On mount, attach listeners inside the test area only.
2. Buttons 0-4: press to mark tested; visual pressed state.
3. Double-click area: record interval between two clicks.
4. Wheel area: classify up/down/left/right; show deltaMode.
5. Polling area: move mouse; show median Hz and nearest standard rate.
6. Drag area: drag to complete.
7. Chatter: detect two mousedowns within threshold; show count.
8. Pass/Fail/Skip via TestLayout.

## Pass/Fail meaning
- Pass: all five buttons tested (or skipped individually) plus wheel and drag completed; no chatter detected (or acknowledged).
- Fail: chatter detected or required interaction missing.
- Skip: unsupported or user choice.

## details keys recorded
- `buttonsTested` (number)
- `allButtonsTested` (boolean)
- `doubleClickIntervalMs` (number)
- `wheelDirectionsTested` (number)
- `wheelDeltaMode` (number)
- `pollingRateHz` (number)
- `nearestPollingRateHz` (number)
- `dragCompleted` (boolean)
- `dragDistancePx` (number)
- `chatterDetected` (boolean)
- `chatterCount` (number)
