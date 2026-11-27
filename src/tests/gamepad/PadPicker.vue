<template>
  <label class="pad-picker">
    <span>{{ t('tests.gamepad.padLabel') }}</span>
    <select
      class="pad-picker__select"
      :value="selectedIndex === null ? '' : selectedIndex"
      @change="onChange"
    >
      <option
        v-for="pad in pads"
        :key="pad.index"
        :value="pad.index"
      >
        {{ pad.id }} (#{{ pad.index }})
      </option>
    </select>
  </label>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
    pads: Gamepad[];
    selectedIndex: number | null;
}>();

const emit = defineEmits<{
    (e: 'update:selectedIndex', value: number): void;
}>();

const { t } = useI18n();

function onChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    emit('update:selectedIndex', Number(target.value));
}
</script>

<style scoped>
.pad-picker {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.pad-picker__select {
    min-width: 12rem;
}
</style>
