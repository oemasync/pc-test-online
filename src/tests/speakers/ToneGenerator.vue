<template>
  <section class="tone-gen">
    <h3>{{ t('tests.speakers.toneTitle') }}</h3>
    <label>{{ t('tests.speakers.frequency') }}
      <input
        v-model.number="frequency"
        type="number"
        data-testid="tone-frequency"
      >
    </label>
    <label>{{ t('tests.speakers.volume') }}
      <input
        v-model.number="volume"
        type="range"
        min="0"
        max="1"
        step="0.01"
        data-testid="tone-volume"
      >
    </label>
    <button
      v-if="!playing"
      type="button"
      data-testid="play-tone"
      @click="start"
    >
      {{ t('tests.speakers.playTone') }}
    </button>
    <button
      v-else
      type="button"
      data-testid="stop-tone"
      @click="stop"
    >
      {{ t('tests.speakers.stopTone') }}
    </button>
    <p
      v-if="playing"
      data-testid="tone-playing"
      aria-live="polite"
    >
      playing
    </p>
  </section>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { resumeAudioContext } from '@/lib/audio';
import { voiceGain } from './logic';

const emit = defineEmits<{ (e: 'started', frequency: number, volume: number): void }>();
const { t } = useI18n();
const frequency = ref(440);
const volume = ref(0.1);
const playing = ref(false);
let osc: OscillatorNode | null = null;
let gain: GainNode | null = null;

async function start(): Promise<void> {
    const ctx = await resumeAudioContext();
    if (!ctx) return;
    osc = ctx.createOscillator();
    gain = ctx.createGain();
    gain.gain.value = voiceGain(volume.value, 1);
    osc.frequency.value = frequency.value;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    playing.value = true;
    emit('started', frequency.value, volume.value);
}

function stop(): void {
    try {
        osc?.stop();
    } catch (err) {
        console.debug('audio: node already stopped or disconnected', err);
    }
    try {
        osc?.disconnect();
    } catch (err) {
        console.debug('audio: node already stopped or disconnected', err);
    }
    try {
        gain?.disconnect();
    } catch (err) {
        console.debug('audio: node already stopped or disconnected', err);
    }
    osc = null;
    gain = null;
    playing.value = false;
}

onUnmounted(() => {
    stop();
});
</script>

<style scoped>
.tone-gen {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>
