import { describe, expect, it } from 'vitest';

import {
  computeRms,
  countClipped,
  createPeakHoldState,
  detectSilence,
  estimateNoiseFloor,
  estimateNoiseFloorDbfs,
  frequencyBinCentres,
  isClipping,
  peakBinIndex,
  peakHoldReducer,
  rmsToDbfs,
} from '../logic';

describe('computeRms', () => {
  it('returns 0 for an empty input', () => {
    expect(computeRms([])).toBe(0);
    expect(computeRms(new Float32Array())).toBe(0);
  });

  it('returns 0 for a silent (all zero) signal', () => {
    expect(computeRms([0, 0, 0, 0])).toBe(0);
  });

  it('computes RMS for a constant amplitude', () => {
    expect(computeRms([0.5, 0.5, 0.5, 0.5])).toBeCloseTo(0.5, 10);
  });

  it('computes RMS for alternating signs', () => {
    expect(computeRms([1, -1, 1, -1])).toBeCloseTo(1, 10);
  });

  it('converts byte time-domain data centred at 128', () => {
    const bytes = new Uint8Array([128, 255, 0, 128]);
    // amplitudes: 0, ~0.992, -1, 0
    expect(computeRms(bytes)).toBeCloseTo(0.7043, 3);
  });

  it('returns 0 for non-finite samples', () => {
    expect(computeRms([1, Number.NaN, 2])).toBe(0);
    expect(computeRms([1, Number.POSITIVE_INFINITY])).toBe(0);
  });

  it('handles Float32Array', () => {
    expect(computeRms(new Float32Array([0.25, -0.25]))).toBeCloseTo(0.25, 10);
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

  it('returns -Infinity for negative or non-finite input', () => {
    expect(rmsToDbfs(-1)).toBe(Number.NEGATIVE_INFINITY);
    expect(rmsToDbfs(Number.NaN)).toBe(Number.NEGATIVE_INFINITY);
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
    // elapsed 2000, hold 1000, decay 1000ms at 20 dB/s = 20 dB -> -20, clamped to level -20
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

  it('ignores non-finite level or time', () => {
    const state = { peak: -5, peakAt: 10 };
    expect(peakHoldReducer(state, Number.NaN, 20)).toEqual(state);
    expect(peakHoldReducer(state, -2, Number.NaN)).toEqual(state);
  });
});

describe('isClipping', () => {
  it('returns false for normal samples', () => {
    expect(isClipping(0.5)).toBe(false);
    expect(isClipping(-0.5)).toBe(false);
  });

  it('returns true at or above the threshold', () => {
    expect(isClipping(0.99)).toBe(true);
    expect(isClipping(-1)).toBe(true);
    expect(isClipping(1)).toBe(true);
  });

  it('returns false for non-finite input', () => {
    expect(isClipping(Number.NaN)).toBe(false);
  });

  it('respects a custom threshold', () => {
    expect(isClipping(0.8, 0.75)).toBe(true);
    expect(isClipping(0.7, 0.75)).toBe(false);
  });
});

describe('countClipped', () => {
  it('counts clipped samples in a block', () => {
    expect(countClipped([0.1, 0.99, -1, 0.5, 1])).toBe(3);
  });

  it('returns 0 for an empty block', () => {
    expect(countClipped([])).toBe(0);
  });

  it('handles byte arrays', () => {
    // 255 -> ~1.0 clipped, 0 -> -1 clipped
    expect(countClipped(new Uint8Array([255, 0, 128]))).toBe(2);
  });
});

describe('estimateNoiseFloor', () => {
  it('returns 0 for empty input', () => {
    expect(estimateNoiseFloor([])).toBe(0);
  });

  it('returns the minimum RMS observed', () => {
    expect(estimateNoiseFloor([0.02, 0.01, 0.05])).toBe(0.01);
  });

  it('ignores non-finite values', () => {
    expect(estimateNoiseFloor([0.03, Number.NaN, 0.01])).toBe(0.01);
  });

  it('returns 0 if all values are non-finite', () => {
    expect(estimateNoiseFloor([Number.NaN, Number.POSITIVE_INFINITY])).toBe(0);
  });
});

describe('estimateNoiseFloorDbfs', () => {
  it('converts the noise floor to dBFS', () => {
    expect(estimateNoiseFloorDbfs([0.01])).toBeCloseTo(rmsToDbfs(0.01), 10);
  });
});

describe('detectSilence', () => {
  it('returns false for empty input', () => {
    expect(detectSilence([])).toBe(false);
  });

  it('detects a flat-zero tail', () => {
    expect(detectSilence([0.1, 0, 0, 0], 1e-6, 3)).toBe(true);
  });

  it('requires enough consecutive silent samples', () => {
    expect(detectSilence([0, 0, 0.1], 1e-6, 3)).toBe(false);
  });

  it('returns false when fewer samples than required', () => {
    expect(detectSilence([0, 0], 1e-6, 3)).toBe(false);
  });

  it('treats values at or below the threshold as silent', () => {
    expect(detectSilence([1e-7, 1e-7], 1e-6, 2)).toBe(true);
  });

  it('breaks the run on a loud sample', () => {
    expect(detectSilence([0, 0.5, 0], 1e-6, 2)).toBe(false);
  });
});

describe('frequencyBinCentres', () => {
  it('returns empty for invalid input', () => {
    expect(frequencyBinCentres(0, 48000)).toEqual([]);
    expect(frequencyBinCentres(4, 0)).toEqual([]);
  });

  it('computes bin centres up to Nyquist', () => {
    const bins = frequencyBinCentres(4, 48000);
    expect(bins).toHaveLength(4);
    expect(bins[0]).toBe(0);
    expect(bins[bins.length - 1]).toBeCloseTo(18000, 6);
  });
});

describe('peakBinIndex', () => {
  it('returns -1 for empty input', () => {
    expect(peakBinIndex([])).toBe(-1);
  });

  it('returns the index of the largest magnitude', () => {
    expect(peakBinIndex([1, 5, 2])).toBe(1);
  });

  it('returns 0 when all values equal or non-finite tail', () => {
    expect(peakBinIndex([3, 3, 3])).toBe(0);
  });
});
