import { describe, expect, it, vi, beforeEach } from 'vitest'
import { handleRouterError, isChunkLoadError } from './router'

describe('router chunk-load error handling', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('detects chunk load errors', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module'))).toBe(true)
    expect(isChunkLoadError(new Error('Loading chunk 42 failed'))).toBe(true)
    expect(isChunkLoadError(new Error('nope'))).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
  })

  it('reloads once for a chunk load error', () => {
    const assign = vi.fn()
    vi.spyOn(window.location, 'assign').mockImplementation(assign)

    const first = handleRouterError(new Error('Failed to fetch dynamically imported module'), {
      fullPath: '/test/keyboard',
    })
    expect(first).toBe(true)
    expect(assign).toHaveBeenCalledWith('/test/keyboard')

    const second = handleRouterError(new Error('Failed to fetch dynamically imported module'), {
      fullPath: '/test/keyboard',
    })
    expect(second).toBe(false)
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('does not reload for non-chunk errors', () => {
    const assign = vi.fn()
    vi.spyOn(window.location, 'assign').mockImplementation(assign)

    const result = handleRouterError(new Error('boom'), { fullPath: '/summary' })
    expect(result).toBe(false)
    expect(assign).not.toHaveBeenCalled()
  })
})