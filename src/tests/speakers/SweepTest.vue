<template>
  <section class="sweep">
    <h3>{{ t('tests.speakers.sweepTitle') }}</h3>
    <button
      type="button"
      data-testid="play-sweep"
      @click="playSweep"
    >
      {{ t('tests.speakers.playLeft') }}
    </button>
    <div class="sweep__marks">
      <button
        type="button"
        data-testid="mark-low"
        @click="markLow"
      >
        {{ t('tests.speakers.markLow') }}
      </button>
      <button
        type="button"
        data-testid="mark-high"
        @click="markHigh"
      >
        {{ t('tests.speakers.markHigh') }}
      </button>
    </div>
    <p
      data-testid="audible-range"
      aria-live="polite"
    >
      {{ state.lowHz ?? '-' }} - {{ state.highHz ?? '-' }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getAudioContext, resumeAudioContext } from '@/lib/audio'
import {
    audibleRangeReducer,
    createAudibleRange,
    markedSweepFrequency,
    voiceGain,
    SWEEP_MIN_HZ,
    SWEEP_MAX_HZ,
} from './logic';
import type { AudibleRangeState } from './logic';

const emit = defineEmits<{ (e: 'range', low: number | null, high: number | null): void }>();
const { t } = useI18n();
const state = ref<AudibleRangeState>(createAudibleRange());
const DURATION = 10;
let startTime = 0;
let osc: OscillatorNode | null = null;

async function playSweep(): Promise<void> {
    const ctx = await resumeAudioContext();
    if (!ctx) return;
    stop();
    osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = voiceGain(0.15, 1);
    osc.frequency.setValueAtTime(SWEEP_MIN_HZ, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(SWEEP_MAX_HZ, ctx.currentTime + DURATION);
    osc.connect(gain);
    gain.connect(ctx.destination);
    startTime = ctx.currentTime;
    osc.start();
    osc.stop(ctx.currentTime + DURATION);
}

function markLow(): void {
    const ctx = getAudioContext();
    if (!ctx) return;
    const pressTime = ctx.currentTime - startTime;
    const hz = markedSweepFrequency({ pressTime, duration: DURATION, direction: 'rising' });
    state.value = audibleRangeReducer(state.value, { type: 'markLow', hz });
    emitRange();
}

function markHigh(): void {
    const ctx = getAudioContext();
    if (!ctx) return;
    const pressTime = ctx.currentTime - startTime;
    const hz = markedSweepFrequency({ pressTime, duration: DURATION, direction: 'falling' });
    state.value = audibleRangeReducer(state.value, { type: 'markHigh', hz });
    emitRange();
}

function emitRange(): void {
    emit('range', state.value.lowHz, state.value.highHz);
}

function stop(): void {
    try {
        osc?.stop();
    } catch (err) {
            console.debug("audio: node already stopped or disconnected", err)
        }
    try {
        osc?.disconnect();
    } catch (err) {
            console.debug("audio: node already stopped or disconnected", err)
        }
    osc = null;
}

onUnmounted(() => {
    stop();
});
</script>

<style scoped>
.sweep__marks {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
}
</style>
