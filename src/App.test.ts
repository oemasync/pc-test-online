import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import App from '@/App.vue'
import TestLayout from '@/ui/TestLayout.vue'
import { i18n } from '@/i18n'

describe('App shell a11y', () => {
  it('renders a skip link to main content', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<h1>Home</h1>' } }],
    })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(App, { attachTo: document.body, global: { plugins: [i18n, router] } })
    await nextTick()
    const skip = wrapper.find('a.skip-link')
    expect(skip.exists()).toBe(true)
    expect(skip.attributes('href')).toBe('#main-content')
  })

  it('moves focus to the page heading on route change', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<h1 tabindex="-1">Home</h1>' } },
        { path: '/summary', component: { template: '<h1 tabindex="-1">Summary</h1>' } },
      ],
    })
    await router.push('/')
    await router.isReady()
    mount(App, { attachTo: document.body, global: { plugins: [i18n, router] } })
    await nextTick()
    await flushPromises()
    vi.useFakeTimers()
    await router.push('/summary')
    await nextTick()
    await flushPromises()
    vi.runAllTimers()
    await nextTick()
    await flushPromises()
    expect(document.activeElement?.textContent).toContain('Summary')
    vi.useRealTimers()
  })

  it('does not move focus on initial load', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<h1 tabindex="-1">Home</h1>' } }],
    })
    await router.push('/')
    await router.isReady()
    mount(App, { attachTo: document.body, global: { plugins: [i18n, router] } })
    await nextTick()
    await flushPromises()
    vi.useFakeTimers()
    vi.runAllTimers()
    await nextTick()
    await flushPromises()
    expect(document.activeElement?.textContent ?? '').not.toContain('Home')
    vi.useRealTimers()
  })
})

describe('TestLayout a11y', () => {
  it('announces status changes via a live region', async () => {
    const { reset } = await import('@/core/results')
    reset()
    const wrapper = mount(TestLayout, {
      props: { testId: 'keyboard', title: 'Keyboard', canPass: true },
      global: { plugins: [i18n] },
      attachTo: document.body,
    })
    const live = wrapper.find('[aria-live="polite"]')
    expect(live.exists()).toBe(true)
    expect(live.text()).toContain('Pending')
    const passBtn = wrapper.findAll('button').find((b) => b.text() === 'Pass')
    await passBtn?.trigger('click')
    await nextTick()
    await flushPromises()
    expect(live.text()).toContain('Passed')
    wrapper.unmount()
  })
})
