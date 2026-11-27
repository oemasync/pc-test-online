import type { TestModule } from '@/core/types';

const module: TestModule = {
    id: 'system',
    order: 30,
    icon: '🖥️',
    titleKey: 'tests.system.title',
    descriptionKey: 'tests.system.description',
    component: () => import('./SystemTest.vue'),
};

export default module;
