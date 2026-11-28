import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountWithPlugins } from '@/test-utils/mount'
import { useSensors } from '../useSensors'

describe('useSensors requestPermission', () => {
  let api: ReturnType<typeof useSensors>

  beforeEach(() => {
    const Comp = defineComponent({
      setup() {
        api = useSensors()
        return () => h('div')
      },
    })
    mountWithPlugins(Comp)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('granted path', async () => {
    const reqDO = vi.fn().mockResolvedValue('granted')
    const reqDM = vi.fn().mockResolvedValue('granted')
    vi.stubGlobal('DeviceOrientationEvent', { requestPermission: reqDO })
    vi.stubGlobal('DeviceMotionEvent', { requestPermission: reqDM })

    // re-mount to pick up globals? detect already ran in beforeEach without APIs.
    // Call requestPermission directly with current globals.
    await api.requestPermission()

    expect(api.permissionStatus.value).toBe('granted')
    expect(api.needsPermission.value).toBe(false)
    expect(api.permissionError.value).toBeNull()
  })

  it('denied path', async () => {
    const reqDO = vi.fn().mockResolvedValue('denied')
    vi.stubGlobal('DeviceOrientationEvent', { requestPermission: reqDO })
    vi.stubGlobal('DeviceMotionEvent', { requestPermission: vi.fn().mockResolvedValue('granted') })

    await api.requestPermission()

    expect(api.permissionStatus.value).toBe('denied')
    expect(api.needsPermission.value).toBe(true)
    expect(api.permissionError.value).toBeNull()
  })

  it('throw path records error name', async () => {
    const err = new Error('boom')
    err.name = 'NotAllowedError'
    const reqDO = vi.fn().mockRejectedValue(err)
    vi.stubGlobal('DeviceOrientationEvent', { requestPermission: reqDO })
    vi.stubGlobal('DeviceMotionEvent', { requestPermission: vi.fn().mockResolvedValue('granted') })

    await api.requestPermission()

    expect(api.permissionStatus.value).toBe('denied')
    expect(api.needsPermission.value).toBe(true)
    expect(api.permissionError.value).toBe('NotAllowedError')
  })
})
describe('useSensors cleanup', () => {
  it('removes reading and error listeners on unmount', () => {
    const addSpy = vi.fn()
    const removeSpy = vi.fn()
    class FakeSensor {
      addEventListener = addSpy
      removeEventListener = removeSpy
      start() {}
      stop() {}
    }
    vi.stubGlobal('Accelerometer', FakeSensor)
    vi.stubGlobal('DeviceOrientationEvent', {})
    vi.stubGlobal('DeviceMotionEvent', {})

    const Comp = defineComponent({
      setup() {
        useSensors()
        return () => h('div')
      },
    })
    const wrapper = mountWithPlugins(Comp)
    wrapper.unmount()

    const addedReading = addSpy.mock.calls.find((c) => c[0] === 'reading')?.[1]
    const addedError = addSpy.mock.calls.find((c) => c[0] === 'error')?.[1]
    const removedReading = removeSpy.mock.calls.find((c) => c[0] === 'reading')?.[1]
    const removedError = removeSpy.mock.calls.find((c) => c[0] === 'error')?.[1]

    expect(removedReading).toBe(addedReading)
    expect(removedError).toBe(addedError)
    vi.unstubAllGlobals()
  })
})
