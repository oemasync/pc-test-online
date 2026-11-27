/**
 * Pure helpers for the microphone test module.
 *
 * These functions contain all non-trivial computation for the module. They have
 * no Vue or application-shell dependencies and operate only on plain data.
 */

export interface PeakHoldState {
  readonly peak: number;
  readonly peakAt: number;
}

export interface PeakHoldOptions {
  readonly holdMs?: number;
  readonly decayDbPerSecond?: number;
}

export type RmsInput =
  | Float32Array
  | Float64Array
  | Uint8Array
  | Uint8ClampedArray
  | readonly number[];

const DEFAULT_CLIP_THRESHOLD = 0.99;
const DEFAULT_SILENCE_THRESHOLD = 1e-6;
const DEFAULT_PEAK_HOLD_MS = 1000;
const DEFAULT_PEAK_DECAY_DB_PER_SECOND = 20;

function toFloatSamples(input: RmsInput): number[] {
  if (input instanceof Uint8Array || input instanceof Uint8ClampedArray) {
    const result: number[] = [];
    for (let i = 0; i < input.length; i += 1) {
      result.push(((input[i] as number) - 128) / 128);
    }
    return result;
  }
  const result: number[] = [];
  for (let i = 0; i < input.length; i += 1) {
    result.push(input[i] as number);
  }
  return result;
}

/**
 * Compute the root-mean-square of a block of time-domain samples.
 *
 * Byte arrays (Uint8Array / Uint8ClampedArray) are interpreted as unsigned
 * 8-bit PCM centred at 128, matching AnalyserNode byte time-domain data.
 * Float arrays are interpreted as signed amplitudes in [-1, 1].
 */
export function computeRms(input: RmsInput): number {
  const samples = toFloatSamples(input);
  if (samples.length === 0) {
    return 0;
  }

  let sumSquares = 0;
  for (const sample of samples) {
    if (!Number.isFinite(sample)) {
      return 0;
    }
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / samples.length);
}

/**
 * Convert an RMS amplitude to decibels relative to full scale (dBFS).
 *
 * Returns -Infinity for an RMS of zero or below.
 */
export function rmsToDbfs(rms: number): number {
  if (!Number.isFinite(rms) || rms <= 0) {
    return Number.NEGATIVE_INFINITY;
  }
  return 20 * Math.log10(rms);
}

/**
 * Create a fresh peak-hold state.
 */
export function createPeakHoldState(): PeakHoldState {
  return { peak: Number.NEGATIVE_INFINITY, peakAt: 0 };
}

/**
 * Peak-hold reducer.
 *
 * Holds the peak level for `holdMs` milliseconds, then decays it at
 * `decayDbPerSecond` decibels per second. The peak never falls below the
 * current level.
 */
export function peakHoldReducer(
  state: PeakHoldState,
  levelDb: number,
  nowMs: number,
  holdMs: number = DEFAULT_PEAK_HOLD_MS,
  decayDbPerSecond: number = DEFAULT_PEAK_DECAY_DB_PER_SECOND,
): PeakHoldState {
  if (!Number.isFinite(levelDb)) {
    return state;
  }
  if (!Number.isFinite(nowMs)) {
    return state;
  }
  const safeHoldMs = Number.isFinite(holdMs) && holdMs >= 0 ? holdMs : 0;
  const safeDecay =
    Number.isFinite(decayDbPerSecond) && decayDbPerSecond >= 0
      ? decayDbPerSecond
      : 0;

  if (!Number.isFinite(state.peak) || levelDb >= state.peak) {
    return { peak: levelDb, peakAt: nowMs };
  }

  const elapsed = nowMs - state.peakAt;
  if (elapsed <= safeHoldMs) {
    return state;
  }

  const decayed =
    state.peak - (safeDecay * (elapsed - safeHoldMs)) / 1000;
  const newPeak = Math.max(decayed, levelDb);

  if (newPeak <= levelDb) {
    return { peak: levelDb, peakAt: nowMs };
  }
  return { peak: newPeak, peakAt: state.peakAt };
}

/**
 * Report whether a single sample is clipping.
 */
export function isClipping(
  sample: number,
  threshold: number = DEFAULT_CLIP_THRESHOLD,
): boolean {
  if (!Number.isFinite(sample)) {
    return false;
  }
  const safeThreshold =
    Number.isFinite(threshold) && threshold > 0 ? threshold : DEFAULT_CLIP_THRESHOLD;
  return Math.abs(sample) >= safeThreshold;
}

/**
 * Count the clipped samples in a block.
 */
export function countClipped(
  input: RmsInput,
  threshold: number = DEFAULT_CLIP_THRESHOLD,
): number {
  const samples = toFloatSamples(input);
  const safeThreshold =
    Number.isFinite(threshold) && threshold > 0 ? threshold : DEFAULT_CLIP_THRESHOLD;
  let count = 0;
  for (const sample of samples) {
    if (Number.isFinite(sample) && Math.abs(sample) >= safeThreshold) {
      count += 1;
    }
  }
  return count;
}

/**
 * Estimate the noise floor (RMS) from samples collected over a quiet window.
 *
 * Uses the minimum RMS observed, which is the standard quiet-window estimator.
 */
export function estimateNoiseFloor(samples: readonly number[]): number {
  if (!Array.isArray(samples) && !ArrayBuffer.isView(samples)) {
    return 0;
  }
  if (samples.length === 0) {
    return 0;
  }

  let min = Number.POSITIVE_INFINITY;
  for (const value of samples) {
    if (!Number.isFinite(value)) {
      continue;
    }
    if (value < min) {
      min = value;
    }
  }
  return Number.isFinite(min) ? min : 0;
}

/**
 * Estimate the noise floor in dBFS from RMS samples.
 */
export function estimateNoiseFloorDbfs(samples: readonly number[]): number {
  return rmsToDbfs(estimateNoiseFloor(samples));
}

/**
 * Detect a sustained silence: the trailing `minConsecutive` RMS values must
 * all be at or below `threshold`.
 */
export function detectSilence(
  rmsValues: readonly number[],
  threshold: number = DEFAULT_SILENCE_THRESHOLD,
  minConsecutive: number = 1,
): boolean {
  if (rmsValues.length === 0) {
    return false;
  }
  const required =
    Number.isInteger(minConsecutive) && minConsecutive > 0 ? minConsecutive : 1;
  if (rmsValues.length < required) {
    return false;
  }
  const safeThreshold =
    Number.isFinite(threshold) && threshold >= 0 ? threshold : 0;

  let consecutive = 0;
  for (let i = rmsValues.length - 1; i >= 0; i -= 1) {
    const value = rmsValues[i] as number;
    if (Number.isFinite(value) && value <= safeThreshold) {
      consecutive += 1;
    } else {
      break;
    }
  }
  return consecutive >= required;
}

/**
 * Frequency of each FFT bin centre in hertz.
 */
export function frequencyBinCentres(
  binCount: number,
  sampleRate: number,
): number[] {
  if (!Number.isFinite(binCount) || binCount <= 0) {
    return [];
  }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    return [];
  }
  const result: number[] = [];
  const nyquist = sampleRate / 2;
  for (let i = 0; i < binCount; i += 1) {
    result.push((i * nyquist) / binCount);
  }
  return result;
}

/**
 * Index of the bin with the largest magnitude.
 */
export function peakBinIndex(magnitudes: readonly number[]): number {
  if (magnitudes.length === 0) {
    return -1;
  }
  let bestIndex = 0;
  let bestValue = magnitudes[0] as number;
  for (let i = 1; i < magnitudes.length; i += 1) {
    const value = magnitudes[i] as number;
    if (Number.isFinite(value) && value > bestValue) {
      bestValue = value;
      bestIndex = i;
    }
  }
  return bestIndex;
}
