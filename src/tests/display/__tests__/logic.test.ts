import { describe, expect, it } from 'vitest';

import {
    DISPLAY_COLORS,
    advanceColorSequence,
    buildDisplayDetails,
    createColorSequenceState,
    displayCapabilityFromMediaQueries,
    estimateRefreshRate,
    frameIntervalsFromTimestamps,
    jitterStats,
    nearestStandardRate,
    nextColorIndex,
    normalizeColorIndex,
    normalizeDevicePixelRatio,
    previousColorIndex,
    removeOutlierIntervals,
    selectColorIndex,
} from '../logic';

describe('display color sequence', () => {
    it('starts on black', () => {
        expect(createColorSequenceState()).toEqual({ index: 0, color: 'black' });
    });

    it('wraps forward and backward', () => {
        expect(nextColorIndex(5)).toBe(0);
        expect(previousColorIndex(0)).toBe(5);
        expect(nextColorIndex(2)).toBe(3);
    });

    it('clamps direct selection instead of wrapping', () => {
        expect(selectColorIndex(-10)).toBe(0);
        expect(selectColorIndex(2)).toBe(2);
        expect(selectColorIndex(99)).toBe(DISPLAY_COLORS.length - 1);
    });

    it('advances through keyboard/click events', () => {
        const start = createColorSequenceState(0);

        const next = advanceColorSequence(start, { type: 'next' });
        expect(next).toEqual({ index: 1, color: 'white' });

        const wrapped = advanceColorSequence(createColorSequenceState(5), { type: 'next' });
        expect(wrapped).toEqual({ index: 0, color: 'black' });

        const selected = advanceColorSequence(start, { type: 'select', index: 4 });
        expect(selected).toEqual({ index: 4, color: 'blue' });

        const reset = advanceColorSequence(selected, { type: 'reset' });
        expect(reset).toEqual({ index: 0, color: 'black' });
    });

    it('normalizes non-finite and negative indices', () => {
        expect(normalizeColorIndex(-1)).toBe(DISPLAY_COLORS.length - 1);
    });
});

describe('refresh-rate estimation', () => {
    it('converts timestamps to positive intervals', () => {
        expect(frameIntervalsFromTimestamps([0, 16, 32, 32, 48])).toEqual([16, 16, 16]);
    });

    it('rejects outlier intervals and estimates 60 Hz', () => {
        const intervals = [16.6, 16.7, 16.6, 16.7, 33.3, 16.6];
        const estimate = estimateRefreshRate(intervals);

        expect(estimate.sampleCount).toBe(6);
        expect(estimate.rejectedCount).toBe(1);
        expect(estimate.acceptedCount).toBe(5);
        expect(estimate.medianIntervalMs).toBeCloseTo(16.6, 5);
        expect(estimate.estimatedHz).toBeCloseTo(60.24, 2);
        expect(estimate.nearestStandardHz).toBe(60);
    });

    it('returns nulls for no valid samples', () => {
        const estimate = estimateRefreshRate([]);

        expect(estimate.sampleCount).toBe(0);
        expect(estimate.acceptedCount).toBe(0);
        expect(estimate.medianIntervalMs).toBeNull();
        expect(estimate.estimatedHz).toBeNull();
        expect(estimate.nearestStandardHz).toBeNull();
    });

    it('estimates 50 Hz from a PAL-region frame stream', () => {
        const estimate = estimateRefreshRate([20, 20, 20, 20, 40]);

        expect(estimate.rejectedCount).toBe(1);
        expect(estimate.nearestStandardHz).toBe(50);
    });

    it('estimates 165 Hz when a few frames are dropped', () => {
        const estimate = estimateRefreshRate([6, 6, 6, 12, 6]);

        expect(estimate.rejectedCount).toBe(1);
        expect(estimate.nearestStandardHz).toBe(165);
    });
    it('maps common rates to the nearest standard rate', () => {
        expect(nearestStandardRate(143.8)).toBe(144);
        expect(nearestStandardRate(239.5)).toBe(240);
        expect(nearestStandardRate(59.94)).toBe(60);
        expect(nearestStandardRate(0)).toBeNull();
    });

    it('returns short interval lists unchanged', () => {
        expect(removeOutlierIntervals([16, 17])).toEqual([16, 17]);
    });

    it('converts an empty timestamp list', () => {
        expect(frameIntervalsFromTimestamps([])).toEqual([]);
    });

    it('removes a doubled frame without removing normal jitter', () => {
        const accepted = removeOutlierIntervals([16.0, 16.2, 16.1, 32.5, 16.3]);

        expect(accepted).toHaveLength(4);
        expect(accepted).not.toContain(32.5);
    });
});

describe('jitter statistics', () => {
    it('computes central tendency, spread, and p95', () => {
        const stats = jitterStats([10, 20, 30]);

        expect(stats.count).toBe(3);
        expect(stats.minMs).toBe(10);
        expect(stats.maxMs).toBe(30);
        expect(stats.standardDeviationMs).toBeCloseTo(8.1649658, 6);
    });

    it('returns empty stats for no samples', () => {
        const stats = jitterStats([]);

        expect(stats.count).toBe(0);
        expect(stats.standardDeviationMs).toBeNull();
    });
});

describe('display capabilities', () => {
    it('classifies HDR and wide gamut from media-query booleans', () => {
        const capability = displayCapabilityFromMediaQueries({
            dynamicRangeHigh: true,
            colorGamutP3: true,
            colorGamutRec2020: false,
        });

        expect(capability).toEqual({
            dynamicRange: 'high',
            colorGamut: 'p3',
        });
    });

    it('falls back to standard sRGB', () => {
        const capability = displayCapabilityFromMediaQueries({
            dynamicRangeHigh: false,
            colorGamutP3: false,
            colorGamutRec2020: false,
        });

        expect(capability.dynamicRange).toBe('standard');
        expect(capability.colorGamut).toBe('srgb');
    });
});

describe('device pixel helpers', () => {
    it('normalizes invalid ratios to 1', () => {
        expect(normalizeDevicePixelRatio(0)).toBe(1);
        expect(normalizeDevicePixelRatio(Number.NaN)).toBe(1);
        expect(normalizeDevicePixelRatio(2)).toBe(2);
    });
});

describe('display details', () => {
    it('records refresh, jitter, capability, and defect data', () => {
        const refresh = estimateRefreshRate([16.6, 16.7, 16.6, 33.3]);
        const jitter = jitterStats([16.6, 16.7, 16.6]);
        const capability = displayCapabilityFromMediaQueries({
            dynamicRangeHigh: true,
            colorGamutP3: true,
            colorGamutRec2020: false,
        });

        const details = buildDisplayDetails({
            colorsTested: 6,
            defectsFound: 2,
            defectColors: ['red', 'blue'],
            refresh,
            jitter,
            capability,
            devicePixelRatio: 2,
            fullscreenSupported: true,
            gradientBandingObserved: false,
            backlightBleedObserved: true,
            sharpnessDefectObserved: false,
        });

        expect(details.colorsTested).toBe(6);
        expect(details.defectsFound).toBe(2);
        expect(details.defectColors).toBe('red,blue');
        expect(details.nearestStandardRefreshRateHz).toBe(60);
        expect(details.dynamicRange).toBe('high');
        expect(details.colorGamut).toBe('p3');
        expect(details.devicePixelRatio).toBe(2);
        expect(details.fullscreenSupported).toBe(true);
        expect(details.backlightBleedObserved).toBe(true);
    });
});
