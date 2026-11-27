export interface StickPoint {
    readonly x: number;
    readonly y: number;
}

export interface StickDriftResult {
    readonly meanOffset: number;
    readonly maxOffset: number;
    readonly noise: number;
    readonly drifting: boolean;
}

export interface CircularityResult {
    readonly error: number;
    readonly coverage: number;
    readonly coveredSectors: number;
    readonly totalSectors: number;
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

export interface TriggerRange {
    readonly min: number;
    readonly max: number;
    readonly fullRange: boolean;
}

const CIRCULARITY_SECTORS = 36;

function clampUnit(value: number): number {
    if (value < -1) return -1;
    if (value > 1) return 1;
    return value;
}

export function applyDeadzone(value: number, deadzone = 0): number {
    if (Math.abs(value) <= deadzone) {
        return 0;
    }

    return value;
}

export function stickOffset(x: number, y: number): number {
    return Math.hypot(x, y);
}

export function detectStickDrift(
    samples: readonly StickPoint[],
    deadzone = 0.15
): StickDriftResult {
    if (samples.length === 0) {
        return {
            meanOffset: 0,
            maxOffset: 0,
            noise: 0,
            drifting: false,
        };
    }

    const clamped = samples.map(sample => ({
        x: clampUnit(sample.x),
        y: clampUnit(sample.y),
    }));
    const meanX = clamped.reduce((sum, point) => sum + point.x, 0) / clamped.length;
    const meanY = clamped.reduce((sum, point) => sum + point.y, 0) / clamped.length;
    const meanOffset = Math.hypot(meanX, meanY);
    const maxOffset = clamped.reduce(
        (max, point) => Math.max(max, Math.hypot(point.x, point.y)),
        0
    );
    const noise = Math.sqrt(
        clamped.reduce((sum, point) => {
            const differenceX = point.x - meanX;
            const differenceY = point.y - meanY;
            return sum + differenceX * differenceX + differenceY * differenceY;
        }, 0) / clamped.length
    );

    return {
        meanOffset,
        maxOffset,
        noise,
        drifting: meanOffset > deadzone,
    };
}

export function circularityError(
    samples: readonly StickPoint[],
    sectors = CIRCULARITY_SECTORS
): CircularityResult {
    const totalSectors = Math.max(1, Math.trunc(sectors));
    const hasSample = new Array<boolean>(totalSectors).fill(false);
    const maxRadius = new Array<number>(totalSectors).fill(0);
    let coveredSectors = 0;

    for (const sample of samples) {
        const x = clampUnit(sample.x);
        const y = clampUnit(sample.y);
        const radius = Math.hypot(x, y);
        const angle = Math.atan2(y, x);
        const sector = Math.min(
            totalSectors - 1,
            Math.max(0, Math.floor(((angle + Math.PI) / (Math.PI * 2)) * totalSectors))
        );

        if (!hasSample[sector]) {
            hasSample[sector] = true;
            coveredSectors += 1;
        }

        const currentMax = maxRadius[sector] as number;
        if (radius > currentMax) {
            maxRadius[sector] = radius;
        }
    }

    let totalError = 0;

    for (let sector = 0; sector < totalSectors; sector += 1) {
        if (hasSample[sector]) {
            totalError += Math.abs((maxRadius[sector] as number) - 1);
        }
    }

    const error = coveredSectors === 0 ? 0 : totalError / coveredSectors;
    const coverage = coveredSectors / totalSectors;

    return {
        error,
        coverage,
        coveredSectors,
        totalSectors,
    };
}

export function createCoverage(count: number): boolean[] {
    const size = Math.max(0, Math.trunc(count));
    return new Array<boolean>(size).fill(false);
}

export function buttonCoverageReducer(
    covered: readonly boolean[],
    buttonIndex: number
): readonly boolean[] {
    if (buttonIndex < 0 || buttonIndex >= covered.length || covered[buttonIndex]) {
        return covered;
    }

    const next = covered.slice();
    next[buttonIndex] = true;
    return next;
}

export function buttonCoverage(covered: readonly boolean[]): ButtonCoverageSummary {
    const testedCount = covered.filter(value => value).length;

    return {
        tested: covered.slice(),
        testedCount,
        total: covered.length,
        ratio: covered.length === 0 ? 0 : testedCount / covered.length,
    };
}

export function createTriggerRange(): TriggerRange {
    return {
        min: 1,
        max: 0,
        fullRange: false,
    };
}

export function triggerRangeReducer(
    state: TriggerRange,
    value: number,
    tolerance = 0.05
): TriggerRange {
    const min = Math.min(state.min, value);
    const max = Math.max(state.max, value);
    const fullRange = min <= tolerance && max >= 1 - tolerance;

    return {
        min,
        max,
        fullRange,
    };
}

export function diffAxisSnapshots(
    previous: readonly number[],
    next: readonly number[],
    epsilon = 0
): readonly AxisChange[] {
    const length = Math.max(previous.length, next.length);
    const changes: AxisChange[] = [];

    for (let index = 0; index < length; index += 1) {
        const previousValue = previous[index] ?? 0;
        const nextValue = next[index] ?? 0;
        const delta = nextValue - previousValue;

        if (Math.abs(delta) > epsilon) {
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
