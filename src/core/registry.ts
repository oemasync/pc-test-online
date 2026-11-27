import type { TestModule } from './types'

type ModuleEntry = { default: TestModule }

const modules = import.meta.glob<ModuleEntry>('../tests/*/index.ts', { eager: true })

export function getTestModules(): TestModule[] {
  return Object.values(modules)
    .map((m) => m.default)
    .sort((a, b) => a.order - b.order)
}

export function getTestModule(id: string): TestModule | undefined {
  return getTestModules().find((m) => m.id === id)
}
