import { ref } from 'vue'
import type { TestResult, TestStatus } from './types'

const STORAGE_KEY = 'pc-test-online:results'

function loadInitial(): Record<string, TestResult> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, TestResult>
    return parsed ?? {}
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
  return created
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
  const r = ensure(id)
  if (r.startedAt === undefined) r.startedAt = Date.now()
  r.status = 'passed'
  r.finishedAt = Date.now()
  r.durationMs = r.finishedAt - (r.startedAt ?? r.finishedAt)
  if (details) r.details = details
  persist()
}

export function fail(
  id: string,
  details?: Record<string, string | number | boolean>,
  note?: string,
): void {
  const r = ensure(id)
  if (r.startedAt === undefined) r.startedAt = Date.now()
  r.status = 'failed'
  r.finishedAt = Date.now()
  r.durationMs = r.finishedAt - (r.startedAt ?? r.finishedAt)
  if (details) r.details = details
  r.note = note
  persist()
}

export function skip(id: string): void {
  const r = ensure(id)
  if (r.startedAt === undefined) r.startedAt = Date.now()
  r.status = 'skipped'
  r.finishedAt = Date.now()
  r.durationMs = r.startedAt ? r.finishedAt - r.startedAt : 0
  persist()
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

export const resultsStore = {
  results,
  start,
  pass,
  fail,
  skip,
  reset,
  elapsed,
  getResult,
  getAllResults,
  getStatus,
}
