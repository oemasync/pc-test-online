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

export interface FrozenFrameResult {
  readonly frozen: boolean;
  readonly identicalCount: number;
  readonly sampleCount: number;
}

export interface NearBlackOptions {
  readonly luminanceThreshold?: number;
  readonly varianceThreshold?: number;
}

export type PixelBufferInput =
  | Uint8ClampedArray
  | Uint8Array
  | { readonly data: Uint8ClampedArray | Uint8Array };

export type FrozenFrameSample = Uint8ClampedArray | Uint8Array | number;

const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;
const DEFAULT_NEAR_BLACK_LUMINANCE = 10;

function pixelData(input: PixelBufferInput): Uint8ClampedArray | Uint8Array {
  if (ArrayBuffer.isView(input)) {
    return input as Uint8ClampedArray | Uint8Array;
  }
  return (input as { readonly data: Uint8ClampedArray | Uint8Array }).data;
}

/**
 * Estimate a frame rate in frames per second from frame timestamps.
 *
 * Timestamps are expected to be in milliseconds, such as the `now` value passed
 * to `requestVideoFrameCallback` or values from `performance.now()`.
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
 * Compute luminance statistics for an RGBA pixel buffer.
 *
 * The buffer is interpreted as groups of four bytes (red, green, blue, alpha).
 * Luminance uses the Rec. 709 luma coefficients. Alpha is ignored.
 */
export function luminanceStats(input: PixelBufferInput): LuminanceStats {
  const data = pixelData(input);
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

  let sum = 0;
  let min = 255;
  let max = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    const red = data[offset] as number;
    const green = data[offset + 1] as number;
    const blue = data[offset + 2] as number;
    const luminance =
      RED_WEIGHT * red + GREEN_WEIGHT * green + BLUE_WEIGHT * blue;

    sum += luminance;
    if (luminance < min) {
      min = luminance;
    }
    if (luminance > max) {
      max = luminance;
    }
  }

  const mean = sum / pixelCount;

  let squaredDeviationSum = 0;
  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    const red = data[offset] as number;
    const green = data[offset + 1] as number;
    const blue = data[offset + 2] as number;
    const luminance =
      RED_WEIGHT * red + GREEN_WEIGHT * green + BLUE_WEIGHT * blue;
    const deviation = luminance - mean;
    squaredDeviationSum += deviation * deviation;
  }

  return {
    mean,
    variance: squaredDeviationSum / pixelCount,
    min,
    max,
    sampleCount: pixelCount,
  };
}

/**
 * Report whether a frame is near-black.
 *
 * A numeric second argument is treated as the luminance threshold. An object
 * may additionally supply a variance threshold.
 */
export function isNearBlack(
  stats: LuminanceStats,
  thresholdOrOptions?: number | NearBlackOptions,
): boolean {
  const options =
    typeof thresholdOrOptions === 'number'
      ? { luminanceThreshold: thresholdOrOptions }
      : thresholdOrOptions ?? {};

  const luminanceThreshold =
    options.luminanceThreshold ?? DEFAULT_NEAR_BLACK_LUMINANCE;
  const nearBlack = stats.mean <= luminanceThreshold;

  if (options.varianceThreshold === undefined) {
    return nearBlack;
  }

  return nearBlack && stats.variance <= options.varianceThreshold;
}

function sameBytes(
  left: Uint8ClampedArray | Uint8Array,
  right: Uint8ClampedArray | Uint8Array,
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

/**
 * Detect whether the trailing samples represent a frozen frame.
 *
 * Buffers are compared byte-for-byte. Numbers are compared by value, which lets
 * callers use a cheap per-frame fingerprint such as mean luminance.
 */
export function detectFrozenFrames(
  frames: readonly FrozenFrameSample[],
  minimumIdentical = 3,
): FrozenFrameResult {
  const sampleCount = frames.length;
  const required =
    Number.isInteger(minimumIdentical) && minimumIdentical > 0
      ? minimumIdentical
      : 1;

  if (sampleCount === 0) {
    return { frozen: false, identicalCount: 0, sampleCount: 0 };
  }

  const last = frames[sampleCount - 1] as FrozenFrameSample;
  let identicalCount = 1;

  for (let index = sampleCount - 2; index >= 0; index -= 1) {
    const candidate = frames[index] as FrozenFrameSample;
    const identical =
      typeof candidate === 'number' && typeof last === 'number'
        ? candidate === last
        : ArrayBuffer.isView(candidate) &&
          ArrayBuffer.isView(last) &&
          sameBytes(
            candidate as Uint8ClampedArray | Uint8Array,
            last as Uint8ClampedArray | Uint8Array,
          );

    if (!identical) {
      break;
    }

    identicalCount += 1;
  }

  return {
    frozen: sampleCount >= required && identicalCount >= required,
    identicalCount,
    sampleCount,
  };
}
