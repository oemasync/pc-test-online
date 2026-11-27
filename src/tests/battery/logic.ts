// Framework-free logic for the battery module. No Vue, no src/core imports.

export interface BatterySample {
    level: number; // 0..1
    timestamp: number; // ms
}

export interface BatteryReading {
    level: number; // 0..1
    charging: boolean;
    chargingTime: number | null; // seconds; null when unknown (API Infinity)
    dischargingTime: number | null; // seconds; null when unknown (API Infinity)
}

export interface DurationParts {
    hours: number;
    minutes: number;
    seconds: number;
}

export type BatteryPhase = 'unsupported' | 'initializing' | 'charging' | 'discharging';

export type BatteryEvent =
    | { type: 'unsupported' }
    | { type: 'ready'; charging: boolean }
    | { type: 'chargingchange'; charging: boolean };

export function pruneSamples(
    samples: readonly BatterySample[],
    now: number,
    windowMs: number
): BatterySample[] {
    const cutoff = now - windowMs;
    return samples.filter(s => s.timestamp >= cutoff);
}

// Map the API's Infinity (unknown) to null at the boundary.
export function toNullableSeconds(value: number): number | null {
    if (!Number.isFinite(value)) return null;
    return value;
}

// Rate estimation requires >= 3 distinct level values (two observed changes);
// a single 1% step is too noisy.
export function computeRatePerSecond(samples: readonly BatterySample[]): number | null {
    const distinctLevels = new Set(samples.map(s => s.level));
    if (distinctLevels.size < 3) return null;

    // Group by level: use mean timestamp per distinct level to handle 1% quantization.
    const groups = new Map<number, { sumT: number; count: number }>();
    for (const s of samples) {
        const g = groups.get(s.level);
        if (g) {
            g.sumT += s.timestamp;
            g.count += 1;
        } else {
            groups.set(s.level, { sumT: s.timestamp, count: 1 });
        }
    }
    const points = [...groups.entries()].map(([level, g]) => ({
        t: g.sumT / g.count / 1000,
        level,
    }));

    const n = points.length;
    let sumT = 0;
    let sumL = 0;
    let sumTT = 0;
    let sumTL = 0;
    for (const p of points) {
        sumT += p.t;
        sumL += p.level;
        sumTT += p.t * p.t;
        sumTL += p.t * p.level;
    }
    const denom = n * sumTT - sumT * sumT;
    if (denom === 0) return null;
    const slope = (n * sumTL - sumT * sumL) / denom;
    return slope;
}

export function estimateTimeToEmpty(currentLevel: number, ratePerSecond: number): number | null {
    if (ratePerSecond >= 0) return null;
    const seconds = currentLevel / -ratePerSecond;
    return seconds;
}

export function estimateTimeToFull(currentLevel: number, ratePerSecond: number): number | null {
    if (ratePerSecond <= 0) return null;
    const seconds = (1 - currentLevel) / ratePerSecond;
    return seconds;
}

export function estimateEtaSeconds(
    reading: BatteryReading,
    ratePerSecond: number | null
): number | null {
    if (ratePerSecond === null) return null;
    if (reading.charging) return estimateTimeToFull(reading.level, ratePerSecond);
    return estimateTimeToEmpty(reading.level, ratePerSecond);
}

// Returns structured parts so the UI can localize. null when unknown.
export function durationParts(seconds: number | null): DurationParts | null {
    if (seconds === null) return null;
    const total = Math.round(seconds);
    return {
        hours: Math.floor(total / 3600),
        minutes: Math.floor((total % 3600) / 60),
        seconds: total % 60,
    };
}

export function reduceBatteryPhase(event: BatteryEvent): BatteryPhase {
    switch (event.type) {
        case 'unsupported':
            return 'unsupported';
        case 'ready':
            return event.charging ? 'charging' : 'discharging';
        case 'chargingchange':
            return event.charging ? 'charging' : 'discharging';
        default: {
            const _exhaustive: never = event;
            throw new Error(`unhandled battery event: ${JSON.stringify(_exhaustive)}`);
        }
    }
}

export function levelToPercent(level: number): number {
    return Math.round(level * 100);
}
