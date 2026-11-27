<template>
  <section class="stick-panel">
    <h3>{{ title }}</h3>
    <div class="stick-panel__stats">
      <StatTile
        :label="t('tests.gamepad.meanOffset')"
        :value="drift.meanOffset.toFixed(3)"
        aria-live="polite"
      />
      <StatTile
        :label="t('tests.gamepad.maxOffset')"
        :value="drift.maxOffset.toFixed(3)"
        aria-live="polite"
      />
      <StatTile
        :label="t('tests.gamepad.noise')"
        :value="drift.noise.toFixed(3)"
        aria-live="polite"
      />
      <StatTile
        :label="t('tests.gamepad.coverage')"
        :value="Math.round(circularity.coverage * 100) + '%'"
        aria-live="polite"
      />
      <StatTile
        :label="t('tests.gamepad.error')"
        :value="circularity.error.toFixed(3)"
        aria-live="polite"
      />
      <StatTile
        :label="t('tests.gamepad.resting')"
        :value="restCount"
        aria-live="polite"
      />
    </div>
    <svg
      class="stick-panel__plot"
      viewBox="-1.2 -1.2 2.4 2.4"
      role="img"
      :aria-label="title"
    >
      <circle
        cx="0"
        cy="0"
        r="1"
        class="stick-panel__ring"
      />
      <circle
        :cx="x"
        :cy="y"
        r="0.08"
        class="stick-panel__dot"
      />
      <circle
        v-for="(sample, index) in plottedSamples"
        :key="index"
        :cx="sample.x"
        :cy="sample.y"
        r="0.015"
        class="stick-panel__sample"
      />
    </svg>
    <p
      v-if="drift.drifting"
      class="stick-panel__warning"
    >
      {{ t('tests.gamepad.drift') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import StatTile from '@/ui/StatTile.vue';
import type { StickPoint } from './logic';
import type { CircularityResult, StickDriftResult } from './logic';

const props = defineProps<{
    title: string;
    x: number;
    y: number;
    drift: StickDriftResult;
    circularity: CircularityResult;
    samples: StickPoint[];
    restCount: number;
}>();

const { t } = useI18n();

const plottedSamples = computed(() => props.samples.slice(-120));
</script>

<style scoped>
.stick-panel__stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
}
.stick-panel__plot {
    width: 100%;
    max-width: 220px;
    aspect-ratio: 1;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 50%;
}
.stick-panel__ring {
    fill: none;
    stroke: var(--border);
    stroke-width: 0.02;
}
.stick-panel__dot {
    fill: var(--color-warning);
}
.stick-panel__sample {
    fill: var(--color-accent);
    opacity: 0.6;
}
.stick-panel__warning {
    color: var(--color-danger);
    font-weight: 600;
}
</style>
