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

export const STANDARD_REFRESH_RATES = [
    48, 50, 60, 75, 85, 90, 100, 120, 144, 165, 240, 360,
] as const;

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
    readonly minMs: number | null;
    readonly maxMs: number | null;
    readonly standardDeviationMs: number | null;
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
}

export interface DisplayDetailsInput {
    readonly colorsTested?: number;
    readonly defectsFound?: number;
    readonly defectColors?: readonly DisplayColor[];
    readonly refresh?: RefreshRateEstimate;
    readonly jitter?: JitterStats;
    readonly capability?: DisplayCapability;
    readonly devicePixelRatio?: number;
    readonly fullscreenSupported?: boolean;
    readonly gradientBandingObserved?: boolean;
    readonly backlightBleedObserved?: boolean;
    readonly sharpnessDefectObserved?: boolean;
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

export function normalizeColorIndex(index: number): number {
    const remainder = Math.trunc(index) % DISPLAY_COLORS.length;

    return remainder < 0 ? remainder + DISPLAY_COLORS.length : remainder;
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
    event: ColorSequenceEvent
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
    if (intervals.length < 3) {
        return [...intervals];
    }

    const center = median(intervals);
    const deviations = [...intervals]
        .map(value => Math.abs(value - center))
        .sort((left, right) => left - right);
    const mad = median(deviations);

    let accepted: number[];

    if (mad > 0) {
        const threshold = (3.5 * mad) / 0.6745;
        accepted = [...intervals].filter(value => Math.abs(value - center) <= threshold);
    } else {
        const tolerance = Math.max(center * 0.1, 1);
        accepted = [...intervals].filter(value => Math.abs(value - center) <= tolerance);
    }

    return accepted.length > 0 ? accepted : [...intervals];
}

export function estimateRefreshRate(intervals: readonly number[]): RefreshRateEstimate {
    const accepted = removeOutlierIntervals(intervals);
    const medianIntervalMs = accepted.length > 0 ? median(accepted) : null;
    const estimatedHz =
        medianIntervalMs !== null && medianIntervalMs > 0 ? 1000 / medianIntervalMs : null;

    return {
        sampleCount: intervals.length,
        acceptedCount: accepted.length,
        rejectedCount: intervals.length - accepted.length,
        medianIntervalMs,
        estimatedHz,
        nearestStandardHz: estimatedHz === null ? null : nearestStandardRate(estimatedHz),
    };
}

export function nearestStandardRate(hz: number): StandardRefreshRate | null {
    if (hz <= 0) {
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
    if (intervals.length === 0) {
        return {
            count: 0,
            minMs: null,
            maxMs: null,
            standardDeviationMs: null,
        };
    }

    const count = intervals.length;
    const sorted = [...intervals].sort((left, right) => left - right);
    const mean = intervals.reduce((accumulator, value) => accumulator + value, 0) / count;
    const variance =
        intervals.reduce((accumulator, value) => {
            const delta = value - mean;
            return accumulator + delta * delta;
        }, 0) / count;

    return {
        count,
        minMs: sorted[0] as number,
        maxMs: sorted[count - 1] as number,
        standardDeviationMs: Math.sqrt(variance),
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
    };
}

export function normalizeDevicePixelRatio(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
        return 1;
    }

    return value;
}

export function buildDisplayDetails(
    input: DisplayDetailsInput
): Record<string, string | number | boolean> {
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

    if (input.refresh !== undefined) {
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

    if (input.jitter !== undefined) {
        if (input.jitter.standardDeviationMs !== null) {
            details.jitterMs = input.jitter.standardDeviationMs;
        }

        if (input.jitter.minMs !== null) {
            details.minFrameIntervalMs = input.jitter.minMs;
        }

        if (input.jitter.maxMs !== null) {
            details.maxFrameIntervalMs = input.jitter.maxMs;
        }
    }

    if (input.capability !== undefined) {
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
