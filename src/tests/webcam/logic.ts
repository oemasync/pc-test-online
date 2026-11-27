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
const DEFAULT_STATIC_EPSILON = 2;
const DEFAULT_STATIC_FRAME_COUNT = 3;

/**
 * Estimate a frame rate in frames per second from frame timestamps.
 *
 * Timestamps are expected to be in milliseconds.
 */
export function estimateFps(timestamps: readonly number[]): number {
  if (timestamps.length < 2) {
    return 0;
  }

  for (const timestamp of timestamps) {
    if (!Number.isFinite(timestamp)) {
      return 0;
    }
  }

  const first = timestamps[0] as number;
  const last = timestamps[timestamps.length - 1] as number;
  const spanMs = last - first;

  if (spanMs <= 0) {
    return 0;
  }

  return ((timestamps.length - 1) * 1000) / spanMs;
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
    const red = data[offset] as number;
    const green = data[offset + 1] as number;
    const blue = data[offset + 2] as number;
    const luminance =
      RED_WEIGHT * red + GREEN_WEIGHT * green + BLUE_WEIGHT * blue;

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

  if (!Number.isFinite(last) || !Number.isFinite(now)) {
    return true;
  }

  const timeout =
    Number.isFinite(stallTimeoutMs) && stallTimeoutMs >= 0
      ? stallTimeoutMs
      : DEFAULT_STALL_TIMEOUT_MS;

  return now - last > timeout;
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
    const offsetA = index * 4;
    const offsetB = index * 4;
    const luminanceA =
      RED_WEIGHT * (a[offsetA] as number) +
      GREEN_WEIGHT * (a[offsetA + 1] as number) +
      BLUE_WEIGHT * (a[offsetA + 2] as number);
    const luminanceB =
      RED_WEIGHT * (b[offsetB] as number) +
      GREEN_WEIGHT * (b[offsetB + 1] as number) +
      BLUE_WEIGHT * (b[offsetB + 2] as number);

    sum += Math.abs(luminanceA - luminanceB);
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
  const count =
    Number.isInteger(requiredCount) && requiredCount > 0
      ? requiredCount
      : DEFAULT_STATIC_FRAME_COUNT;
  const threshold = Number.isFinite(epsilon) ? epsilon : DEFAULT_STATIC_EPSILON;

  if (differences.length < count) {
    return false;
  }

  for (let index = differences.length - count; index < differences.length; index += 1) {
    const difference = differences[index] as number;
    if (!Number.isFinite(difference) || difference > threshold) {
      return false;
    }
  }

  return true;
}
