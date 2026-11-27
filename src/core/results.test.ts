import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import { elapsed, getAllResults, getResult, getStatus, pass, reset, skip, start, fail } from '@/core/results'

describe('results store', () => {
  beforeEach(() => {
    sessionStorage.clear()
    reset()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts and tracks running status', () => {
    start('keyboard')
    expect(getStatus('keyboard')).toBe('running')
    expect(getResult('keyboard')?.startedAt).toBeDefined()
  })

  it('passes with details and duration', () => {
    vi.setSystemTime(1000)
    start('keyboard')
    vi.setSystemTime(1500)
    pass('keyboard', { keys: 5 })
    const r = getResult('keyboard')
    expect(r?.status).toBe('passed')
    expect(r?.details).toEqual({ keys: 5 })
    expect(r?.durationMs).toBe(500)
    expect(elapsed('keyboard')).toBe(500)
  })

  it('fails with note', () => {
    start('keyboard')
    fail('keyboard', undefined, 'boom')
    expect(getResult('keyboard')?.status).toBe('failed')
    expect(getResult('keyboard')?.note).toBe('boom')
  })

  it('skips', () => {
    skip('keyboard')
    expect(getStatus('keyboard')).toBe('skipped')
  })

  it('elapsed uses fake timers while running', () => {
    vi.setSystemTime(2000)
    start('keyboard')
    vi.setSystemTime(2300)
    expect(elapsed('keyboard')).toBe(300)
  })

  it('reset clears all', () => {
    start('keyboard')
    reset()
    expect(getStatus('keyboard')).toBe('pending')
    expect(Object.keys(getAllResults())).toHaveLength(0)
  })

  it('persists to sessionStorage', () => {
    start('keyboard')
    pass('keyboard')
    const raw = sessionStorage.getItem('pc-test-online:results')
    expect(raw).toContain('keyboard')
  })

  it('reactivity: computed status updates for a new id', () => {
    const statusRef = computed(() => getStatus('never-seen'))
    expect(statusRef.value).toBe('pending')
    start('never-seen')
    expect(statusRef.value).toBe('running')
    pass('never-seen')
    expect(statusRef.value).toBe('passed')
  })

  it('handles sessionStorage failures gracefully', () => {
    const setItem = vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => start('x')).not.toThrow()
    setItem.mockRestore()

    const removeItem = vi.spyOn(sessionStorage, 'removeItem').mockImplementation(() => {
      throw new Error('fail')
    })
    expect(() => reset()).not.toThrow()
    removeItem.mockRestore()
  })

  it('loads valid persisted data', async () => {
    sessionStorage.clear()
    reset()
    const data = { keyboard: { id: 'keyboard', status: 'passed', durationMs: 5, details: {} } }
    sessionStorage.setItem('pc-test-online:results', JSON.stringify(data))
    vi.resetModules()
    const mod = await import('@/core/results')
    expect(mod.getStatus('keyboard')).toBe('passed')
  })

  it('drops invalid persisted data on load', async () => {
    sessionStorage.clear()
    reset()
    sessionStorage.setItem('pc-test-online:results', JSON.stringify({ bad: { id: 'bad', status: 'passed' } }))
    vi.resetModules()
    const mod = await import('@/core/results')
    expect(mod.getStatus('bad')).toBe('pending')
  })

  it('loads empty on null or array persisted data', async () => {
    sessionStorage.clear()
    reset()
    sessionStorage.setItem('pc-test-online:results', JSON.stringify(null))
    vi.resetModules()
    let mod = await import('@/core/results')
    expect(mod.getAllResults()).toEqual({})

    sessionStorage.setItem('pc-test-online:results', JSON.stringify([1, 2]))
    vi.resetModules()
    mod = await import('@/core/results')
    expect(mod.getAllResults()).toEqual({})
  })

  it('isResult rejects non-string id', async () => {
    sessionStorage.clear()
    reset()
    sessionStorage.setItem('pc-test-online:results', JSON.stringify({ a: { id: 1, status: 'passed', durationMs: 1, details: {} } }))
    vi.resetModules()
    const mod = await import('@/core/results')
    expect(mod.getStatus('a')).toBe('pending')
  })

  it('isResult rejects non-number duration', async () => {
    sessionStorage.clear()
    reset()
    sessionStorage.setItem('pc-test-online:results', JSON.stringify({ a: { id: 'a', status: 'passed', durationMs: 'x', details: {} } }))
    vi.resetModules()
    const mod = await import('@/core/results')
    expect(mod.getStatus('a')).toBe('pending')
  })

  it('isResult rejects missing details', async () => {
    sessionStorage.clear()
    reset()
    sessionStorage.setItem('pc-test-online:results', JSON.stringify({ a: { id: 'a', status: 'passed', durationMs: 1 } }))
    vi.resetModules()
    const mod = await import('@/core/results')
    expect(mod.getStatus('a')).toBe('pending')
  })

  it('isResult rejects non-object details', async () => {
    sessionStorage.clear()
    reset()
    sessionStorage.setItem('pc-test-online:results', JSON.stringify({ a: { id: 'a', status: 'passed', durationMs: 1, details: null } }))
    vi.resetModules()
    const mod = await import('@/core/results')
    expect(mod.getStatus('a')).toBe('pending')
  })

  it('loadInitial catches sessionStorage errors', async () => {
    sessionStorage.clear()
    reset()
    const getItem = vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.resetModules()
    const mod = await import('@/core/results')
    expect(mod.getAllResults()).toEqual({})
    getItem.mockRestore()
  })

  it('elapsed returns 0 for unknown id', () => {
    expect(elapsed('nope')).toBe(0)
  })
})
