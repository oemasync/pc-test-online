import {
    intHashLoop,
    primeSieve,
    floatMatrixMultiply,
    typedArrayCopyWorkload,
    BENCHMARK_PARAMS,
    verifyChecksum,
    } from './workloads';
import {
    calibrateRepeats,
    CALIBRATION_MIN_MS,
    singleThreadScore,
    multiThreadThroughput,
    scalingEfficiency,
    median,
} from './logic';

export type BenchmarkMode = 'quick' | 'full';

export interface BenchmarkConfig {
    mode: BenchmarkMode;
    runs: number;
    targetMs: number;
}

export interface WorkerMessage {
    type: 'run' | 'abort' | 'cpu';
    config?: BenchmarkConfig;
    payload?: unknown;
}

export interface CpuWorkerResult {
    durationMs: number;
    checksums: { intHash: number; primeSieve: number; matrix: number };
}

export interface BenchmarkResultData {
    runs: number;
    singleThreadMedianMs: number;
    singleThreadScore: number;
    multiThreadThroughput: number;
    scalingEfficiency: number;
    workers: number;
    memoryBandwidthMiBps: number;
    memoryChecksum: number;
    memoryVerified: boolean;
    gpuFillRateMPixelsPerSec: number | null;
    allChecksumsVerified: boolean;
    singleChecksums: { intHash: number; primeSieve: number; matrix: number };
}

let aborted = false;

function post(msg: unknown): void {
    self.postMessage(msg);
}

function now(): number {
    return performance.now();
}

function runCpuOnce(): { intHash: number; primeSieve: number; matrix: number } {
    return {
        intHash: intHashLoop(BENCHMARK_PARAMS.intHashIterations),
        primeSieve: primeSieve(BENCHMARK_PARAMS.primeSieveLimit),
        matrix: floatMatrixMultiply(BENCHMARK_PARAMS.matrixSize),
    };
}

function calibrateTo(repFn: () => void, targetMs: number): number {
    let repeats = 1;
    let elapsed: number;
    while (true) {
        const t0 = now();
        for (let i = 0; i < repeats; i += 1) {
            repFn();
        }
        elapsed = now() - t0;
        if (aborted) return repeats;
        if (elapsed >= CALIBRATION_MIN_MS) break;
        repeats = calibrateRepeats(repeats, elapsed, CALIBRATION_MIN_MS);
    }
    return calibrateRepeats(repeats, elapsed, targetMs);
}

function timeCpu(repeats: number): {
    durationMs: number;
    checksums: { intHash: number; primeSieve: number; matrix: number };
} {
    const t0 = now();
    let checksums = { intHash: 0, primeSieve: 0, matrix: 0 };
    for (let i = 0; i < repeats; i += 1) {
        checksums = runCpuOnce();
    }
    const durationMs = now() - t0;
    return { durationMs, checksums };
}

function runMemory(repeats: number): { durationMs: number; checksum: number } {
    // fill source once, outside timed section
    const t0 = now();
    let checksum = 0;
    for (let i = 0; i < repeats; i += 1) {
        checksum = typedArrayCopyWorkload(
            BENCHMARK_PARAMS.memoryElementCount,
            BENCHMARK_PARAMS.memoryIterations
        );
    }
    const durationMs = now() - t0;
    return { durationMs, checksum };
}

function runGpu(targetMs: number): number | null {
    if (typeof OffscreenCanvas === 'undefined') return null;
    let canvas: OffscreenCanvas;
    try {
        canvas = new OffscreenCanvas(512, 512);
    } catch {
        return null;
    }
    const gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    if (!gl) return null;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vs || !fs) return null;
    gl.shaderSource(vs, 'attribute vec2 p; void main(){ gl_Position=vec4(p,0,1); }');
    gl.compileShader(vs);
    gl.shaderSource(fs, 'precision mediump float; void main(){ gl_FragColor=vec4(1.0); }');
    gl.compileShader(fs);
    const prog = gl.createProgram();
    if (!prog) return null;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const t0 = now();
    let frames = 0;
    while (now() - t0 < targetMs) {
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.finish();
        frames += 1;
        if (aborted) break;
    }
    const elapsed = now() - t0;
    const pixels = 512 * 512 * frames;
    return elapsed > 0 ? pixels / (elapsed / 1000) / 1e6 : null;
}

function spawnCpuWorker(): Worker {
    return new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
}

async function runMultiThread(
    repeats: number
): Promise<{ durationMs: number; checksums: CpuWorkerResult['checksums'] }> {
    const hw = navigator.hardwareConcurrency || 1;
    const workers = Array.from({ length: hw }, () => spawnCpuWorker());
    const results: CpuWorkerResult[] = [];
    await Promise.all(
        workers.map(
            w =>
                new Promise<void>(resolve => {
                    w.onmessage = (ev: MessageEvent) => {
                        if (ev.data && ev.data.type === 'cpu-result') {
                            results.push(ev.data.result as CpuWorkerResult);
                            resolve();
                        }
                    };
                    w.postMessage({ type: 'cpu', repeats });
                })
        )
    );
    workers.forEach(w => w.terminate());
    const durationMs = results.reduce((m, r) => Math.max(m, r.durationMs), 0);
    const checksums = results[0]?.checksums ?? { intHash: 0, primeSieve: 0, matrix: 0 };
    return { durationMs, checksums };
}

async function runBenchmark(config: BenchmarkConfig): Promise<void> {
    aborted = false;
    const runs = config.runs;
    const targetMs = config.targetMs;
    const hw = navigator.hardwareConcurrency || 1;

    const singleDurations: number[] = [];
    const multiThroughputs: number[] = [];
    const memoryBws: number[] = [];
    const gpuRates: number[] = [];

    let singleChecksums = { intHash: 0, primeSieve: 0, matrix: 0 };
    let memoryChecksum = 0;

    // calibration repeats
    const hashRep = calibrateTo(() => {
        intHashLoop(BENCHMARK_PARAMS.intHashIterations);
    }, targetMs);
    const primeRep = calibrateTo(() => {
        primeSieve(BENCHMARK_PARAMS.primeSieveLimit);
    }, targetMs);
    const matrixRep = calibrateTo(() => {
        floatMatrixMultiply(BENCHMARK_PARAMS.matrixSize);
    }, targetMs);
    // use the max repeat count for single-thread combined run
    const singleRepeats = Math.max(hashRep, primeRep, matrixRep);
    const memoryRepeats = calibrateTo(() => {
        typedArrayCopyWorkload(
            BENCHMARK_PARAMS.memoryElementCount,
            BENCHMARK_PARAMS.memoryIterations
        );
    }, targetMs);

    for (let r = 0; r < runs; r += 1) {
        if (aborted) break;

        // single-thread: run all three, timed together
        const single = timeCpu(singleRepeats);
        singleDurations.push(single.durationMs);
        singleChecksums = single.checksums;

        if (aborted) break;

        // multi-thread
        const multi = await runMultiThread(singleRepeats);
        const totalWork = singleRepeats * hw;
        const tp = multiThreadThroughput(totalWork, multi.durationMs);
        multiThroughputs.push(tp);
        const singleScore = singleThreadScore(singleRepeats * 3, single.durationMs);
        const se = scalingEfficiency(tp, singleScore, hw);
        // store se via closure? push to array not needed; compute at end from medians
        void se;

        if (aborted) break;

        // memory single-threaded only
        const mem = runMemory(memoryRepeats);
        const bw =
            (BENCHMARK_PARAMS.memoryElementCount *
                8 *
                BENCHMARK_PARAMS.memoryIterations *
                memoryRepeats) /
            (1024 * 1024) /
            (mem.durationMs / 1000);
        memoryBws.push(bw);
        memoryChecksum = mem.checksum;

        if (aborted) break;

        // gpu
        const gpu = runGpu(targetMs);
        if (gpu !== null) gpuRates.push(gpu);

        post({ type: 'progress', progress: (r + 1) / runs });
    }

    // checksum verification
    const v1 = verifyChecksum('intHash', singleChecksums.intHash)
    const v2 = verifyChecksum('primeSieve', singleChecksums.primeSieve)
    const v3 = verifyChecksum('matrix', singleChecksums.matrix)
    const vMem = verifyChecksum('memory', memoryChecksum)
    const allChecksumsVerified = v1 && v2 && v3 && vMem

    const singleMedianMs = median(singleDurations);
    const singleScore = singleThreadScore(singleRepeats * 3, singleMedianMs);
    const multiMedianTp = median(multiThroughputs);
    const memMedianBw = median(memoryBws);
    const gpuMedian = gpuRates.length ? median(gpuRates) : 0;
    const se = scalingEfficiency(multiMedianTp, singleScore, hw);

    const data: BenchmarkResultData = {
        runs,
        singleThreadMedianMs: singleMedianMs,
        singleThreadScore: singleScore,
        multiThreadThroughput: multiMedianTp,
        scalingEfficiency: se,
        workers: hw,
        memoryBandwidthMiBps: memMedianBw,
        memoryChecksum,
        memoryVerified: vMem,
        gpuFillRateMPixelsPerSec: gpuRates.length ? gpuMedian : null,
        allChecksumsVerified,
        singleChecksums,
    };

    post({ type: 'result', data });
    post({ type: 'done' });
}

self.onmessage = (e: MessageEvent) => {
    const msg = e.data as { type: string; config?: BenchmarkConfig; repeats?: number };
    if (msg.type === 'run') {
        if (msg.config) void runBenchmark(msg.config);
    } else if (msg.type === 'abort') {
        aborted = true;
    } else if (msg.type === 'cpu') {
        const repeats = (msg.repeats as number) ?? 1;
        const r = timeCpu(repeats);
        post({ type: 'cpu-result', result: { durationMs: r.durationMs, checksums: r.checksums } });
    }
};
