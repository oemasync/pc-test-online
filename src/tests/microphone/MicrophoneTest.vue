<template>
  <TestLayout
    :test-id="id"
    :title="t('tests.microphone.title')"
    :details="details"
    :can-pass="canPass"
  >
    <template #instructions>
      {{ t('tests.microphone.instructions') }}
    </template>

    <PermissionPrompt :kind="errorKind" />

    <div class="microphone-test">
      <DeviceSelect
        :devices="devices.devices.value"
        :model-value="selectedDeviceId"
        :aria-label="t('tests.microphone.deviceLabel')"
        @update:model-value="onDeviceChange"
      />

      <div class="microphone-test__constraints">
        <h3>{{ t('tests.microphone.constraints') }}</h3>
        <label>
          <input
            v-model="echoCancellation"
            type="checkbox"
          >
          {{ t('tests.microphone.echoCancellation') }}
        </label>
        <label>
          <input
            v-model="noiseSuppression"
            type="checkbox"
          >
          {{ t('tests.microphone.noiseSuppression') }}
        </label>
        <label>
          <input
            v-model="autoGainControl"
            type="checkbox"
          >
          {{ t('tests.microphone.autoGainControl') }}
        </label>
        <p class="microphone-test__applied">
          {{ t('tests.microphone.applied') }}: echoCancellation={{ appliedEcho }},
          noiseSuppression={{ appliedNoise }}, autoGainControl={{ appliedAgc }}
        </p>
      </div>

      <LevelMeter
        :dbfs="dbfs"
        :peak-dbfs="peakDbfs"
        :clip-count="clipCount"
        :noise-floor-dbfs="noiseFloorDbfs"
      />

      <p
        v-if="silent"
        class="microphone-test__warning"
        role="alert"
      >
        {{ t('tests.microphone.silentWarning') }}
      </p>

      <Spectrum :analyser="analyser" />

      <Recorder
        :stream="stream"
        @recorded="onRecorded"
      />
    </div>
  </TestLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import TestLayout from '@/ui/TestLayout.vue';
import DeviceSelect from '@/ui/DeviceSelect.vue';
import PermissionPrompt from '@/ui/PermissionPrompt.vue';
import LevelMeter from './LevelMeter.vue';
import Spectrum from './Spectrum.vue';
import Recorder from './Recorder.vue';
import { useDevices, useMediaStream } from '@/lib/media';
import { getAudioContext, resumeAudioContext } from '@/lib/audio';
import {
    computeRms,
    countClipped,
    createPeakHoldState,
    detectSilence,
    estimateNoiseFloor,
    peakHoldReducer,
    rmsToDbfs,
    DEFAULT_SILENCE_THRESHOLD,
} from './logic';
import type { PeakHoldState, SilenceSample } from './logic';

const id = 'microphone';
const { t } = useI18n();

const devices = useDevices('audioinput');
const media = useMediaStream();
const stream = media.stream;

const selectedDeviceId = ref('');
const errorKind = ref<import('@/lib/media').MediaErrorKind | null>(null);

const echoCancellation = ref(true);
const noiseSuppression = ref(true);
const autoGainControl = ref(false);

const audioContext = ref<AudioContext | null>(null);
const analyser = ref<AnalyserNode | null>(null);
const sourceNode = ref<MediaStreamAudioSourceNode | null>(null);

const dbfs = ref(Number.NEGATIVE_INFINITY);
const rms = ref(0);
const peakDbfs = ref(Number.NEGATIVE_INFINITY);
const peakState = ref<PeakHoldState>(createPeakHoldState());
const clipCount = ref(0);
const noiseFloorDbfs = ref(Number.NEGATIVE_INFINITY);
const silent = ref(false);

const appliedEcho = ref(false);
const appliedNoise = ref(false);
const appliedAgc = ref(false);
const sampleRate = ref(0);
const channelCount = ref(0);
const deviceId = ref('');
const groupId = ref('');

const recorded = ref(false)
const mimeType = ref('');

const rmsHistory: SilenceSample[] = [];
const noiseWindow: number[] = [];

let rafId = 0;
let disposed = false;

const details = computed(() => ({
    rms: rms.value,
    dbfs: Number.isFinite(dbfs.value) ? dbfs.value : -Infinity,
    peakDbfs: Number.isFinite(peakDbfs.value) ? peakDbfs.value : -Infinity,
    clipCount: clipCount.value,
    noiseFloorDbfs: Number.isFinite(noiseFloorDbfs.value) ? noiseFloorDbfs.value : -Infinity,
    silent: silent.value,
    sampleRate: sampleRate.value,
    channelCount: channelCount.value,
    echoCancellation: appliedEcho.value,
    noiseSuppression: appliedNoise.value,
    autoGainControl: appliedAgc.value,
    deviceId: deviceId.value,
    groupId: groupId.value,
    recorded: recorded.value,
    mimeType: mimeType.value,
}));

const canPass = computed(() => !silent.value);

function buildGraph(s: MediaStream): void {
    const ctx = getAudioContext();
    audioContext.value = ctx;
    if (!ctx) return;
    void resumeAudioContext();
    const node = ctx.createAnalyser();
    node.fftSize = 2048;
    analyser.value = node;
    const src = ctx.createMediaStreamSource(s);
    sourceNode.value = src;
    src.connect(node);
}

function teardownGraph(): void {
    if (sourceNode.value) {
        try {
            sourceNode.value.disconnect();
        } catch (err) {
            if (!(err instanceof DOMException) || err.name !== 'InvalidStateError') {
                console.warn('microphone: source disconnect failed', err);
            }
        }
        sourceNode.value = null;
    }
    if (analyser.value) {
        try {
            analyser.value.disconnect();
        } catch (err) {
            if (!(err instanceof DOMException) || err.name !== 'InvalidStateError') {
                console.warn('microphone: analyser disconnect failed', err);
            }
        }
        analyser.value = null;
    }
}

async function startStream(): Promise<void> {
    errorKind.value = null;
    teardownGraph();
    const constraints: MediaStreamConstraints = {
        audio: {
            deviceId: selectedDeviceId.value ? { exact: selectedDeviceId.value } : undefined,
            echoCancellation: echoCancellation.value,
            noiseSuppression: noiseSuppression.value,
            autoGainControl: autoGainControl.value,
        },
    };
    const result = await media.start(constraints);
    if (disposed) {
        media.stop();
        teardownGraph();
        return;
    }
    if (result.error || !result.stream) {
        errorKind.value = result.error;
        return;
    }
    const track = result.stream.getAudioTracks()[0];
    if (track) {
        const settings = track.getSettings();
        appliedEcho.value = Boolean(settings.echoCancellation);
        appliedNoise.value = Boolean(settings.noiseSuppression);
        appliedAgc.value = Boolean(settings.autoGainControl);
        sampleRate.value = Number(settings.sampleRate ?? 0);
        channelCount.value = Number(settings.channelCount ?? 0);
        deviceId.value = String(settings.deviceId ?? selectedDeviceId.value ?? '');
        groupId.value = String(settings.groupId ?? '');
    }
    buildGraph(result.stream);
    resetMeters();
}

function resetMeters(): void {
    dbfs.value = Number.NEGATIVE_INFINITY;
    peakDbfs.value = Number.NEGATIVE_INFINITY;
    peakState.value = createPeakHoldState();
    clipCount.value = 0;
    noiseFloorDbfs.value = Number.NEGATIVE_INFINITY;
    silent.value = false;
    rmsHistory.length = 0;
    noiseWindow.length = 0;
}

function analyse(): void {
    const node = analyser.value;
    if (node) {
        const timeData = new Float32Array(node.fftSize);
        node.getFloatTimeDomainData(timeData);
        const rmsVal = computeRms(timeData);
        const levelDb = rmsToDbfs(rmsVal);
        rms.value = rmsVal;
        dbfs.value = levelDb;
        peakState.value = peakHoldReducer(peakState.value, levelDb, performance.now());
        peakDbfs.value = peakState.value.peak;
        clipCount.value += countClipped(timeData);
        noiseWindow.push(rmsVal);
        if (noiseWindow.length > 200) noiseWindow.shift();
        if (noiseWindow.length >= 10) {
            const arr = new Float32Array(noiseWindow);
            noiseFloorDbfs.value = rmsToDbfs(estimateNoiseFloor(Array.from(arr)));
        }
        const now = performance.now();
        rmsHistory.push({ t: now, rms: rmsVal });
        if (rmsHistory.length > 200) rmsHistory.shift();
        silent.value = detectSilence(rmsHistory, DEFAULT_SILENCE_THRESHOLD, 2000);
    }
    rafId = analyser.value ? requestAnimationFrame(analyse) : 0;
}

function onDeviceChange(id: string): void {
    selectedDeviceId.value = id;
    void startStream();
}

function onRecorded(type: string): void {
    recorded.value = true;
    mimeType.value = type;
}

watch([echoCancellation, noiseSuppression, autoGainControl], () => {
    void startStream();
});

onMounted(async () => {
    disposed = false;
    await devices.refresh();
    if (disposed) return;
    if (devices.devices.value.length > 0 && !selectedDeviceId.value) {
        selectedDeviceId.value = devices.devices.value[0]?.deviceId ?? '';
    }
    await startStream();
    if (disposed) return;
    if (analyser.value) {
        rafId = requestAnimationFrame(analyse);
    }
});

onBeforeUnmount(() => {
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    media.stop();
    teardownGraph();
});
</script>

<style scoped>
.microphone-test {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.microphone-test__constraints label {
    display: block;
}
.microphone-test__warning {
    color: var(--color-danger);
}
.microphone-test__applied {
    font-size: 0.85rem;
}
</style>
