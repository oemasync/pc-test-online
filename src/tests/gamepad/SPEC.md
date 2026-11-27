# Gamepad Test Module

## What it measures

This module exercises a connected gamepad through the browser Gamepad API. It
records connection state, standard-mapping availability, analog button and axis
values, stick drift, stick circularity/range, button coverage, trigger range,
and vibration support.

## Browser APIs

- `window` events: `gamepadconnected`, `gamepaddisconnected` (`GamepadEvent`, with
  `event.gamepad`).
- Polling: `navigator.getGamepads()` inside `requestAnimationFrame`; cancel with
  `cancelAnimationFrame`.
- `Gamepad.id`, `Gamepad.index`, `Gamepad.connected`, `Gamepad.timestamp`,
  `Gamepad.mapping` (`"standard"` or `""`), `Gamepad.axes`, `Gamepad.buttons`.
- `GamepadButton.pressed`, `GamepadButton.touched`, `GamepadButton.value`.
- `Gamepad.vibrationActuator` (feature-detected), including
  `playEffect("dual-rumble", { duration, startDelay, strongMagnitude, weakMagnitude })`
  and `reset()`.

## Browser support caveats

- The Gamepad API requires a secure context and is unavailable in some browsers.
- `navigator.getGamepads()` may return `null` slots for disconnected pads.
- Browsers usually expose pads only after a user gesture.
- `gamepadconnected`/`gamepaddisconnected` do not provide continuous state; rAF
  polling is required.
- Vibration is Chromium-oriented and must be feature-detected; unsupported pads
  must not crash the module.
- Standard mapping is optional; non-standard pads use a generic button/axis list.

## UX flow

1. Show an unsupported or no-pad state when the API or a pad is unavailable.
2. Listen for connect/disconnect events and maintain multiple pads by index.
3. Poll the selected pad in `requestAnimationFrame`.
4. Render a standard-mapping visual for `mapping === "standard"`, otherwise a
   generic list.
5. Display analog button values/pressed state, axis values, drift indicators,
   circularity error, button coverage, trigger ranges, and vibration controls.
6. Cancel the animation frame loop on unmount.

## Pass/Fail meaning

- Pass: a pad is connected, its controls can be exercised, button coverage is
  complete, stick drift is within the configured deadzone, and circularity error
  is within the configured tolerance.
- Fail: no supported pad is available, required controls cannot be read, button
  coverage is incomplete, stick drift exceeds the deadzone, or circularity error
  exceeds tolerance.
- Skip: the user chooses not to complete the interactive test.

## Details keys

- `connectedPads`
- `selectedPadIndex`
- `standardMapped`
- `buttonCount`
- `buttonsTested`
- `buttonCoverage`
- `axisCount`
- `leftStickOffset`
- `leftStickDrifting`
- `rightStickOffset`
- `rightStickDrifting`
- `leftStickCircularityError`
- `rightStickCircularityError`
- `leftTriggerRange`
- `rightTriggerRange`
- `vibrationSupported`
- `vibrationTested`
