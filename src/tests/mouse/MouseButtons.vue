<template>
  <div class="mouse-buttons">
    <div class="mouse-buttons__tiles">
      <div
        v-for="(name, i) in buttonNames"
        :key="i"
        class="mouse-button-tile"
        :class="{
          'mouse-button-tile--pressed': pressed[i],
          'mouse-button-tile--tested': tested[i],
        }"
        :data-testid="`mouse-button-${i}`"
      >
        {{ name }}
      </div>
    </div>
    <p class="mouse-buttons__dc">
      {{ t('tests.mouse.doubleClickInterval') }}:
      <span data-testid="double-click-interval">{{ lastInterval ?? '-' }}</span> ms
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  pressed: readonly boolean[]
  tested: readonly boolean[]
  lastInterval: number | null
}>()

const { t } = useI18n()
const buttonNames = [
  t('tests.mouse.buttonLeft'),
  t('tests.mouse.buttonMiddle'),
  t('tests.mouse.buttonRight'),
  t('tests.mouse.buttonBack'),
  t('tests.mouse.buttonForward'),
]
</script>

<style scoped>
.mouse-buttons__tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.mouse-button-tile {
  min-width: 5rem;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  text-align: center;
}
.mouse-button-tile--pressed {
  background: var(--color-warning);
  color: var(--text);
}
.mouse-button-tile--tested {
  background: var(--color-success);
  color: var(--text);
}
</style>
