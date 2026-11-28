import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  initialAvailabilityState,
  availabilityReducer,
  sensorSummary,
  tiltFromAcceleration,
  estimateSampleRate,
} from './logic';
import type { SensorKey, SensorStatus } from './logic';

interface SensorInstance {
  start(): void;
  stop(): void;
  addEventListener(type: string, cb: (e: Event) => void): void;
  removeEventListener(type: string, cb: (e: Event) => void): void;
  x?: number | null;
  y?: number | null;
  z?: number | null;
  illuminance?: number | null;
}

interface SensorCtor {
  new (opts?: { frequency?: number }): SensorInstance;
}

export function useSensors() {
  const { t } = useI18n();

  const windowMs = 1000;
  const availability = ref(initialAvailabilityState(windowMs));
  const pitch = ref(0);
  const roll = ref(0);
  const motionTimestamps = ref<number[]>([]);
  const sampleRate = ref(0);
  const screenType = ref('');
  const screenAngle = ref(0);
  const vibrationSupported = ref(false);
  const needsPermission = ref(false);
  const permissionStatus = ref<'granted' | 'denied' | 'not-required'>('not-required');
  const permissionError = ref<string | null>(null);

  const genericSensors: Partial<Record<SensorKey, SensorInstance>> = {};
  const sensorHandlers: Partial<Record<SensorKey, { reading: () => void; error: (e: Event) => void }>> = {};
  let tickTimer: number | null = null;

  const sensorKeys: SensorKey[] = [
    'deviceOrientation',
    'deviceMotion',
    'accelerometer',
    'gyroscope',
    'magnetometer',
    'ambientLight',
  ];

  const summary = computed(() => sensorSummary(availability.value));
  const canPass = computed(() => summary.value === 'some-active');

  const details = computed<Record<string, string | number | boolean>>(() => {
    const d: Record<string, string | number | boolean> = {};
    for (const key of sensorKeys) {
      d[key] = availability.value.sensors[key].status === 'active';
    }
    d.sampleRateHz = sampleRate.value;
    d.screenOrientation = screenType.value;
    d.screenAngle = screenAngle.value;
    d.vibration = vibrationSupported.value;
    d.permission = permissionStatus.value;
    return d;
  });

  function statusLabel(status: SensorStatus): string {
    const labels: Record<SensorStatus, string> = {
      unknown: t('tests.sensors.statusPending'),
      'api-missing': t('tests.sensors.statusApiMissing'),
      'no-data': t('tests.sensors.statusNoData'),
      active: t('tests.sensors.statusActive'),
      denied: t('tests.sensors.statusDenied'),
      error: t('tests.sensors.statusError'),
    };
    return labels[status];
  }

  function trimTimestamps(): void {
    if (motionTimestamps.value.length > 30) {
      motionTimestamps.value = motionTimestamps.value.slice(-30);
    }
  }

  function updateSampleRate(): void {
    const r = estimateSampleRate(motionTimestamps.value);
    if (r !== null) sampleRate.value = r;
  }

  function onOrientation(e: DeviceOrientationEvent): void {
    const hasValue = e.alpha !== null || e.beta !== null || e.gamma !== null;
    if (e.beta !== null) pitch.value = e.beta;
    if (e.gamma !== null) roll.value = e.gamma;
    motionTimestamps.value.push(performance.now());
    trimTimestamps();
    updateSampleRate();
    availability.value = availabilityReducer(availability.value, {
      type: 'reading',
      sensor: 'deviceOrientation',
      timestampMs: Date.now(),
      hasValue,
    });
  }

  function onMotion(e: DeviceMotionEvent): void {
    const ag = e.accelerationIncludingGravity;
    const hasValue = ag !== null && (ag.x !== null || ag.y !== null || ag.z !== null);
    if (hasValue && ag) {
      const tilt = tiltFromAcceleration({ x: ag.x ?? 0, y: ag.y ?? 0, z: ag.z ?? 0 });
      pitch.value = tilt.pitch;
      roll.value = tilt.roll;
      motionTimestamps.value.push(performance.now());
      trimTimestamps();
      const r = estimateSampleRate(motionTimestamps.value);
      if (r !== null) sampleRate.value = r;
      else if (e.interval && e.interval > 0) sampleRate.value = 1000 / e.interval;
    }
    availability.value = availabilityReducer(availability.value, {
      type: 'reading',
      sensor: 'deviceMotion',
      timestampMs: Date.now(),
      hasValue,
    });
  }

  function readScreenOrientation(): void {
    const so = (screen as { orientation?: { type?: string; angle?: number } }).orientation;
    if (so) {
      screenType.value = so.type ?? '';
      screenAngle.value = so.angle ?? 0;
    }
  }

  function detect(): void {
    const hasDO = typeof DeviceOrientationEvent !== 'undefined';
    const hasDM = typeof DeviceMotionEvent !== 'undefined';
    availability.value = availabilityReducer(availability.value, {
      type: 'api',
      sensor: 'deviceOrientation',
      present: hasDO,
    });
    availability.value = availabilityReducer(availability.value, {
      type: 'api',
      sensor: 'deviceMotion',
      present: hasDM,
    });

    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    needsPermission.value = typeof DOE.requestPermission === 'function';

    const genericMap: Array<[SensorKey, string]> = [
      ['accelerometer', 'Accelerometer'],
      ['gyroscope', 'Gyroscope'],
      ['magnetometer', 'Magnetometer'],
      ['ambientLight', 'AmbientLightSensor'],
    ];
    for (const [key, ctorName] of genericMap) {
      const Ctor = (globalThis as Record<string, unknown>)[ctorName] as SensorCtor | undefined;
      const present = typeof Ctor === 'function';
      availability.value = availabilityReducer(availability.value, {
        type: 'api',
        sensor: key,
        present,
      });
      if (present && Ctor) {
        try {
          const sensor = new Ctor({ frequency: 10 });
          genericSensors[key] = sensor;
          const readingHandler = () => {
            availability.value = availabilityReducer(availability.value, {
              type: 'reading',
              sensor: key,
              timestampMs: Date.now(),
              hasValue: true,
            });
          };
          const errorHandler = (e: Event) => {
            const err = (e as { error?: { name?: string } }).error;
            availability.value = availabilityReducer(availability.value, {
              type: 'error',
              sensor: key,
              errorName: err?.name ?? 'Error',
            });
          };
          sensorHandlers[key] = { reading: readingHandler, error: errorHandler };
          sensor.addEventListener('reading', readingHandler);
          sensor.addEventListener('error', errorHandler);
          sensor.start();
        } catch (err) {
          availability.value = availabilityReducer(availability.value, {
            type: 'error',
            sensor: key,
            errorName: err instanceof Error ? err.name : 'Error',
          });
        }
      }
    }

    vibrationSupported.value = typeof navigator.vibrate === 'function';
    readScreenOrientation();

    if (hasDO) window.addEventListener('deviceorientation', onOrientation as EventListener);
    if (hasDM) window.addEventListener('devicemotion', onMotion as EventListener);
  }

  async function requestPermission(): Promise<void> {
    try {
      const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof DOE.requestPermission === 'function') {
        const result = await DOE.requestPermission();
        if (result !== 'granted') {
          needsPermission.value = true;
          permissionStatus.value = 'denied';
          permissionError.value = null;
          return;
        }
      }
      const DME = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof DME.requestPermission === 'function') {
        const result = await DME.requestPermission();
        if (result !== 'granted') {
          needsPermission.value = true;
          permissionStatus.value = 'denied';
          permissionError.value = null;
          return;
        }
      }
      needsPermission.value = false;
      permissionStatus.value = 'granted';
      permissionError.value = null;
    } catch (err) {
      needsPermission.value = true;
      permissionStatus.value = 'denied';
      permissionError.value = err instanceof Error ? err.name : 'Error';
    }
  }

  function vibrate(): void {
    if (vibrationSupported.value) {
      navigator.vibrate(200);
    }
  }

  const dotStyle = computed(() => ({
    transform: `translate(${Math.max(-40, Math.min(40, roll.value))}px, ${Math.max(-40, Math.min(40, pitch.value))}px)`,
  }));

  onMounted(() => {
    detect();
    tickTimer = window.setInterval(() => {
      availability.value = availabilityReducer(availability.value, {
        type: 'tick',
        nowMs: Date.now(),
      });
    }, 200);
  });

  onUnmounted(() => {
    if (tickTimer !== null) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    window.removeEventListener('deviceorientation', onOrientation as EventListener);
    window.removeEventListener('devicemotion', onMotion as EventListener);
    for (const s of Object.values(genericSensors)) {
      s?.stop();
    }
    for (const key of Object.keys(genericSensors)) {
      const sensor = genericSensors[key as SensorKey];
      const handlers = sensorHandlers[key as SensorKey];
      if (sensor && handlers) {
        sensor.removeEventListener('reading', handlers.reading);
        sensor.removeEventListener('error', handlers.error);
      }
    }
  });

  return {
    t,
    availability,
    pitch,
    roll,
    sampleRate,
    screenType,
    screenAngle,
    vibrationSupported,
    needsPermission,
    permissionStatus,
    permissionError,
    sensorKeys,
    summary,
    canPass,
    details,
    statusLabel,
    dotStyle,
    requestPermission,
    vibrate,
  };
}
