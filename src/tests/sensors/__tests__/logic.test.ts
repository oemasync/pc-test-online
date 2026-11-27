import { describe, it, expect } from 'vitest';
import {
  lowPassFilter,
  lowPassVector,
  tiltFromAcceleration,
  estimateSampleRate,
  initialAvailabilityState,
  availabilityReducer,
  reduceSensorList,
  sensorSummary,
} from '../logic';
import type { SensorKey } from '../logic';

describe('lowPassFilter', () => {
  it('returns the sample when previous is null', () => {
    expect(lowPassFilter(null, 42, 0.5)).toBe(42);
  });

  it('smooths toward the new sample', () => {
    expect(lowPassFilter(0, 10, 0.5)).toBe(5);
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

  it('stays ~100 Hz despite a long gap (median)', () => {
    const ts = [0, 10, 20, 30, 40, 50, 510, 520, 530];
    expect(estimateSampleRate(ts)).toBeCloseTo(100, 6);
  });
});

describe('availability reducer', () => {
  it('starts all unknown with no active sensors', () => {
    const s = initialAvailabilityState();
    expect(sensorSummary(s)).toBe('pending');
  });

  it('api present marks sensor unknown (pending reading)', () => {
    const s = availabilityReducer(initialAvailabilityState(), {
      type: 'api',
      sensor: 'accelerometer',
      present: true,
    });
    expect(s.sensors.accelerometer.status).toBe('unknown');
    expect(s.sensors.accelerometer.apiPresent).toBe(true);
    expect(sensorSummary(s)).toBe('pending');
  });

  it('api missing marks api-missing', () => {
    const s = availabilityReducer(initialAvailabilityState(), {
      type: 'api',
      sensor: 'gyroscope',
      present: false,
    });
    expect(s.sensors.gyroscope.status).toBe('api-missing');
    expect(s.sensors.gyroscope.apiPresent).toBe(false);
  });

  it('a real reading with value activates the sensor', () => {
    let s = availabilityReducer(initialAvailabilityState(), {
      type: 'api',
      sensor: 'accelerometer',
      present: true,
    });
    s = availabilityReducer(s, {
      type: 'reading',
      sensor: 'accelerometer',
      timestampMs: 100,
      hasValue: true,
    });
    expect(s.sensors.accelerometer.status).toBe('active');
    expect(s.sensors.accelerometer.lastReadingMs).toBe(100);
    expect(sensorSummary(s)).toBe('some-active');
  });

  it('a null reading does not activate', () => {
    let s = availabilityReducer(initialAvailabilityState(), {
      type: 'api',
      sensor: 'accelerometer',
      present: true,
    });
    s = availabilityReducer(s, {
      type: 'reading',
      sensor: 'accelerometer',
      timestampMs: 100,
      hasValue: false,
    });
    expect(s.sensors.accelerometer.status).toBe('unknown');
  });

  it('error maps NotAllowedError to denied', () => {
    let s = availabilityReducer(initialAvailabilityState(), {
      type: 'api',
      sensor: 'magnetometer',
      present: true,
    });
    s = availabilityReducer(s, {
      type: 'error',
      sensor: 'magnetometer',
      errorName: 'NotAllowedError',
    });
    expect(s.sensors.magnetometer.status).toBe('denied');
  });

  it('error maps NotReadableError to error', () => {
    let s = availabilityReducer(initialAvailabilityState(), {
      type: 'api',
      sensor: 'magnetometer',
      present: true,
    });
    s = availabilityReducer(s, {
      type: 'error',
      sensor: 'magnetometer',
      errorName: 'NotReadableError',
    });
    expect(s.sensors.magnetometer.status).toBe('error');
  });

  it('tick times out a pending sensor with no reading', () => {
    const windowMs = 100;
    let s = initialAvailabilityState(windowMs);
    s = availabilityReducer(s, { type: 'api', sensor: 'accelerometer', present: true });
    for (const sn of ['deviceOrientation', 'deviceMotion', 'gyroscope', 'magnetometer', 'ambientLight'] as SensorKey[]) {
      s = availabilityReducer(s, { type: 'api', sensor: sn, present: false });
    }
    s = availabilityReducer(s, { type: 'tick', nowMs: 0 });
    s = availabilityReducer(s, { type: 'tick', nowMs: 150 });
    expect(s.sensors.accelerometer.status).toBe('no-data');
    expect(sensorSummary(s)).toBe('none-detected');
  });

  it('tick keeps active sensor active while readings are fresh', () => {
    const windowMs = 100;
    let s = initialAvailabilityState(windowMs);
    s = availabilityReducer(s, { type: 'api', sensor: 'accelerometer', present: true });
    s = availabilityReducer(s, {
      type: 'reading',
      sensor: 'accelerometer',
      timestampMs: 50,
      hasValue: true,
    });
    s = availabilityReducer(s, { type: 'tick', nowMs: 100 });
    expect(s.sensors.accelerometer.status).toBe('active');
  });

  it('tick marks active sensor no-data after a gap', () => {
    const windowMs = 100;
    let s = initialAvailabilityState(windowMs);
    s = availabilityReducer(s, { type: 'api', sensor: 'accelerometer', present: true });
    s = availabilityReducer(s, {
      type: 'reading',
      sensor: 'accelerometer',
      timestampMs: 50,
      hasValue: true,
    });
    s = availabilityReducer(s, { type: 'tick', nowMs: 200 });
    expect(s.sensors.accelerometer.status).toBe('no-data');
  });

  it('reset restores windowMs and unknown state', () => {
    let s = initialAvailabilityState(200);
    s = availabilityReducer(s, { type: 'api', sensor: 'accelerometer', present: true });
    s = availabilityReducer(s, { type: 'reset' });
    expect(s.windowMs).toBe(200);
    expect(s.sensors.accelerometer.status).toBe('unknown');
    expect(s.sensors.accelerometer.apiPresent).toBe(false);
  });

  it('reduceSensorList only sets api presence, not active', () => {
    const s = reduceSensorList(
      [
        ['accelerometer', true],
        ['gyroscope', false],
      ],
      100,
    );
    expect(s.sensors.accelerometer.status).toBe('unknown');
    expect(s.sensors.accelerometer.apiPresent).toBe(true);
    expect(s.sensors.gyroscope.status).toBe('api-missing');
    expect(sensorSummary(s)).toBe('pending');
  });

  it('realistic sequence: desktop apis present but no readings -> none-detected', () => {
    const w = 50;
    let s = initialAvailabilityState(w);
    const sensors: SensorKey[] = ['deviceOrientation', 'deviceMotion'];
    for (const sn of sensors) {
      s = availabilityReducer(s, { type: 'api', sensor: sn, present: true });
    }
    for (const sn of ['accelerometer', 'gyroscope', 'magnetometer', 'ambientLight'] as SensorKey[]) {
      s = availabilityReducer(s, { type: 'api', sensor: sn, present: false });
    }
    s = availabilityReducer(s, { type: 'tick', nowMs: 0 });
    s = availabilityReducer(s, { type: 'tick', nowMs: 100 });
    expect(sensorSummary(s)).toBe('none-detected');
  });

  it('realistic sequence: one real reading yields some-active', () => {
    const w = 50;
    let s = initialAvailabilityState(w);
    s = availabilityReducer(s, { type: 'api', sensor: 'accelerometer', present: true });
    s = availabilityReducer(s, {
      type: 'reading',
      sensor: 'accelerometer',
      timestampMs: 10,
      hasValue: true,
    });
    expect(sensorSummary(s)).toBe('some-active');
  });

  it('screenOrientation and vibration are not in the sensor set', () => {
    const s = initialAvailabilityState();
    expect(Object.prototype.hasOwnProperty.call(s.sensors, 'screenOrientation')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(s.sensors, 'vibration')).toBe(false);
  });
});
