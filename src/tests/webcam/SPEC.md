# Webcam test module

## Purpose

Verify that the browser can open a camera, show a live preview, report the
track's negotiated resolution and frame rate, expose the device's supported
ranges, and measure the frames actually delivered. The module also supports
mirroring the preview, capturing a PNG snapshot, switching cameras, and warning
about a covered lens or frozen frame.

## Browser APIs used

- `navigator.mediaDevices.getUserMedia({ video: true })` to request camera access.
- `MediaStream.getVideoTracks()` and `MediaStreamTrack.stop()` to obtain and
  release the camera track.
- `MediaStreamTrack.getSettings()` for the active `MediaTrackSettings`, including
  `width`, `height`, `frameRate`, `aspectRatio`, `facingMode`, `deviceId`, and
  `groupId`.
- `MediaStreamTrack.getCapabilities()` for the supported `MediaTrackCapabilities`,
  including range objects such as `width`, `height`, and `frameRate` with `min`
  and `max` members. Capabilities are not available in every browser and may be
  empty.
- `navigator.mediaDevices.enumerateDevices()` and the `devicechange` event for
  device switching.
- `HTMLVideoElement.srcObject`, `HTMLVideoElement.play()`, and
  `HTMLVideoElement.requestVideoFrameCallback()` for per-frame measurement.
- `requestAnimationFrame()` as the fallback when
  `requestVideoFrameCallback()` is unavailable.
- `HTMLCanvasElement.getContext('2d')`, `CanvasRenderingContext2D.drawImage()`,
  and `CanvasRenderingContext2D.getImageData()` for snapshot and luminance
  sampling.
- `HTMLCanvasElement.toBlob()` or `toDataURL('image/png')` plus an anchor
  download for PNG export.

## Browser support caveats

- `getUserMedia` requires a secure context and user permission.
- `getCapabilities()` is Chromium-oriented; Firefox and Safari may omit it or
  return partial data.
- `requestVideoFrameCallback()` is Chromium/Edge and recent Safari; Firefox
  support is limited, so the module falls back to `requestAnimationFrame`.
- Fake devices used in automated tests report synthetic settings and frame rates.
- Camera labels are empty until permission has been granted.

## UX flow

1. Show the permission prompt until camera access is granted.
2. Start the selected camera and attach the stream to the video preview.
3. Display resolution, reported frame rate, measured frame rate, aspect ratio,
   facing mode, and supported ranges.
4. Allow mirroring the preview horizontally.
5. Allow selecting another video input and restarting the stream.
6. Sample frames and warn when the average luminance is near black or when the
   last N frames are identical.
7. Capture the current frame to a canvas and download it as PNG.
8. Stop all tracks and cancel frame callbacks on unmount.

## Pass / Fail

- Pass: a live video track is active, the preview is playing, and measured
  frames per second is greater than zero.
- Fail: camera permission is denied, no video track is available, or the
  measured frame rate remains zero after the sampling window.
- Skip: the browser does not support `getUserMedia` or no camera is present.

## Recorded details

- `width`: number
- `height`: number
- `frameRate`: number
- `measuredFps`: number
- `aspectRatio`: number
- `facingMode`: string
- `deviceId`: string
- `groupId`: string
- `capabilitiesWidthMin`: number
- `capabilitiesWidthMax`: number
- `capabilitiesHeightMin`: number
- `capabilitiesHeightMax`: number
- `capabilitiesFrameRateMin`: number
- `capabilitiesFrameRateMax`: number
- `mirrored`: boolean
- `luminanceMean`: number
- `luminanceVariance`: number
- `nearBlack`: boolean
- `frozenFrame`: boolean
- `snapshotCaptured`: boolean
