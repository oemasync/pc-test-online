import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

import { mountWithPlugins } from '@/test-utils/mount'
import WebcamTest from '../WebcamTest.vue'

describe('WebcamTest', () => {
  let trackStop: ReturnType<typeof vi.fn>

  beforeEach(() => {
    trackStop = vi.fn()
    const track = {
      getSettings: () => ({
        width: 640,
        height: 480,
        frameRate: 30,
        aspectRatio: 4 / 3,
        facingMode: 'user',
        deviceId: 'cam-1',
        groupId: 'group-1',
      }),
      getCapabilities: () => ({
        width: { min: 640, max: 1280 },
        height: { min: 480, max: 720 },
        frameRate: { min: 15, max: 30 },
      }),
      stop: trackStop,
    }
    const stream = {
      getVideoTracks: () => [track],
      getTracks: () => [track],
    }

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
        enumerateDevices: vi.fn().mockResolvedValue([
          {
            kind: 'videoinput',
            deviceId: 'cam-1',
            label: 'Camera 1',
            groupId: 'group-1',
          },
        ]),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })

    vi.spyOn(HTMLVideoElement.prototype, 'play').mockResolvedValue(undefined)
    Object.defineProperty(HTMLVideoElement.prototype, 'srcObject', {
      configurable: true,
      writable: true,
      value: null,
    })
    Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', {
      configurable: true,
      value: vi.fn((callback: VideoFrameRequestCallback) => {
        const id = 1
        setTimeout(
          () =>
            callback(performance.now(), {
              presentationTime: performance.now(),
            } as VideoFrameCallbackMetadata),
          0
        )
        return id
      }),
    })
    Object.defineProperty(HTMLVideoElement.prototype, 'cancelVideoFrameCallback', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => ({
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) })),
      })),
    })
  })

  it('cancels the animation-frame fallback on unmount', async () => {
    Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', {
      configurable: true,
      value: undefined,
    })
    const requestAnimationFrame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    const cancelAnimationFrame = vi.spyOn(window, 'cancelAnimationFrame')

    const wrapper = mountWithPlugins(WebcamTest)
    await flushPromises()
    wrapper.unmount()
    await flushPromises()

    expect(requestAnimationFrame).toHaveBeenCalled()
    expect(cancelAnimationFrame).toHaveBeenCalled()

    requestAnimationFrame.mockRestore()
    cancelAnimationFrame.mockRestore()
  })

  it('stops a stream acquired after unmount', async () => {
    let resolveGum: (s: unknown) => void = () => {}
    const gumPromise = new Promise((res) => { resolveGum = res })
    const track = {
      getSettings: () => ({ width: 640, height: 480, frameRate: 30, aspectRatio: 4 / 3, facingMode: 'user', deviceId: 'cam-1', groupId: 'group-1' }),
      getCapabilities: () => ({ width: { min: 640, max: 1280 }, height: { min: 480, max: 720 }, frameRate: { min: 15, max: 30 } }),
      stop: vi.fn(),
    }
    const stream = { getVideoTracks: () => [track], getTracks: () => [track] }
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockReturnValue(gumPromise),
        enumerateDevices: vi.fn().mockResolvedValue([{ kind: 'videoinput', deviceId: 'cam-1', label: 'Camera 1', groupId: 'group-1' }]),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })
    vi.spyOn(HTMLVideoElement.prototype, 'play').mockResolvedValue(undefined)
    Object.defineProperty(HTMLVideoElement.prototype, 'srcObject', { configurable: true, writable: true, value: null })
    Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', { configurable: true, value: vi.fn(() => 1) })
    Object.defineProperty(HTMLVideoElement.prototype, 'cancelVideoFrameCallback', { configurable: true, value: vi.fn() })
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: vi.fn(() => ({ drawImage: vi.fn(), getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) })) })) })

    const wrapper = mountWithPlugins(WebcamTest)
    await new Promise((r) => setTimeout(r, 0))
    wrapper.unmount()
    resolveGum(stream)
    await new Promise((r) => setTimeout(r, 20))
    expect(track.stop).toHaveBeenCalled()
  })

  it('stops tracks and cancels the frame callback on unmount', async () => {
    const wrapper = mountWithPlugins(WebcamTest)
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 0))
    wrapper.unmount()
    await flushPromises()

    expect(trackStop).toHaveBeenCalled()
    expect(HTMLVideoElement.prototype.cancelVideoFrameCallback).toHaveBeenCalled()
  })

  it('wraps mirrored snapshot transform in save/restore', async () => {
    const save = vi.fn()
    const restore = vi.fn()
    const translate = vi.fn()
    const scale = vi.fn()
    const drawImage = vi.fn()
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => ({
        save,
        restore,
        translate,
        scale,
        drawImage,
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) })),
      })),
    })
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: vi.fn((cb: (b: Blob) => void) => cb(new Blob(['x'], { type: 'image/png' }))),
    })
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, value: 640 })
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, value: 480 })
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:u') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })

    const wrapper = mountWithPlugins(WebcamTest)
    await flushPromises()
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)
    const btn = wrapper.find('button.webcam-test__button')
    await btn.trigger('click')
    await flushPromises()

    expect(save).toHaveBeenCalled()
    expect(restore).toHaveBeenCalled()
    const saveOrder = save.mock.invocationCallOrder[0]!
    const translateOrder = translate.mock.invocationCallOrder[0]!
    const restoreOrder = restore.mock.invocationCallOrder[0]!
    expect(saveOrder).toBeLessThan(translateOrder)
    expect(restoreOrder).toBeGreaterThan(translateOrder)
    wrapper.unmount()
  })

  it('defers revokeObjectURL until after click', async () => {
    const revoke = vi.fn()
    const create = vi.fn(() => 'blob:u')
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke })
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: vi.fn((cb: (b: Blob) => void) => cb(new Blob(['x'], { type: 'image/png' }))),
    })
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, value: 640 })
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, value: 480 })
    const ctx = { save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), drawImage: vi.fn(), getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) })) }
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: vi.fn(() => ctx) })

    const wrapper = mountWithPlugins(WebcamTest)
    await new Promise(r => setTimeout(r, 0))
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)
    const btn = wrapper.find('button.webcam-test__button')
    await btn.trigger('click')
    expect(revoke).not.toHaveBeenCalled()
    await new Promise(r => setTimeout(r, 0))
    expect(revoke).toHaveBeenCalledWith('blob:u')
    wrapper.unmount()
  })
})