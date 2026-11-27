# Benchmark module (src/tests/benchmark)

## What it measures
A quick, in-browser CPU / memory / GPU benchmark. All heavy work runs off the
main thread. Scores are the median of N runs, with sample stddev (n-1) reported.
No network.

## Workloads
- CPU single-thread and multi-thread (Web Workers sized to `navigator.hardwareConcurrency`):
  - integer hash loop
  - prime sieve
  - float matrix multiply
- Memory copy bandwidth via typed-array copies (64 MiB per buffer, exceeds typical L3).
- GPU fill-rate via a WebGL2 fragment-shader test.

Each workload returns a checksum. Fixed benchmark parameters and their expected
checksums are exported as `BENCHMARK_PARAMS` and `EXPECTED_CHECKSUMS`; a result
that does not match fails with a clear checksum-mismatch message (a genuine
'unstable CPU / overclock' finding).

- Each timed run repeats the workload until it lasts ~200 ms; the repeat count is
  calibrated once per workload. Work units = iterations x repeats. Checksums are
  verified per repetition (first and last).
- Memory test runs single-threaded only (OOM guard: 2 x 64 MiB per call).

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
4. On completion, median + sample stddev are shown per metric.
5. Pass/Fail is recorded via the results store.

## Pass / Fail
Pass = all workloads completed without errors and every checksum matches
`EXPECTED_CHECKSUMS` (verified via `verifyChecksum`). Fail = any error or checksum
mismatch. Scores go to `details`.

## Scoring
- Single-thread score = work units / median duration (units/s).
- Multi-thread aggregate throughput = total work across workers / wall-clock
  time of the slowest worker per round (units/s).
- Scaling efficiency = multi / (single x workers).

## Memory bandwidth
Reported as 'copy bandwidth' in MiB/s. `bytes` is the number of bytes copied
(payload); read+write traffic is 2x. Working set is 64 MiB per buffer to exceed
typical L3.

## details keys
- `cpuSingleThreadScore`
- `cpuMultiThreadScore`
- `cpuSingleStddev`
- `cpuMultiStddev`
- `intHashChecksum`
- `primeSieveChecksum`
- `matrixChecksum`
- `memoryCopyBandwidthMiBps`
- `memoryStddev`
- `gpuFillRateMPixelsPerSec`
- `gpuStddev`
- `runs`
- `hardwareConcurrency`

## Scheduler semantics
- `startRun` allowed only from `idle`.
- `failRun` / `abortRun` on a terminal state return the state unchanged.
- `finalSummary` for aborted/failed runs is marked `partial: true`.
- Run statistics use sample stddev (n-1).
