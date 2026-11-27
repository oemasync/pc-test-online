# Touch Test Module

## What it measures
Multi-touch and pen input capability of the browser/device. It captures simultaneous touch points, dead zones across the screen via a coverage grid, and pressure/tilt/size readouts when the hardware reports them.

## Browser APIs (MDN-accurate)
- `PointerEvent` with `pointerType === 'touch'` and `pointerType === 'pen'`
- `PointerEvent.pointerId`, `.clientX`, `.clientY`, `.pressure`, `.tiltX`, `.tiltY`, `.width`, `.height`
- `navigator.maxTouchPoints`
- Pointer Events: `pointerdown`, `pointermove`, `pointerup`, `pointercancel`
- `setPointerCapture` (optional, for tracking outside target)

## Browser support caveats
- `maxTouchPoints` is 0 on most desktops without touch screens; module reports unsupported and offers Skip.
- Pressure/tilt/width/height are only populated by hardware that reports them; absent values are shown as "not reported".
- Pen support depends on stylus hardware; `pointerType 'pen'` may never fire on touch-only devices.
- Safari historically limited Pointer Events support; touch events fallback not implemented in this module (Pointer Events only).

## UX flow
1. On mount, check `isSupported = navigator.maxTouchPoints > 0`.
2. If unsupported, show graceful message and Skip button.
3. If supported, show live pointer points, max simultaneous count vs maxTouchPoints, coverage grid, and readouts.
4. User swipes over whole screen; covered cells fill; uncovered cells reveal dead zones.
5. Points are stored as fractions (0..1) of the test surface so resize/orientation change mid-test does not corrupt the grid.
6. Interpolation is per pointer: a path never connects points from two different fingers.
7. User can Pass/Fail/Skip via TestLayout.

## Pass/Fail meaning
- Pass: coverage threshold met (all or most cells) and no dead zones reported; max simultaneous reached expected.
- Fail: dead zones detected or max simultaneous below 1.
- Skip: user or unsupported device.

## details keys recorded
- `maxTouchPoints` (number)
- `maxSimultaneous` (number)
- `coveredCells` (number)
- `totalCells` (number)
- `coverageRatio` (number)
- `hasDeadZones` (boolean)
- `penDetected` (boolean)
- `pressureReported` (boolean)
- `tiltReported` (boolean)
