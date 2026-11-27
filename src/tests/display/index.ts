import type { TestModule } from '@/core/types';

const module: TestModule = {
    id: 'display',
    order: 20,
    icon: '🖥️',
    titleKey: 'tests.display.title',
    descriptionKey: 'tests.display.description',
    component: () => import('./DisplayTest.vue'),
};

export default module;
