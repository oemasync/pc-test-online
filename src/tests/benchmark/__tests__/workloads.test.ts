import { describe, it, expect } from 'vitest';
import {
  BENCHMARK_PARAMS,
  EXPECTED_CHECKSUMS,
  intHashLoop,
  primeSieve,
  floatMatrixMultiply,
  typedArrayCopyWorkload,
  estimateCopyBandwidthMiBps,
  verifyChecksum,
} from '../workloads';

describe('workload determinism', () => {
  it('intHashLoop matches expected checksum', () => {
    expect(intHashLoop(BENCHMARK_PARAMS.intHashIterations)).toBe(EXPECTED_CHECKSUMS.intHash);
  });

  it('primeSieve matches expected checksum', () => {
    expect(primeSieve(BENCHMARK_PARAMS.primeSieveLimit)).toBe(EXPECTED_CHECKSUMS.primeSieve);
  });

  it('floatMatrixMultiply matches expected checksum', () => {
    expect(floatMatrixMultiply(BENCHMARK_PARAMS.matrixSize)).toBe(EXPECTED_CHECKSUMS.matrix);
  });

  it('typedArrayCopyWorkload matches expected checksum', () => {
    expect(
      typedArrayCopyWorkload(BENCHMARK_PARAMS.memoryElementCount, BENCHMARK_PARAMS.memoryIterations),
    ).toBe(EXPECTED_CHECKSUMS.memory);
  });

  it('is deterministic across calls', () => {
    expect(intHashLoop(1000, 42)).toBe(intHashLoop(1000, 42));
    expect(primeSieve(100)).toBe(primeSieve(100));
    expect(floatMatrixMultiply(4, 2)).toBe(floatMatrixMultiply(4, 2));
    expect(typedArrayCopyWorkload(64, 3)).toBe(typedArrayCopyWorkload(64, 3));
  });
});

describe('verifyChecksum', () => {
  it('accepts matching checksums', () => {
    expect(verifyChecksum('intHash', EXPECTED_CHECKSUMS.intHash)).toBe(true);
    expect(verifyChecksum('memory', EXPECTED_CHECKSUMS.memory)).toBe(true);
  });

  it('rejects mismatched checksums', () => {
    expect(verifyChecksum('intHash', EXPECTED_CHECKSUMS.intHash + 1)).toBe(false);
  });

  it('rejects unknown workload names', () => {
    expect(verifyChecksum('nope', 0)).toBe(false);
  });
});

describe('estimateCopyBandwidthMiBps', () => {
  it('computes MiB/s from bytes and ms', () => {
    expect(estimateCopyBandwidthMiBps(1024 * 1024, 1000)).toBeCloseTo(1, 5);
  });

  it('returns 0 for non-positive duration', () => {
    expect(estimateCopyBandwidthMiBps(100, 0)).toBe(0);
  });
});
