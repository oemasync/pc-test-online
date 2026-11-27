<template>
  <div class="mouse-wheel">
    <div class="mouse-wheel__tiles">
      <div
        v-for="dir in directions"
        :key="dir"
        class="mouse-wheel__tile"
        :class="{ 'mouse-wheel__tile--tested': tested.includes(dir) }"
        :data-testid="`wheel-${dir}`"
      >
        {{ label(dir) }}
      </div>
    </div>
    <p>
      {{ t('tests.mouse.deltaMode') }}:
      <span data-testid="wheel-delta-mode">{{ deltaModeLabel(deltaMode) }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { deltaModeLabel } from './logic'

defineProps<{
  direction: string | null
  deltaMode: number
  tested: string[]
}>()

const { t } = useI18n()
const directions = ['up', 'down', 'left', 'right']

function label(dir: string): string {
  switch (dir) {
    case 'up':
      return t('tests.mouse.wheelUp')
    case 'down':
      return t('tests.mouse.wheelDown')
    case 'left':
      return t('tests.mouse.wheelLeft')
    case 'right':
      return t('tests.mouse.wheelRight')
    default:
      return dir
  }
}
</script>

<style scoped>
.mouse-wheel__tiles {
  display: flex;
  gap: 0.5rem;
}
.mouse-wheel__tile {
  min-width: 4rem;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  text-align: center;
}
.mouse-wheel__tile--tested {
  background: var(--color-success);
  color: var(--text);
}
</style>
