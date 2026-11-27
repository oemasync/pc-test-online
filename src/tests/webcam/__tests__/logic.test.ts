import { describe, expect, it } from 'vitest';

import {
  detectFrozenFrames,
  estimateFps,
  isNearBlack,
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

  it('accepts an object wrapping pixel data', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255]);
    expect(luminanceStats({ data }).sampleCount).toBe(1);
  });
});

describe('isNearBlack', () => {
  it('uses the default luminance threshold', () => {
    expect(isNearBlack({ mean: 0, variance: 0, min: 0, max: 0, sampleCount: 1 })).toBe(true);
    expect(isNearBlack({ mean: 10, variance: 0, min: 10, max: 10, sampleCount: 1 })).toBe(true);
    expect(isNearBlack({ mean: 11, variance: 0, min: 11, max: 11, sampleCount: 1 })).toBe(false);
  });

  it('accepts a numeric threshold', () => {
    const stats = { mean: 20, variance: 0, min: 20, max: 20, sampleCount: 1 };
    expect(isNearBlack(stats, 20)).toBe(true);
    expect(isNearBlack(stats, 19)).toBe(false);
  });

  it('can require low variance', () => {
    const stats = { mean: 5, variance: 100, min: 0, max: 20, sampleCount: 2 };
    expect(isNearBlack(stats, { luminanceThreshold: 10, varianceThreshold: 50 })).toBe(false);
    expect(isNearBlack(stats, { luminanceThreshold: 10, varianceThreshold: 200 })).toBe(true);
  });
});

describe('detectFrozenFrames', () => {
  it('returns false with no samples', () => {
    expect(detectFrozenFrames([])).toEqual({
      frozen: false,
      identicalCount: 0,
      sampleCount: 0,
    });
  });

  it('counts one non-frozen sample', () => {
    const frame = new Uint8ClampedArray([1, 2, 3, 4]);
    expect(detectFrozenFrames([frame])).toMatchObject({
      frozen: false,
      identicalCount: 1,
      sampleCount: 1,
    });
  });

  it('detects three identical byte buffers', () => {
    const frame = new Uint8ClampedArray([1, 2, 3, 4]);
    const result = detectFrozenFrames([frame, frame.slice(), frame.slice()], 3);

    expect(result.frozen).toBe(true);
    expect(result.identicalCount).toBe(3);
  });

  it('does not count a changed trailing frame', () => {
    const first = new Uint8ClampedArray([1, 2, 3, 4]);
    const changed = new Uint8ClampedArray([1, 2, 3, 5]);
    const result = detectFrozenFrames([first, first.slice(), changed], 3);

    expect(result.frozen).toBe(false);
    expect(result.identicalCount).toBe(1);
  });

  it('stops counting at the first differing older frame', () => {
    const frame = new Uint8ClampedArray([1, 2, 3, 4]);
    const other = new Uint8ClampedArray([9, 9, 9, 9]);
    const result = detectFrozenFrames([other, frame, frame], 3);

    expect(result.frozen).toBe(false);
    expect(result.identicalCount).toBe(2);
  });

  it('supports numeric fingerprints', () => {
    expect(detectFrozenFrames([42, 42, 42], 2).frozen).toBe(true);
    expect(detectFrozenFrames([42, 41, 42], 2).frozen).toBe(false);
  });

  it('requires at least the configured number of samples', () => {
    const frame = new Uint8ClampedArray([1, 2, 3, 4]);
    expect(detectFrozenFrames([frame, frame], 3).frozen).toBe(false);
  });
});
