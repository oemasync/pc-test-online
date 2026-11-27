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
      <PermissionPrompt
        v-if="summary === 'none-detected'"
        :kind="'unsupported'"
      />
      <PermissionPrompt
        v-if="permissionStatus === 'denied'"
        :kind="'denied'"
      />

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
        <div
          class="sensors__readouts"
          aria-live="polite"
        >
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
import TestLayout from '@/ui/TestLayout.vue';
import PermissionPrompt from '@/ui/PermissionPrompt.vue';
import { useSensors } from './useSensors';

const {
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
  sensorKeys,
  summary,
  canPass,
  details,
  statusLabel,
  dotStyle,
  requestPermission,
  vibrate,
} = useSensors();
</script>

<style scoped>
.sensors {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.sensors__none {
  color: var(--color-danger);
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
  border: 1px solid var(--border);
  border-radius: 4px;
}
.bubble {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 2px solid var(--border);
  position: relative;
  margin: 0.5rem 0;
}
.bubble__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-accent);
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