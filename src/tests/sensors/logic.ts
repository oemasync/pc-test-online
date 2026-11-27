// Framework-free pure logic for the sensors module.
// No Vue imports and no imports from src/core.

const RAD_TO_DEG = 180 / Math.PI;

export type Vec3 = { x: number; y: number; z: number };

export type Tilt = { pitch: number; roll: number };

export function lowPassFilter(previous: number | null, sample: number, alpha: number): number {
  if (previous === null) {
    return sample;
  }
  const a = Math.min(1, Math.max(0, alpha));
  return previous + a * (sample - previous);
}

export function lowPassVector(previous: Vec3 | null, sample: Vec3, alpha: number): Vec3 {
  if (previous === null) {
    return { x: sample.x, y: sample.y, z: sample.z };
  }
  const a = Math.min(1, Math.max(0, alpha));
  return {
    x: previous.x + a * (sample.x - previous.x),
    y: previous.y + a * (sample.y - previous.y),
    z: previous.z + a * (sample.z - previous.z),
  };
}

// Tilt is derived from accelerationIncludingGravity (the gravity vector), not
// from linear acceleration, because gravity provides the reference "down".
export function tiltFromAcceleration(acc: Vec3): Tilt {
  const { x, y, z } = acc;
  const roll = Math.atan2(y, z) * RAD_TO_DEG;
  const pitch = Math.atan2(-x, Math.hypot(y, z)) * RAD_TO_DEG;
  return {
    pitch: Number.isFinite(pitch) ? pitch : 0,
    roll: Number.isFinite(roll) ? roll : 0,
  };
}

export function estimateSampleRate(timestampsMs: readonly number[]): number | null {
  if (timestampsMs.length < 2) {
    return null;
  }
  const deltas: number[] = [];
  for (let i = 1; i < timestampsMs.length; i += 1) {
    const prev = timestampsMs[i - 1];
    const cur = timestampsMs[i];
    if (prev === undefined || cur === undefined) {
      continue;
    }
    const dt = cur - prev;
    if (dt > 0) {
      deltas.push(dt);
    }
  }
  if (deltas.length === 0) {
    return null;
  }
  const sorted = [...deltas].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? sorted[mid]!
      : (sorted[mid - 1]! + sorted[mid]!) / 2;
  if (median <= 0) {
    return null;
  }
  return 1000 / median;
}

export type SensorKey =
  | 'deviceOrientation'
  | 'deviceMotion'
  | 'accelerometer'
  | 'gyroscope'
  | 'magnetometer'
  | 'ambientLight';

export type SensorStatus = 'unknown' | 'api-missing' | 'no-data' | 'active' | 'denied' | 'error';

export type SensorEntry = {
  status: SensorStatus;
  apiPresent: boolean;
  lastReadingMs: number | null;
  pendingSinceMs: number | null;
};

export type AvailabilityState = {
  windowMs: number;
  sensors: Record<SensorKey, SensorEntry>;
};

export type AvailabilityAction =
  | { type: 'reset' }
  | { type: 'setWindow'; windowMs: number }
  | { type: 'api'; sensor: SensorKey; present: boolean }
  | { type: 'reading'; sensor: SensorKey; timestampMs: number; hasValue: boolean }
  | { type: 'error'; sensor: SensorKey; errorName: string }
  | { type: 'tick'; nowMs: number };

const SENSOR_KEYS: SensorKey[] = [
  'deviceOrientation',
  'deviceMotion',
  'accelerometer',
  'gyroscope',
  'magnetometer',
  'ambientLight',
];

function makeEntry(): SensorEntry {
  return { status: 'unknown', apiPresent: false, lastReadingMs: null, pendingSinceMs: null };
}

export function initialAvailabilityState(windowMs = 1000): AvailabilityState {
  const sensors = {} as Record<SensorKey, SensorEntry>;
  for (const key of SENSOR_KEYS) {
    sensors[key] = makeEntry();
  }
  return { windowMs, sensors };
}

function mapErrorToStatus(errorName: string): SensorStatus {
  if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
    return 'denied';
  }
  return 'error';
}

export function availabilityReducer(
  state: AvailabilityState,
  action: AvailabilityAction,
): AvailabilityState {
  switch (action.type) {
    case 'reset':
      return initialAvailabilityState(state.windowMs);
    case 'setWindow':
      return { ...state, windowMs: action.windowMs };
    case 'api': {
      const sensors = { ...state.sensors };
      sensors[action.sensor] = {
        status: action.present ? 'unknown' : 'api-missing',
        apiPresent: action.present,
        lastReadingMs: null,
        pendingSinceMs: null,
      };
      return { ...state, sensors };
    }
    case 'reading': {
      const entry = state.sensors[action.sensor];
      if (!entry || !entry.apiPresent) {
        return state;
      }
      const sensors = { ...state.sensors };
      if (action.hasValue) {
        sensors[action.sensor] = {
          ...entry,
          status: 'active',
          lastReadingMs: action.timestampMs,
          pendingSinceMs: null,
        };
      }
      return { ...state, sensors };
    }
    case 'error': {
      const entry = state.sensors[action.sensor];
      if (!entry) {
        return state;
      }
      const sensors = { ...state.sensors };
      sensors[action.sensor] = {
        ...entry,
        status: mapErrorToStatus(action.errorName),
      };
      return { ...state, sensors };
    }
    case 'tick': {
      const sensors = { ...state.sensors };
      for (const key of SENSOR_KEYS) {
        const entry = sensors[key];
        if (!entry || !entry.apiPresent) {
          continue;
        }
        if (entry.status === 'unknown') {
          const since = entry.pendingSinceMs ?? action.nowMs;
          if (entry.lastReadingMs !== null) {
            sensors[key] = { ...entry, status: 'active', pendingSinceMs: null };
          } else if (action.nowMs - since >= state.windowMs) {
            sensors[key] = { ...entry, status: 'no-data', pendingSinceMs: since };
          } else {
            sensors[key] = { ...entry, pendingSinceMs: since };
          }
        } else if (entry.status === 'active' && entry.lastReadingMs !== null) {
          if (action.nowMs - entry.lastReadingMs >= state.windowMs) {
            sensors[key] = { ...entry, status: 'no-data' };
          }
        }
      }
      return { ...state, sensors };
    }
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function reduceSensorList(
  entries: ReadonlyArray<readonly [SensorKey, boolean]>,
  windowMs = 1000,
): AvailabilityState {
  let state = initialAvailabilityState(windowMs);
  for (const [sensor, present] of entries) {
    state = availabilityReducer(state, { type: 'api', sensor, present });
  }
  return state;
}

export function hasAnySensor(state: AvailabilityState): boolean {
  return SENSOR_KEYS.some((key) => state.sensors[key].status === 'active');
}

export type SensorSummary = 'some-active' | 'none-detected' | 'pending';

export function sensorSummary(state: AvailabilityState): SensorSummary {
  if (SENSOR_KEYS.some((key) => state.sensors[key].status === 'active')) {
    return 'some-active';
  }
  if (SENSOR_KEYS.some((key) => state.sensors[key].status === 'unknown')) {
    return 'pending';
  }
  return 'none-detected';
}
