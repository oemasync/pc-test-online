<template>
  <div class="summary">
    <h1 tabindex="-1">{{ t('summary.title') }}</h1>
    <div
      v-if="hasResults"
      class="summary__table-wrap"
    >
      <table>
        <thead>
          <tr>
            <th>{{ t('summary.test') }}</th>
            <th>{{ t('summary.status') }}</th>
            <th>{{ t('summary.duration') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="m in modules"
            :key="m.id"
          >
            <td>{{ t(m.titleKey) }}</td>
            <td>{{ t(`status.${status(m.id)}`) }}</td>
            <td>{{ formatDuration(elapsedValue(m.id)) }}</td>
          </tr>
        </tbody>
      </table>
      <div class="summary__actions">
        <button
          type="button"
          @click="exportJson()"
        >
          {{ t('buttons.export') }}
        </button>
        <button
          type="button"
          @click="print"
        >
          {{ t('buttons.print') }}
        </button>
      </div>
    </div>
    <p v-else>
      {{ t('summary.empty') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getTestModules } from '@/core/registry'
import { elapsed, getAllResults, getStatus } from '@/core/results'
import { exportJson } from '@/core/report'

const { t } = useI18n()
const modules = getTestModules()

const hasResults = computed(() => Object.keys(getAllResults()).length > 0)

function status(id: string) {
  return getStatus(id)
}
function elapsedValue(id: string) {
  return elapsed(id)
}
function formatDuration(ms: number): string {
  return (ms / 1000).toFixed(2) + 's'
}
function print(): void {
  window.print()
}
</script>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.summary__table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.summary__actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
  flex-wrap: wrap;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border);
  text-align: left;
  font-size: var(--text-sm);
}
th {
  font-weight: 600;
  color: var(--text-secondary);
}
</style>
