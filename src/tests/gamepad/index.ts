import type { TestModule } from '@/core/types';

const module: TestModule = {
    id: 'gamepad',
    order: 20,
    icon: '🎮',
    titleKey: 'tests.gamepad.title',
    descriptionKey: 'tests.gamepad.description',
    component: () => import('./GamepadTest.vue'),
    isSupported: () => 'getGamepads' in navigator,
};

export default module;
