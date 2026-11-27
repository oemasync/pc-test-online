export interface StickPoint {
  readonly x: number;
  readonly y: number;
}

export interface StickDriftResult {
  readonly offset: number;
  readonly drifting: boolean;
}

export interface AxisChange {
  readonly index: number;
  readonly previous: number;
  readonly next: number;
  readonly delta: number;
}

export interface ButtonCoverageSummary {
  readonly tested: readonly boolean[];
  readonly testedCount: number;
  readonly total: number;
  readonly ratio: number;
}

function finite(value: number | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nonNegative(value: number | undefined): number {
  return Math.max(0, finite(value, 0));
}

export function applyDeadzone(value: number, deadzone = 0): number {
  const numericValue = finite(value, 0);
  const threshold = nonNegative(deadzone);

  if (Math.abs(numericValue) <= threshold) {
    return 0;
  }

  return numericValue;
}

export function stickOffset(x: number, y: number): number {
  return Math.hypot(finite(x, 0), finite(y, 0));
}

export function detectStickDrift(
  x: number,
  y: number,
  deadzone = 0.15,
): StickDriftResult {
  const offset = stickOffset(x, y);
  const threshold = nonNegative(deadzone);

  return {
    offset,
    drifting: offset > threshold,
  };
}

export function isAxisDrifting(value: number, deadzone = 0.15): boolean {
  return Math.abs(finite(value, 0)) > nonNegative(deadzone);
}

export function circularityError(
  samples: readonly StickPoint[],
  outerRadius = 1,
): number {
  if (!Array.isArray(samples) || samples.length === 0) {
    return 0;
  }

  const targetRadius = finite(outerRadius, 1);
  let totalError = 0;

  for (const sample of samples) {
    const x = finite(sample?.x, 0);
    const y = finite(sample?.y, 0);
    totalError += Math.abs(Math.hypot(x, y) - targetRadius);
  }

  return totalError / samples.length;
}

export function buttonCoverageReducer(
  covered: readonly boolean[],
  buttonIndex: number,
): readonly boolean[] {
  const normalized = covered.map((value) => value === true);

  if (!Number.isFinite(buttonIndex)) {
    return normalized;
  }

  const index = Math.trunc(buttonIndex);

  if (index < 0) {
    return normalized;
  }

  const length = Math.max(normalized.length, index + 1);
  const result = Array.from({ length }, (_, position) =>
    position < normalized.length ? normalized[position] === true : false,
  );

  result[index] = true;
  return result;
}

export function buttonCoverage(
  covered: readonly boolean[],
): ButtonCoverageSummary {
  const tested = covered.map((value) => value === true);
  const testedCount = tested.reduce(
    (count, value) => count + (value ? 1 : 0),
    0,
  );

  return {
    tested,
    testedCount,
    total: tested.length,
    ratio: tested.length === 0 ? 0 : testedCount / tested.length,
  };
}

export function diffAxisSnapshots(
  previous: readonly number[],
  next: readonly number[],
  epsilon = 0,
): readonly AxisChange[] {
  const length = Math.max(previous.length, next.length);
  const threshold = nonNegative(epsilon);
  const changes: AxisChange[] = [];

  for (let index = 0; index < length; index += 1) {
    const previousValue = finite(previous[index], 0);
    const nextValue = finite(next[index], 0);
    const delta = nextValue - previousValue;

    if (Math.abs(delta) > threshold) {
      changes.push({
        index,
        previous: previousValue,
        next: nextValue,
        delta,
      });
    }
  }

  return changes;
}

export function changedAxisIndices(
  previous: readonly number[],
  next: readonly number[],
  epsilon = 0,
): readonly number[] {
  return diffAxisSnapshots(previous, next, epsilon).map(
    (change) => change.index,
  );
}

export function axisDeltas(
  previous: readonly number[],
  next: readonly number[],
): readonly number[] {
  const length = Math.max(previous.length, next.length);

  return Array.from({ length }, (_, index) =>
    finite(next[index], 0) - finite(previous[index], 0),
  );
}
