<template>
  <TestLayout
    test-id="display"
    :title="t('tests.display.title')"
    :details="details"
    :can-pass="canPass"
  >
    <template #instructions>
      {{ t('tests.display.instructions') }}
    </template>

    <PixelCyclePanel
      @color-change="currentColor = $event"
      @defects-change="defectColors = $event"
    />
    <GradientPanel @update:banding="gradientBanding = $event" />
    <UniformityPanel @update:bleed="backlightBleed = $event" />
    <SharpnessPanel @update:defect="sharpnessDefect = $event" />
    <RefreshRatePanel
      @update:refresh="refreshEstimate = $event"
      @update:jitter="jitter = $event"
    />
    <CapabilityPanel />
    <StatTile
      :label="t('tests.display.devicePixelRatio')"
      :value="devicePixelRatio"
    />
  </TestLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import TestLayout from '@/ui/TestLayout.vue';
import StatTile from '@/ui/StatTile.vue';
import PixelCyclePanel from './PixelCyclePanel.vue';
import GradientPanel from './GradientPanel.vue';
import UniformityPanel from './UniformityPanel.vue';
import SharpnessPanel from './SharpnessPanel.vue';
import RefreshRatePanel from './RefreshRatePanel.vue';
import CapabilityPanel from './CapabilityPanel.vue';
import {
    DISPLAY_COLORS,
    buildDisplayDetails,
    displayCapabilityFromMediaQueries,
    normalizeDevicePixelRatio,
} from './logic';
import type { DisplayColor, DisplayCapability, JitterStats, RefreshRateEstimate } from './logic';

const { t } = useI18n();
const currentColor = ref<DisplayColor>('black');
const defectColors = ref<DisplayColor[]>([]);
const gradientBanding = ref(false);
const backlightBleed = ref(false);
const sharpnessDefect = ref(false);
const devicePixelRatio = ref(normalizeDevicePixelRatio(window.devicePixelRatio || 1));
const fullscreenSupported = ref(typeof document.documentElement.requestFullscreen === 'function');
const refreshEstimate = ref<RefreshRateEstimate | null>(null);
const jitter = ref<JitterStats | null>(null);
const capability = ref<DisplayCapability | null>(null);

const canPass = computed(
    () =>
        capability.value !== null &&
        defectColors.value.length === 0 &&
        !gradientBanding.value &&
        !backlightBleed.value &&
        !sharpnessDefect.value
);

const details = computed(() =>
    buildDisplayDetails({
        colorsTested: DISPLAY_COLORS.length,
        defectsFound:
            defectColors.value.length +
            (gradientBanding.value ? 1 : 0) +
            (backlightBleed.value ? 1 : 0) +
            (sharpnessDefect.value ? 1 : 0),
        defectColors: defectColors.value,
        refresh: refreshEstimate.value ?? undefined,
        jitter: jitter.value ?? undefined,
        capability: capability.value ?? undefined,
        devicePixelRatio: devicePixelRatio.value,
        fullscreenSupported: fullscreenSupported.value,
        gradientBandingObserved: gradientBanding.value,
        backlightBleedObserved: backlightBleed.value,
        sharpnessDefectObserved: sharpnessDefect.value,
    })
);

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
</script>

<style scoped>
.display-test {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
</style>
