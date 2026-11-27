import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useFullscreen } from '../useFullscreen';

describe('useFullscreen', () => {
    it('sets unavailable when requestFullscreen is missing', async () => {
        const target = ref<HTMLElement | null>(null);
        const { unavailable, request } = useFullscreen(target);
        const element = document.createElement('div');
        Object.defineProperty(element, 'requestFullscreen', {
            configurable: true,
            value: undefined,
        });
        target.value = element;

        await request();

        expect(unavailable.value).toBe(true);
    });

    it('sets unavailable when requestFullscreen rejects', async () => {
        const target = ref<HTMLElement | null>(null);
        const { unavailable, request } = useFullscreen(target);
        const element = document.createElement('div');
        Object.defineProperty(element, 'requestFullscreen', {
            configurable: true,
            value: vi.fn().mockRejectedValue(new Error('unavailable')),
        });
        target.value = element;

        await request();

        expect(unavailable.value).toBe(true);
    });

    it('stays available when requestFullscreen resolves', async () => {
        const target = ref<HTMLElement | null>(null);
        const { unavailable, request } = useFullscreen(target);
        const element = document.createElement('div');
        Object.defineProperty(element, 'requestFullscreen', {
            configurable: true,
            value: vi.fn().mockResolvedValue(undefined),
        });
        target.value = element;

        await request();

        expect(unavailable.value).toBe(false);
    });
});
