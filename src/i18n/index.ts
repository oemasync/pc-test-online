import { createI18n } from 'vue-i18n'
import enShell from './locales/en.json'
import esShell from './locales/es.json'

const enModules = import.meta.glob('../tests/*/locales/en.json', { eager: true })
const esModules = import.meta.glob('../tests/*/locales/es.json', { eager: true })

function moduleIdFromPath(path: string): string {
  // '../tests/<id>/locales/en.json'
  const parts = path.split('/')
  return parts[2] ?? ''
}

function mergeModules(shell: Record<string, unknown>, mods: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...shell }
  const tests: Record<string, unknown> = { ...((result.tests as Record<string, unknown>) ?? {}) }
  for (const [path, mod] of Object.entries(mods)) {
    const id = moduleIdFromPath(path)
    if (!id) continue
    const payload = (mod as { default?: unknown }).default ?? mod
    tests[id] = payload
  }
  result.tests = tests
  return result
}

const enMessages = mergeModules(enShell as Record<string, unknown>, enModules)
const esMessages = mergeModules(esShell as Record<string, unknown>, esModules)

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: enMessages,
    es: esMessages,
  } as any,
})

export const availableLocales = ['en', 'es'] as const
