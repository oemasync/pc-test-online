<template>
  <svg
    class="controller-visual"
    viewBox="0 0 320 180"
    role="img"
    :aria-label="
      mapping === 'standard'
        ? t('tests.gamepad.standardMapping')
        : t('tests.gamepad.genericMapping')
    "
  >
    <rect
      x="40"
      y="45"
      width="240"
      height="90"
      rx="28"
      class="controller-visual__body"
    />
    <circle
      class="controller-visual__stick"
      :cx="80 + leftX * 18"
      :cy="90 + leftY * 18"
      r="14"
    />
    <circle
      class="controller-visual__stick"
      :cx="240 + rightX * 18"
      :cy="90 + rightY * 18"
      r="14"
    />
    <circle
      v-for="(pressed, index) in buttonPressed"
      :key="index"
      class="controller-visual__button"
      :class="{ 'controller-visual__button--pressed': pressed }"
      :cx="185 + (index % 4) * 16"
      :cy="62 + Math.floor(index / 4) * 16"
      r="6"
    />
  </svg>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
    mapping: string;
    leftX: number;
    leftY: number;
    rightX: number;
    rightY: number;
    buttonPressed: boolean[];
}>();

const { t } = useI18n();
</script>

<style scoped>
.controller-visual {
    width: 100%;
    max-width: 320px;
    height: auto;
}
.controller-visual__body {
    fill: var(--surface);
    stroke: var(--border);
    stroke-width: 2;
}
.controller-visual__stick {
    fill: var(--color-text-muted);
}
.controller-visual__button {
    fill: var(--border);
}
.controller-visual__button--pressed {
    fill: var(--color-success);
}
</style>
