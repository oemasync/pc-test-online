import { describe, it, expect } from 'vitest';
import {
  lowPassFilter,
  lowPassVector,
  tiltFromAcceleration,
  estimateSampleRate,
  initialAvailabilityState,
  availabilityReducer,
  reduceSensorList,
  hasAnySensor,
  allUnsupported,
} from '../logic';

describe('lowPassFilter', () => {
  it('returns the sample when previous is null', () => {
    expect(lowPassFilter(null, 42, 0.5)).toBe(42);
  });

  it('smooths toward the new sample', () => {
    const out = lowPassFilter(0, 10, 0.5);
    expect(out).toBe(5);
  });

  it('alpha 0 keeps previous value', () => {
    expect(lowPassFilter(7, 100, 0)).toBe(7);
  });

  it('alpha 1 returns the new sample', () => {
    expect(lowPassFilter(7, 100, 1)).toBe(100);
  });

  it('clamps alpha outside [0,1]', () => {
    expect(lowPassFilter(0, 10, 2)).toBe(10);
    expect(lowPassFilter(0, 10, -1)).toBe(0);
  });
});

describe('lowPassVector', () => {
  it('returns sample copy when previous is null', () => {
    const s = { x: 1, y: 2, z: 3 };
    const out = lowPassVector(null, s, 0.5);
    expect(out).toEqual(s);
    expect(out).not.toBe(s);
  });

  it('smooths each component', () => {
    expect(lowPassVector({ x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 10 }, 0.5)).toEqual({
      x: 5,
      y: 5,
      z: 5,
    });
  });
});

describe('tiltFromAcceleration', () => {
  it('returns zero tilt when level', () => {
    const t = tiltFromAcceleration({ x: 0, y: 0, z: 9.81 });
    expect(t.pitch).toBeCloseTo(0, 6);
    expect(t.roll).toBeCloseTo(0, 6);
  });

  it('rolls when y dominates', () => {
    const t = tiltFromAcceleration({ x: 0, y: 9.81, z: 0 });
    expect(t.roll).toBeCloseTo(90, 6);
  });

  it('pitches when x dominates', () => {
    const t = tiltFromAcceleration({ x: 9.81, y: 0, z: 0 });
    expect(t.pitch).toBeCloseTo(-90, 6);
  });

  it('never produces NaN or Infinity', () => {
    const t = tiltFromAcceleration({ x: 0, y: 0, z: 0 });
    expect(Number.isFinite(t.pitch)).toBe(true);
    expect(Number.isFinite(t.roll)).toBe(true);
  });
});

describe('estimateSampleRate', () => {
  it('returns null with fewer than 2 samples', () => {
    expect(estimateSampleRate([])).toBeNull();
    expect(estimateSampleRate([100])).toBeNull();
  });

  it('estimates 100 Hz for 10 ms intervals', () => {
    const ts = [0, 10, 20, 30, 40];
    expect(estimateSampleRate(ts)).toBeCloseTo(100, 6);
  });

  it('ignores non-positive deltas', () => {
    const ts = [0, 10, 10, 20];
    expect(estimateSampleRate(ts)).toBeCloseTo(100, 6);
  });

  it('returns null when no positive deltas', () => {
    expect(estimateSampleRate([5, 5, 5])).toBeNull();
  });
});

describe('availability reducer', () => {
  it('starts all unknown', () => {
    const s = initialAvailabilityState();
    expect(hasAnySensor(s)).toBe(false);
    expect(allUnsupported(s)).toBe(false);
  });

  it('marks detected sensors supported', () => {
    let s = initialAvailabilityState();
    s = availabilityReducer(s, { type: 'detected', sensor: 'accelerometer' });
    expect(s.accelerometer).toBe('supported');
    expect(hasAnySensor(s)).toBe(true);
  });

  it('marks missing sensors unsupported', () => {
    let s = initialAvailabilityState();
    s = availabilityReducer(s, { type: 'missing', sensor: 'gyroscope' });
    expect(s.gyroscope).toBe('unsupported');
  });

  it('reset restores initial state', () => {
    let s = initialAvailabilityState();
    s = availabilityReducer(s, { type: 'detected', sensor: 'accelerometer' });
    s = availabilityReducer(s, { type: 'reset' });
    expect(s.accelerometer).toBe('unknown');
  });

  it('reduceSensorList folds entries', () => {
    const s = reduceSensorList([
      ['accelerometer', true],
      ['gyroscope', false],
      ['vibration', true],
    ]);
    expect(s.accelerometer).toBe('supported');
    expect(s.gyroscope).toBe('unsupported');
    expect(s.vibration).toBe('supported');
    expect(hasAnySensor(s)).toBe(true);
    expect(allUnsupported(s)).toBe(false);
  });

  it('allUnsupported true when every tracked sensor missing', () => {
    const entries: Array<[import('../logic').SensorKey, boolean]> = [
      ['deviceOrientation', false],
      ['deviceMotion', false],
    ];
    // all sensors present in state must be unsupported; reduceSensorList only sets listed ones
    let s = reduceSensorList(entries);
    // fill remaining as missing
    for (const k of Object.keys(s) as import('../logic').SensorKey[]) {
      if (s[k] !== 'unsupported') {
        s = availabilityReducer(s, { type: 'missing', sensor: k });
      }
    }
    expect(allUnsupported(s)).toBe(true);
  });
});
