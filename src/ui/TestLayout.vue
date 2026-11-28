<template>
  <section class="test-layout">
    <header class="test-layout__header">
      <h2>{{ title }}</h2>
      <StatusLight :status="status" />
    </header>
    <p class="test-layout__instructions">
      <slot name="instructions" />
    </p>
    <div class="test-layout__main">
      <slot />
    </div>
    <div
      v-if="failing"
      class="test-layout__note"
    >
      <label for="fail-note">{{ t('buttons.failNote') }}</label>
      <textarea
        id="fail-note"
        v-model="note"
      />
      <button
        type="button"
        data-testid="fail-confirm-button"
        @click="confirmFail"
      >
        {{ t('buttons.confirm') }}
      </button>
      <button
        type="button"
        @click="cancelFail"
      >
        {{ t('buttons.cancel') }}
      </button>
    </div>
    <div class="test-layout__actions">
      <button
        type="button"
        class="test-layout__btn"
        data-testid="pass-button"
        :disabled="!canPass"
        @click="onPass"
      >
        {{ t('buttons.pass') }}
      </button>
      <button
        type="button"
        class="test-layout__btn"
        data-testid="fail-button"
        @click="onFail"
      >
        {{ t('buttons.fail') }}
      </button>
      <button
        type="button"
        class="test-layout__btn"
        data-testid="skip-button"
        @click="onSkip"
      >
        {{ t('buttons.skip') }}
      </button>
      <button
        type="button"
        class="test-layout__btn"
        data-testid="retest-button"
        @click="onRetest"
      >
        {{ t('buttons.retry') }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { pass, fail, skip, start, getStatus } from '@/core/results'
import StatusLight from '@/ui/StatusLight.vue'

const props = withDefaults(
  defineProps<{
    testId: string
    title: string
    details?: Record<string, string | number | boolean>
    canPass?: boolean
  }>(),
  {
    details: () => ({}),
    canPass: true,
  },
)

const { t } = useI18n()
const failing = ref(false)
const note = ref('')

const status = computed(() => getStatus(props.testId))

function onPass(): void {
  pass(props.testId, props.details)
}

function onFail(): void {
  failing.value = true
}

function confirmFail(): void {
  fail(props.testId, props.details, note.value)
  failing.value = false
  note.value = ''
}

function cancelFail(): void {
  failing.value = false
  note.value = ''
}

function onSkip(): void {
  skip(props.testId, props.details)
}

function onRetest(): void {
  start(props.testId)
}
</script>

<style scoped>
.test-layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.test-layout__actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.test-layout__btn {
  flex: 1 1 0;
  min-width: 5rem;
}
.test-layout__btn:disabled {
  opacity: 0.5;
}
.test-layout__note {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.test-layout__note textarea {
  width: 100%;
  min-height: 4rem;
  resize: vertical;
}
</style>
