import { describe, expect, it } from 'vitest';

import {
  estimateFps,
  frameDifference,
  isCoveredLens,
  isFrameStalled,
  isStaticFrame,
  luminanceStats,
} from '../logic';

describe('estimateFps', () => {
  it('returns zero for fewer than two timestamps', () => {
    expect(estimateFps([])).toBe(0);
    expect(estimateFps([100])).toBe(0);
  });

  it('estimates 60 fps from 16.67 ms frames', () => {
    const timestamps = [0, 16.6667, 33.3333, 50];
    expect(estimateFps(timestamps)).toBeCloseTo(60, 0);
  });

  it('uses elapsed time rather than sample count alone', () => {
    expect(estimateFps([0, 1000])).toBe(1);
    expect(estimateFps([0, 500, 1000])).toBe(2);
  });

  it('returns zero for non-increasing or invalid timestamps', () => {
    expect(estimateFps([10, 10])).toBe(0);
    expect(estimateFps([20, 10])).toBe(0);
    expect(estimateFps([0, Number.NaN])).toBe(0);
    expect(estimateFps([0, Number.POSITIVE_INFINITY])).toBe(0);
  });
});

describe('luminanceStats', () => {
  it('returns zeros for an empty buffer', () => {
    expect(luminanceStats(new Uint8ClampedArray())).toEqual({
      mean: 0,
      variance: 0,
      min: 0,
      max: 0,
      sampleCount: 0,
    });
  });

  it('computes a black frame', () => {
    const buffer = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]);
    const stats = luminanceStats(buffer);

    expect(stats.mean).toBe(0);
    expect(stats.variance).toBe(0);
    expect(stats.min).toBe(0);
    expect(stats.max).toBe(0);
    expect(stats.sampleCount).toBe(2);
  });

  it('computes a white frame', () => {
    const buffer = new Uint8ClampedArray([255, 255, 255, 255]);
    const stats = luminanceStats(buffer);

    expect(stats.mean).toBeCloseTo(255, 5);
    expect(stats.variance).toBe(0);
  });

  it('computes variance across mixed luminance', () => {
    const buffer = new Uint8ClampedArray([
      0, 0, 0, 255,
      255, 255, 255, 255,
    ]);
    const stats = luminanceStats(buffer);

    expect(stats.mean).toBeCloseTo(127.5, 5);
    expect(stats.variance).toBeCloseTo(16256.25, 5);
    expect(stats.min).toBe(0);
    expect(stats.max).toBeCloseTo(255, 5);
  });

  it('ignores alpha and trailing bytes', () => {
    const buffer = new Uint8ClampedArray([10, 20, 30, 99, 40, 50, 60, 1]);
    const stats = luminanceStats(buffer);

    expect(stats.sampleCount).toBe(2);
    expect(stats.mean).toBeCloseTo(
      (0.2126 * 10 + 0.7152 * 20 + 0.0722 * 30 +
        0.2126 * 40 + 0.7152 * 50 + 0.0722 * 60) / 2,
      5,
    );
  });
});

describe('isCoveredLens', () => {
  it('detects a black, low-variance frame with defaults', () => {
    const stats = luminanceStats(new Uint8ClampedArray([0, 0, 0, 255]));
    expect(isCoveredLens(stats)).toBe(true);
  });

  it('rejects a bright frame', () => {
    const stats = luminanceStats(new Uint8ClampedArray([255, 255, 255, 255]));
    expect(isCoveredLens(stats)).toBe(false);
  });

  it('rejects a dark but noisy frame', () => {
    const stats = {
      mean: 5,
      variance: 500,
      min: 0,
      max: 40,
      sampleCount: 2,
    };
    expect(isCoveredLens(stats)).toBe(false);
  });

  it('honors explicit thresholds', () => {
    const stats = {
      mean: 20,
      variance: 50,
      min: 0,
      max: 40,
      sampleCount: 2,
    };
    expect(isCoveredLens(stats, { luminanceThreshold: 25, varianceThreshold: 100 })).toBe(true);
    expect(isCoveredLens(stats, { luminanceThreshold: 10, varianceThreshold: 100 })).toBe(false);
  });
});

describe('isFrameStalled', () => {
  it('is true when there are no frames', () => {
    expect(isFrameStalled([], 1000)).toBe(true);
  });

  it('is false when the last frame is recent', () => {
    expect(isFrameStalled([950], 1000, 100)).toBe(false);
  });

  it('is true when the last frame is older than the timeout', () => {
    expect(isFrameStalled([0], 2000, 1000)).toBe(true);
  });

  it('uses the default timeout', () => {
    expect(isFrameStalled([0], 1500)).toBe(true);
    expect(isFrameStalled([1400], 1500)).toBe(false);
  });
});

describe('frameDifference', () => {
  it('is zero for identical frames', () => {
    const frame = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]);
    expect(frameDifference(frame, frame.slice())).toBe(0);
  });

  it('measures luminance differences', () => {
    const a = new Uint8ClampedArray([0, 0, 0, 255]);
    const b = new Uint8ClampedArray([255, 255, 255, 255]);
    expect(frameDifference(a, b)).toBeCloseTo(255, 5);
  });

  it('is small for noisy but live frames', () => {
    const base = new Uint8ClampedArray([100, 100, 100, 255]);
    const noisy = new Uint8ClampedArray([102, 99, 101, 255]);
    expect(frameDifference(base, noisy)).toBeLessThan(2);
  });

  it('returns infinity for different-sized buffers', () => {
    const a = new Uint8ClampedArray([0, 0, 0, 255]);
    const b = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]);
    expect(frameDifference(a, b)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('isStaticFrame', () => {
  it('is false without enough samples', () => {
    expect(isStaticFrame([0.1, 0.2])).toBe(false);
  });

  it('detects a static sequence', () => {
    expect(isStaticFrame([5, 0.1, 0.2, 0.1])).toBe(true);
  });

  it('rejects a noisy but live sequence', () => {
    expect(isStaticFrame([0.1, 2.5, 3.1, 2.8], 2, 3)).toBe(false);
  });

  it('only checks the trailing samples', () => {
    expect(isStaticFrame([10, 10, 0.1, 0.2, 0.1], 2, 3)).toBe(true);
  });

  it('honors explicit epsilon and count', () => {
    expect(isStaticFrame([0.5, 0.5, 0.5], 0.25, 3)).toBe(false);
    expect(isStaticFrame([0.5, 0.5, 0.5], 1, 2)).toBe(true);
  });
});
