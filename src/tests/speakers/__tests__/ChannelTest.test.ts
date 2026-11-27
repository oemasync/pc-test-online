import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountWithPlugins } from '@/test-utils/mount';
import ChannelTest from '../ChannelTest.vue';
import { makeFakeAudioContext } from './audioMock';

let fake: ReturnType<typeof makeFakeAudioContext>;

vi.mock('@/lib/audio', () => ({
    resumeAudioContext: vi.fn(async () => fake.ctx),
    getAudioContext: vi.fn(() => fake.ctx),
}));

describe('ChannelTest', () => {
    beforeEach(() => {
        fake = makeFakeAudioContext();
    });

    it('stops and disconnects oscillators on unmount', async () => {
        const wrapper = mountWithPlugins(ChannelTest);
        await wrapper.find('[data-testid="play-left"]').trigger('click');
        await flushPromises();
        wrapper.unmount();
        expect(fake.oscillators.length).toBeGreaterThan(0);
        for (const osc of fake.oscillators) {
            expect(osc.stop).toHaveBeenCalled();
            expect(osc.disconnect).toHaveBeenCalled();
        }
    });
});
