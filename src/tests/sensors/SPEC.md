# sensors module

Measures device motion and orientation sensors available in the browser.

## What it measures

- Device orientation (tilt) via `DeviceOrientationEvent` (`alpha`, `beta`, `gamma`).
- Device motion via `DeviceMotionEvent` (`acceleration`, `accelerationIncludingGravity`, `rotationRate`, `interval`).
- iOS permission flow via `DeviceOrientationEvent.requestPermission()` / `DeviceMotionEvent.requestPermission()` (feature-detected).
- Generic Sensor API: `Accelerometer`, `Gyroscope`, `Magnetometer`, `AmbientLightSensor` (with `start()`, `stop()`, `onreading`, `onerror`).
- Screen orientation via `screen.orientation.type` and `screen.orientation.angle`.
- Vibration via `navigator.vibrate()`.

Geolocation is intentionally NOT used.

## Browser support caveats

- `DeviceOrientationEvent`/`DeviceMotionEvent` are not available on all desktops; HTTPS (or localhost) required.
- iOS 13+ requires explicit permission via `requestPermission()`; the call must originate from a user gesture.
- Generic Sensor API is Chromium-only and usually requires permission; `AmbientLightSensor` is largely deprecated/unavailable.
- `screen.orientation` may be absent on some browsers (Safari desktop).
- `navigator.vibrate` is primarily mobile; desktop returns `false`/undefined.

## UX flow

1. Mount: feature-detect each API; show "no sensors detected" + Skip when none.
2. Request permission where required (button, user gesture).
3. Start listeners; render live tilt bubble-level, numeric readouts, sample-rate estimate.
4. Stop all sensors and remove listeners on unmount.
5. Pass/Fail/Skip via TestLayout.

## Pass / Fail

- Pass: at least one sensor produced readings.
- Fail: permission denied or no readings after attempt.
- Skip: no sensors detected or user skips.

## details keys

- `deviceOrientation`: boolean
- `deviceMotion`: boolean
- `accelerometer`: boolean
- `gyroscope`: boolean
- `magnetometer`: boolean
- `ambientLight`: boolean
- `screenOrientation`: string (e.g. "portrait-primary")
- `screenAngle`: number
- `vibration`: boolean
- `sampleRateHz`: number
- `permission`: "granted" | "denied" | "not-required"
