import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { mountWithPlugins } from '@/test-utils/mount'
import PixelCyclePanel from '../PixelCyclePanel.vue'
import RefreshRatePanel from '../RefreshRatePanel.vue'
import UniformityPanel from '../UniformityPanel.vue'

describe('PixelCyclePanel', () => {
  it('cycles colors with a click', async () => {
    const wrapper = mountWithPlugins(PixelCyclePanel)
    await wrapper.find('.pixel-cycle__stage').trigger('click')
    expect(wrapper.text()).toContain('white')
  })

  it('shows a fullscreen-unavailable message when fullscreen is unsupported', async () => {
    const wrapper = mountWithPlugins(PixelCyclePanel)
    const stage = wrapper.find('.pixel-cycle__stage').element as HTMLElement
    Object.defineProperty(stage, 'requestFullscreen', {
      configurable: true,
      value: undefined,
    })

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Fullscreen is unavailable in this browser')
    wrapper.unmount()
  })

  it('does not intercept Space on a focused button', () => {
    const wrapper = mountWithPlugins(PixelCyclePanel)
    const btn = wrapper.find('button').element as HTMLElement
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    btn.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    wrapper.unmount()
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

describe('UniformityPanel', () => {
  it('shows a fullscreen-unavailable message when fullscreen is unsupported', async () => {
    const wrapper = mountWithPlugins(UniformityPanel)
    const stage = wrapper.find('.uniformity-panel__stage').element as HTMLElement
    Object.defineProperty(stage, 'requestFullscreen', {
      configurable: true,
      value: undefined,
    })

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Fullscreen is unavailable in this browser')
    wrapper.unmount()
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
