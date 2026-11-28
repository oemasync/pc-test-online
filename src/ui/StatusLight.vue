<template>
  <span
    class="status-light"
    :class="`status-light--${status}`"
    :aria-label="t(`status.${status}`)"
    role="img"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { TestStatus } from '@/core/types'

defineProps<{ status: TestStatus }>()
const { t } = useI18n()
</script>

<style scoped>
.status-light {
  display: inline-block;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: var(--radius-full);
  background: var(--color-text-muted);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--bg) 80%, transparent);
}
.status-light--pending { background: var(--color-text-muted); }
.status-light--running { background: var(--color-warning); }
.status-light--passed { background: var(--color-success); }
.status-light--failed { background: var(--color-danger); }
.status-light--skipped { background: var(--text-secondary); }
</style>
