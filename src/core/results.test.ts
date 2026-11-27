import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resultsStore } from '@/core/results'

describe('results store', () => {
  beforeEach(() => {
    sessionStorage.clear()
    resultsStore.reset()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts and tracks running status', () => {
    resultsStore.start('keyboard')
    expect(resultsStore.getStatus('keyboard')).toBe('running')
    expect(resultsStore.getResult('keyboard')?.startedAt).toBeDefined()
  })

  it('passes with details and duration', () => {
    vi.setSystemTime(1000)
    resultsStore.start('keyboard')
    vi.setSystemTime(1500)
    resultsStore.pass('keyboard', { keys: 5 })
    const r = resultsStore.getResult('keyboard')
    expect(r?.status).toBe('passed')
    expect(r?.details).toEqual({ keys: 5 })
    expect(r?.durationMs).toBe(500)
  })

  it('fails with note', () => {
    resultsStore.start('keyboard')
    resultsStore.fail('keyboard', undefined, 'boom')
    expect(resultsStore.getResult('keyboard')?.status).toBe('failed')
    expect(resultsStore.getResult('keyboard')?.note).toBe('boom')
  })

  it('skips', () => {
    resultsStore.skip('keyboard')
    expect(resultsStore.getStatus('keyboard')).toBe('skipped')
  })

  it('elapsed uses fake timers while running', () => {
    vi.setSystemTime(2000)
    resultsStore.start('keyboard')
    vi.setSystemTime(2300)
    expect(resultsStore.elapsed('keyboard')).toBe(300)
  })

  it('reset clears all', () => {
    resultsStore.start('keyboard')
    resultsStore.reset()
    expect(resultsStore.getStatus('keyboard')).toBe('pending')
    expect(Object.keys(resultsStore.getAllResults())).toHaveLength(0)
  })

  it('persists to sessionStorage', () => {
    resultsStore.start('keyboard')
    resultsStore.pass('keyboard')
    const raw = sessionStorage.getItem('pc-test-online:results')
    expect(raw).toContain('keyboard')
  })
})
