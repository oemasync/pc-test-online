# Gamepad Test Module

## What it measures

This module exercises a connected gamepad through the browser Gamepad API. It
records connection state, standard-mapping availability, analog button and axis
values, stick drift from a resting window, stick circularity/range, button
coverage, trigger range, and vibration support.

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
5. Ask the user to release the sticks, collect a resting window, and report
   mean offset, max offset, and noise.
6. Ask the user to rotate each stick and collect samples; bucket them by angle
   into 36 sectors, take the max radius per sector, and report circularity error
   and sector coverage. Prompt the user until coverage is at least 90%.
7. Track tested buttons from the pad's real button count.
8. Track min/max values for analog trigger buttons (standard mapping buttons 6
   and 7) and report whether 0 to 1 was reached.
9. Display analog button values/pressed state, axis values, drift indicators,
   circularity error, button coverage, trigger ranges, and vibration controls.
10. Cancel the animation frame loop on unmount.

## Pass/Fail meaning

- Pass: a pad is connected, its controls can be exercised, button coverage is
  complete, stick drift mean offset is within the configured deadzone, stick
  circularity coverage is at least 90% with error within tolerance, triggers
  reach their full range, and vibration is either supported and tested or not
  required.
- Fail: no supported pad is available, required controls cannot be read, button
  coverage is incomplete, stick drift exceeds the deadzone, circularity coverage
  or error is outside tolerance, or a required trigger does not reach range.
- Skip: the user chooses not to complete the interactive test.

## Details keys

- `connectedPads`
- `selectedPadIndex`
- `standardMapped`
- `buttonCount`
- `buttonsTested`
- `buttonCoverage`
- `axisCount`
- `leftStickMeanOffset`
- `leftStickMaxOffset`
- `leftStickNoise`
- `leftStickDrifting`
- `rightStickMeanOffset`
- `rightStickMaxOffset`
- `rightStickNoise`
- `rightStickDrifting`
- `leftStickCircularityError`
- `leftStickCircularityCoverage`
- `rightStickCircularityError`
- `rightStickCircularityCoverage`
- `leftTriggerMin`
- `leftTriggerMax`
- `leftTriggerFullRange`
- `rightTriggerMin`
- `rightTriggerMax`
- `rightTriggerFullRange`
- `vibrationSupported`
- `vibrationTested`
