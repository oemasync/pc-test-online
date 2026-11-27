<template>
  <TestLayout
    test-id="speakers"
    :title="t('tests.speakers.title')"
    :details="details"
    :can-pass="canPass"
  >
    <template #instructions>
      {{ t('tests.speakers.description') }}
    </template>
    <p
      class="notice"
      data-testid="lower-volume"
    >
      {{ t('tests.speakers.lowerVolume') }}
    </p>
    <p
      v-if="!sinkSupported"
      class="notice"
      data-testid="sink-unsupported"
    >
      {{ t('tests.speakers.unsupportedSink') }}
    </p>

    <div
      v-if="sinkSupported"
      class="device-row"
    >
      <label>{{ t('tests.speakers.outputDevice') }}
        <DeviceSelect
          v-model="selectedDeviceId"
          :devices="devices"
        />
      </label>
    </div>

    <ChannelTest @played="onChannelPlayed" />
    <ToneGenerator @started="onToneStarted" />
    <SweepTest @range="onRange" />
    <ChordTest @played="chordPlayed = true" />
    <PolarityTest @played="polarityPlayed = true" />
  </TestLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import TestLayout from '@/ui/TestLayout.vue';
import DeviceSelect from '@/ui/DeviceSelect.vue';
import { useDevices } from '@/lib/media';
import { getAudioContext } from '@/lib/audio';
import { detectSinkIdSupport, audibleRangeSpanOctaves } from './logic';
import ChannelTest from './ChannelTest.vue';
import ToneGenerator from './ToneGenerator.vue';
import SweepTest from './SweepTest.vue';
import ChordTest from './ChordTest.vue';
import PolarityTest from './PolarityTest.vue';

const { t } = useI18n()
const { devices } = useDevices('audiooutput');
const selectedDeviceId = ref('');

const channelsPlayed = ref(new Set<string>());
const tonePlayed = ref(false);
const toneFreq = ref(440);
const toneVol = ref(0.1);
const sweepLow = ref<number | null>(null);
const sweepHigh = ref<number | null>(null);
const chordPlayed = ref(false);
const polarityPlayed = ref(false);

const sinkSupport = computed(() =>
    detectSinkIdSupport(
        typeof AudioContext !== 'undefined' && 'setSinkId' in AudioContext.prototype,
        typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype,
    ),
);

const sinkSupported = computed(() => sinkSupport.value !== 'none');

const canPass = computed(
    () =>
        channelsPlayed.value.has('left') &&
        channelsPlayed.value.has('right') &&
        channelsPlayed.value.has('both') &&
        sweepLow.value !== null &&
        sweepHigh.value !== null
);

const details = computed(() => ({
    leftChannelPlayed: channelsPlayed.value.has('left'),
    rightChannelPlayed: channelsPlayed.value.has('right'),
    bothChannelsPlayed: channelsPlayed.value.has('both'),
    toneFrequencyHz: toneFreq.value,
    toneVolume: toneVol.value,
    sweepLowHz: sweepLow.value ?? 0,
    sweepHighHz: sweepHigh.value ?? 0,
    audibleRangeOctaves:
        sweepLow.value !== null && sweepHigh.value !== null
            ? audibleRangeSpanOctaves(sweepLow.value, sweepHigh.value)
            : 0,
    chordPlayed: chordPlayed.value,
    phaseCheckPlayed: polarityPlayed.value,
    sinkIdSupported: sinkSupported.value,
    outputDeviceId: selectedDeviceId.value,
}));

function onChannelPlayed(ch: string): void {
    channelsPlayed.value.add(ch);
}
function onToneStarted(f: number, v: number): void {
    tonePlayed.value = true;
    toneFreq.value = f;
    toneVol.value = v;
}
function onRange(low: number | null, high: number | null): void {
    sweepLow.value = low;
    sweepHigh.value = high;
}

async function applyOutputDevice(deviceId: string): Promise<void> {
    if (sinkSupport.value !== 'audioContext') return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const sinkCtx = ctx as AudioContext & { setSinkId?: (id: string) => Promise<void> };
    if (typeof sinkCtx.setSinkId !== 'function') return;
    try {
        await sinkCtx.setSinkId(deviceId);
    } catch (err) {
        console.debug('audio: setSinkId failed', err);
    }
}

watch(selectedDeviceId, (id) => {
    void applyOutputDevice(id);
});
</script>

<style scoped>
.notice {
    padding: 0.5rem;
    background: var(--surface, #f9fafb);
    border: 1px solid var(--border, #e5e7eb);
    border-radius: 4px;
}
.device-row {
    margin: 0.5rem 0;
}
</style>
