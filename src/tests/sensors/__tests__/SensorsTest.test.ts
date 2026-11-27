import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mountWithPlugins } from '@/test-utils/mount'
import SensorsTest from '../SensorsTest.vue'

describe('SensorsTest', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows no-sensors state in an environment without sensors', async () => {
    const wrapper = mountWithPlugins(SensorsTest)
    vi.advanceTimersByTime(1200)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="no-sensors"]').exists()).toBe(true)
  })

  it('removes listeners, clears timers and stops sensors on unmount', () => {
    const stopSpy = vi.fn()
    class FakeSensor {
      start = vi.fn()
      stop = stopSpy
      addEventListener = vi.fn()
      removeEventListener = vi.fn()
    }
    vi.stubGlobal('Accelerometer', FakeSensor)

    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const clearSpy = vi.spyOn(window, 'clearInterval')

    const wrapper = mountWithPlugins(SensorsTest)
    wrapper.unmount()

    expect(removeSpy).toHaveBeenCalledWith('deviceorientation', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('devicemotion', expect.any(Function))
    expect(clearSpy).toHaveBeenCalled()
    expect(stopSpy).toHaveBeenCalled()

    removeSpy.mockRestore()
    clearSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})