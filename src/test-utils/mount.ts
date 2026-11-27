import { mount } from '@vue/test-utils'
import type { Component } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { i18n } from '@/i18n'

export function mountWithPlugins(component: Component, options: Record<string, unknown> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  return mount(component, {
    global: {
      plugins: [i18n, router],
      ...(options.global as Record<string, unknown> | undefined),
    },
    ...options,
  })
}
