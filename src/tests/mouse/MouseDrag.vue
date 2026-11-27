<template>
  <div class="mouse-drag">
    <div
      class="mouse-drag__box"
      :class="{ 'mouse-drag__box--dragging': dragging }"
      data-testid="drag-box"
    >
      {{ t('tests.mouse.drag') }}
    </div>
    <p>
      {{ t('tests.mouse.dragDistance') }}:
      <span data-testid="drag-distance">{{ Math.round(distance) }}</span> px
    </p>
    <p
      v-if="completed"
      data-testid="drag-done"
    >
      {{ t('tests.mouse.dragDone') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  dragging: boolean
  completed: boolean
  distance: number
}>()

const { t } = useI18n()
</script>

<style scoped>
.mouse-drag__box {
  width: 8rem;
  height: 4rem;
  border: 2px dashed var(--border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  user-select: none;
}
.mouse-drag__box--dragging {
  cursor: grabbing;
  background: var(--color-warning);
  color: var(--text);
}
</style>
