<template>
  <div class="overview">
    <h1>{{ t('overview.title') }}</h1>
    <div class="overview__grid">
      <router-link
        v-for="m in modules"
        :key="m.id"
        :to="`/test/${m.id}`"
        class="overview__card"
      >
        <span class="overview__icon">{{ m.icon }}</span>
        <span class="overview__title">{{ t(m.titleKey) }}</span>
        <p class="overview__desc">{{ t(m.descriptionKey) }}</p>
        <StatusLight :status="status(m.id)" />
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { getTestModules } from '@/core/registry'
import { resultsStore } from '@/core/results'
import StatusLight from '@/ui/StatusLight.vue'

const { t } = useI18n()
const modules = getTestModules()
function status(id: string) {
  return resultsStore.getStatus(id)
}
</script>

<style scoped>
.overview__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
.overview__card {
  display: block;
  padding: 1rem;
  border: 1px solid var(--border, #ccc);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
}
</style>
