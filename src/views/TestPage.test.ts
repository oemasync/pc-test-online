import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { i18n } from '@/i18n'
import TestPage from './TestPage.vue'

const deferreds: Record<string, { resolve: (value: unknown) => void }> = {}

const modules = [
  {
    id: 'a',
    order: 1,
    titleKey: 'tests.a.title',
    descriptionKey: 'tests.a.description',
    component: () => new Promise((resolve) => { deferreds.a = { resolve } }),
    isSupported: () => true,
  },
  {
    id: 'b',
    order: 2,
    titleKey: 'tests.b.title',
    descriptionKey: 'tests.b.description',
    component: () => new Promise((resolve) => { deferreds.b = { resolve } }),
    isSupported: () => true,
  },
]

vi.mock('@/core/registry', () => ({
  getTestModule: (id: string) => modules.find((m) => m.id === id),
  getTestModules: () => [...modules],
}))

vi.mock('@/core/results', () => ({
  getStatus: () => 'pending',
  skip: vi.fn(),
  start: vi.fn(),
}))

describe('TestPage', () => {
  beforeEach(() => {
    for (const k of Object.keys(deferreds)) delete deferreds[k]
  })

  it('ignores a stale module load that resolves out of order', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/test/:id', component: TestPage }],
    })
    await router.push('/test/a')
    await router.isReady()
    const wrapper = mount(TestPage, { global: { plugins: [i18n, router] } })
    await flushPromises()

    await router.push('/test/b')
    await flushPromises()

    // resolve the stale 'a' loader first
    deferreds.a!.resolve({ default: { template: '<div data-testid="mod-a">A</div>' } })
    await flushPromises()

    // 'a' must not have rendered
    expect(wrapper.find('[data-testid="mod-a"]').exists()).toBe(false)

    // resolve the current 'b' loader
    deferreds.b!.resolve({ default: { template: '<div data-testid="mod-b">B</div>' } })
    await flushPromises()

    expect(wrapper.find('[data-testid="mod-b"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mod-a"]').exists()).toBe(false)
  })
})