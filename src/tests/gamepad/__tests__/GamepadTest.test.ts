import { describe, expect, it, vi } from 'vitest';
import { mountWithPlugins } from '@/test-utils/mount';
import GamepadTest from '../GamepadTest.vue';

describe('GamepadTest', () => {
    it('shows the connect prompt when no pad is available', () => {
        Object.defineProperty(navigator, 'getGamepads', {
            value: () => [null],
            configurable: true,
            writable: true,
        });

        const wrapper = mountWithPlugins(GamepadTest);
        expect(wrapper.text()).toContain('Press any button on your controller to connect.');
        wrapper.unmount();
    });

    it('cancels animation-frame polling on unmount', () => {
        const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 42);

        Object.defineProperty(navigator, 'getGamepads', {
            value: () => [null],
            configurable: true,
            writable: true,
        });

        const wrapper = mountWithPlugins(GamepadTest);
        wrapper.unmount();

        expect(cancelSpy).toHaveBeenCalled();
        cancelSpy.mockRestore();
    });
});
