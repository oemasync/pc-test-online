import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mountWithPlugins } from '@/test-utils/mount';
import { reset } from '@/core/results';

describe('SystemTest', () => {
    let loseContextCalled = false;

    beforeEach(() => {
        loseContextCalled = false;
        const fakeGl = {
            getExtension: (name: string) => {
                if (name === 'WEBGL_debug_renderer_info') {
                    return { UNMASKED_RENDERER_WEBGL: 1, UNMASKED_VENDOR_WEBGL: 2 };
                }
                if (name === 'WEBGL_lose_context') {
                    return {
                        loseContext: () => {
                            loseContextCalled = true;
                        },
                    };
                }
                return null;
            },
            getParameter: (p: number) => {
                if (p === 1)
                    return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)';
                if (p === 2) return 'NVIDIA';
                return null;
            },
        };
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
            fakeGl as unknown as RenderingContext
        );
        // storage
        Object.defineProperty(navigator, 'storage', {
            value: { estimate: async () => ({ usage: 1000, quota: 1000000 }) },
            configurable: true,
        });
        // connection
        Object.defineProperty(navigator, 'connection', {
            value: { effectiveType: '4g', downlink: 10, rtt: 50 },
            configurable: true,
        });
        // deviceMemory
        Object.defineProperty(navigator, 'deviceMemory', { value: 8, configurable: true });
        reset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders cores and GPU string', async () => {
        const SystemTest = (await import('../SystemTest.vue')).default;
        const wrapper = mountWithPlugins(SystemTest);
        await new Promise(r => setTimeout(r, 0));
        await new Promise(r => setTimeout(r, 0));
        expect(wrapper.text()).toContain('NVIDIA GeForce RTX 3060');
    });

    it('releases WebGL context on unmount', async () => {
        const SystemTest = (await import('../SystemTest.vue')).default;
        const wrapper = mountWithPlugins(SystemTest);
        await new Promise(r => setTimeout(r, 0));
        await new Promise(r => setTimeout(r, 0));
        wrapper.unmount();
        expect(loseContextCalled).toBe(true);
    });
});
