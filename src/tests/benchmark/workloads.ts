// Framework-free, pure CPU/memory workloads.
// Each workload returns a checksum so the work cannot be optimized away and
// results are verifiable. No browser APIs, no DOM, no Vue, no src/core.

export interface WorkloadChecksum {
  value: number;
}

/**
 * Deterministic integer hash loop.
 * @param iterations number of hash iterations (>=0)
 * @param seed initial 32-bit seed
 */
export function intHashLoop(iterations: number, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < iterations; i += 1) {
    h = (h ^ (i + 0x9e3779b9)) >>> 0;
    h = Math.imul(h, 0x7feb352d) >>> 0;
    h = (h ^ (h >>> 15)) >>> 0;
  }
  return h >>> 0;
}

/**
 * Sieve of Eratosthenes up to `limit`.
 * Returns a checksum (sum of primes found, modulo 2^32) so the sieve work is
 * observable. Returns 0 for limit < 2.
 */
export function primeSieve(limit: number): number {
  if (limit < 2) {
    return 0;
  }
  const sieve = new Uint8Array(limit + 1);
  sieve[0] = 1;
  sieve[1] = 1;
  for (let p = 2; p * p <= limit; p += 1) {
    if (sieve[p] === 0) {
      for (let q = p * p; q <= limit; q += p) {
        sieve[q] = 1;
      }
    }
  }
  let checksum = 0;
  for (let i = 2; i <= limit; i += 1) {
    if (sieve[i] === 0) {
      checksum = (checksum + i) >>> 0;
    }
  }
  return checksum >>> 0;
}

/**
 * Deterministic float matrix multiply C = A * B (size x size).
 * Matrices are filled deterministically from `seed`. Returns the sum of all
 * entries of C (a float checksum).
 */
export function floatMatrixMultiply(size: number, seed = 1): number {
  if (size === 0) {
    return 0;
  }
  const n = size;
  const a = new Float64Array(n * n);
  const b = new Float64Array(n * n);
  for (let i = 0; i < n * n; i += 1) {
    a[i] = (((i * 37 + seed * 13) % 97) + 1) / 97;
    b[i] = (((i * 71 + seed * 19) % 89) + 1) / 89;
  }
  const c = new Float64Array(n * n);
  for (let i = 0; i < n; i += 1) {
    for (let k = 0; k < n; k += 1) {
      const aik = a[i * n + k]!;
      if (aik !== 0) {
        for (let j = 0; j < n; j += 1) {
          c[i * n + j] = c[i * n + j]! + aik * b[k * n + j]!;
        }
      }
    }
  }
  let sum = 0;
  for (let i = 0; i < c.length; i += 1) {
    sum += c[i]!;
  }
  return sum;
}

/**
 * Typed-array copy workload. Performs `iterations` copies of `elementCount`
 * float64 elements and returns a checksum derived from the copied data.
 */
export function typedArrayCopyWorkload(elementCount: number, iterations: number): number {
  if (elementCount === 0 || iterations === 0) {
    return 0;
  }
  const src = new Float64Array(elementCount);
  const dst = new Float64Array(elementCount);
  for (let i = 0; i < elementCount; i += 1) {
    src[i] = i * 0.5 + 1;
  }
  let checksum = 0;
  for (let r = 0; r < iterations; r += 1) {
    dst.set(src);
    checksum += dst[0]! + dst[elementCount - 1]!;
  }
  return checksum;
}

/**
 * Convert a measured copy duration into an estimated bandwidth (MB/s).
 * @param bytes number of bytes copied in the measured run
 * @param durationMs measured duration in milliseconds
 */
export function estimateBandwidthMBps(bytes: number, durationMs: number): number {
  if (bytes < 0 || durationMs <= 0) {
    return 0;
  }
  return bytes / (1024 * 1024) / (durationMs / 1000);
}

/**
 * Sanity check that a checksum is a finite number (used for Pass/Fail).
 */
export function isSaneChecksum(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
