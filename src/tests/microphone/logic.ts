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

export interface SilenceSample {
  readonly t: number;
  readonly rms: number;
}

const DEFAULT_CLIP_THRESHOLD = 0.99;
export const DEFAULT_SILENCE_THRESHOLD = 1e-6;
const DEFAULT_PEAK_HOLD_MS = 1000;
const DEFAULT_PEAK_DECAY_DB_PER_SECOND = 20;
const NOISE_FLOOR_PERCENTILE = 0.1;

/**
 * Compute the root-mean-square of a block of time-domain samples.
 *
 * Samples are signed amplitudes in [-1, 1], as returned by
 * AnalyserNode.getFloatTimeDomainData.
 */
export function computeRms(samples: Float32Array): number {
  if (samples.length === 0) {
    return 0;
  }

  let sumSquares = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i] as number;
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
  if (rms <= 0) {
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
  if (levelDb >= state.peak) {
    return { peak: levelDb, peakAt: nowMs };
  }

  const elapsed = nowMs - state.peakAt;
  if (elapsed <= holdMs) {
    return state;
  }

  const decayed =
    state.peak - (decayDbPerSecond * (elapsed - holdMs)) / 1000;
  const newPeak = Math.max(decayed, levelDb);

  if (newPeak <= levelDb) {
    return { peak: levelDb, peakAt: nowMs };
  }
  return { peak: newPeak, peakAt: state.peakAt };
}

/**
 * Count the clipped samples in a block.
 */
export function countClipped(
  samples: Float32Array,
  threshold: number = DEFAULT_CLIP_THRESHOLD,
): number {
  let count = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i] as number;
    if (Math.abs(sample) >= threshold) {
      count += 1;
    }
  }
  return count;
}

/**
 * Estimate the noise floor (RMS) from RMS values collected over a quiet
 * window. Uses a low percentile so a single near-zero outlier cannot decide
 * the estimate.
 */
export function estimateNoiseFloor(rmsHistory: readonly number[]): number {
  if (rmsHistory.length === 0) {
    return 0;
  }

  const sorted = Array.from(rmsHistory).sort((a, b) => a - b);
  const drop = Math.max(1, Math.floor(sorted.length * NOISE_FLOOR_PERCENTILE));
  const index = Math.min(drop, sorted.length - 1);
  return sorted[index] as number;
}

/**
 * Detect a sustained silence: the trailing run of samples with RMS at or
 * below `thresholdRms` must span at least `durationMs` milliseconds.
 */
export function detectSilence(
  history: readonly SilenceSample[],
  thresholdRms: number,
  durationMs: number,
): boolean {
  if (history.length === 0) {
    return false;
  }

  const lastIndex = history.length - 1;
  if ((history[lastIndex] as SilenceSample).rms > thresholdRms) {
    return false;
  }

  let firstIndex = lastIndex;
  while (firstIndex > 0) {
    const prev = history[firstIndex - 1] as SilenceSample;
    if (prev.rms > thresholdRms) {
      break;
    }
    firstIndex -= 1;
  }

  const span =
    (history[lastIndex] as SilenceSample).t -
    (history[firstIndex] as SilenceSample).t;
  return span >= durationMs;
}

/**
 * Frequency of each FFT bin centre in hertz.
 *
 * The bin width is `sampleRate / fftSize`; `binCount` is typically
 * `fftSize / 2`.
 */
export function frequencyBinCentres(
  binCount: number,
  sampleRate: number,
): number[] {
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
export function peakBinIndex(magnitudes: Float32Array): number {
  if (magnitudes.length === 0) {
    return -1;
  }
  let bestIndex = 0;
  let bestValue = magnitudes[0] as number;
  for (let i = 1; i < magnitudes.length; i += 1) {
    const value = magnitudes[i] as number;
    if (value > bestValue) {
      bestValue = value;
      bestIndex = i;
    }
  }
  return bestIndex;
}
