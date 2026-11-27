<template>
  <div class="mouse-chatter">
    <p>
      {{ t('tests.mouse.chatterCount') }}:
      <span
        data-testid="chatter-count"
        aria-live="polite"
      >{{ count }}</span>
    </p>
    <p
      v-if="detected"
      class="mouse-chatter__warn"
      data-testid="chatter-detected"
    >
      {{ t('tests.mouse.chatterDetected') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  count: number
  detected: boolean
}>()

const { t } = useI18n()
</script>

<style scoped>
.mouse-chatter__warn {
  color: var(--color-danger);
}
</style>
