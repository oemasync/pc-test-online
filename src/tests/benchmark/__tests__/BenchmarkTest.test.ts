import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountWithPlugins } from '@/test-utils/mount'
import BenchmarkTest from '../BenchmarkTest.vue'

class FakeWorker {
  onmessage: ((ev: MessageEvent) => void) | null = null
  onerror: ((ev: ErrorEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
  constructor() {
    instances.push(this)
  }
}

const instances: FakeWorker[] = []

beforeEach(() => {
  instances.length = 0
  // @ts-expect-error test override
  globalThis.Worker = FakeWorker
})

afterEach(() => {
  // @ts-expect-error cleanup
  delete globalThis.Worker
})

describe('BenchmarkTest', () => {
  it('terminates worker on unmount', async () => {
    const wrapper = mountWithPlugins(BenchmarkTest)
    await wrapper.find('[data-testid="run-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(instances.length).toBe(1)
    wrapper.unmount()
    expect(instances[0]!.terminate).toHaveBeenCalled()
  })

  it('terminates worker on abort', async () => {
    const wrapper = mountWithPlugins(BenchmarkTest)
    await wrapper.find('[data-testid="run-button"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="abort-button"]').trigger('click')
    expect(instances[0]!.terminate).toHaveBeenCalled()
  })
})
