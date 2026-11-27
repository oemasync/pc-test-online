import type { TestModule } from '@/core/types';

const module: TestModule = {
    id: 'microphone',
    order: 20,
    icon: '🎤',
    titleKey: 'tests.microphone.title',
    descriptionKey: 'tests.microphone.description',
    component: () => import('./MicrophoneTest.vue'),
};

export default module;
