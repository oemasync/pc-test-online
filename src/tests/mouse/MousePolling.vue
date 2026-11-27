<template>
  <div class="mouse-polling">
    <p>
      {{ t('tests.mouse.pollingRate') }}:
      <span
        data-testid="polling-rate"
        aria-live="polite"
      >{{ medianHz ?? '-' }}</span> Hz
    </p>
    <p>
      {{ t('tests.mouse.nearestRate') }}:
      <span
        data-testid="nearest-rate"
        aria-live="polite"
      >{{ nearestRate ?? '-' }}</span> Hz
    </p>
    <p>
      {{ t('tests.mouse.samples') }}:
      <span
        data-testid="polling-samples"
        aria-live="polite"
      >{{ samples }}</span>
    </p>
    <p class="mouse-polling__hint">
      {{ t('tests.mouse.pollingHint') }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  medianHz: number | null
  nearestRate: number | null
  samples: number
}>()
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<style scoped>
.mouse-polling__hint {
  font-style: italic;
  opacity: 0.8;
}
</style>
