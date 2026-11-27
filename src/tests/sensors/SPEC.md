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
- API presence is not hardware presence: on desktop Chrome these events exist but never deliver real readings (or deliver all-null fields). Availability is only `active` after a non-null reading arrives within a timeout window.
- iOS 13+ requires explicit permission via `requestPermission()`; the call must originate from a user gesture.
- Generic Sensor API is Chromium-only and usually requires permission; `AmbientLightSensor` is largely deprecated/unavailable. Generic Sensor `error` events map to `denied` (NotAllowedError/SecurityError) or `error` (NotReadableError and others).
- `screen.orientation` may be absent on some browsers (Safari desktop).
- `navigator.vibrate` is primarily mobile; desktop returns `false`/undefined.

## Availability model

Sensor statuses: `unknown` | `api-missing` | `no-data` | `active` | `denied` | `error`.
- `api-missing`: the API is not present.
- `unknown`: API present, waiting for a reading (within the timeout window).
- `active`: a real reading with non-null values arrived.
- `no-data`: API present but no non-null reading within the timeout window.
- `denied` / `error`: from Generic Sensor `error` events.

`screenOrientation` and `vibration` are capabilities, not sensors: tracked separately, excluded from the sensor set and from `hasAnySensor`. Summary is `some-active` | `none-detected` | `pending`.

## Axis conventions and tilt

`DeviceMotionEvent.accelerationIncludingGravity` reports acceleration in device coordinates including gravity (m/s^2): x (right), y (up), z (toward viewer). `acceleration` reports linear acceleration with gravity removed (often null on desktop).

Tilt (pitch/roll) is computed from `accelerationIncludingGravity`, not `acceleration`, because gravity provides the reference "down" direction. Linear acceleration has no stable gravity component and cannot determine orientation.

## UX flow

1. Mount: feature-detect each API; report capabilities; show "no sensors detected" + Skip when no sensor becomes active.
2. Request permission where required (button, user gesture).
3. Start listeners; render live tilt bubble-level, numeric readouts, sample-rate estimate.
4. Stop all sensors and remove listeners on unmount.
5. Pass/Fail/Skip via TestLayout.

## Pass / Fail

- Pass: at least one sensor became active (produced real readings).
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
