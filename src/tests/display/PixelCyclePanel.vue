<template>
  <section class="pixel-cycle">
    <h3>{{ t('tests.display.pixelCycle.title') }}</h3>
    <div
      ref="stageRef"
      class="pixel-cycle__stage"
      :style="{ background: colorValue }"
      tabindex="0"
      role="button"
      @click="next"
    >
      <div class="pixel-cycle__overlay">
        <p>{{ t('tests.display.pixelCycle.currentColor') }}: {{ colorName }}</p>
        <p class="pixel-cycle__hint">
          {{ t('tests.display.pixelCycle.exitHint') }}
        </p>
      </div>
    </div>
    <p
      class="pixel-cycle__warning"
      role="note"
    >
      {{ t('tests.display.pixelCycle.photosensitivityWarning') }}
    </p>
    <div class="pixel-cycle__actions">
      <button
        type="button"
        @click="startFullscreen"
      >
        {{ t('tests.display.pixelCycle.startFullscreen') }}
      </button>
      <button
        type="button"
        @click="markDefect"
      >
        {{ t('tests.display.pixelCycle.markDefect') }}
      </button>
    </div>
    <p
      v-if="fullscreenUnavailable"
      class="pixel-cycle__fullscreen-status"
      role="status"
    >
      {{ t('tests.display.pixelCycle.fullscreenUnavailable') }}
    </p>
    <p v-if="defects.length">
      {{ t('tests.display.pixelCycle.defects') }}: {{ defects.join(', ') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { advanceColorSequence, createColorSequenceState } from './logic';
import { useFullscreen } from './useFullscreen';
import type { ColorSequenceEvent, DisplayColor } from './logic';

const emit = defineEmits<{
    (e: 'colorChange', color: DisplayColor): void;
    (e: 'defectsChange', defects: DisplayColor[]): void;
}>();

const { t } = useI18n();
const stageRef = ref<HTMLElement | null>(null);
const state = ref(createColorSequenceState(0));
const defects = ref<DisplayColor[]>([]);
const { unavailable: fullscreenUnavailable, request: requestFullscreen } = useFullscreen(stageRef);

const colorName = computed(() => state.value.color);
const colorValue = computed(() => state.value.color);

function applyEvent(event: ColorSequenceEvent): void {
    state.value = advanceColorSequence(state.value, event);
    emit('colorChange', state.value.color);
}

function next(): void {
    applyEvent({ type: 'next' });
}

function previous(): void {
    applyEvent({ type: 'previous' });
}

function markDefect(): void {
    const color = state.value.color;
    if (!defects.value.includes(color)) {
        defects.value = [...defects.value, color];
        emit('defectsChange', defects.value);
    }
}

async function startFullscreen(): Promise<void> {
    await requestFullscreen();
}

function onKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'BUTTON' || target.tagName === 'A' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
    }
    if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        next();
    } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previous();
    } else if (event.key === 'Escape') {
        if (document.fullscreenElement === stageRef.value) {
            void document.exitFullscreen?.();
        }
    }
}

onMounted(() => {
    window.addEventListener('keydown', onKeyDown);
});

defineExpose({ stageRef });

onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown);
    void document.exitFullscreen?.();
});
</script>

<style scoped>
.pixel-cycle__stage {
    position: relative;
    min-height: 12rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--overlay-text);
    text-shadow: none;
}

.pixel-cycle__overlay {
    padding: 1rem;
    text-align: center;
    background: var(--overlay-bg);
    border-radius: 0.5rem;
}

.pixel-cycle__hint {
    font-size: 0.875rem;
    opacity: 0.9;
}

.pixel-cycle__actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
}

.pixel-cycle__actions button {
    flex: 1 1 12rem;
}
</style>
