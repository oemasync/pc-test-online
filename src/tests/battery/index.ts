import type { TestModule } from '@/core/types';

const module: TestModule = {
    id: 'battery',
    order: 20,
    icon: '🔋',
    titleKey: 'tests.battery.title',
    descriptionKey: 'tests.battery.description',
    component: () => import('./BatteryTest.vue'),
    isSupported: () => 'getBattery' in navigator,
};

export default module;
