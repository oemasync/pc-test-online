import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountWithPlugins } from '@/test-utils/mount';
import PolarityTest from '../PolarityTest.vue';
import { makeFakeAudioContext } from './audioMock';

let fake: ReturnType<typeof makeFakeAudioContext>;

vi.mock('@/lib/audio', () => ({
    resumeAudioContext: vi.fn(async () => fake.ctx),
    getAudioContext: vi.fn(() => fake.ctx),
}));

describe('PolarityTest', () => {
    beforeEach(() => {
        fake = makeFakeAudioContext();
    });

    it('clears the 650ms timer on unmount', async () => {
        const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
        const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
        const wrapper = mountWithPlugins(PolarityTest);
        await wrapper.find('[data-testid="play-inphase"]').trigger('click');
        await flushPromises();
        const timerId = setTimeoutSpy.mock.results[setTimeoutSpy.mock.results.length - 1]!.value;
        wrapper.unmount();
        expect(clearTimeoutSpy).toHaveBeenCalledWith(timerId);
        setTimeoutSpy.mockRestore();
        clearTimeoutSpy.mockRestore();
    });

    it('stops and disconnects oscillators on unmount', async () => {
        const wrapper = mountWithPlugins(PolarityTest);
        await wrapper.find('[data-testid="play-inphase"]').trigger('click');
        await flushPromises();
        wrapper.unmount();
        expect(fake.oscillators.length).toBeGreaterThan(0);
        for (const osc of fake.oscillators) {
            expect(osc.stop).toHaveBeenCalled();
            expect(osc.disconnect).toHaveBeenCalled();
        }
    });
});
