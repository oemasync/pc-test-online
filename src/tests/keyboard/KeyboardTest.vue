<template>
  <TestLayout
    :test-id="id"
    :title="t('tests.keyboard.title')"
  >
    <template #instructions>
      {{ t('tests.keyboard.instructions') }}
    </template>
    <div
      class="keyboard-test"
      tabindex="0"
    >
      <div class="keyboard-test__stats">
        <StatTile
          :label="t('tests.keyboard.testedLabel')"
          :value="`${state.tested.size} / ${total}`"
        />
        <StatTile
          :label="t('tests.keyboard.rolloverLabel')"
          :value="state.maxSimultaneous"
        />
      </div>
      <div class="keyboard">
        <div
          v-for="(row, ri) in KEYBOARD_LAYOUT"
          :key="ri"
          class="keyboard__row"
        >
          <div
            v-for="key in row"
            :key="key.code"
            class="keyboard__key"
            :class="{
              'keyboard__key--pressed': state.pressed.has(key.code),
              'keyboard__key--tested': state.tested.has(key.code),
            }"
          >
            {{ key.label }}
          </div>
        </div>
      </div>
      <div class="keyboard-test__recent">
        <h3>{{ t('tests.keyboard.recentLabel') }}</h3>
        <ul>
          <li
            v-for="(e, i) in state.recentEvents"
            :key="i"
          >
            {{ e.type }} {{ e.code }}
          </li>
        </ul>
      </div>
    </div>
  </TestLayout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TestLayout from '@/ui/TestLayout.vue'
import StatTile from '@/ui/StatTile.vue'
import {
  KEYBOARD_LAYOUT,
  createKeyboardState,
  pressKey,
  releaseKey,
  totalCount,
  shouldPreventDefault,
} from './logic'

const id = 'keyboard'
const { t } = useI18n()
const state = ref(createKeyboardState())
const total = totalCount()

function onKeyDown(e: KeyboardEvent): void {
  if (shouldPreventDefault(e.code)) e.preventDefault()
  state.value = pressKey(state.value, e.code, e.timeStamp)
}

function onKeyUp(e: KeyboardEvent): void {
  state.value = releaseKey(state.value, e.code, e.timeStamp)
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})
</script>

<style scoped>
.keyboard-test__stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}
.keyboard {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.keyboard__row {
  display: flex;
  gap: 4px;
}
.keyboard__key {
  min-width: 2.5rem;
  padding: var(--space-1);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  text-align: center;
  font-size: var(--text-xs);
}
.keyboard__key--pressed {
  background: var(--color-warning);
  color: var(--text);
}
.keyboard__key--tested {
  background: var(--color-success);
  color: var(--text);
}
</style>
