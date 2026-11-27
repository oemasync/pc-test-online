<template>
  <section class="trigger-panel">
    <h3>{{ t('tests.gamepad.triggerLeft') }} / {{ t('tests.gamepad.triggerRight') }}</h3>
    <div class="trigger-panel__row">
      <div class="trigger-panel__item">
        <span>{{ t('tests.gamepad.triggerLeft') }}</span>
        <progress
          :value="left.max"
          max="1"
        />
        <span>{{ t('tests.gamepad.min') }}: {{ left.min.toFixed(2) }}</span>
        <span>{{ t('tests.gamepad.max') }}: {{ left.max.toFixed(2) }}</span>
        <span>{{ t('tests.gamepad.fullRange') }}: {{ left.fullRange }}</span>
      </div>
      <div class="trigger-panel__item">
        <span>{{ t('tests.gamepad.triggerRight') }}</span>
        <progress
          :value="right.max"
          max="1"
        />
        <span>{{ t('tests.gamepad.min') }}: {{ right.min.toFixed(2) }}</span>
        <span>{{ t('tests.gamepad.max') }}: {{ right.max.toFixed(2) }}</span>
        <span>{{ t('tests.gamepad.fullRange') }}: {{ right.fullRange }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TriggerRange } from './logic';

defineProps<{
    left: TriggerRange;
    right: TriggerRange;
}>();

import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<style scoped>
.trigger-panel__row {
    display: flex;
    gap: 1rem;
}
.trigger-panel__item {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}
</style>
