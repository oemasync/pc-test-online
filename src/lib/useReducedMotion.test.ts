import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { withSetup } from '@/test-utils/withSetup';
import { useReducedMotion } from '@/lib/useReducedMotion';

describe('useReducedMotion', () => {
    let originalMatchMedia: typeof window.matchMedia;

    beforeEach(() => {
        originalMatchMedia = window.matchMedia;
    });

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
        vi.restoreAllMocks();
    });

    it('reports the initial matchMedia result', () => {
        const listeners: Array<(e: MediaQueryListEvent) => void> = [];
        const mq = {
            matches: true,
            addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) =>
                listeners.push(cb),
            removeEventListener: vi.fn(),
        };
        window.matchMedia = vi.fn().mockReturnValue(mq as unknown as MediaQueryList);

        const { result, unmount } = withSetup(() => useReducedMotion());
        expect(result.reduced.value).toBe(true);
        unmount();
    });

    it('handles environments without matchMedia', () => {
        // @ts-expect-error test override
        window.matchMedia = undefined;
        const { result, unmount } = withSetup(() => useReducedMotion());
        expect(result.reduced.value).toBe(false);
        unmount();
    });

    it('updates when the media query changes', async () => {
        const listeners: Array<(e: MediaQueryListEvent) => void> = [];
        const mq = {
            matches: false,
            addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) =>
                listeners.push(cb),
            removeEventListener: vi.fn(),
        };
        window.matchMedia = vi.fn().mockReturnValue(mq as unknown as MediaQueryList);

        const { result, unmount } = withSetup(() => useReducedMotion());
        expect(result.reduced.value).toBe(false);
        mq.matches = true;
        listeners.forEach(cb => cb({ matches: true } as MediaQueryListEvent));
        await new Promise(r => setTimeout(r, 0));
        expect(result.reduced.value).toBe(true);
        unmount();
    });
});
