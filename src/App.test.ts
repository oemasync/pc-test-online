import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import App from '@/App.vue'
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
    await new Promise((r) => setTimeout(r, 200))
    await router.push('/summary')
    await nextTick()
    await new Promise((r) => setTimeout(r, 200))
    expect(document.activeElement?.textContent).toContain('Summary')
  })
})