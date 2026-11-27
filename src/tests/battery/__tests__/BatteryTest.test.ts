import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mountWithPlugins } from '@/test-utils/mount';
import { reset } from '@/core/results';

describe('BatteryTest', () => {
    let listeners: Record<string, Set<() => void>>;
    let fakeBattery: {
        charging: boolean;
        chargingTime: number;
        dischargingTime: number;
        level: number;
        addEventListener: (t: string, cb: () => void) => void;
        removeEventListener: (t: string, cb: () => void) => void;
    };

    beforeEach(() => {
        listeners = {};
        fakeBattery = {
            charging: true,
            chargingTime: 100,
            dischargingTime: Infinity,
            level: 0.5,
            addEventListener: (t, cb) => {
                if (!listeners[t]) listeners[t] = new Set();
                listeners[t].add(cb);
            },
            removeEventListener: (t, cb) => {
                listeners[t]?.delete(cb);
            },
        };
        Object.defineProperty(navigator, 'getBattery', {
            value: async () => fakeBattery,
            configurable: true,
            writable: true,
        });
        reset();
    });

    afterEach(() => {
        delete (navigator as { getBattery?: unknown }).getBattery;
    });

    it('renders the charge level', async () => {
        const BatteryTest = (await import('../BatteryTest.vue')).default;
        const wrapper = mountWithPlugins(BatteryTest);
        await new Promise(r => setTimeout(r, 0));
        expect(wrapper.text()).toContain('50%');
    });

    it('updates readouts on levelchange', async () => {
        const BatteryTest = (await import('../BatteryTest.vue')).default;
        const wrapper = mountWithPlugins(BatteryTest);
        await new Promise(r => setTimeout(r, 0));
        fakeBattery.level = 0.75;
        listeners.levelchange?.forEach(cb => cb());
        await wrapper.vm.$nextTick();
        expect(wrapper.text()).toContain('75%');
    });

    it('removes listeners on unmount', async () => {
        const BatteryTest = (await import('../BatteryTest.vue')).default;
        const wrapper = mountWithPlugins(BatteryTest);
        await new Promise(r => setTimeout(r, 0));
        expect(listeners.levelchange?.size ?? 0).toBeGreaterThan(0);
        wrapper.unmount();
        expect(listeners.levelchange?.size ?? 0).toBe(0);
    });
});

describe('BatteryTest unsupported', () => {
    it('shows unsupported state and Skip', async () => {
        vi.resetModules();
        delete (navigator as { getBattery?: unknown }).getBattery;
        const BatteryTest = (await import('../BatteryTest.vue')).default;
        const wrapper = mountWithPlugins(BatteryTest);
        expect(wrapper.text()).toContain('Battery API not supported');
        const skipBtn = wrapper.findAll('button').find(b => b.text() === 'Skip');
        expect(skipBtn).toBeDefined();
    });
});
