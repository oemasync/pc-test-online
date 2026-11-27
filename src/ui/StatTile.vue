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
  gap: 0.25rem;
}
.stat-tile__label {
  font-size: 0.75rem;
  color: var(--text-secondary, #6b7280);
}
.stat-tile__value {
  font-size: 1.125rem;
  font-weight: 600;
}
</style>
