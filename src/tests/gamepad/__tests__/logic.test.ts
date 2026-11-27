import { describe, expect, it } from 'vitest';

import {
  applyDeadzone,
  axisDeltas,
  buttonCoverage,
  buttonCoverageReducer,
  changedAxisIndices,
  circularityError,
  detectStickDrift,
  diffAxisSnapshots,
  isAxisDrifting,
  stickOffset,
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

  it('treats a negative deadzone as zero', () => {
    expect(applyDeadzone(0.2, -1)).toBe(0.2);
  });
});

describe('stickOffset and drift detection', () => {
  it('computes the Euclidean resting offset', () => {
    expect(stickOffset(0.3, 0.4)).toBeCloseTo(0.5, 10);
  });

  it('reports drift when the offset exceeds the deadzone', () => {
    const result = detectStickDrift(0.3, 0.4, 0.2);

    expect(result.offset).toBeCloseTo(0.5, 10);
    expect(result.drifting).toBe(true);
  });

  it('does not report drift on the deadzone boundary', () => {
    const result = detectStickDrift(0.2, 0, 0.2);

    expect(result.offset).toBeCloseTo(0.2, 10);
    expect(result.drifting).toBe(false);
  });

  it('detects a drifting single axis', () => {
    expect(isAxisDrifting(0.3, 0.2)).toBe(true);
    expect(isAxisDrifting(0.1, 0.2)).toBe(false);
  });
});

describe('circularityError', () => {
  it('is zero for a perfect unit circle', () => {
    const samples = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
    ];

    expect(circularityError(samples)).toBeCloseTo(0, 10);
  });

  it('measures the average distance from the target radius', () => {
    const samples = [{ x: 0.9, y: 0 }, { x: 0, y: 1.1 }];

    expect(circularityError(samples, 1)).toBeCloseTo(0.1, 10);
  });

  it('returns zero for an empty sample list', () => {
    expect(circularityError([])).toBe(0);
  });
});

describe('buttonCoverageReducer', () => {
  it('marks a button as tested', () => {
    expect(buttonCoverageReducer([false, false, false], 1)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('extends coverage when a higher button index is pressed', () => {
    expect(buttonCoverageReducer([true], 3)).toEqual([true, false, false, true]);
  });

  it('ignores invalid indices', () => {
    expect(buttonCoverageReducer([true, false], -1)).toEqual([true, false]);
    expect(buttonCoverageReducer([true, false], Number.NaN)).toEqual([
      true,
      false,
    ]);
  });

  it('summarizes tested buttons', () => {
    const summary = buttonCoverage([true, false, true, false]);

    expect(summary.testedCount).toBe(2);
    expect(summary.total).toBe(4);
    expect(summary.ratio).toBeCloseTo(0.5, 10);
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

  it('lists changed indices and deltas independently', () => {
    expect(changedAxisIndices([0, 0], [0.1, 0], 0)).toEqual([0]);
    expect(axisDeltas([0, 0.5], [0.25, 0.5])).toEqual([0.25, 0]);
  });
});
