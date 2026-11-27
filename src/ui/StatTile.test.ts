import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatTile from './StatTile.vue'

describe('StatTile', () => {
  it('announces readouts via aria-live', () => {
    const wrapper = mount(StatTile, { props: { label: 'WPM', value: 42 } })
    const root = wrapper.element as HTMLElement
    expect(root.getAttribute('aria-live')).toBe('polite')
    expect(root.getAttribute('aria-atomic')).toBe('true')
  })
})