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
.overview {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.overview__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: var(--space-4);
  align-items: stretch;
}
.overview__card {
  display: block;
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: inherit;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  transition: transform var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
}
.overview__card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.overview__card--unsupported {
  opacity: 0.7;
}
.overview__link {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  text-decoration: none;
  color: inherit;
}
.overview__icon {
  font-size: var(--text-2xl);
  line-height: 1;
}
.overview__title {
  font-size: var(--text-lg);
  font-weight: 600;
}
.overview__desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
}
.overview__reason {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin: 0;
}
</style>
