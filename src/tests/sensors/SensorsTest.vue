<template>
  <TestLayout
    test-id="sensors"
    :title="t('tests.sensors.title')"
    :details="details"
    :can-pass="canPass"
  >
    <template #instructions>
      {{ t('tests.sensors.instructions') }}
    </template>
    <div class="sensors">
      <button
        v-if="needsPermission"
        type="button"
        class="sensors__perm"
        @click="requestPermission"
      >
        {{ t('tests.sensors.permissionButton') }}
      </button>

      <p
        v-if="summary === 'none-detected'"
        data-testid="no-sensors"
        class="sensors__none"
      >
        {{ t('tests.sensors.noSensors') }}
      </p>

      <section class="sensors__section">
        <h3>{{ t('tests.sensors.listTitle') }}</h3>
        <ul class="sensors__list">
          <li
            v-for="key in sensorKeys"
            :key="key"
            class="sensors__list-item"
          >
            <span>{{ key }}</span>
            <span :data-testid="`sensor-status-${key}`">{{
              statusLabel(availability.sensors[key].status)
            }}</span>
          </li>
        </ul>
      </section>

      <section class="sensors__section">
        <h3>{{ t('tests.sensors.bubbleLabel') }}</h3>
        <div
          data-testid="bubble-level"
          class="bubble"
        >
          <div
            class="bubble__dot"
            :style="dotStyle"
          />
        </div>
        <div class="sensors__readouts">
          <span data-testid="tilt-pitch">{{ t('tests.sensors.pitchLabel') }}: {{ pitch.toFixed(1) }}</span>
          <span data-testid="tilt-roll">{{ t('tests.sensors.rollLabel') }}: {{ roll.toFixed(1) }}</span>
          <span data-testid="sample-rate">{{ t('tests.sensors.sampleRateLabel') }}: {{ sampleRate.toFixed(1) }}</span>
        </div>
      </section>

      <section class="sensors__section">
        <h3>{{ t('tests.sensors.orientationTitle') }}</h3>
        <div>{{ t('tests.sensors.orientationType') }}: {{ screenType }}</div>
        <div>{{ t('tests.sensors.orientationAngle') }}: {{ screenAngle }}</div>
      </section>

      <section class="sensors__section">
        <h3>{{ t('tests.sensors.vibrationTitle') }}</h3>
        <button
          v-if="vibrationSupported"
          type="button"
          data-testid="vibration-button"
          @click="vibrate"
        >
          {{ t('tests.sensors.vibrationButton') }}
        </button>
        <p v-else>
          {{ t('tests.sensors.vibrationUnsupported') }}
        </p>
      </section>
    </div>
  </TestLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import TestLayout from '@/ui/TestLayout.vue';
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

const genericSensors: Partial<Record<SensorKey, SensorInstance>> = {};
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
                sensor.addEventListener('reading', () => {
                    availability.value = availabilityReducer(availability.value, {
                        type: 'reading',
                        sensor: key,
                        timestampMs: Date.now(),
                        hasValue: true,
                    });
                });
                sensor.addEventListener('error', (e: Event) => {
                    const err = (e as { error?: { name?: string } }).error;
                    availability.value = availabilityReducer(availability.value, {
                        type: 'error',
                        sensor: key,
                        errorName: err?.name ?? 'Error',
                    });
                });
                sensor.start();
            } catch {
                availability.value = availabilityReducer(availability.value, {
                    type: 'error',
                    sensor: key,
                    errorName: 'Error',
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
        const DOE = DeviceOrientationEvent as unknown as {
            requestPermission?: () => Promise<string>;
        };
        if (typeof DOE.requestPermission === 'function') {
            await DOE.requestPermission();
        }
        const DME = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
        if (typeof DME.requestPermission === 'function') {
            await DME.requestPermission();
        }
        needsPermission.value = false;
    } catch {
        needsPermission.value = true;
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
});
</script>

<style scoped>
.sensors {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.sensors__none {
    color: var(--color-danger, #dc2626);
    font-weight: 600;
}
.sensors__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.25rem;
}
.sensors__list-item {
    display: flex;
    justify-content: space-between;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border, #ccc);
    border-radius: 4px;
}
.bubble {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 2px solid var(--border, #ccc);
    position: relative;
    margin: 0.5rem 0;
}
.bubble__dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-accent, #2563eb);
    position: absolute;
    top: 50%;
    left: 50%;
    margin: -6px 0 0 -6px;
    transition: transform 0.1s linear;
}
.sensors__readouts {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}
.sensors__section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.sensors__perm {
    align-self: flex-start;
}
</style>
