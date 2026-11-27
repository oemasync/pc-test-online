import type { TestModule } from './types'
import { moduleIdFromPath } from './paths'

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
    const dir = moduleIdFromPath(path)
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
  return list.sort((a, b) => a.order - b.order)
}

const entries: ModuleEntryRecord[] = Object.entries(modules).map(([path, mod]) => ({ path, module: mod }))
const validated: readonly TestModule[] = Object.freeze(validateModuleEntries(entries))

export function getTestModules(): TestModule[] {
  return [...validated]
}

export function getTestModule(id: string): TestModule | undefined {
  return validated.find((m) => m.id === id)
}
