import { createI18n } from 'vue-i18n'
import enShell from './locales/en.json'
import esShell from './locales/es.json'
import { moduleIdFromPath } from '@/core/paths'

const enModules = import.meta.glob('../tests/*/locales/en.json', { eager: true })
const esModules = import.meta.glob('../tests/*/locales/es.json', { eager: true })

function mergeModules(shell: Record<string, unknown>, mods: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...shell }
  const tests: Record<string, unknown> = { ...((result.tests as Record<string, unknown>) ?? {}) }
  for (const [path, mod] of Object.entries(mods)) {
    const id = moduleIdFromPath(path)
    const payload = (mod as { default?: unknown }).default ?? mod
    tests[id] = payload
  }
  result.tests = tests
  return result
}

const enMessages = mergeModules(enShell as Record<string, unknown>, enModules)
const esMessages = mergeModules(esShell as Record<string, unknown>, esModules)

function detectInitialLocale(): 'en' | 'es' {
  try {
    const saved = localStorage.getItem('pc-test-online:locale')
    if (saved === 'en' || saved === 'es') return saved
  } catch {
    // localStorage may be unavailable; fall through to navigator detection.
  }
  try {
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]
    for (const lang of langs) {
      const code = (lang || '').toLowerCase().split('-')[0]
      if (code === 'es') return 'es'
      if (code === 'en') return 'en'
    }
  } catch {
    // navigator may be unavailable; default to en.
  }
  return 'en'
}

const initialLocale = detectInitialLocale()

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages: {
    en: enMessages,
    es: esMessages,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
  // vue-i18n's strict message types do not match our merged JSON shape; runtime is unaffected.
})

export const availableLocales = ['en', 'es'] as const

export type AppLocale = (typeof availableLocales)[number]

export function setLocale(locale: AppLocale): void {
  (i18n.global.locale as { value: string }).value = locale
  try {
    localStorage.setItem('pc-test-online:locale', locale)
  } catch {
    // ignore storage failures
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}
