import { describe, expect, it } from 'vitest'
import { getTestModules, getTestModule, validateModuleEntries } from '@/core/registry'

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

  it('throws on duplicate id', () => {
    const make = (id: string, dir: string) => ({
      path: `../tests/${dir}/index.ts`,
      module: { default: { id, order: 1, icon: 'x', titleKey: 't', descriptionKey: 'd', component: async () => ({}) } },
    })
    expect(() =>
      validateModuleEntries([make('a', 'a'), make('a', 'a')]),
    ).toThrow(/Duplicate/)
  })

  it('getTestModule returns undefined for unknown', () => {
    expect(getTestModule('nope')).toBeUndefined()
  })

  it('throws when id does not match directory', () => {
    const make = (id: string, dir: string) => ({
      path: `../tests/${dir}/index.ts`,
      module: { default: { id, order: 1, icon: 'x', titleKey: 't', descriptionKey: 'd', component: async () => ({}) } },
    })
    expect(() => validateModuleEntries([make('a', 'b')])).toThrow(/does not match/)
  })
})
