<template>
  <div class="recorder">
    <div class="recorder__actions">
      <button
        type="button"
        data-testid="record-button"
        @click="toggleRecord"
      >
        {{
          recording
            ? t('tests.microphone.stopRecordLabel')
            : t('tests.microphone.recordLabel')
        }}
      </button>
      <button
        type="button"
        data-testid="play-button"
        :disabled="!audioUrl"
        @click="play"
      >
        {{ t('tests.microphone.playLabel') }}
      </button>
    </div>
    <audio
      v-if="audioUrl"
      ref="audioEl"
      :src="audioUrl"
    />
  </div>
</template>

<script setup lang="ts">
import { defineOptions } from 'vue';
defineOptions({ name: 'AudioRecorder' });
import { onBeforeUnmount, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
    stream: MediaStream | null;
}>();

const emit = defineEmits<{
    (e: 'recorded', mimeType: string): void;
}>();

const { t } = useI18n();

const recording = ref(false);
const audioUrl = ref<string | null>(null);
const mimeType = ref('');
let recorder: MediaRecorder | null = null;
const chunks: Blob[] = [];
let audioEl = ref<HTMLAudioElement | null>(null);

function pickMimeType(): string {
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
    ];
    for (const c of candidates) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) {
            return c;
        }
    }
    return '';
}

function toggleRecord(): void {
    if (recording.value) {
        recorder?.stop();
        return;
    }
    if (!props.stream) return;
    const type = pickMimeType();
    mimeType.value = type;
    try {
        recorder = type
            ? new MediaRecorder(props.stream, { mimeType: type })
            : new MediaRecorder(props.stream);
    } catch {
        recorder = new MediaRecorder(props.stream);
    }
    chunks.length = 0;
    recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
        recording.value = false;
        const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
        if (audioUrl.value) URL.revokeObjectURL(audioUrl.value);
        audioUrl.value = URL.createObjectURL(blob);
        emit('recorded', mimeType.value);
        recorder = null;
    };
    recorder.start();
    recording.value = true;
}

function play(): void {
    audioEl.value?.play();
}

onBeforeUnmount(() => {
    if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
    }
    if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value);
        audioUrl.value = null;
    }
});
</script>

<style scoped>
.recorder__actions {
    display: flex;
    gap: 0.5rem;
}
</style>
