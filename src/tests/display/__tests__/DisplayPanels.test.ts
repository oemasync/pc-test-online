import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { mountWithPlugins } from '@/test-utils/mount'
import PixelCyclePanel from '../PixelCyclePanel.vue'
import RefreshRatePanel from '../RefreshRatePanel.vue'

describe('PixelCyclePanel', () => {
  it('cycles colors with the keyboard', async () => {
    const wrapper = mountWithPlugins(PixelCyclePanel)
    await wrapper.find('.pixel-cycle__stage').trigger('click')
    expect(wrapper.text()).toContain('white')
  })

  it('exits fullscreen on unmount', async () => {
    const wrapper = mountWithPlugins(PixelCyclePanel)
    const stage = (wrapper.vm as { stageRef: { value: HTMLElement | null } }).stageRef.value as HTMLElement
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: stage,
    })
    const exitFullscreen = vi.fn()
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    })

    wrapper.unmount()
    await flushPromises()

    expect(exitFullscreen).toHaveBeenCalled()
  })
})

describe('RefreshRatePanel', () => {
  it('cancels the animation frame on unmount', async () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
    const wrapper = mountWithPlugins(RefreshRatePanel)
    await wrapper.find('button').trigger('click')
    await flushPromises()
    wrapper.unmount()
    await flushPromises()
    expect(cancelSpy).toHaveBeenCalled()
    cancelSpy.mockRestore()
  })
})
