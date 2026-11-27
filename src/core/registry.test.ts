import { describe, expect, it } from 'vitest'
import { getTestModules, getTestModule } from '@/core/registry'

describe('registry', () => {
  it('discovers the keyboard module', () => {
    const modules = getTestModules()
    expect(modules.some((m) => m.id === 'keyboard')).toBe(true)
  })

  it('sorts modules by order', () => {
    const modules = getTestModules()
    for (let i = 1; i < modules.length; i++) {
      expect(modules[i - 1]!.order).toBeLessThanOrEqual(modules[i]!.order)
    }
  })

  it('getTestModule returns undefined for unknown', () => {
    expect(getTestModule('nope')).toBeUndefined()
  })
})
