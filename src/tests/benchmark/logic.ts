// Framework-free pure logic: statistics, scoring, and run-scheduler state machine.
// No Vue imports, no src/core imports.

export interface RunSummary {
  count: number;
  median: number;
  stddev: number; // sample stddev (n-1)
  min: number;
  max: number;
  partial: boolean;
}

export type SchedulerStatus = 'idle' | 'running' | 'completed' | 'aborted' | 'failed';

export interface SchedulerState {
  totalRuns: number;
  status: SchedulerStatus;
  completed: readonly number[];
  currentRun: number; // 0-based index of the in-flight run, -1 when none
  progress: number; // 0..1 overall
  error: string | null;
  abortReason: string | null;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

// Sample standard deviation (Bessel's correction, n-1). Used for run statistics.
export function stddev(values: readonly number[]): number {
  if (values.length <= 1) {
    return 0;
  }
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function summarizeRuns(values: readonly number[], partial = false): RunSummary {
  if (values.length === 0) {
    return { count: 0, median: 0, stddev: 0, min: 0, max: 0, partial };
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: values.length,
    median: median(values),
    stddev: stddev(values),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    partial,
  };
}

export function singleThreadScore(workUnits: number, durationMs: number): number {
  return workUnits / (durationMs / 1000);
}

export function multiThreadThroughput(totalWorkUnits: number, wallClockMs: number): number {
  return totalWorkUnits / (wallClockMs / 1000);
}

export function scalingEfficiency(
  multiThroughput: number,
  singleThroughput: number,
  workers: number,
): number {
  return multiThroughput / (singleThroughput * workers);
}

// Minimum measured duration before calibration switches from doubling to scaling.
export const CALIBRATION_MIN_MS = 10;

// Calibration: double until measured elapsed >= CALIBRATION_MIN_MS, then scale to target.
// Given the current repeat count, the elapsed ms for that run, and the target ms.
export function calibrateRepeats(repeats: number, elapsedMs: number, targetMs: number): number {
  const base = repeats > 0 ? repeats : 1;
  if (!Number.isFinite(elapsedMs) || elapsedMs < CALIBRATION_MIN_MS) {
    return base * 2;
  }
  const scaled = Math.ceil((targetMs / elapsedMs) * base);
  return Math.max(base, scaled);
}

export function createScheduler(totalRuns: number): SchedulerState {
  if (!Number.isInteger(totalRuns) || totalRuns < 1) {
    throw new RangeError('totalRuns must be a positive integer');
  }
  return {
    totalRuns,
    status: 'idle',
    completed: [],
    currentRun: -1,
    progress: 0,
    error: null,
    abortReason: null,
  };
}

export function startRun(state: SchedulerState): SchedulerState {
  if (state.status !== 'idle') {
    throw new Error(`cannot start run from status ${state.status}`);
  }
  if (state.completed.length >= state.totalRuns) {
    throw new Error('all runs already completed');
  }
  return {
    ...state,
    status: 'running',
    currentRun: state.completed.length,
    progress: state.completed.length / state.totalRuns,
    error: null,
  };
}

export function setRunProgress(state: SchedulerState, fraction: number): SchedulerState {
  if (state.status !== 'running') {
    return state;
  }
  const f = clamp(fraction, 0, 1);
  const progress = clamp((state.completed.length + f) / state.totalRuns, 0, 1);
  return { ...state, progress };
}

export function completeRun(state: SchedulerState, value: number): SchedulerState {
  if (state.status !== 'running') {
    throw new Error(`cannot complete run from status ${state.status}`);
  }
  const completed = [...state.completed, value];
  if (completed.length >= state.totalRuns) {
    return {
      ...state,
      status: 'completed',
      completed,
      currentRun: -1,
      progress: 1,
      error: null,
    };
  }
  return {
    ...state,
    status: 'idle',
    completed,
    currentRun: -1,
    progress: completed.length / state.totalRuns,
  };
}

export function failRun(state: SchedulerState, error: string): SchedulerState {
  if (isTerminal(state)) {
    return state;
  }
  return {
    ...state,
    status: 'failed',
    currentRun: -1,
    error,
  };
}

export function abortRun(state: SchedulerState, reason?: string): SchedulerState {
  if (isTerminal(state)) {
    return state;
  }
  return {
    ...state,
    status: 'aborted',
    currentRun: -1,
    abortReason: reason ?? null,
    progress: state.completed.length / state.totalRuns,
  };
}

export function isTerminal(state: SchedulerState): boolean {
  switch (state.status) {
    case 'completed':
    case 'aborted':
    case 'failed':
      return true;
    case 'idle':
    case 'running':
      return false;
    default: {
      const _exhaustive: never = state.status;
      return _exhaustive;
    }
  }
}

export function finalSummary(state: SchedulerState): RunSummary | null {
  if (state.status === 'idle' || state.status === 'running') {
    return null;
  }
  return summarizeRuns(state.completed, state.status !== 'completed');
}
