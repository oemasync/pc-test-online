<template>
  <section class="chord">
    <h3>{{ t('tests.speakers.chordTitle') }}</h3>
    <button
      type="button"
      data-testid="play-chord"
      @click="play"
    >
      {{ t('tests.speakers.playChord') }}
    </button>
    <p
      v-if="playing"
      data-testid="chord-playing"
    >
      playing
    </p>
  </section>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { resumeAudioContext } from '@/lib/audio';
import { pleasantChordFrequencies, voiceGain } from './logic';

const emit = defineEmits<{ (e: 'played'): void }>();
const { t } = useI18n();
const playing = ref(false);
const oscs: OscillatorNode[] = [];

async function play(): Promise<void> {
    const ctx = await resumeAudioContext();
    if (!ctx) return;
    stop();
    const freqs = pleasantChordFrequencies();
    const perVoice = voiceGain(0.2, freqs.length);
    const gain = ctx.createGain();
    gain.gain.value = perVoice;
    for (const f of freqs) {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        o.connect(gain);
        oscs.push(o);
        o.start();
        o.stop(ctx.currentTime + 0.6);
    }
    gain.connect(ctx.destination);
    playing.value = true;
    emit('played');
    setTimeout(() => {
        playing.value = false;
    }, 650);
}

function stop(): void {
    for (const o of oscs) {
        try {
            o.stop();
        } catch {
            /* noop */
        }
        try {
            o.disconnect();
        } catch {
            /* noop */
        }
    }
    oscs.length = 0;
}

onUnmounted(() => {
    stop();
});
</script>

<style scoped>
.chord {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>
