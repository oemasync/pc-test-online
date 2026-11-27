import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { mountWithPlugins } from '@/test-utils/mount'
import { getStatus, reset } from '@/core/results'
import DisplayTest from '../DisplayTest.vue'

describe('DisplayTest', () => {
  it('renders and allows pass when no defects are marked', async () => {
    reset()
    const wrapper = mountWithPlugins(DisplayTest)
    await flushPromises()
    const passButton = wrapper.find('[data-testid="pass-button"]')
    expect(passButton.attributes('disabled')).toBeUndefined()
    await passButton.trigger('click')
    expect(getStatus('display')).toBe('passed')
    wrapper.unmount()
  })
})
