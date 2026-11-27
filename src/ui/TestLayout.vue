<template>
  <section class="test-layout">
    <header class="test-layout__header">
      <h2>{{ title }}</h2>
    </header>
    <p class="test-layout__instructions">
      <slot name="instructions" />
    </p>
    <div class="test-layout__main">
      <slot />
    </div>
    <div class="test-layout__actions">
      <button type="button" class="test-layout__btn" @click="onPass">{{ t('buttons.pass') }}</button>
      <button type="button" class="test-layout__btn" @click="onFail">{{ t('buttons.fail') }}</button>
      <button type="button" class="test-layout__btn" @click="onSkip">{{ t('buttons.skip') }}</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { resultsStore } from '@/core/results'

const props = defineProps<{ testId: string; title: string }>()
const { t } = useI18n()

function onPass(): void {
  resultsStore.pass(props.testId)
}
function onFail(): void {
  resultsStore.fail(props.testId)
}
function onSkip(): void {
  resultsStore.skip(props.testId)
}
</script>

<style scoped>
.test-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.test-layout__actions {
  display: flex;
  gap: 0.5rem;
}
.test-layout__btn {
  flex: 1 1 0;
}
</style>
