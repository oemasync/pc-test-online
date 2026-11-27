import { describe, expect, it, vi } from 'vitest'
import { mountWithPlugins } from '@/test-utils/mount'
import SensorsTest from './SensorsTest.vue'

describe('SensorsTest', () => {
  it('shows no-sensors state in an environment without sensors', async () => {
    const wrapper = mountWithPlugins(SensorsTest)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="no-sensors"]').exists()).toBe(true)
  })

  it('removes listeners and clears timers on unmount', () => {
    const spy = vi.spyOn(window, 'removeEventListener')
    const wrapper = mountWithPlugins(SensorsTest)
    wrapper.unmount()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
