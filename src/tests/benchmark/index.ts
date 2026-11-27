import type { TestModule } from '@/core/types';

const module: TestModule = {
    id: 'benchmark',
    order: 70,
    icon: '📊',
    titleKey: 'tests.benchmark.title',
    descriptionKey: 'tests.benchmark.description',
    component: () => import('./BenchmarkTest.vue'),
};

export default module;
