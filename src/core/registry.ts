import type { TestModule } from './types'

type ModuleEntry = { default: TestModule }

const modules = import.meta.glob<ModuleEntry>('../tests/*/index.ts', { eager: true })

export interface ModuleEntryRecord {
  path: string
  module: ModuleEntry
}

export function validateModuleEntries(entries: ModuleEntryRecord[]): TestModule[] {
  const seen = new Map<string, string>()
  const list: TestModule[] = []
  for (const { path, module: mod } of entries) {
    const dir = path.split('/')[2] ?? ''
    const entry = mod.default
    if (seen.has(entry.id)) {
      throw new Error(`Duplicate test module id: ${entry.id}`)
    }
    if (entry.id !== dir) {
      throw new Error(`Test module id "${entry.id}" does not match directory "${dir}"`)
    }
    seen.set(entry.id, dir)
    list.push(entry)
  }
  return list
}

export function getTestModules(): TestModule[] {
  const entries: ModuleEntryRecord[] = Object.entries(modules).map(([path, mod]) => ({ path, module: mod }))
  return validateModuleEntries(entries).sort((a, b) => a.order - b.order)
}

export function getTestModule(id: string): TestModule | undefined {
  return getTestModules().find((m) => m.id === id)
}
