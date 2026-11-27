import { describe, it, expect, vi, afterEach } from 'vitest'
import { mountWithPlugins } from '@/test-utils/mount'
import MouseTest from '../MouseTest.vue'

const listenerTypes = [
  'mousedown',
  'mouseup',
  'mousemove',
  'click',
  'wheel',
  'contextmenu',
  'auxclick',
  'pointermove',
  'keydown',
]

describe('MouseTest component', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mounts and unmounts without errors', () => {
    const wrapper = mountWithPlugins(MouseTest)
    expect(wrapper.exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders button tiles', () => {
    const wrapper = mountWithPlugins(MouseTest)
    for (let i = 0; i < 5; i += 1) {
      expect(wrapper.find(`[data-testid="mouse-button-${i}"]`).exists()).toBe(true)
    }
    wrapper.unmount()
  })

  it('contextmenu is prevented inside area', async () => {
    const wrapper = mountWithPlugins(MouseTest)
    const area = wrapper.find('.mouse-test')
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    area.element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    wrapper.unmount()
  })

  it('removes every listener and cancels rAF on unmount', () => {
    const removeSpy = vi.spyOn(HTMLElement.prototype, 'removeEventListener')
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 42)
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')

    const wrapper = mountWithPlugins(MouseTest)
    const area = wrapper.find('.mouse-test')
    area.element.dispatchEvent(new PointerEvent('pointermove'))

    expect(rafSpy).toHaveBeenCalled()
    wrapper.unmount()

    const removedTypes = new Set(removeSpy.mock.calls.map((c) => c[0]))
    console.log('removed types:', [...removedTypes])
    for (const type of listenerTypes) {
      expect(removeSpy).toHaveBeenCalledWith(type, expect.any(Function))
    }
    expect(cancelSpy).toHaveBeenCalledWith(42)
  })
})
