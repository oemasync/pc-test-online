<template>
  <section class="uniformity-panel">
    <h3>{{ t('tests.display.uniformity.title') }}</h3>
    <p>{{ t('tests.display.uniformity.description') }}</p>
    <div
      ref="stageRef"
      class="uniformity-panel__stage"
      :class="{ 'uniformity-panel__stage--active': active }"
    />
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

const emit = defineEmits<{ (e: 'update:bleed', value: boolean): void }>();

const { t } = useI18n();
const stageRef = ref<HTMLElement | null>(null);
const active = ref(false);
const bleed = ref(false);

async function showBlack(): Promise<void> {
    const element = stageRef.value;
    if (!element) return;
    active.value = true;
    try {
        if (typeof element.requestFullscreen === 'function') {
            await element.requestFullscreen();
        }
    } catch {
        // Keep the inline black panel usable when fullscreen is unavailable.
    }
}

watch(bleed, value => emit('update:bleed', value));
</script>

<style scoped>
.uniformity-panel__stage {
    height: 8rem;
    margin: 0.5rem 0;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background: #111;
}

.uniformity-panel__stage--active {
    background: #000;
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
