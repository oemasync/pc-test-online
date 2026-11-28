<template>
  <div
    class="stat-tile"
    aria-live="polite"
    aria-atomic="true"
  >
    <span class="stat-tile__label">{{ label }}</span>
    <span class="stat-tile__value">{{ value }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string | number }>()
</script>

<style scoped>
.stat-tile {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.stat-tile__label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.stat-tile__value {
  font-size: var(--text-lg);
  font-weight: 600;
  line-height: var(--leading-tight);
}
</style>
