# Benchmark module (src/tests/benchmark)

## What it measures
A quick, in-browser CPU / memory / GPU benchmark. All heavy work runs off the
main thread. Scores are the median of N runs, with stddev reported. No network.

## Workloads
- CPU single-thread and multi-thread (Web Workers sized to `navigator.hardwareConcurrency`):
  - integer hash loop
  - prime sieve
  - float matrix multiply
- Memory bandwidth estimate via typed-array copies.
- GPU fill-rate via a WebGL2 fragment-shader test.

Each workload returns a checksum so the work cannot be optimized away and
results are verifiable.

## Browser APIs (MDN names)
- Workers: `Worker`, `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`, `worker.postMessage`, `worker.onmessage`, `worker.terminate()`.
- Concurrency: `navigator.hardwareConcurrency` (may be undefined; fallback 1).
- Timing: `performance.now()`.
- Memory: `TypedArray` (`Float64Array`, `Uint8Array`), `TypedArray.prototype.set`.
- GPU: `HTMLCanvasElement.getContext('webgl2')`, `WebGL2RenderingContext`, `WebGLShader`, `WebGLProgram`, `gl.createShader`, `gl.shaderSource`, `gl.compileShader`, `gl.createProgram`, `gl.linkProgram`, `gl.useProgram`, `gl.drawArrays`, `gl.finish`, `gl.getParameter(gl.RENDERER)`.
- Optional timer: `EXT_disjoint_timer_query_webgl2` (fallback to `performance.now()` around `gl.finish()`).
- Abort: `AbortController` / `AbortSignal`.

## Browser-support caveats
- `navigator.hardwareConcurrency` may be missing or report logical cores; treat as a hint.
- WebGL2 may be unavailable (software renderer or blocked); GPU test is then skipped.
- Timer query extension is optional; fall back to CPU-side timing.
- Workers may be blocked by CSP; module workers require `type: 'module'` support.
- `performance.memory` is non-standard and not used.

## UX flow
1. User starts the benchmark.
2. Scheduler runs N iterations per workload, reporting progress (0..1).
3. Each run is abortable; abort terminates workers.
4. On completion, median + stddev are shown per metric.
5. Pass/Fail is recorded via the results store.

## Pass / Fail
Pass = all workloads completed without errors and produced sane (finite) checksums.
Fail = any error or non-finite / implausible checksum. Scores go to `details`.

## details keys
- `cpuSingleThreadScore`
- `cpuMultiThreadScore`
- `intHashChecksum`
- `primeSieveChecksum`
- `matrixChecksum`
- `memoryBandwidthMBps`
- `gpuFillRateMPixelsPerSec`
- `runs`
- `hardwareConcurrency`
- `cpuSingleStddev`
- `cpuMultiStddev`
- `memoryStddev`
- `gpuStddev`
