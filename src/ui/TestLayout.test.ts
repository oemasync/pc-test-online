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
    const passBtn = wrapper.find('[data-testid="pass-button"]')
    await passBtn?.trigger('click')
    expect(getStatus('keyboard')).toBe('passed')
  })

  it('Pass is disabled when canPass false', async () => {
    reset()
    const wrapper = mount(TestLayout, {
      props: { testId: 'keyboard', title: 'Keyboard', canPass: false },
      global: { plugins: [i18n] },
    })
    const passBtn = wrapper.find('[data-testid="pass-button"]')
    expect(passBtn?.attributes('disabled')).toBeDefined()
  })

  it('Fail shows textarea and records note', async () => {
    reset()
    const wrapper = mount(TestLayout, {
      props: { testId: 'keyboard', title: 'Keyboard', details: { keys: 1 } },
      global: { plugins: [i18n] },
    })
    const failBtn = wrapper.find('[data-testid="fail-button"]')
    await failBtn?.trigger('click')
    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    await textarea.setValue('broken')
    const confirm = wrapper.find('[data-testid="fail-confirm-button"]')
    await confirm?.trigger('click')
    expect(getStatus('keyboard')).toBe('failed')
  })

  it('Skip records skipped', async () => {
    reset()
    const wrapper = mount(TestLayout, {
      props: { testId: 'keyboard', title: 'Keyboard' },
      global: { plugins: [i18n] },
    })
    const skipBtn = wrapper.find('[data-testid="skip-button"]')
    await skipBtn?.trigger('click')
    expect(getStatus('keyboard')).toBe('skipped')
  })

  it('Retest calls start', async () => {
    reset()
    const wrapper = mount(TestLayout, {
      props: { testId: 'keyboard', title: 'Keyboard' },
      global: { plugins: [i18n] },
    })
    const retryBtn = wrapper.find('[data-testid="retest-button"]')
    await retryBtn?.trigger('click')
    expect(getStatus('keyboard')).toBe('running')
  })
})
