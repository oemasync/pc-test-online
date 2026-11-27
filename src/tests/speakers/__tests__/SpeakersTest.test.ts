import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mountWithPlugins } from '@/test-utils/mount';
import { ref } from 'vue';
import SpeakersTest from '../SpeakersTest.vue';

let fakeCtx: { setSinkId: ReturnType<typeof vi.fn> };

beforeAll(() => {
    if (typeof (globalThis as unknown as Record<string, unknown>).AudioContext === 'undefined') {
        (globalThis as unknown as Record<string, unknown>).AudioContext =
            function AudioContext() {};
    }
    const AC = (globalThis as unknown as Record<string, unknown>).AudioContext as
        { prototype: Record<string, unknown> } | undefined;
    if (!AC) return;
    if (!('setSinkId' in AC.prototype)) {
        Object.defineProperty(AC.prototype, 'setSinkId', {
            value: vi.fn(async () => undefined),
            writable: true,
            configurable: true,
        });
    }
});

vi.mock('@/lib/media', () => ({
    useDevices: () => ({
        devices: ref([{ deviceId: 'dev1', label: 'Speaker 1' } as MediaDeviceInfo]),
        refresh: vi.fn(),
    }),
}));

vi.mock('@/lib/audio', () => ({
    getAudioContext: vi.fn(() => fakeCtx),
    resumeAudioContext: vi.fn(async () => fakeCtx),
}));

describe('SpeakersTest', () => {
    beforeEach(() => {
        fakeCtx = { setSinkId: vi.fn(async () => undefined) };
    });

    it('shows unsupported message when setSinkId is unavailable', async () => {
        const AC = (globalThis as unknown as Record<string, unknown>).AudioContext;
        const HME = (globalThis as unknown as Record<string, unknown>).HTMLMediaElement;
        (globalThis as unknown as Record<string, unknown>).AudioContext =
            function AudioContext() {};
        (globalThis as unknown as Record<string, unknown>).HTMLMediaElement =
            function HTMLMediaElement() {};
        try {
            const wrapper = mountWithPlugins(SpeakersTest);
            await flushPromises();
            expect(wrapper.find('[data-testid="sink-unsupported"]').exists()).toBe(true);
            expect(wrapper.find('.device-row').exists()).toBe(false);
        } finally {
            (globalThis as unknown as Record<string, unknown>).AudioContext = AC;
            (globalThis as unknown as Record<string, unknown>).HTMLMediaElement = HME;
        }
    });

    it('shows an error when setSinkId fails', async () => {
        const saved = fakeCtx;
        fakeCtx = {
            setSinkId: vi.fn(async () => {
                throw new Error('boom');
            }),
        } as unknown as { setSinkId: ReturnType<typeof vi.fn> };
        const wrapper = mountWithPlugins(SpeakersTest);
        await flushPromises();
        const select = wrapper.find('select');
        await select.setValue('dev1');
        await select.trigger('change');
        await flushPromises();
        expect(wrapper.find('[data-testid="sink-error"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="sink-error"]').text()).toContain(
            'Could not switch the output device.'
        );
        fakeCtx = saved;
    });

    it('applies selected output device via setSinkId', async () => {
        const wrapper = mountWithPlugins(SpeakersTest);
        await flushPromises();
        expect(wrapper.find('[data-testid="sink-unsupported"]').exists()).toBe(false);
        const select = wrapper.find('select');
        await select.setValue('dev1');
        await select.trigger('change');
        await flushPromises();
        expect((wrapper.vm as unknown as { selectedDeviceId: string }).selectedDeviceId).toBe(
            'dev1'
        );
        expect(fakeCtx.setSinkId).toHaveBeenCalledWith('dev1');
    });
});
