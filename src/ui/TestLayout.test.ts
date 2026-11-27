import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TestLayout from '@/ui/TestLayout.vue'
import { getStatus, reset } from '@/core/results'
import { i18n } from '@/i18n'

describe('TestLayout', () => {
  it('clicking Pass updates the store with details', async () => {
    reset()
    const wrapper = mount(TestLayout, {
      props: { testId: 'keyboard', title: 'Keyboard', details: { keys: 3 }, canPass: true },
      global: { plugins: [i18n] },
    })
    const passBtn = wrapper.findAll('button').find((b) => b.text() === 'Pass')
    await passBtn?.trigger('click')
    expect(getStatus('keyboard')).toBe('passed')
  })

  it('Pass is disabled when canPass false', async () => {
    reset()
    const wrapper = mount(TestLayout, {
      props: { testId: 'keyboard', title: 'Keyboard', canPass: false },
      global: { plugins: [i18n] },
    })
    const passBtn = wrapper.findAll('button').find((b) => b.text() === 'Pass')
    expect(passBtn?.attributes('disabled')).toBeDefined()
  })

  it('Fail shows textarea and records note', async () => {
    reset()
    const wrapper = mount(TestLayout, {
      props: { testId: 'keyboard', title: 'Keyboard', details: { keys: 1 } },
      global: { plugins: [i18n] },
    })
    const failBtn = wrapper.findAll('button').find((b) => b.text() === 'Fail')
    await failBtn?.trigger('click')
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    await textarea.setValue('broken')
    const confirm = wrapper.findAll('button').find((b) => b.text() === 'Confirm')
    await confirm?.trigger('click')
    expect(getStatus('keyboard')).toBe('failed')
  })

  it('Skip records skipped', async () => {
    reset()
    const wrapper = mount(TestLayout, {
      props: { testId: 'keyboard', title: 'Keyboard' },
      global: { plugins: [i18n] },
    })
    const skipBtn = wrapper.findAll('button').find((b) => b.text() === 'Skip')
    await skipBtn?.trigger('click')
    expect(getStatus('keyboard')).toBe('skipped')
  })

  it('Retest calls start', async () => {
    reset()
    const wrapper = mount(TestLayout, {
      props: { testId: 'keyboard', title: 'Keyboard' },
      global: { plugins: [i18n] },
    })
    const retryBtn = wrapper.findAll('button').find((b) => b.text() === 'Retest')
    await retryBtn?.trigger('click')
    expect(getStatus('keyboard')).toBe('running')
  })
})
