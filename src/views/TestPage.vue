<template>
  <div v-if="module">
    <div v-if="!supported">
      <p>{{ t('buttons.unsupported') }}</p>
      <button
        type="button"
        data-testid="skip-button"
        @click="skipModule"
      >
        {{ t('buttons.skip') }}
      </button>
    </div>
    <component
      :is="component"
      v-else
    />
    <nav class="test-nav">
      <router-link
        v-if="prev"
        :to="`/test/${prev.id}`"
      >{{ t('buttons.prev') }}</router-link>
      <router-link
        v-if="next"
        :to="`/test/${next.id}`"
      >{{ t('buttons.next') }}</router-link>
    </nav>
  </div>
  <div v-else>
    <h1>{{ t('notFound.title') }}</h1>
    <p>{{ t('notFound.message') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import type { Component } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getTestModule, getTestModules } from '@/core/registry'
import { getStatus, skip, start } from '@/core/results'

const route = useRoute()
const { t } = useI18n()
const module = computed(() => getTestModule(String(route.params.id)))
const modules = getTestModules()
const idx = computed(() => modules.findIndex((m) => m.id === module.value?.id))
const prev = computed(() => (idx.value > 0 ? modules[idx.value - 1] : null))
const next = computed(() => (idx.value >= 0 && idx.value < modules.length - 1 ? modules[idx.value + 1] : null))
const supported = computed(() => module.value?.isSupported?.() ?? true)

const component = shallowRef<Component | null>(null)
watch(
  module,
  async (m) => {
    component.value = null
    if (m) {
      if (getStatus(m.id) === 'pending') start(m.id)
      if (m.isSupported?.() === false) return
      const loaded = await m.component()
      component.value = (loaded as { default?: Component }).default ?? (loaded as Component)
    }
  },
  { immediate: true },
)

function skipModule(): void {
  if (module.value) skip(module.value.id)
}
</script>

<style scoped>
.test-nav {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-4);
  gap: var(--space-2);
}
.test-nav a {
  color: var(--color-accent);
  text-decoration: none;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  transition: background var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}
.test-nav a:hover {
  background: var(--bg);
  border-color: var(--color-accent);
}
</style>
