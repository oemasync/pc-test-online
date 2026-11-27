import { ref } from 'vue'
import type { TestResult, TestStatus } from './types'

const STORAGE_KEY = 'pc-test-online:results'

function isResult(value: unknown): value is TestResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const v = value as Record<string, unknown>
  if (typeof v.id !== 'string') return false
  if (typeof v.status !== 'string') return false
  if (typeof v.durationMs !== 'number') return false
  if (!v.details || typeof v.details !== 'object' || Array.isArray(v.details)) return false
  return true
}

function loadInitial(): Record<string, TestResult> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, TestResult> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isResult(value) && value.id === key) {
        out[key] = value
      }
    }
    return out
  } catch (err) {
    // sessionStorage may be unavailable (private mode, quota); fall back to memory.
    console.debug('results: failed to load from sessionStorage', err)
    return {}
  }
}

const results = ref<Record<string, TestResult>>(loadInitial())

function persist(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(results.value))
  } catch (err) {
    console.debug('results: failed to persist to sessionStorage', err)
  }
}

function ensure(id: string): TestResult {
  const existing = results.value[id]
  if (existing) return existing
  const created: TestResult = { id, status: 'pending', durationMs: 0, details: {} }
  results.value = { ...results.value, [id]: created }
  const entry = results.value[id]
  if (!entry) throw new Error(`failed to create result entry for ${id}`)
  return entry
}

function finish(
  id: string,
  statusValue: TestStatus,
  details?: Record<string, string | number | boolean>,
  note?: string,
): void {
  const r = ensure(id)
  if (r.startedAt === undefined) r.startedAt = Date.now()
  r.status = statusValue
  r.finishedAt = Date.now()
  r.durationMs = r.finishedAt - r.startedAt!
  if (details) r.details = details
  if (note !== undefined) r.note = note
  persist()
}

export function start(id: string): void {
  const r = ensure(id)
  r.status = 'running'
  r.startedAt = Date.now()
  r.finishedAt = undefined
  r.durationMs = 0
  r.details = {}
  r.note = undefined
  persist()
}

export function pass(id: string, details?: Record<string, string | number | boolean>): void {
  finish(id, 'passed', details)
}

export function fail(
  id: string,
  details?: Record<string, string | number | boolean>,
  note?: string,
): void {
  finish(id, 'failed', details, note)
}

export function skip(id: string, details?: Record<string, string | number | boolean>): void {
  finish(id, 'skipped', details)
}

export function reset(): void {
  results.value = {}
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.debug('results: failed to clear sessionStorage', err)
  }
}

export function elapsed(id: string): number {
  const r = results.value[id]
  if (!r) return 0
  if (r.status === 'running' && r.startedAt !== undefined) {
    return Date.now() - r.startedAt
  }
  return r.durationMs
}

export function getResult(id: string): TestResult | undefined {
  return results.value[id]
}

export function getAllResults(): Record<string, TestResult> {
  return results.value
}

export function getStatus(id: string): TestStatus {
  return results.value[id]?.status ?? 'pending'
}
