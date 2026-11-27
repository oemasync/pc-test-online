import { describe, expect, it } from 'vitest';

import {
  computeRms,
  countClipped,
  createPeakHoldState,
  detectSilence,
  estimateNoiseFloor,
  frequencyBinCentres,
  peakBinIndex,
  peakHoldReducer,
  rmsToDbfs,
} from '../logic';
import type { SilenceSample } from '../logic';

describe('computeRms', () => {
  it('returns 0 for an empty input', () => {
    expect(computeRms(new Float32Array())).toBe(0);
  });

  it('returns 0 for a silent (all zero) signal', () => {
    expect(computeRms(new Float32Array([0, 0, 0, 0]))).toBe(0);
  });

  it('computes RMS for a constant amplitude', () => {
    expect(computeRms(new Float32Array([0.5, 0.5, 0.5, 0.5]))).toBeCloseTo(0.5, 10);
  });

  it('computes RMS for alternating signs', () => {
    expect(computeRms(new Float32Array([1, -1, 1, -1]))).toBeCloseTo(1, 10);
  });
});

describe('rmsToDbfs', () => {
  it('maps full scale to 0 dBFS', () => {
    expect(rmsToDbfs(1)).toBeCloseTo(0, 10);
  });

  it('maps half amplitude to about -6.02 dBFS', () => {
    expect(rmsToDbfs(0.5)).toBeCloseTo(-6.020599913, 6);
  });

  it('returns -Infinity for zero', () => {
    expect(rmsToDbfs(0)).toBe(Number.NEGATIVE_INFINITY);
  });

  it('returns -Infinity for negative input', () => {
    expect(rmsToDbfs(-1)).toBe(Number.NEGATIVE_INFINITY);
  });
});

describe('peakHoldReducer', () => {
  it('raises the peak when the level exceeds it', () => {
    const state = createPeakHoldState();
    const next = peakHoldReducer(state, -3, 1000);
    expect(next.peak).toBe(-3);
    expect(next.peakAt).toBe(1000);
  });

  it('holds the peak during the hold window', () => {
    const state = { peak: -3, peakAt: 1000 };
    const next = peakHoldReducer(state, -12, 1500, 1000);
    expect(next.peak).toBe(-3);
    expect(next.peakAt).toBe(1000);
  });

  it('decays after the hold window', () => {
    const state = { peak: 0, peakAt: 0 };
    const next = peakHoldReducer(state, -20, 2000, 1000, 20);
    expect(next.peak).toBeCloseTo(-20, 6);
  });

  it('never decays below the current level', () => {
    const state = { peak: 0, peakAt: 0 };
    const next = peakHoldReducer(state, -5, 5000, 1000, 20);
    expect(next.peak).toBe(-5);
  });

  it('resets peakAt when current level catches up', () => {
    const state = { peak: -10, peakAt: 0 };
    const next = peakHoldReducer(state, -2, 100, 1000, 20);
    expect(next.peak).toBe(-2);
    expect(next.peakAt).toBe(100);
  });
});

describe('countClipped', () => {
  it('counts clipped samples in a block', () => {
    expect(countClipped(new Float32Array([0.1, 0.99, -1, 0.5, 1]))).toBe(3);
  });

  it('returns 0 for an empty block', () => {
    expect(countClipped(new Float32Array())).toBe(0);
  });

  it('respects a custom threshold', () => {
    expect(countClipped(new Float32Array([0.8, 0.7]), 0.75)).toBe(1);
  });
});

describe('estimateNoiseFloor', () => {
  it('returns 0 for empty input', () => {
    expect(estimateNoiseFloor([])).toBe(0);
  });

  it('uses a low percentile, ignoring a single near-zero outlier', () => {
    const window = [
      0, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05,
    ];
    expect(estimateNoiseFloor(window)).toBeCloseTo(0.05, 5);
  });

  it('returns the low percentile for a larger window', () => {
    const values = Array.from({ length: 100 }, () => 0.04);
    values[0] = 0;
    expect(estimateNoiseFloor(values)).toBeCloseTo(0.04, 5);
  });
});

describe('detectSilence', () => {
  it('returns false for empty input', () => {
    expect(detectSilence([], 1e-6, 1000)).toBe(false);
  });

  it('returns false when the last sample is loud', () => {
    const history: SilenceSample[] = [
      { t: 0, rms: 0 },
      { t: 500, rms: 0.5 },
    ];
    expect(detectSilence(history, 1e-6, 1000)).toBe(false);
  });

  it('returns false when the silent span is shorter than the duration', () => {
    const history: SilenceSample[] = [
      { t: 0, rms: 0.5 },
      { t: 500, rms: 0 },
      { t: 900, rms: 0 },
    ];
    expect(detectSilence(history, 1e-6, 1000)).toBe(false);
  });

  it('returns true when the silent span meets the duration', () => {
    const history: SilenceSample[] = [
      { t: 0, rms: 0.5 },
      { t: 500, rms: 0 },
      { t: 1500, rms: 0 },
    ];
    expect(detectSilence(history, 1e-6, 1000)).toBe(true);
  });

  it('breaks the run on a loud sample in the middle', () => {
    const history: SilenceSample[] = [
      { t: 0, rms: 0 },
      { t: 500, rms: 0.5 },
      { t: 1500, rms: 0 },
    ];
    expect(detectSilence(history, 1e-6, 1000)).toBe(false);
  });
});

describe('frequencyBinCentres', () => {
  it('computes bin centres up to Nyquist', () => {
    const bins = frequencyBinCentres(4, 48000);
    expect(bins).toHaveLength(4);
    expect(bins[0]).toBe(0);
    expect(bins[bins.length - 1]).toBeCloseTo(18000, 6);
  });
});

describe('peakBinIndex', () => {
  it('returns -1 for empty input', () => {
    expect(peakBinIndex(new Float32Array())).toBe(-1);
  });

  it('returns the index of the largest magnitude', () => {
    expect(peakBinIndex(new Float32Array([1, 5, 2]))).toBe(1);
  });

  it('returns 0 when all values equal', () => {
    expect(peakBinIndex(new Float32Array([3, 3, 3]))).toBe(0);
  });
});
