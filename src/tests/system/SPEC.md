# System module

## What it measures
Client-side system/hardware information exposed by the browser: CPU concurrency,
device memory, platform/architecture/bitness/model via User-Agent Client Hints,
GPU renderer/vendor via WebGL and WebGPU, screen geometry and color capabilities,
storage estimate, network connection, languages and timezone. Nothing is sent
anywhere; all reads are local.

## Browser APIs (MDN names)
- `navigator.hardwareConcurrency: number`
- `navigator.deviceMemory: number` (approximate, in GB)
- `navigator.userAgentData.getHighEntropyValues(['platform','platformVersion','architecture','bitness','model','fullVersionList'])` (User-Agent Client Hints)
- `navigator.userAgent` (fallback string)
- WebGL: `canvas.getContext('webgl')` (or 'webgl2'), `gl.getExtension('WEBGL_debug_renderer_info')`, `gl.getParameter(UNMASKED_RENDERER_WEBGL)`, `gl.getParameter(UNMASKED_VENDOR_WEBGL)`
- WebGPU: `navigator.gpu.requestAdapter()` then `adapter.info` (vendor, architecture, device, description)
- Screen: `screen.width`, `screen.height`, `window.devicePixelRatio`, `screen.colorDepth`
- Media queries: `(color-gamut: p3|srgb|rec2020)`, `(dynamic-range: high)`
- `navigator.storage.estimate()` -> `{usage, quota}`
- `navigator.connection` (Network Information API): `effectiveType`, `downlink`, `rtt`, `saveData`
- `navigator.languages`, `Intl.DateTimeFormat().resolvedOptions().timeZone`

## Browser-support caveats
- `userAgentData` is Chromium-only; fall back to UA string parsing elsewhere.
- `deviceMemory` is Chromium-only and rounded.
- WebGL debug renderer info may be disabled/blocked; treat missing as unknown.
- WebGPU is not universally available; feature-detect `navigator.gpu`.
- `navigator.connection` is Chromium/Android only.
- `storage.estimate()` may be unavailable or reject; handle gracefully.

## UX flow
1. On mount, collect all available fields (each guarded by feature detection).
2. Normalize GPU renderer strings (strip ANGLE wrapper).
3. Format byte sizes for storage.
4. User confirms specs match reality, then Pass or Fail.

## Pass/Fail
- Pass: collected values are plausible and consistent with the machine.
- Fail: required values missing/implausible or user reports mismatch.

## `details` keys recorded
- `hardwareConcurrency: number`
- `deviceMemoryGb: number`
- `platform`, `platformVersion`, `architecture`, `bitness`, `model` (strings, possibly 'unknown')
- `gpuRenderer`, `gpuVendor` (strings)
- `webgpuAdapterInfo` (string, possibly 'unavailable')
- `screenWidth`, `screenHeight`, `devicePixelRatio`, `colorDepth`, `physicalPixels` (number)
- `colorGamut` (string), `dynamicRangeHigh` (boolean)
- `storageUsageBytes`, `storageQuotaBytes` (number)
- `connectionEffectiveType`, `connectionDownlinkMbps`, `connectionRttMs`, `connectionSaveData` (best effort)
- `languages` (string), `timeZone` (string)
" content">