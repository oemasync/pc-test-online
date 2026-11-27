// Framework-free logic for the display test module.
// No Vue, DOM, or src/core imports: these functions are pure and unit-testable.

export const DISPLAY_COLORS = ['black', 'white', 'red', 'green', 'blue', 'gray'] as const;

export type DisplayColor = (typeof DISPLAY_COLORS)[number];

export interface ColorSequenceState {
  readonly index: number;
  readonly color: DisplayColor;
}

export type ColorSequenceEvent =
  | { readonly type: 'next' }
  | { readonly type: 'previous' }
  | { readonly type: 'select'; readonly index: number }
  | { readonly type: 'reset' };

export const STANDARD_REFRESH_RATES = [60, 75, 90, 100, 120, 144, 165, 240, 360] as const;

export type StandardRefreshRate = (typeof STANDARD_REFRESH_RATES)[number];

export interface RefreshRateEstimate {
  readonly sampleCount: number;
  readonly acceptedCount: number;
  readonly rejectedCount: number;
  readonly medianIntervalMs: number | null;
  readonly estimatedHz: number | null;
  readonly nearestStandardHz: StandardRefreshRate | null;
}

export interface JitterStats {
  readonly count: number;
  readonly meanMs: number | null;
  readonly medianMs: number | null;
  readonly minMs: number | null;
  readonly maxMs: number | null;
  readonly rangeMs: number | null;
  readonly standardDeviationMs: number | null;
  readonly meanAbsoluteDeviationMs: number | null;
  readonly jitterMs: number | null;
  readonly p95Ms: number | null;
}

export type DynamicRange = 'standard' | 'high';

export type ColorGamut = 'srgb' | 'p3' | 'rec2020';

export interface MediaQuerySnapshot {
  readonly dynamicRangeHigh: boolean;
  readonly colorGamutP3: boolean;
  readonly colorGamutRec2020: boolean;
}

export interface DisplayCapability {
  readonly dynamicRange: DynamicRange;
  readonly colorGamut: ColorGamut;
  readonly hdrLikely: boolean;
}

export interface DisplayDetailsInput {
  readonly colorsTested?: number;
  readonly defectsFound?: number;
  readonly defectColors?: readonly DisplayColor[];
  readonly refresh?: RefreshRateEstimate | null;
  readonly jitter?: JitterStats | null;
  readonly capability?: DisplayCapability | null;
  readonly devicePixelRatio?: number;
  readonly fullscreenSupported?: boolean;
  readonly gradientBandingObserved?: boolean;
  readonly backlightBleedObserved?: boolean;
  readonly sharpnessDefectObserved?: boolean;
}

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle] as number;
  }

  return ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

export function normalizeColorIndex(index: number, length: number = DISPLAY_COLORS.length): number {
  const safeLength = Number.isFinite(length) ? Math.trunc(length) : 0;

  if (safeLength <= 0) {
    return 0;
  }

  const safeIndex = Number.isFinite(index) ? Math.trunc(index) : 0;
  const remainder = safeIndex % safeLength;

  return remainder < 0 ? remainder + safeLength : remainder;
}

export function createColorSequenceState(index: number = 0): ColorSequenceState {
  const normalizedIndex = normalizeColorIndex(index);

  return {
    index: normalizedIndex,
    color: DISPLAY_COLORS[normalizedIndex] as DisplayColor,
  };
}

export function nextColorIndex(current: number): number {
  return normalizeColorIndex(current + 1);
}

export function previousColorIndex(current: number): number {
  return normalizeColorIndex(current - 1);
}

export function selectColorIndex(index: number): number {
  if (!Number.isFinite(index)) {
    return 0;
  }

  const truncated = Math.trunc(index);

  if (truncated < 0) {
    return 0;
  }

  if (truncated >= DISPLAY_COLORS.length) {
    return DISPLAY_COLORS.length - 1;
  }

  return truncated;
}

export function advanceColorSequence(
  state: ColorSequenceState,
  event: ColorSequenceEvent,
): ColorSequenceState {
  switch (event.type) {
    case 'next':
      return createColorSequenceState(nextColorIndex(state.index));
    case 'previous':
      return createColorSequenceState(previousColorIndex(state.index));
    case 'select':
      return createColorSequenceState(selectColorIndex(event.index));
    case 'reset':
      return createColorSequenceState(0);
    default: {
      const exhaustive: never = event;
      throw new Error(`Unsupported color sequence event: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function frameIntervalsFromTimestamps(timestamps: readonly number[]): number[] {
  const intervals: number[] = [];

  for (let index = 1; index < timestamps.length; index += 1) {
    const previous = timestamps[index - 1];
    const current = timestamps[index];

    if (previous === undefined || current === undefined) {
      continue;
    }

    const delta = current - previous;

    if (Number.isFinite(delta) && delta > 0) {
      intervals.push(delta);
    }
  }

  return intervals;
}

export function removeOutlierIntervals(intervals: readonly number[]): number[] {
  const valid = intervals.filter(isFinitePositive);

  if (valid.length < 3) {
    return [...valid];
  }

  const center = median(valid);
  const deviations = valid.map((value) => Math.abs(value - center)).sort((left, right) => left - right);
  const mad = median(deviations);

  let accepted: number[];

  if (mad > 0) {
    const threshold = (3.5 * mad) / 0.6745;
    accepted = valid.filter((value) => Math.abs(value - center) <= threshold);
  } else {
    const tolerance = Math.max(center * 0.1, 1);
    accepted = valid.filter((value) => Math.abs(value - center) <= tolerance);
  }

  return accepted.length > 0 ? accepted : [...valid];
}

export function estimateRefreshRate(intervals: readonly number[]): RefreshRateEstimate {
  const valid = intervals.filter(isFinitePositive);
  const accepted = removeOutlierIntervals(valid);
  const medianIntervalMs = accepted.length > 0 ? median(accepted) : null;
  const estimatedHz =
    medianIntervalMs !== null && medianIntervalMs > 0 ? 1000 / medianIntervalMs : null;

  return {
    sampleCount: valid.length,
    acceptedCount: accepted.length,
    rejectedCount: valid.length - accepted.length,
    medianIntervalMs,
    estimatedHz,
    nearestStandardHz: estimatedHz === null ? null : nearestStandardRate(estimatedHz),
  };
}

export function nearestStandardRate(hz: number | null | undefined): StandardRefreshRate | null {
  if (typeof hz !== 'number' || !Number.isFinite(hz) || hz <= 0) {
    return null;
  }

  let nearest: StandardRefreshRate = STANDARD_REFRESH_RATES[0];
  let bestDistance = Math.abs(hz - nearest);

  for (const rate of STANDARD_REFRESH_RATES) {
    const distance = Math.abs(hz - rate);

    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = rate;
    }
  }

  return nearest;
}

export function jitterStats(intervals: readonly number[]): JitterStats {
  const valid = intervals.filter(isFinitePositive);

  if (valid.length === 0) {
    return {
      count: 0,
      meanMs: null,
      medianMs: null,
      minMs: null,
      maxMs: null,
      rangeMs: null,
      standardDeviationMs: null,
      meanAbsoluteDeviationMs: null,
      jitterMs: null,
      p95Ms: null,
    };
  }

  const count = valid.length;
  const sorted = [...valid].sort((left, right) => left - right);
  const sum = valid.reduce((accumulator, value) => accumulator + value, 0);
  const meanMs = sum / count;
  const medianValue = median(valid);
  const variance = valid.reduce((accumulator, value) => {
    const delta = value - meanMs;
    return accumulator + delta * delta;
  }, 0) / count;
  const standardDeviationMs = Math.sqrt(variance);
  const meanAbsoluteDeviationMs =
    valid.reduce((accumulator, value) => accumulator + Math.abs(value - medianValue), 0) / count;
  const p95Index = Math.ceil(0.95 * count) - 1;

  return {
    count,
    meanMs,
    medianMs: medianValue,
    minMs: sorted[0] as number,
    maxMs: sorted[count - 1] as number,
    rangeMs: (sorted[count - 1] as number) - (sorted[0] as number),
    standardDeviationMs,
    meanAbsoluteDeviationMs,
    jitterMs: standardDeviationMs,
    p95Ms: sorted[Math.max(0, Math.min(count - 1, p95Index))] as number,
  };
}

export function displayCapabilityFromMediaQueries(snapshot: MediaQuerySnapshot): DisplayCapability {
  const dynamicRange: DynamicRange = snapshot.dynamicRangeHigh ? 'high' : 'standard';
  const colorGamut: ColorGamut = snapshot.colorGamutRec2020
    ? 'rec2020'
    : snapshot.colorGamutP3
      ? 'p3'
      : 'srgb';

  return {
    dynamicRange,
    colorGamut,
    hdrLikely: dynamicRange === 'high' && colorGamut !== 'srgb',
  };
}

export function normalizeDevicePixelRatio(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return value;
}

export function cssPixelsPerDevicePixel(devicePixelRatio: number): number {
  return 1 / normalizeDevicePixelRatio(devicePixelRatio);
}

export function devicePixels(cssPixels: number, devicePixelRatio: number): number {
  if (!Number.isFinite(cssPixels)) {
    return 0;
  }

  return cssPixels * normalizeDevicePixelRatio(devicePixelRatio);
}

export function buildDisplayDetails(input: DisplayDetailsInput): Record<string, string | number | boolean> {
  const details: Record<string, string | number | boolean> = {};

  if (input.colorsTested !== undefined) {
    details.colorsTested = input.colorsTested;
  }

  if (input.defectsFound !== undefined) {
    details.defectsFound = input.defectsFound;
  }

  if (input.defectColors !== undefined) {
    details.defectColors = input.defectColors.join(',');
  }

  if (input.refresh !== undefined && input.refresh !== null) {
    if (input.refresh.estimatedHz !== null) {
      details.refreshRateHz = input.refresh.estimatedHz;
    }

    if (input.refresh.nearestStandardHz !== null) {
      details.nearestStandardRefreshRateHz = input.refresh.nearestStandardHz;
    }

    details.frameSampleCount = input.refresh.sampleCount;
    details.rejectedFrameCount = input.refresh.rejectedCount;

    if (input.refresh.medianIntervalMs !== null) {
      details.medianFrameIntervalMs = input.refresh.medianIntervalMs;
    }
  }

  if (input.jitter !== undefined && input.jitter !== null) {
    if (input.jitter.jitterMs !== null) {
      details.jitterMs = input.jitter.jitterMs;
    }

    if (input.jitter.minMs !== null) {
      details.minFrameIntervalMs = input.jitter.minMs;
    }

    if (input.jitter.maxMs !== null) {
      details.maxFrameIntervalMs = input.jitter.maxMs;
    }
  }

  if (input.capability !== undefined && input.capability !== null) {
    details.dynamicRange = input.capability.dynamicRange;
    details.colorGamut = input.capability.colorGamut;
  }

  if (input.devicePixelRatio !== undefined) {
    details.devicePixelRatio = normalizeDevicePixelRatio(input.devicePixelRatio);
  }

  if (input.fullscreenSupported !== undefined) {
    details.fullscreenSupported = input.fullscreenSupported;
  }

  if (input.gradientBandingObserved !== undefined) {
    details.gradientBandingObserved = input.gradientBandingObserved;
  }

  if (input.backlightBleedObserved !== undefined) {
    details.backlightBleedObserved = input.backlightBleedObserved;
  }

  if (input.sharpnessDefectObserved !== undefined) {
    details.sharpnessDefectObserved = input.sharpnessDefectObserved;
  }

  return details;
}