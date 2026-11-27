<template>
  <section class="refresh-panel">
    <h3>{{ t('tests.display.refresh.title') }}</h3>
    <p class="refresh-panel__hint">
      {{ t('tests.display.refresh.focusHint') }}
    </p>
    <div class="refresh-panel__actions">
      <button
        type="button"
        @click="start"
      >
        {{ t('tests.display.refresh.start') }}
      </button>
      <button
        type="button"
        @click="stop"
      >
        {{ t('tests.display.refresh.stop') }}
      </button>
    </div>
    <dl class="refresh-panel__list">
      <div>
        <dt>{{ t('tests.display.refresh.estimatedHz') }}</dt>
        <dd>{{ estimate?.estimatedHz?.toFixed(2) ?? '—' }}</dd>
      </div>
      <div>
        <dt>{{ t('tests.display.refresh.nearestStandard') }}</dt>
        <dd>{{ estimate?.nearestStandardHz ?? '—' }}</dd>
      </div>
      <div>
        <dt>{{ t('tests.display.refresh.medianInterval') }}</dt>
        <dd>{{ estimate?.medianIntervalMs?.toFixed(2) ?? '—' }} ms</dd>
      </div>
      <div>
        <dt>{{ t('tests.display.refresh.samples') }}</dt>
        <dd>{{ estimate?.sampleCount ?? 0 }}</dd>
      </div>
      <div>
        <dt>{{ t('tests.display.refresh.rejected') }}</dt>
        <dd>{{ estimate?.rejectedCount ?? 0 }}</dd>
      </div>
      <div>
        <dt>{{ t('tests.display.refresh.jitter') }}</dt>
        <dd>{{ jitter?.standardDeviationMs?.toFixed(2) ?? '—' }} ms</dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { estimateRefreshRate, frameIntervalsFromTimestamps, jitterStats } from './logic';
import type { JitterStats, RefreshRateEstimate } from './logic';

const emit = defineEmits<{
    (e: 'update:refresh', value: RefreshRateEstimate): void;
    (e: 'update:jitter', value: JitterStats): void;
}>();

const { t } = useI18n();
const running = ref(false);
const samples = ref<number[]>([]);
const estimate = ref<RefreshRateEstimate | null>(null);
const jitter = ref<JitterStats | null>(null);
let rafId: number | null = null;

function finish(): void {
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    running.value = false;
    const intervals = frameIntervalsFromTimestamps(samples.value);
    const nextEstimate = estimateRefreshRate(intervals);
    const nextJitter = jitterStats(intervals);
    estimate.value = nextEstimate;
    jitter.value = nextJitter;
    emit('update:refresh', nextEstimate);
    emit('update:jitter', nextJitter);
}

function frame(timestamp: number): void {
    if (!running.value) return;
    samples.value.push(timestamp);
    if (samples.value.length >= 60) {
        finish();
        return;
    }
    rafId = requestAnimationFrame(frame);
}

function start(): void {
    if (running.value) return;
    samples.value = [];
    estimate.value = null;
    jitter.value = null;
    running.value = true;
    rafId = requestAnimationFrame(frame);
}

function stop(): void {
    if (!running.value) return;
    if (samples.value.length >= 2) {
        finish();
    } else {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        running.value = false;
    }
}

onMounted(() => {
    // rAF is started only by an explicit user action.
});

onUnmounted(() => {
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    running.value = false;
});
</script>

<style scoped>
.refresh-panel__hint {
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
}

.refresh-panel__actions {
    display: flex;
    gap: 0.5rem;
    margin: 0.5rem 0;
}

.refresh-panel__actions button {
    flex: 1 1 0;
}

.refresh-panel__list {
    display: grid;
    gap: 0.5rem;
    margin: 0.5rem 0;
}

.refresh-panel__list div {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
}

.refresh-panel__list dt {
    color: var(--text-secondary, #6b7280);
}

.refresh-panel__list dd {
    margin: 0;
    font-weight: 600;
}
</style>
