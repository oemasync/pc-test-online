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
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #9ca3af;
}
.status-light--pending { background: #9ca3af; }
.status-light--running { background: #f59e0b; }
.status-light--passed { background: #22c55e; }
.status-light--failed { background: #ef4444; }
.status-light--skipped { background: #6b7280; }
</style>
