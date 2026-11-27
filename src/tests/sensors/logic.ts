// Framework-free pure logic for the sensors module.
// No Vue imports and no imports from src/core.

export const RAD_TO_DEG = 180 / Math.PI;

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
  let sum = 0;
  let count = 0;
  for (let i = 1; i < timestampsMs.length; i += 1) {
    const prev = timestampsMs[i - 1];
    const cur = timestampsMs[i];
    if (prev === undefined || cur === undefined) {
      continue;
    }
    const dt = cur - prev;
    if (dt > 0) {
      sum += dt;
      count += 1;
    }
  }
  if (count === 0) {
    return null;
  }
  const mean = sum / count;
  if (mean <= 0) {
    return null;
  }
  return 1000 / mean;
}

export type SensorKey =
  | 'deviceOrientation'
  | 'deviceMotion'
  | 'accelerometer'
  | 'gyroscope'
  | 'magnetometer'
  | 'ambientLight'
  | 'screenOrientation'
  | 'vibration';

export type Availability = 'unknown' | 'supported' | 'unsupported';

export type AvailabilityState = Record<SensorKey, Availability>;

export type AvailabilityAction =
  | { type: 'reset' }
  | { type: 'detected'; sensor: SensorKey }
  | { type: 'missing'; sensor: SensorKey };

export function initialAvailabilityState(): AvailabilityState {
  return {
    deviceOrientation: 'unknown',
    deviceMotion: 'unknown',
    accelerometer: 'unknown',
    gyroscope: 'unknown',
    magnetometer: 'unknown',
    ambientLight: 'unknown',
    screenOrientation: 'unknown',
    vibration: 'unknown',
  };
}

export function availabilityReducer(
  state: AvailabilityState,
  action: AvailabilityAction,
): AvailabilityState {
  switch (action.type) {
    case 'reset':
      return initialAvailabilityState();
    case 'detected':
      return { ...state, [action.sensor]: 'supported' };
    case 'missing':
      return { ...state, [action.sensor]: 'unsupported' };
    default:
      return state;
  }
}

export function reduceSensorList(entries: ReadonlyArray<readonly [SensorKey, boolean]>): AvailabilityState {
  return entries.reduce<AvailabilityState>((state, entry) => {
    const [sensor, present] = entry;
    return availabilityReducer(state, present ? { type: 'detected', sensor } : { type: 'missing', sensor });
  }, initialAvailabilityState());
}

export function hasAnySensor(state: AvailabilityState): boolean {
  return (Object.keys(state) as SensorKey[]).some((key) => state[key] === 'supported');
}

export function allUnsupported(state: AvailabilityState): boolean {
  return (Object.keys(state) as SensorKey[]).every((key) => state[key] === 'unsupported');
}
