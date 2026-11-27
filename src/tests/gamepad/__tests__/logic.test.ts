import { describe, expect, it } from 'vitest';

import {
    applyDeadzone,
    buttonCoverage,
    buttonCoverageReducer,
    circularityError,
    createCoverage,
    createTriggerRange,
    detectStickDrift,
    diffAxisSnapshots,
    stickOffset,
    triggerRangeReducer,
} from '../logic';

describe('applyDeadzone', () => {
    it('returns zero inside the deadzone', () => {
        expect(applyDeadzone(0.05, 0.1)).toBe(0);
        expect(applyDeadzone(-0.05, 0.1)).toBe(0);
    });

    it('preserves values outside the deadzone', () => {
        expect(applyDeadzone(0.5, 0.1)).toBe(0.5);
        expect(applyDeadzone(-0.5, 0.1)).toBe(-0.5);
    });
});

describe('stickOffset', () => {
    it('computes the Euclidean offset', () => {
        expect(stickOffset(0.3, 0.4)).toBeCloseTo(0.5, 10);
    });
});

describe('detectStickDrift', () => {
    it('reports a centered noisy stick as not drifting', () => {
        const samples = [
            { x: 0.02, y: -0.01 },
            { x: -0.01, y: 0.02 },
            { x: 0.01, y: 0.01 },
            { x: -0.02, y: -0.01 },
        ];

        const result = detectStickDrift(samples, 0.15);

        expect(result.drifting).toBe(false);
        expect(result.meanOffset).toBeLessThan(0.15);
        expect(result.maxOffset).toBeGreaterThan(0);
        expect(result.noise).toBeGreaterThan(0);
    });

    it('does not report drift for zero-mean noise', () => {
        const samples = Array.from({ length: 200 }, (_, index) => {
            const angle = (2 * Math.PI * index) / 200;
            return { x: 0.08 * Math.cos(angle), y: 0.08 * Math.sin(angle) };
        });

        const result = detectStickDrift(samples, 0.1);

        expect(result.drifting).toBe(false);
        expect(result.meanOffset).toBeLessThan(0.001);
        expect(result.noise).toBeCloseTo(0.08, 2);
    });

    it('reports drift for a biased stick with the same noise', () => {
        const samples = Array.from({ length: 200 }, (_, index) => {
            const angle = (2 * Math.PI * index) / 200;
            return { x: 0.2 + 0.08 * Math.cos(angle), y: 0.08 * Math.sin(angle) };
        });

        const result = detectStickDrift(samples, 0.1);

        expect(result.drifting).toBe(true);
        expect(result.meanOffset).toBeCloseTo(0.2, 2);
    });

    it('reports a biased stick as drifting', () => {
        const samples = [
            { x: 0.3, y: 0.1 },
            { x: 0.32, y: 0.08 },
            { x: 0.28, y: 0.12 },
        ];

        const result = detectStickDrift(samples, 0.15);

        expect(result.drifting).toBe(true);
        expect(result.meanOffset).toBeGreaterThan(0.15);
    });

    it('returns zeroed stats for an empty resting window', () => {
        expect(detectStickDrift([])).toEqual({
            meanOffset: 0,
            maxOffset: 0,
            noise: 0,
            drifting: false,
        });
    });
});

describe('circularityError', () => {
    it('is approximately zero for a full rotation through the center', () => {
        const samples = [{ x: 0, y: 0 }];

        for (let angle = 0; angle < 360; angle += 5) {
            const radians = (angle * Math.PI) / 180;
            samples.push({ x: Math.cos(radians), y: Math.sin(radians) });
        }

        const result = circularityError(samples);

        expect(result.error).toBeCloseTo(0, 10);
        expect(result.coverage).toBe(1);
    });

    it('reports corner error for a squarish envelope', () => {
        const samples = [
            { x: 1, y: 1 },
            { x: -1, y: 1 },
            { x: -1, y: -1 },
            { x: 1, y: -1 },
        ];

        const result = circularityError(samples);

        expect(result.error).toBeCloseTo(Math.sqrt(2) - 1, 10);
        expect(result.coverage).toBeLessThan(0.2);
    });

    it('returns zero for an empty sample list', () => {
        const result = circularityError([]);

        expect(result.error).toBe(0);
        expect(result.coverage).toBe(0);
    });

    it('clamps out-of-range samples to the unit circle', () => {
        const result = circularityError([
            { x: 2, y: 0 },
            { x: 0, y: -2 },
        ]);

        expect(result.error).toBeCloseTo(0, 10);
        expect(result.coverage).toBe(2 / 36);
    });

    it('reports partial coverage for an incomplete rotation', () => {
        const samples = [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
        ];

        const result = circularityError(samples);

        expect(result.coverage).toBeLessThan(0.9);
        expect(result.coveredSectors).toBe(2);
    });
});

describe('button coverage', () => {
    it('initializes from the pad button count', () => {
        expect(createCoverage(4)).toEqual([false, false, false, false]);
        expect(createCoverage(0)).toEqual([]);
    });

    it('marks valid buttons without growing the array', () => {
        const covered = createCoverage(3);

        expect(buttonCoverageReducer(covered, 1)).toEqual([false, true, false]);
        expect(buttonCoverageReducer(covered, 5)).toBe(covered);
        expect(buttonCoverageReducer(covered, -1)).toBe(covered);

        const marked = buttonCoverageReducer(covered, 1);
        expect(buttonCoverageReducer(marked, 1)).toBe(marked);
    });

    it('summarizes an empty coverage array', () => {
        const summary = buttonCoverage([]);

        expect(summary.testedCount).toBe(0);
        expect(summary.total).toBe(0);
        expect(summary.ratio).toBe(0);
    });

    it('summarizes tested buttons', () => {
        const summary = buttonCoverage([true, false, true, false]);

        expect(summary.testedCount).toBe(2);
        expect(summary.total).toBe(4);
        expect(summary.ratio).toBeCloseTo(0.5, 10);
    });
});

describe('trigger range', () => {
    it('tracks min and max and detects the full range', () => {
        let state = createTriggerRange();

        state = triggerRangeReducer(state, 0);
        state = triggerRangeReducer(state, 0.5);
        state = triggerRangeReducer(state, 1);

        expect(state.min).toBe(0);
        expect(state.max).toBe(1);
        expect(state.fullRange).toBe(true);
    });

    it('does not report full range for a partial range', () => {
        let state = createTriggerRange();

        state = triggerRangeReducer(state, 0.2);
        state = triggerRangeReducer(state, 0.8);

        expect(state.fullRange).toBe(false);
    });
});

describe('axis snapshot diffing', () => {
    it('returns changed axes with their deltas', () => {
        const changes = diffAxisSnapshots([0, 0.25, -1], [0, 0.5, -1]);

        expect(changes).toHaveLength(1);
        expect(changes[0]).toMatchObject({
            index: 1,
            previous: 0.25,
            next: 0.5,
            delta: 0.25,
        });
    });

    it('respects an epsilon threshold', () => {
        const changes = diffAxisSnapshots([0, 0.25], [0, 0.26], 0.02);

        expect(changes).toHaveLength(0);
    });

    it('treats missing axes as zero', () => {
        const changes = diffAxisSnapshots([0.5], [0.5, 0.25]);

        expect(changes).toHaveLength(1);
        expect(changes[0]).toMatchObject({ index: 1, previous: 0, next: 0.25 });
    });

    it('treats a shorter next snapshot as zero', () => {
        const changes = diffAxisSnapshots([0, 0.5], [0]);

        expect(changes).toHaveLength(1);
        expect(changes[0]).toMatchObject({ index: 1, previous: 0.5, next: 0 });
    });
});
