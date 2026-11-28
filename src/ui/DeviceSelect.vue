<template>
  <select
    class="device-select"
    :value="modelValue"
    @change="onChange"
  >
    <option
      v-for="d in devices"
      :key="d.deviceId"
      :value="d.deviceId"
    >
      {{ d.label || d.deviceId }}
    </option>
  </select>
</template>

<script setup lang="ts">
defineProps<{
  devices: MediaDeviceInfo[]
  modelValue: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

function onChange(e: Event): void {
  const target = e.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>

<style scoped>
.device-select {
  padding: var(--space-1) var(--space-2);
  min-height: 2rem;
}
</style>
