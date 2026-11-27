<template>
  <section class="uniformity-panel">
    <h3>{{ t('tests.display.uniformity.title') }}</h3>
    <p>{{ t('tests.display.uniformity.description') }}</p>
    <div
      ref="stageRef"
      class="uniformity-panel__stage"
      :class="{ 'uniformity-panel__stage--active': active }"
    />
    <p
      v-if="fullscreenUnavailable"
      class="uniformity-panel__fullscreen-status"
      role="status"
    >
      {{ t('tests.display.uniformity.fullscreenUnavailable') }}
    </p>
    <div class="uniformity-panel__actions">
      <button
        type="button"
        @click="showBlack"
      >
        {{ t('tests.display.uniformity.startFullscreen') }}
      </button>
    </div>
    <label class="uniformity-panel__toggle">
      <input
        v-model="bleed"
        type="checkbox"
      >
      {{ t('tests.display.uniformity.markBleed') }}
    </label>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { UNIFORMITY_BLACK } from './logic';
import { useFullscreen } from './useFullscreen';

const emit = defineEmits<{ (e: 'update:bleed', value: boolean): void }>();

const { t } = useI18n();
const stageRef = ref<HTMLElement | null>(null);
const active = ref(false);
const bleed = ref(false);
const { unavailable: fullscreenUnavailable, request: requestFullscreen } = useFullscreen(stageRef);

async function showBlack(): Promise<void> {
    const element = stageRef.value;
    if (!element) return;
    active.value = true;
    await requestFullscreen();
}

watch(bleed, value => emit('update:bleed', value));

defineExpose({ stageRef })
</script>

<style scoped>
.uniformity-panel__stage {
    height: 8rem;
    margin: 0.5rem 0;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background: var(--surface);
}

.uniformity-panel__stage--active {
    background: v-bind('UNIFORMITY_BLACK');
}

.uniformity-panel__actions {
    margin-bottom: 0.5rem;
}

.uniformity-panel__toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
</style>
