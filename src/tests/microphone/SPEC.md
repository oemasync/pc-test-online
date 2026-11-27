# Microphone test module

## Purpose

Verify that the browser can open a microphone, measure a live audio level,
detect clipping and silence, estimate the noise floor, and render both a
waveform and a frequency spectrum. The module also records and plays back audio,
switches input devices, and exposes the applied audio-processing constraints.

## Browser APIs used

- `navigator.mediaDevices.getUserMedia({ audio: constraints })` to request microphone access.
- `MediaStream.getAudioTracks()` and `MediaStreamTrack.stop()` to obtain and release the microphone track.
- `MediaStreamTrack.getSettings()` for the active `MediaTrackSettings`, including
  `echoCancellation`, `noiseSuppression`, `autoGainControl`, `channelCount`,
  `sampleRate`, `sampleSize`, `deviceId`, and `groupId`.
- `MediaStreamTrack.getCapabilities()` for the supported `MediaTrackCapabilities`.
- `navigator.mediaDevices.enumerateDevices()` and the `devicechange` event for device switching.
- `AudioContext` and `AnalyserNode` with `getFloatTimeDomainData()`,
  `getByteFrequencyData()`, `fftSize`, `smoothingTimeConstant`, `minDecibels`,
  and `maxDecibels` for level measurement, waveform, and spectrum rendering.
- `MediaRecorder` with `MediaRecorder.isTypeSupported()` and `start()`, `stop()`,
  `ondataavailable`, `onstop` for recording and playback.
- `URL.createObjectURL()` and `HTMLAudioElement` for playback.
- Constraint toggles for `echoCancellation`, `noiseSuppression`, and
  `autoGainControl` passed through `getUserMedia`.

## Browser support caveats

- `getUserMedia` requires a secure context and user permission.
- `MediaRecorder` and `isTypeSupported` availability varies; the module picks a
  supported MIME type or falls back to the browser default.
- `getCapabilities()` is Chromium-oriented; Firefox and Safari may omit it or
  return partial data.
- AnalyserNode data is zero-filled until audio flows, which the module treats as
  the silent-device case after N seconds.
- Chromium's fake microphone in automated tests emits a beep tone, so the level
  meter must move.
- Device labels are empty until permission has been granted.

## UX flow

1. Show the permission prompt until microphone access is granted.
2. Start the selected microphone and build an AnalyserNode.
3. Display a live level meter (RMS to dBFS) with peak hold and decay.
4. Count clipped samples and estimate the noise floor over a quiet window.
5. Draw the waveform and frequency spectrum on canvas.
6. Toggle echoCancellation / noiseSuppression / autoGainControl and show the
   applied values from `getSettings()`.
7. Detect the silent-device case (flat-zero signal for N seconds) and warn.
8. Record audio with MediaRecorder and play it back.
9. Allow selecting another audio input and restarting the stream.
10. Stop all tracks, disconnect audio nodes, and cancel animation frames on unmount.

## Pass / Fail

- Pass: a live audio track is active and the measured level moves above the
  noise floor (or a recorded clip plays back).
- Fail: microphone permission is denied, no audio track is available, or the
  signal stays flat-zero for the whole sampling window.
- Skip: the browser does not support `getUserMedia` or no microphone is present.

## Recorded details

- `rms`: number
- `dbfs`: number
- `peakDbfs`: number
- `clipCount`: number
- `noiseFloorDbfs`: number
- `silent`: boolean
- `sampleRate`: number
- `channelCount`: number
- `echoCancellation`: boolean
- `noiseSuppression`: boolean
- `autoGainControl`: boolean
- `deviceId`: string
- `groupId`: string
- `mimeType`: string
- `recorded`: boolean