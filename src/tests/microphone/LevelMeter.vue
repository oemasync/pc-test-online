<template>
  <div class="level-meter">
    <div
      class="level-meter__bar"
      :aria-hidden="true"
    >
      <div
        class="level-meter__fill"
        :style="{ width: meterWidth }"
      />
    </div>
    <p
      class="level-meter__readout"
      role="status"
      aria-live="polite"
    >
      {{ readout }}
    </p>
    <div class="level-meter__stats">
      <span>{{ t('tests.microphone.peakLabel') }}: {{ peakDbfs.toFixed(1) }} dBFS</span>
      <span>{{ t('tests.microphone.clipLabel') }}: {{ clipCount }}</span>
      <span>{{ t('tests.microphone.noiseFloorLabel') }}:
        {{ noiseFloorDbfs.toFixed(1) }} dBFS</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
    dbfs: number;
    peakDbfs: number;
    clipCount: number;
    noiseFloorDbfs: number;
}>();

const { t } = useI18n();

const meterWidth = computed(() => {
    const pct = Math.max(0, Math.min(100, ((props.dbfs + 60) / 60) * 100));
    return `${pct}%`;
});

const readout = computed(() => `${props.dbfs.toFixed(1)} dBFS`);
</script>

<style scoped>
.level-meter__bar {
    width: 100%;
    height: 1rem;
    background: var(--border, #ccc);
    border-radius: 4px;
    overflow: hidden;
}
.level-meter__fill {
    height: 100%;
    background: var(--color-accent, #22c55e);
    transition: width 80ms linear;
}
.level-meter__readout {
    margin: 0.25rem 0;
    font-variant-numeric: tabular-nums;
}
.level-meter__stats {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.85rem;
}
</style>
