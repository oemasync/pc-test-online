import { describe, expect, it } from 'vitest'
import { mapMediaError, requestMediaStream } from '@/lib/media'

describe('media error mapping', () => {
  it('maps NotAllowedError to denied', () => {
    expect(mapMediaError(new DOMException('x', 'NotAllowedError'))).toBe('denied')
  })
  it('maps NotFoundError to not-found', () => {
    expect(mapMediaError(new DOMException('x', 'NotFoundError'))).toBe('not-found')
  })
  it('maps NotReadableError to in-use', () => {
    expect(mapMediaError(new DOMException('x', 'NotReadableError'))).toBe('in-use')
  })
  it('maps OverconstrainedError to overconstrained', () => {
    expect(mapMediaError(new DOMException('x', 'OverconstrainedError'))).toBe('overconstrained')
  })
  it('maps SecurityError to insecure-context', () => {
    expect(mapMediaError(new DOMException('x', 'SecurityError'))).toBe('insecure-context')
  })
  it('maps unknown to unknown', () => {
    expect(mapMediaError(new Error('x'))).toBe('unknown')
  })
})

describe('requestMediaStream', () => {
  it('returns unsupported when getUserMedia missing', async () => {
    const orig = navigator.mediaDevices
    const origSecure = window.isSecureContext
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
    // @ts-expect-error test override
    navigator.mediaDevices = undefined
    const res = await requestMediaStream({ video: true })
    expect(res.error).toBe('unsupported')
    // @ts-expect-error test override
    navigator.mediaDevices = orig
    Object.defineProperty(window, 'isSecureContext', { value: origSecure, configurable: true })
  })
})
