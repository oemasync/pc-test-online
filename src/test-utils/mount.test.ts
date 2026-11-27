import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountWithPlugins } from '@/test-utils/mount'

describe('mountWithPlugins', () => {
  it('merges plugins and extra global options', () => {
    const Comp = defineComponent({
      setup() {
        return () => h('span', 'ok')
      },
    })
    const wrapper = mountWithPlugins(Comp, { global: { stubs: { Foo: true } } })
    expect(wrapper.text()).toBe('ok')
  })
})
