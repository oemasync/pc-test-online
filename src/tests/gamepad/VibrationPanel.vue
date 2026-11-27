<template>
  <section class="vibration-panel">
    <h3>{{ t('tests.gamepad.vibration') }}</h3>
    <p v-if="!supported">
      {{ t('tests.gamepad.vibrationUnsupported') }}
    </p>
    <button
      v-else
      type="button"
      class="vibration-panel__button"
      @click="emit('test')"
    >
      {{ t('tests.gamepad.testVibration') }}
    </button>
    <p v-if="tested">
      {{ t('tests.gamepad.vibrationTested') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
    supported: boolean;
    tested: boolean;
}>();

const emit = defineEmits<{
    (e: 'test'): void;
}>();

const { t } = useI18n();
</script>

<style scoped>
.vibration-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>
