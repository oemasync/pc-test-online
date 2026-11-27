<template>
  <section class="capability-panel">
    <h3>{{ t('tests.display.capability.title') }}</h3>
    <dl class="capability-panel__list">
      <div>
        <dt>{{ t('tests.display.capability.dynamicRange') }}</dt>
        <dd>{{ dynamicRangeLabel }}</dd>
      </div>
      <div>
        <dt>{{ t('tests.display.capability.colorGamut') }}</dt>
        <dd>{{ colorGamutLabel }}</dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { displayCapabilityFromMediaQueries } from './logic';
import type { DisplayCapability } from './logic';

const { t } = useI18n();
const capability = ref<DisplayCapability | null>(null);

const dynamicRangeLabel = computed(() => {
    if (!capability.value) return '';
    return capability.value.dynamicRange === 'high'
        ? t('tests.display.capability.high')
        : t('tests.display.capability.standard');
});

const colorGamutLabel = computed(() => {
    if (!capability.value) return '';
    const key = capability.value.colorGamut;
    return t(`tests.display.capability.${key}`);
});

onMounted(() => {
    const dynamicRangeHigh = window.matchMedia?.('(dynamic-range: high)').matches ?? false;
    const colorGamutP3 = window.matchMedia?.('(color-gamut: p3)').matches ?? false;
    const colorGamutRec2020 = window.matchMedia?.('(color-gamut: rec2020)').matches ?? false;
    capability.value = displayCapabilityFromMediaQueries({
        dynamicRangeHigh,
        colorGamutP3,
        colorGamutRec2020,
    });
});

defineExpose({ capability });
</script>

<style scoped>
.capability-panel__list {
    display: grid;
    gap: 0.5rem;
    margin: 0.5rem 0;
}

.capability-panel__list div {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
}

.capability-panel__list dt {
    color: var(--text-secondary, #6b7280);
}

.capability-panel__list dd {
    margin: 0;
    font-weight: 600;
}
</style>
