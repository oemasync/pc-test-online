// Framework-free logic for the battery module. No Vue, no src/core imports.

export interface BatterySample {
  level: number; // 0..1
  timestamp: number; // ms
}

export interface BatteryReading {
  level: number; // 0..1
  charging: boolean;
  chargingTime: number; // seconds; Infinity when unknown
  dischargingTime: number; // seconds; Infinity when unknown
}

export interface DurationParts {
  hours: number;
  minutes: number;
  seconds: number;
}

export type BatteryPhase =
  | 'unsupported'
  | 'initializing'
  | 'charging'
  | 'discharging'
  | 'complete';

export type BatteryEvent =
  | { type: 'unsupported' }
  | { type: 'ready'; charging: boolean }
  | { type: 'chargingchange'; charging: boolean }
  | { type: 'complete' };

export function pruneSamples(
  samples: readonly BatterySample[],
  now: number,
  windowMs: number,
): BatterySample[] {
  const cutoff = now - windowMs;
  return samples.filter((s) => s.timestamp >= cutoff);
}

// Rate estimation needs >= 2 distinct level values in the window; a single
// quantized 1% step is not enough to derive a meaningful slope.
export function computeRatePerSecond(samples: readonly BatterySample[]): number | null {
  if (samples.length < 2) return null;
  const distinctLevels = new Set(samples.map((s) => s.level));
  if (distinctLevels.size < 2) return null;

  const n = samples.length;
  let sumT = 0;
  let sumL = 0;
  let sumTT = 0;
  let sumTL = 0;
  for (const s of samples) {
    const t = s.timestamp / 1000;
    const l = s.level;
    sumT += t;
    sumL += l;
    sumTT += t * t;
    sumTL += t * l;
  }
  const denom = n * sumTT - sumT * sumT;
  if (denom === 0) return null;
  const slope = (n * sumTL - sumT * sumL) / denom;
  if (!Number.isFinite(slope)) return null;
  return slope;
}

export function estimateTimeToEmpty(
  currentLevel: number,
  ratePerSecond: number,
): number | null {
  if (ratePerSecond >= 0) return null;
  const seconds = currentLevel / -ratePerSecond;
  if (seconds < 0) return null;
  return seconds;
}

export function estimateTimeToFull(
  currentLevel: number,
  ratePerSecond: number,
): number | null {
  if (ratePerSecond <= 0) return null;
  const seconds = (1 - currentLevel) / ratePerSecond;
  if (seconds < 0) return null;
  return seconds;
}

export function estimateEtaSeconds(
  reading: BatteryReading,
  ratePerSecond: number | null,
): number | null {
  if (ratePerSecond === null) return null;
  if (reading.charging) return estimateTimeToFull(reading.level, ratePerSecond);
  return estimateTimeToEmpty(reading.level, ratePerSecond);
}

// Returns structured parts so the UI can localize. null when unknown.
export function durationParts(seconds: number | null): DurationParts | null {
  if (seconds === null) return null;
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const total = Math.round(seconds);
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

// 'complete' is produced by an explicit user confirmation (Pass) after the
// battery reading has been verified against the machine.
export function reduceBatteryPhase(phase: BatteryPhase, event: BatteryEvent): BatteryPhase {
  switch (event.type) {
    case 'unsupported':
      return 'unsupported';
    case 'ready':
      return event.charging ? 'charging' : 'discharging';
    case 'chargingchange':
      if (phase === 'complete') return phase;
      return event.charging ? 'charging' : 'discharging';
    case 'complete':
      return 'complete';
    default: {
      const _exhaustive: never = event;
      throw new Error(`unhandled battery event: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

export function levelToPercent(level: number): number {
  return Math.round(level * 100);
}
