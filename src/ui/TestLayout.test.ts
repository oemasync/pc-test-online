import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TestLayout from '@/ui/TestLayout.vue'
import { resultsStore } from '@/core/results'
import { i18n } from '@/i18n'

describe('TestLayout', () => {
  it('clicking Pass updates the store', async () => {
    resultsStore.reset()
    const wrapper = mount(TestLayout, {
      props: { testId: 'keyboard', title: 'Keyboard' },
      global: { plugins: [i18n] },
    })
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Pass')
    await btn?.trigger('click')
    expect(resultsStore.getStatus('keyboard')).toBe('passed')
  })
})
