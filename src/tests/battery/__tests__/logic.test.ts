import { describe, it, expect } from 'vitest';
import {
  levelToPercent,
  pruneSamples,
  computeRatePerSecond,
  estimateTimeToEmpty,
  estimateTimeToFull,
  estimateEtaSeconds,
  durationParts,
  reduceBatteryPhase,
  toNullableSeconds,
} from '../logic';

describe('battery logic', () => {
  it('converts level to percent', () => {
    expect(levelToPercent(0.426)).toBe(43);
    expect(levelToPercent(1)).toBe(100);
  });

  it('prunes samples outside window', () => {
    const samples = [
      { level: 0.5, timestamp: 1000 },
      { level: 0.4, timestamp: 9000 },
    ];
    const kept = pruneSamples(samples, 10000, 5000);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.timestamp).toBe(9000);
  });

  it('returns null with fewer than 3 distinct levels', () => {
    const samples = [
      { level: 0.87, timestamp: 0 },
      { level: 0.87, timestamp: 5000 },
      { level: 0.86, timestamp: 10000 },
    ];
    expect(computeRatePerSecond(samples)).toBeNull();
  });

  it('computes rate from 3 evenly spaced levels within ~10%', () => {
    const samples: { level: number; timestamp: number }[] = [];
    for (let i = 0; i < 60; i++) samples.push({ level: 0.87, timestamp: i * 5000 });
    for (let i = 0; i < 60; i++) samples.push({ level: 0.86, timestamp: (60 + i) * 5000 });
    for (let i = 0; i < 60; i++) samples.push({ level: 0.85, timestamp: (120 + i) * 5000 });
    const rate = computeRatePerSecond(samples);
    expect(rate).not.toBeNull();
    const truth = -0.01 / 300;
    expect(Math.abs(rate! - truth) / Math.abs(truth)).toBeLessThan(0.1);
  });

  it('returns null for insufficient samples', () => {
    expect(computeRatePerSecond([{ level: 0.5, timestamp: 0 }])).toBeNull();
  });

  it('returns null for zero time span', () => {
    const samples = [
      { level: 0.8, timestamp: 5000 },
      { level: 0.7, timestamp: 5000 },
      { level: 0.6, timestamp: 5000 },
    ];
    expect(computeRatePerSecond(samples)).toBeNull();
  });

  it('estimates time to empty when discharging', () => {
    const sec = estimateTimeToEmpty(0.5, -0.001);
    expect(sec).toBeCloseTo(500, 5);
  });

  it('returns null time-to-empty when not discharging', () => {
    expect(estimateTimeToEmpty(0.5, 0.001)).toBeNull();
    expect(estimateTimeToEmpty(0.5, 0)).toBeNull();
  });

  it('estimates time to full when charging', () => {
    const sec = estimateTimeToFull(0.2, 0.001);
    expect(sec).toBeCloseTo(800, 5);
  });

  it('returns null time-to-full when not charging', () => {
    expect(estimateTimeToFull(0.2, -0.001)).toBeNull();
  });

  it('estimateEtaSeconds picks direction by charging flag', () => {
    const reading = { level: 0.5, charging: true, chargingTime: 100, dischargingTime: null };
    expect(estimateEtaSeconds(reading, 0.001)).toBeCloseTo(500, 5);
    const reading2 = { level: 0.5, charging: false, chargingTime: null, dischargingTime: 100 };
    expect(estimateEtaSeconds(reading2, -0.001)).toBeCloseTo(500, 5);
  });

  it('returns duration parts', () => {
    expect(durationParts(3661)).toEqual({ hours: 1, minutes: 1, seconds: 1 });
    expect(durationParts(125)).toEqual({ hours: 0, minutes: 2, seconds: 5 });
    expect(durationParts(42)).toEqual({ hours: 0, minutes: 0, seconds: 42 });
    expect(durationParts(null)).toBeNull();
  });

  it('maps Infinity to null at boundary', () => {
    expect(toNullableSeconds(Infinity)).toBeNull();
    expect(toNullableSeconds(120)).toBe(120);
  });

  it('reduces battery phase', () => {
    expect(reduceBatteryPhase({ type: 'unsupported' })).toBe('unsupported');
    expect(reduceBatteryPhase({ type: 'ready', charging: true })).toBe('charging');
    expect(reduceBatteryPhase({ type: 'chargingchange', charging: false })).toBe('discharging');
  });
});
