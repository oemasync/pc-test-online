<template>
  <div
    v-if="kind"
    class="permission-prompt"
    role="alert"
  >
    <p>{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MediaErrorKind } from '@/lib/media'

const props = defineProps<{ kind: MediaErrorKind | null }>()
const { t } = useI18n()

const message = computed(() =>
  props.kind ? t(`mediaErrors.${props.kind}`) : '',
)
</script>

<style scoped>
.permission-prompt {
  padding: var(--space-3);
  color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
  border-radius: var(--radius-md);
}
</style>
