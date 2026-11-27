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
  it('stops tracks and cancels the frame callback on unmount', async () => {
    const wrapper = mountWithPlugins(WebcamTest)
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 0))
    wrapper.unmount()
    await flushPromises()

    expect(trackStop).toHaveBeenCalled()
    expect(HTMLVideoElement.prototype.cancelVideoFrameCallback).toHaveBeenCalled()
  })
})
