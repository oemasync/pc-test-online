import { describe, it, expect } from 'vitest';
import {
  median,
  stddev,
  summarizeRuns,
  createScheduler,
  canStart,
  startRun,
  setRunProgress,
  completeRun,
  failRun,
  abortRun,
  isTerminal,
  finalSummary,
} from '../logic';

describe('median', () => {
  it('returns 0 for empty', () => {
    expect(median([])).toBe(0);
  });
  it('middle value for odd count', () => {
    expect(median([1, 2, 3])).toBe(2);
  });
  it('average of two middle for even count', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it('does not mutate input', () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe('stddev', () => {
  it('returns 0 for 0 or 1 values', () => {
    expect(stddev([])).toBe(0);
    expect(stddev([5])).toBe(0);
  });
  it('computes sample stddev', () => {
    // stddev of [2,4,4,4,5,5,7,9] is 2
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 5);
  });
});

describe('summarizeRuns', () => {
  it('empty summary', () => {
    expect(summarizeRuns([])).toEqual({ count: 0, median: 0, stddev: 0, min: 0, max: 0 });
  });
  it('summarizes noisy timings', () => {
    const noisy = [10.2, 9.8, 10.1, 9.9, 10.0, 10.3, 9.7];
    const s = summarizeRuns(noisy);
    expect(s.count).toBe(7);
    expect(s.median).toBeCloseTo(10.0, 5);
    expect(s.stddev).toBeGreaterThan(0);
    expect(s.min).toBeLessThanOrEqual(s.median);
    expect(s.max).toBeGreaterThanOrEqual(s.median);
  });
});

describe('scheduler', () => {
  it('creates idle scheduler', () => {
    const s = createScheduler(3);
    expect(s.status).toBe('idle');
    expect(s.totalRuns).toBe(3);
    expect(s.completed).toEqual([]);
    expect(s.progress).toBe(0);
    expect(canStart(s)).toBe(true);
  });

  it('rejects invalid totalRuns', () => {
    expect(() => createScheduler(0)).toThrow(RangeError);
    expect(() => createScheduler(-1)).toThrow(RangeError);
    expect(() => createScheduler(1.5)).toThrow(RangeError);
  });

  it('startRun transitions to running', () => {
    const s = startRun(createScheduler(2));
    expect(s.status).toBe('running');
    expect(s.currentRun).toBe(0);
    expect(s.progress).toBe(0);
  });

  it('cannot start from completed', () => {
    let s = createScheduler(1);
    s = startRun(s);
    s = completeRun(s, 10);
    expect(s.status).toBe('completed');
    expect(() => startRun(s)).toThrow();
  });

  it('completeRun accumulates and finishes', () => {
    let s = createScheduler(2);
    s = startRun(s);
    s = completeRun(s, 5);
    expect(s.status).toBe('running');
    expect(s.completed).toEqual([5]);
    expect(s.progress).toBe(0.5);
    s = startRun(s);
    s = completeRun(s, 7);
    expect(s.status).toBe('completed');
    expect(s.completed).toEqual([5, 7]);
    expect(s.progress).toBe(1);
    expect(isTerminal(s)).toBe(true);
  });

  it('finalSummary after completion uses median', () => {
    let s = createScheduler(2);
    s = startRun(s);
    s = completeRun(s, 5);
    s = startRun(s);
    s = completeRun(s, 7);
    const fs = finalSummary(s);
    expect(fs).not.toBeNull();
    expect(fs!.median).toBe(6);
    expect(fs!.stddev).toBeCloseTo(1, 5);
  });

  it('setRunProgress updates within-run progress', () => {
    let s = createScheduler(2);
    s = startRun(s);
    s = setRunProgress(s, 0.25);
    expect(s.progress).toBeCloseTo(0.125, 5);
    s = setRunProgress(s, 1.5); // clamped
    expect(s.progress).toBeCloseTo(0.5, 5);
  });

  it('setRunProgress is no-op when not running', () => {
    const s = createScheduler(2);
    const s2 = setRunProgress(s, 0.5);
    expect(s2).toBe(s);
  });

  it('failRun marks failed with error', () => {
    let s = createScheduler(2);
    s = startRun(s);
    s = failRun(s, 'boom');
    expect(s.status).toBe('failed');
    expect(s.error).toBe('boom');
    expect(isTerminal(s)).toBe(true);
  });

  it('abortRun marks aborted and keeps completed', () => {
    let s = createScheduler(3);
    s = startRun(s);
    s = completeRun(s, 9);
    s = abortRun(s, 'user');
    expect(s.status).toBe('aborted');
    expect(s.completed).toEqual([9]);
    expect(s.abortReason).toBe('user');
    expect(s.progress).toBeCloseTo(1 / 3, 5);
  });

  it('finalSummary null while idle', () => {
    expect(finalSummary(createScheduler(2))).toBeNull();
  });
});
