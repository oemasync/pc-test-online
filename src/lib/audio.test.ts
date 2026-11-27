import { describe, expect, it, vi } from 'vitest'

class FakeAudioContext {
  state = 'suspended'
  async resume() {
    this.state = 'running'
  }
}

describe('audio', () => {
  it('creates and reuses a shared AudioContext', async () => {
    // @ts-expect-error test override
    window.AudioContext = FakeAudioContext
    vi.resetModules()
    const mod = await import('@/lib/audio')
    const ctx = mod.getAudioContext()
    expect(ctx).toBeInstanceOf(FakeAudioContext)
    expect(mod.getAudioContext()).toBe(ctx)
  })

  it('uses webkitAudioContext fallback', async () => {
    // @ts-expect-error test override
    delete window.AudioContext
    // @ts-expect-error test override
    window.webkitAudioContext = FakeAudioContext
    vi.resetModules()
    const mod = await import('@/lib/audio')
    const ctx = mod.getAudioContext()
    expect(ctx).toBeInstanceOf(FakeAudioContext)
    // restore
    // @ts-expect-error test override
    window.AudioContext = FakeAudioContext
  })

  it('returns null when no constructor', async () => {
    // @ts-expect-error test override
    delete window.AudioContext
    // @ts-expect-error test override
    delete window.webkitAudioContext
    vi.resetModules()
    const mod = await import('@/lib/audio')
    expect(mod.getAudioContext()).toBeNull()
    // @ts-expect-error test override
    window.AudioContext = FakeAudioContext
  })

  it('resumes a suspended context', async () => {
    // @ts-expect-error test override
    window.AudioContext = FakeAudioContext
    vi.resetModules()
    const mod = await import('@/lib/audio')
    const ctx = mod.getAudioContext() as FakeAudioContext
    ctx.state = 'suspended'
    const resumed = await mod.resumeAudioContext()
    expect(resumed).toBe(ctx)
    expect(ctx.state).toBe('running')
  })

  it('handles resume failure', async () => {
    class FailingContext {
      state = 'suspended'
      async resume() {
        throw new Error('fail')
      }
    }
    // @ts-expect-error test override
    window.AudioContext = FailingContext
    vi.resetModules()
    const mod = await import('@/lib/audio')
    const ctx = mod.getAudioContext() as FailingContext
    const resumed = await mod.resumeAudioContext()
    expect(resumed).toBe(ctx)
  })

  it('resumeAudioContext returns null when no context', async () => {
    // @ts-expect-error test override
    delete window.AudioContext
    // @ts-expect-error test override
    delete window.webkitAudioContext
    vi.resetModules()
    const mod = await import('@/lib/audio')
    const resumed = await mod.resumeAudioContext()
    expect(resumed).toBeNull()
  })
})
