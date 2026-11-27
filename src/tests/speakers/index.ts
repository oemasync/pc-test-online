import type { TestModule } from '@/core/types';

const module: TestModule = {
    id: 'speakers',
    order: 20,
    icon: '🔊',
    titleKey: 'tests.speakers.title',
    descriptionKey: 'tests.speakers.description',
    component: () => import('./SpeakersTest.vue'),
    isSupported: () => typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined',
};

export default module;
