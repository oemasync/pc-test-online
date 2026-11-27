<template>
  <div v-if="module">
    <component :is="component" />
    <nav class="test-nav">
      <router-link
        v-if="prev"
        :to="`/test/${prev.id}`"
      >Prev</router-link>
      <router-link
        v-if="next"
        :to="`/test/${next.id}`"
      >Next</router-link>
    </nav>
  </div>
  <div v-else>
    <h1>{{ t('notFound.title') }}</h1>
    <p>{{ t('notFound.message') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getTestModule, getTestModules } from '@/core/registry'
import { getStatus, start } from '@/core/results'

const route = useRoute()
const { t } = useI18n()
const module = computed(() => getTestModule(String(route.params.id)))
const modules = getTestModules()
const idx = computed(() => modules.findIndex((m) => m.id === module.value?.id))
const prev = computed(() => (idx.value > 0 ? modules[idx.value - 1] : null))
const next = computed(() => (idx.value >= 0 && idx.value < modules.length - 1 ? modules[idx.value + 1] : null))

const component = ref<unknown>(null)
watch(
  module,
  async (m) => {
    component.value = null
    if (m) {
      if (getStatus(m.id) === 'pending') start(m.id)
      const loaded = await m.component()
      component.value = (loaded as { default?: unknown }).default ?? loaded
    }
  },
  { immediate: true },
)

onMounted(() => {
  const id = String(route.params.id)
  if (getTestModule(id) && getStatus(id) === 'pending') {
    start(id)
  }
})
</script>

<style scoped>
.test-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
}
</style>
