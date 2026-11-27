import type { TestModule } from '@/core/types';

const module: TestModule = {
    id: 'webcam',
    order: 20,
    icon: '📷',
    titleKey: 'tests.webcam.title',
    descriptionKey: 'tests.webcam.description',
    component: () => import('./WebcamTest.vue'),
    isSupported: () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
};

export default module;
