<template>
  <section class="polarity">
    <h3>{{ t('tests.speakers.polarityTitle') }}</h3>
    <button
      type="button"
      data-testid="play-inphase"
      @click="play('inPhase')"
    >
      {{ t('tests.speakers.playInPhase') }}
    </button>
    <button
      type="button"
      data-testid="play-inverted"
      @click="play('inverted')"
    >
      {{ t('tests.speakers.playInverted') }}
    </button>
    <p
      v-if="playing"
      data-testid="polarity-playing"
      aria-live="polite"
    >
      {{ playing }}
    </p>
    <p class="hint">
      {{
        playing === 'inverted'
          ? t('tests.speakers.invertedHint')
          : t('tests.speakers.inPhaseHint')
      }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { resumeAudioContext } from '@/lib/audio';
import { rightChannelPolarityMultiplier, voiceGain } from './logic';

const emit = defineEmits<{ (e: 'played'): void }>();
const { t } = useI18n();
const playing = ref<string>('');
const oscs: OscillatorNode[] = [];

async function play(polarity: 'inPhase' | 'inverted'): Promise<void> {
    const ctx = await resumeAudioContext();
    if (!ctx) return;
    stop();
    const leftGain = ctx.createGain();
    const rightGain = ctx.createGain();
    rightGain.gain.value = rightChannelPolarityMultiplier(polarity);
    const master = ctx.createGain();
    master.gain.value = voiceGain(0.2, 2);
    // left
    const oL = ctx.createOscillator();
    oL.frequency.value = 220;
    oL.connect(leftGain);
    leftGain.connect(master);
    // right
    const oR = ctx.createOscillator();
    oR.frequency.value = 220;
    oR.connect(rightGain);
    rightGain.connect(master);
    master.connect(ctx.destination);
    oL.start();
    oR.start();
    oL.stop(ctx.currentTime + 0.6);
    oR.stop(ctx.currentTime + 0.6);
    oscs.push(oL, oR);
    playing.value = polarity;
    emit('played');
    setTimeout(() => {
        playing.value = '';
    }, 650);
}

function stop(): void {
    for (const o of oscs) {
        try {
            o.stop();
        } catch (err) {
            console.debug("audio: node already stopped or disconnected", err)
        }
        try {
            o.disconnect();
        } catch (err) {
            console.debug("audio: node already stopped or disconnected", err)
        }
    }
    oscs.length = 0;
}

onUnmounted(() => {
    stop();
});
</script>

<style scoped>
.polarity {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.hint {
    font-size: 0.85rem;
    color: var(--text-secondary);
}
</style>
