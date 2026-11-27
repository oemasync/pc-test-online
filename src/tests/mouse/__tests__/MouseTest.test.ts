import { describe, it, expect } from 'vitest'
import { mountWithPlugins } from '@/test-utils/mount'
import MouseTest from '../MouseTest.vue'

describe('MouseTest component', () => {
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
})
