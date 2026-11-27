import { describe, it, expect } from 'vitest';
import {
  intHashLoop,
  primeSieve,
  floatMatrixMultiply,
  typedArrayCopyWorkload,
  estimateBandwidthMBps,
  isSaneChecksum,
} from '../workloads';

describe('intHashLoop', () => {
  it('is deterministic for the same inputs', () => {
    const a = intHashLoop(1000, 42);
    const b = intHashLoop(1000, 42);
    expect(a).toBe(b);
  });

  it('changes with different seeds', () => {
    expect(intHashLoop(1000, 1)).not.toBe(intHashLoop(1000, 2));
  });

  it('changes with different iteration counts', () => {
    expect(intHashLoop(100, 7)).not.toBe(intHashLoop(101, 7));
  });

  it('returns 0 iterations as the seed (identity-ish) only when 0 iters', () => {
    const seed = 12345;
    expect(intHashLoop(0, seed)).toBe(seed >>> 0);
  });
});

describe('primeSieve', () => {
  it('is deterministic', () => {
    expect(primeSieve(100)).toBe(primeSieve(100));
  });

  it('returns 0 for limits below 2', () => {
    expect(primeSieve(0)).toBe(0);
    expect(primeSieve(1)).toBe(0);
  });

  it('produces a larger checksum for a larger limit', () => {
    expect(primeSieve(100)).toBeLessThan(primeSieve(200));
  });
});

describe('floatMatrixMultiply', () => {
  it('is deterministic', () => {
    expect(floatMatrixMultiply(8, 3)).toBe(floatMatrixMultiply(8, 3));
  });

  it('returns 0 for size 0', () => {
    expect(floatMatrixMultiply(0)).toBe(0);
  });

  it('changes with seed', () => {
    expect(floatMatrixMultiply(4, 1)).not.toBe(floatMatrixMultiply(4, 2));
  });

  it('scales: larger matrix gives larger magnitude sum', () => {
    expect(Math.abs(floatMatrixMultiply(8))).toBeGreaterThan(Math.abs(floatMatrixMultiply(2)));
  });
});

describe('typedArrayCopyWorkload', () => {
  it('is deterministic', () => {
    expect(typedArrayCopyWorkload(1024, 4)).toBe(typedArrayCopyWorkload(1024, 4));
  });

  it('returns 0 when iterations is 0', () => {
    expect(typedArrayCopyWorkload(1024, 0)).toBe(0);
  });

  it('returns 0 when elementCount is 0', () => {
    expect(typedArrayCopyWorkload(0, 4)).toBe(0);
  });

  it('scales with iterations', () => {
    const one = typedArrayCopyWorkload(64, 1);
    const two = typedArrayCopyWorkload(64, 2);
    expect(two).toBeCloseTo(one * 2, 5);
  });
});

describe('estimateBandwidthMBps', () => {
  it('computes MB/s from bytes and ms', () => {
    // 1 MB in 1000 ms = 1 MB/s
    expect(estimateBandwidthMBps(1024 * 1024, 1000)).toBeCloseTo(1, 5);
  });

  it('returns 0 for non-positive duration', () => {
    expect(estimateBandwidthMBps(100, 0)).toBe(0);
    expect(estimateBandwidthMBps(100, -1)).toBe(0);
  });

  it('returns 0 for negative bytes', () => {
    expect(estimateBandwidthMBps(-1, 10)).toBe(0);
  });
});

describe('isSaneChecksum', () => {
  it('accepts finite numbers', () => {
    expect(isSaneChecksum(0)).toBe(true);
    expect(isSaneChecksum(42.5)).toBe(true);
  });
  it('rejects non-numbers and non-finite', () => {
    expect(isSaneChecksum(NaN)).toBe(false);
    expect(isSaneChecksum(Infinity)).toBe(false);
    expect(isSaneChecksum('x')).toBe(false);
    expect(isSaneChecksum(null)).toBe(false);
  });
});
