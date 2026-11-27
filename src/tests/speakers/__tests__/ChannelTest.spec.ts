import { describe, it, expect } from 'vitest';
import { mountWithPlugins } from '@/test-utils/mount';
import ChannelTest from '../ChannelTest.vue';

describe('ChannelTest', () => {
    it('mounts and unmounts without throwing', () => {
        const wrapper = mountWithPlugins(ChannelTest);
        expect(wrapper.exists()).toBe(true);
        wrapper.unmount();
    });
});
