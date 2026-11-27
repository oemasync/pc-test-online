<template>
  <section class="gradient-panel">
    <h3>{{ t('tests.display.gradient.title') }}</h3>
    <p>{{ t('tests.display.gradient.description') }}</p>
    <div class="gradient-panel__samples">
      <div class="gradient-panel__sample gradient-panel__sample--horizontal" />
      <div class="gradient-panel__sample gradient-panel__sample--vertical" />
      <div class="gradient-panel__sample gradient-panel__sample--radial" />
    </div>
    <label class="gradient-panel__toggle">
      <input
        v-model="banding"
        type="checkbox"
      >
      {{ t('tests.display.gradient.markBanding') }}
    </label>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { GRADIENT_STOPS } from './logic';

const emit = defineEmits<{ (e: 'update:banding', value: boolean): void }>();

const { t } = useI18n();
const banding = ref(false);

watch(banding, value => emit('update:banding', value));
</script>

<style scoped>
.gradient-panel__samples {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: 0.5rem;
    margin: 0.5rem 0;
}

.gradient-panel__sample {
    height: 6rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
}

.gradient-panel__sample--horizontal {
    background: v-bind('GRADIENT_STOPS.horizontal');
}

.gradient-panel__sample--vertical {
    background: v-bind('GRADIENT_STOPS.vertical');
}

.gradient-panel__sample--radial {
    background: v-bind('GRADIENT_STOPS.radial');
}

.gradient-panel__toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
</style>
