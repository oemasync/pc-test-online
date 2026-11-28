/* eslint-disable vue/one-component-per-file */
import { defineComponent, h, onMounted } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { useReducedMotion } from '@/lib/useReducedMotion'

describe('useReducedMotion', () => {
  let originalMatchMedia: typeof window.matchMedia

  beforeEach(() => {
    originalMatchMedia = window.matchMedia
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    vi.restoreAllMocks()
  })

  it('reports the initial matchMedia result', async () => {
    const listeners: Array<(e: MediaQueryListEvent) => void> = []
    const mq = {
      matches: true,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
      removeEventListener: vi.fn(),
    }
    window.matchMedia = vi.fn().mockReturnValue(mq as unknown as MediaQueryList)

    const Comp = defineComponent({
      setup() {
        const { reduced } = useReducedMotion()
        onMounted(() => {})
        return () => h('div', reduced.value ? 'reduced' : 'motion')
      },
    })
    const wrapper = mount(Comp)
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toBe('reduced')
    wrapper.unmount()
  })

  it('handles environments without matchMedia', async () => {
    const original = window.matchMedia
    // @ts-expect-error test override
    window.matchMedia = undefined
    const Comp = defineComponent({
      setup() {
        const { reduced } = useReducedMotion()
        return () => h('div', reduced.value ? 'reduced' : 'motion')
      },
    })
    const wrapper = mount(Comp)
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toBe('motion')
    wrapper.unmount()
    window.matchMedia = original
  })

  it('updates when the media query changes', async () => {
    const listeners: Array<(e: MediaQueryListEvent) => void> = []
    const mq = {
      matches: false,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
      removeEventListener: vi.fn(),
    }
    window.matchMedia = vi.fn().mockReturnValue(mq as unknown as MediaQueryList)

    const Comp = defineComponent({
      setup() {
        const { reduced } = useReducedMotion()
        return () => h('div', reduced.value ? 'reduced' : 'motion')
      },
    })
    const wrapper = mount(Comp)
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toBe('motion')
    mq.matches = true
    listeners.forEach((cb) => cb({ matches: true } as MediaQueryListEvent))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toBe('reduced')
    wrapper.unmount()
  })
})
