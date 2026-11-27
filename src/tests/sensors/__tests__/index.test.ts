import { describe, expect, it } from 'vitest'
import mod from '../index'

describe('sensors index isSupported', () => {
  it('returns true when a sensor API is present', () => {
    Object.defineProperty(window, 'DeviceOrientationEvent', {
      value: class {},
      configurable: true,
      writable: true,
    })
    expect(mod.isSupported?.()).toBe(true)
    delete (window as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent
  })

  it('returns false when no sensor API is present', () => {
    delete (window as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent
    delete (window as { DeviceMotionEvent?: unknown }).DeviceMotionEvent
    delete (window as { Accelerometer?: unknown }).Accelerometer
    expect(mod.isSupported?.()).toBe(false)
  })
})