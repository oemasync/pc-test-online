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

export function clampLevel(level: number): number {
  if (level < 0) return 0;
  if (level > 1) return 1;
  return level;
}

export function levelToPercent(level: number): number {
  return Math.round(clampLevel(level) * 100);
}

export function isBatterySupported(hasGetBattery: boolean): boolean {
  return hasGetBattery;
}

export function pruneSamples(
  samples: readonly BatterySample[],
  now: number,
  windowMs: number,
): BatterySample[] {
  const cutoff = now - windowMs;
  return samples.filter((s) => s.timestamp >= cutoff);
}

// Least-squares slope of level over time (level fraction per second).
export function computeRatePerSecond(samples: readonly BatterySample[]): number | null {
  if (samples.length < 2) return null;
  const n = samples.length;
  let sumT = 0;
  let sumL = 0;
  let sumTT = 0;
  let sumTL = 0;
  for (const s of samples) {
    const t = s.timestamp / 1000;
    const l = clampLevel(s.level);
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
  const seconds = clampLevel(currentLevel) / -ratePerSecond;
  if (seconds < 0) return null;
  return seconds;
}

export function estimateTimeToFull(
  currentLevel: number,
  ratePerSecond: number,
): number | null {
  if (ratePerSecond <= 0) return null;
  const seconds = (1 - clampLevel(currentLevel)) / ratePerSecond;
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

export function formatDurationSeconds(seconds: number | null): string {
  if (seconds === null) return 'unknown';
  if (!Number.isFinite(seconds) || seconds < 0) return 'unknown';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// chargingTime/dischargeTime quirk: Infinity means "unknown".
export function normalizeChargingTime(value: number): number {
  if (value === Infinity || value < 0) return Infinity;
  return value;
}

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
      void _exhaustive;
      return phase;
    }
  }
}
