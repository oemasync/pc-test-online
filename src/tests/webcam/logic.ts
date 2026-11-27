/**
 * Pure helpers for the webcam test module.
 *
 * These functions contain all non-trivial computation for the module. They have
 * no Vue or application-shell dependencies and operate only on plain data.
 */

export interface LuminanceStats {
  readonly mean: number;
  readonly variance: number;
  readonly min: number;
  readonly max: number;
  readonly sampleCount: number;
}

export interface CoveredLensOptions {
  readonly luminanceThreshold?: number;
  readonly varianceThreshold?: number;
}

const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;
const DEFAULT_COVERED_LENS_LUMINANCE_THRESHOLD = 10;
const DEFAULT_COVERED_LENS_VARIANCE_THRESHOLD = 100;
const DEFAULT_STALL_TIMEOUT_MS = 1000;
const DEFAULT_STATIC_EPSILON = 0.25;
const DEFAULT_STATIC_FRAME_COUNT = 30;

function luma(data: Uint8ClampedArray, offset: number): number {
  return (
    RED_WEIGHT * (data[offset] as number) +
    GREEN_WEIGHT * (data[offset + 1] as number) +
    BLUE_WEIGHT * (data[offset + 2] as number)
  );
}

/**
 * Estimate a frame rate in frames per second from frame timestamps.
 *
 * Uses the median interval in the supplied window so one long stall does not
 * skew the live readout. Timestamps are expected to be in milliseconds.
 */
export function estimateFps(timestamps: readonly number[]): number {
  if (timestamps.length < 2) {
    return 0;
  }

  const intervals: number[] = [];
  for (let index = 1; index < timestamps.length; index += 1) {
    intervals.push((timestamps[index] as number) - (timestamps[index - 1] as number));
  }

  intervals.sort((left, right) => left - right);
  const middle = Math.floor(intervals.length / 2);
  const medianInterval =
    intervals.length % 2 === 1
      ? (intervals[middle] as number)
      : ((intervals[middle - 1] as number) + (intervals[middle] as number)) / 2;

  if (medianInterval <= 0) {
    return 0;
  }

  return 1000 / medianInterval;
}

/**
 * Compute luminance statistics for an RGBA pixel buffer in one pass.
 */
export function luminanceStats(data: Uint8ClampedArray): LuminanceStats {
  const pixelCount = Math.floor(data.length / 4);

  if (pixelCount === 0) {
    return {
      mean: 0,
      variance: 0,
      min: 0,
      max: 0,
      sampleCount: 0,
    };
  }

  let count = 0;
  let mean = 0;
  let squaredDeviationSum = 0;
  let min = 255;
  let max = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    const luminance = luma(data, offset);

    count += 1;
    const delta = luminance - mean;
    mean += delta / count;
    const deltaAfterMean = luminance - mean;
    squaredDeviationSum += delta * deltaAfterMean;

    if (luminance < min) {
      min = luminance;
    }
    if (luminance > max) {
      max = luminance;
    }
  }

  return {
    mean,
    variance: squaredDeviationSum / count,
    min,
    max,
    sampleCount: count,
  };
}

/**
 * Report whether a frame looks like a covered lens: near-black and low variance.
 */
export function isCoveredLens(
  stats: LuminanceStats,
  options: CoveredLensOptions = {},
): boolean {
  const luminanceThreshold =
    options.luminanceThreshold ?? DEFAULT_COVERED_LENS_LUMINANCE_THRESHOLD;
  const varianceThreshold =
    options.varianceThreshold ?? DEFAULT_COVERED_LENS_VARIANCE_THRESHOLD;

  return (
    stats.mean <= luminanceThreshold &&
    stats.variance <= varianceThreshold
  );
}

/**
 * Report whether frame presentation has stalled.
 */
export function isFrameStalled(
  timestamps: readonly number[],
  now: number,
  stallTimeoutMs: number = DEFAULT_STALL_TIMEOUT_MS,
): boolean {
  if (timestamps.length === 0) {
    return true;
  }

  const last = timestamps[timestamps.length - 1] as number;
  return now - last > stallTimeoutMs;
}

/**
 * Mean absolute luminance difference between two RGBA buffers.
 */
export function frameDifference(
  a: Uint8ClampedArray,
  b: Uint8ClampedArray,
): number {
  const pixelCountA = Math.floor(a.length / 4);
  const pixelCountB = Math.floor(b.length / 4);

  if (pixelCountA !== pixelCountB) {
    return Number.POSITIVE_INFINITY;
  }

  if (pixelCountA === 0) {
    return 0;
  }

  let sum = 0;

  for (let index = 0; index < pixelCountA; index += 1) {
    const offset = index * 4;
    sum += Math.abs(luma(a, offset) - luma(b, offset));
  }

  return sum / pixelCountA;
}

/**
 * Report whether recent frame differences represent a static image.
 */
export function isStaticFrame(
  differences: readonly number[],
  epsilon: number = DEFAULT_STATIC_EPSILON,
  requiredCount: number = DEFAULT_STATIC_FRAME_COUNT,
): boolean {
  if (differences.length < requiredCount) {
    return false;
  }

  for (let index = differences.length - requiredCount; index < differences.length; index += 1) {
    const difference = differences[index] as number;
    if (difference > epsilon) {
      return false;
    }
  }

  return true;
}
