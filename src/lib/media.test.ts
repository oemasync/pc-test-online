/* eslint-disable vue/one-component-per-file */
import { describe, expect, it, vi } from 'vitest'
import { mapMediaError, requestMediaStream, useDevices, useMediaStream } from '@/lib/media'
import { mount } from '@vue/test-utils'
import { defineComponent, h, onMounted } from 'vue'

describe('media error mapping', () => {
  it('maps NotAllowedError to denied', () => {
    expect(mapMediaError({ name: 'NotAllowedError' })).toBe('denied')
  })
  it('maps NotFoundError to not-found', () => {
    expect(mapMediaError({ name: 'NotFoundError' })).toBe('not-found')
  })
  it('maps NotReadableError to in-use', () => {
    expect(mapMediaError({ name: 'NotReadableError' })).toBe('in-use')
  })
  it('maps AbortError to in-use', () => {
    expect(mapMediaError({ name: 'AbortError' })).toBe('in-use')
  })
  it('maps OverconstrainedError to overconstrained', () => {
    expect(mapMediaError({ name: 'OverconstrainedError' })).toBe('overconstrained')
  })
  it('maps SecurityError to insecure-context', () => {
    expect(mapMediaError({ name: 'SecurityError' })).toBe('insecure-context')
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

  it('returns insecure-context when not secure', async () => {
    const origDevices = navigator.mediaDevices
    const origSecure = window.isSecureContext
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true })
    // @ts-expect-error test override
    navigator.mediaDevices = undefined
    const res = await requestMediaStream({ video: true })
    expect(res.error).toBe('insecure-context')
    // @ts-expect-error test override
    navigator.mediaDevices = origDevices
    Object.defineProperty(window, 'isSecureContext', { value: origSecure, configurable: true })
  })

  it('returns stream on success', async () => {
    const track = { stop: vi.fn() }
    const stream = { getTracks: () => [track] } as unknown as MediaStream
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    // @ts-expect-error test override
    navigator.mediaDevices = { getUserMedia }
    const res = await requestMediaStream({ video: true })
    expect(res.stream).toBe(stream)
    expect(res.error).toBeNull()
  })

  it('maps error on failure', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('x', 'NotAllowedError'))
    // @ts-expect-error test override
    navigator.mediaDevices = { getUserMedia }
    const res = await requestMediaStream({ video: true })
    expect(res.stream).toBeNull()
    expect(res.error).toBe('denied')
  })
})

describe('useMediaStream', () => {
  it('stops tracks on unmount', async () => {
    const track = { stop: vi.fn() }
    const stream = { getTracks: () => [track] } as unknown as MediaStream
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    // @ts-expect-error test override
    navigator.mediaDevices = { getUserMedia }

    const Comp = defineComponent({
      setup() {
        const ms = useMediaStream()
        onMounted(() => {
          void ms.start({ video: true })
        })
        return () => h('div')
      },
    })

    const wrapper = mount(Comp)
    await new Promise((r) => setTimeout(r, 0))
    wrapper.unmount()
    await new Promise((r) => setTimeout(r, 0))
    expect(track.stop).toHaveBeenCalled()
  })
})

describe('useDevices no enumerateDevices', () => {
  it('sets empty devices', async () => {
    const orig = navigator.mediaDevices
    // @ts-expect-error test override
    navigator.mediaDevices = { addEventListener: vi.fn(), removeEventListener: vi.fn() }
    const Comp = defineComponent({
      setup() {
        const { devices } = useDevices('videoinput')
        return () => h('div', devices.value.length.toString())
      },
    })
    const wrapper = mount(Comp)
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toBe('0')
    wrapper.unmount()
    // @ts-expect-error test override
    navigator.mediaDevices = orig
  })
})

describe('useDevices', () => {
  it('enumerates devices on mount', async () => {
    const enumerateDevices = vi.fn().mockResolvedValue([
      { kind: 'videoinput', deviceId: '1' },
      { kind: 'audioinput', deviceId: '2' },
    ])
    // @ts-expect-error test override
    navigator.mediaDevices = { enumerateDevices, addEventListener: vi.fn(), removeEventListener: vi.fn() }

    const Comp = defineComponent({
      setup() {
        const { devices } = useDevices('videoinput')
        return () => h('div', devices.value.length.toString())
      },
    })
    const wrapper = mount(Comp)
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toBe('1')
    wrapper.unmount()
  })
})

describe('useMediaStream start', () => {
  it('returns error and keeps null on failure', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException('x', 'NotFoundError'))
    // @ts-expect-error test override
    navigator.mediaDevices = { getUserMedia }

    const Comp = defineComponent({
      setup() {
        const ms = useMediaStream()
        onMounted(() => {
          void ms.start({ video: true })
        })
        return () => h('div')
      },
    })
    const wrapper = mount(Comp)
    await new Promise((r) => setTimeout(r, 0))
    wrapper.unmount()
  })
})
