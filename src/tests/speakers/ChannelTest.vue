<template>
  <section class="channel-test">
    <h3>{{ t('tests.speakers.channelsTitle') }}</h3>
    <div class="channel-test__buttons">
      <button
        type="button"
        data-testid="play-left"
        @click="play('left')"
      >
        {{ t('tests.speakers.playLeft') }}
      </button>
      <button
        type="button"
        data-testid="play-right"
        @click="play('right')"
      >
        {{ t('tests.speakers.playRight') }}
      </button>
      <button
        type="button"
        data-testid="play-both"
        @click="play('both')"
      >
        {{ t('tests.speakers.playBoth') }}
      </button>
    </div>
    <p
      v-if="playing"
      data-testid="channel-playing"
      aria-live="polite"
    >
      {{ playing }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { resumeAudioContext } from '@/lib/audio';
import { panForChannel, gainRampEnvelope, CLICK_FREE_ATTACK_S, voiceGain } from './logic';

const emit = defineEmits<{ (e: 'played', channel: 'left' | 'right' | 'both'): void }>();
const { t } = useI18n();
const playing = ref<string>('');
const activeNodes: AudioNode[] = [];
const activeOscs: OscillatorNode[] = [];

async function play(channel: 'left' | 'right' | 'both'): Promise<void> {
    const ctx = await resumeAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    panner.pan.value = panForChannel(channel);
    const peak = voiceGain(0.2, 1);
    const env = gainRampEnvelope(ctx.currentTime, peak, 0.01, 0.3, 0.05);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    for (const pt of env) {
        if (pt.ramp === 'set') gain.gain.setValueAtTime(pt.value, pt.time);
        else if (pt.ramp === 'linear') gain.gain.linearRampToValueAtTime(pt.value, pt.time);
        else if (pt.ramp === 'setTargetAtTime')
            gain.gain.setTargetAtTime(pt.value, pt.time, pt.timeConstant ?? CLICK_FREE_ATTACK_S);
    }
    osc.frequency.value = 440;
    osc.connect(panner);
    panner.connect(gain);
    gain.connect(ctx.destination);
    activeNodes.push(panner, gain);
    activeOscs.push(osc);
    osc.start();
    const stopAt = env[env.length - 1]?.time ?? ctx.currentTime + 0.5;
    osc.stop(stopAt);
    playing.value = channel;
    emit('played', channel);
    osc.onended = () => {
        try {
            osc.disconnect();
        } catch (err) {
            console.debug("audio: node already stopped or disconnected", err)
        }
        try {
            panner.disconnect();
        } catch (err) {
            console.debug("audio: node already stopped or disconnected", err)
        }
        try {
            gain.disconnect();
        } catch (err) {
            console.debug("audio: node already stopped or disconnected", err)
        }
    };
}

onUnmounted(() => {
    for (const o of activeOscs) {
        try {
            o.stop();
        } catch (err) {
            console.debug('audio: node already stopped or disconnected', err);
        }
        try {
            o.disconnect();
        } catch (err) {
            console.debug('audio: node already stopped or disconnected', err);
        }
    }
    for (const n of activeNodes) {
        try {
            n.disconnect();
        } catch (err) {
            console.debug('audio: node already stopped or disconnected', err);
        }
    }
    activeOscs.length = 0;
    activeNodes.length = 0;
});
</script>

<style scoped>
.channel-test__buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}
</style>
