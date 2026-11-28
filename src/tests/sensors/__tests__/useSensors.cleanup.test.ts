import { describe, it, expect, vi, afterEach } from 'vitest';
import { defineComponent, h } from 'vue';
import { mountWithPlugins } from '@/test-utils/mount';
import { useSensors } from '../useSensors';

describe('useSensors cleanup', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('removes reading and error listeners on unmount', () => {
        const addSpy = vi.fn();
        const removeSpy = vi.fn();
        class FakeSensor {
            addEventListener = addSpy;
            removeEventListener = removeSpy;
            start() {}
            stop() {}
        }
        vi.stubGlobal('Accelerometer', FakeSensor);
        vi.stubGlobal('DeviceOrientationEvent', {});
        vi.stubGlobal('DeviceMotionEvent', {});

        const Comp = defineComponent({
            setup() {
                useSensors();
                return () => h('div');
            },
        });
        const wrapper = mountWithPlugins(Comp);
        wrapper.unmount();

        const addedReading = addSpy.mock.calls.find(c => c[0] === 'reading')?.[1];
        const addedError = addSpy.mock.calls.find(c => c[0] === 'error')?.[1];
        const removedReading = removeSpy.mock.calls.find(c => c[0] === 'reading')?.[1];
        const removedError = removeSpy.mock.calls.find(c => c[0] === 'error')?.[1];

        expect(removedReading).toBe(addedReading);
        expect(removedError).toBe(addedError);
    });
});
