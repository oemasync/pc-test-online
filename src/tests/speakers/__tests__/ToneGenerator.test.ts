import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountWithPlugins } from '@/test-utils/mount'
import ToneGenerator from '../ToneGenerator.vue'
import { makeFakeAudioContext } from './audioMock'

let fake: ReturnType<typeof makeFakeAudioContext>

vi.mock('@/lib/audio', () => ({
    resumeAudioContext: vi.fn(async () => fake.ctx),
    getAudioContext: vi.fn(() => fake.ctx),
}))

describe('ToneGenerator', () => {
    beforeEach(() => {
        fake = makeFakeAudioContext()
    })

    it('stops and disconnects on unmount', async () => {
        const wrapper = mountWithPlugins(ToneGenerator)
        await wrapper.find('[data-testid="play-tone"]').trigger('click')
        await flushPromises()
        wrapper.unmount()
        expect(fake.oscillators.length).toBeGreaterThan(0)
        for (const osc of fake.oscillators) {
            expect(osc.stop).toHaveBeenCalled()
            expect(osc.disconnect).toHaveBeenCalled()
        }
    })
})