<template>
  <div class="overview">
    <h1>{{ t('overview.title') }}</h1>
    <div class="overview__grid">
      <div
        v-for="m in modules"
        :key="m.id"
        class="overview__card"
        :class="{ 'overview__card--unsupported': !supported(m) }"
      >
        <router-link
          v-if="supported(m)"
          :to="`/test/${m.id}`"
          class="overview__link"
        >
          <span class="overview__icon">{{ m.icon }}</span>
          <span class="overview__title">{{ t(m.titleKey) }}</span>
          <p class="overview__desc">{{ t(m.descriptionKey) }}</p>
          <StatusLight
            :status="status(m.id)"
            :data-testid="`status-light-${m.id}`"
            :data-status="status(m.id)"
          />
        </router-link>
        <template v-else>
          <span class="overview__icon">{{ m.icon }}</span>
          <span class="overview__title">{{ t(m.titleKey) }}</span>
          <p class="overview__desc">
            {{ t(m.descriptionKey) }}
          </p>
          <p class="overview__reason">
            {{ t('buttons.unsupported') }}
          </p>
          <button
            type="button"
            @click="skipModule(m.id)"
          >
            {{ t('buttons.skip') }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { getTestModules } from '@/core/registry'
import type { TestModule } from '@/core/types'
import { getStatus, skip } from '@/core/results'
import StatusLight from '@/ui/StatusLight.vue'

const { t } = useI18n()
const modules = getTestModules()
function status(id: string) {
  return getStatus(id)
}
function supported(m: TestModule): boolean {
  return m.isSupported?.() ?? true
}
function skipModule(id: string): void {
  skip(id)
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
  color: inherit;
}
.overview__card--unsupported {
  opacity: 0.6;
}
.overview__link {
  display: block;
  text-decoration: none;
  color: inherit;
}
</style>
