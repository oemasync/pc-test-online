import { defineComponent, h, onMounted } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useMediaStream } from '@/lib/media'

describe('useMediaStream cleanup', () => {
  it('stops tracks on stop and unmount', async () => {
    const track = { stop: vi.fn() }
    const fakeStream = { getTracks: () => [track] } as unknown as MediaStream
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream)
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
