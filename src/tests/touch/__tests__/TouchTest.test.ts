import { describe, expect, it, vi } from 'vitest'
import { mountWithPlugins } from '@/test-utils/mount'
import TouchTest from '../TouchTest.vue'

describe('TouchTest component', () => {
  it('shows unsupported state on non-touch device', () => {
    const wrapper = mountWithPlugins(TouchTest)
    expect(wrapper.text()).toContain('This device does not report touch input')
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('removes listeners and cancels rAF on unmount', () => {
    const addSpy = vi.spyOn(HTMLElement.prototype, 'addEventListener')
    const removeSpy = vi.spyOn(HTMLElement.prototype, 'removeEventListener')
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1 as unknown as number)
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')

    const wrapper = mountWithPlugins(TouchTest)
    wrapper.unmount()

    expect(removeSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function))
    expect(cancelSpy).toHaveBeenCalled()

    addSpy.mockRestore()
    removeSpy.mockRestore()
    rafSpy.mockRestore()
    cancelSpy.mockRestore()
  })
})
