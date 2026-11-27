import { mount } from '@vue/test-utils'
import type { Component } from 'vue'
import type { MountingOptions } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { i18n } from '@/i18n'

export function mountWithPlugins(
  component: Component,
  options: MountingOptions<unknown> = {},
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  const { global, ...rest } = options
  const { plugins, ...globalRest } = global ?? {}
  return mount(component, {
    ...rest,
    global: {
      ...globalRest,
      plugins: [i18n, router, ...(plugins ?? [])],
    },
  })
}
