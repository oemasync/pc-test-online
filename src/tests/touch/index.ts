import type { TestModule } from '@/core/types'

const module: TestModule = {
  id: 'touch',
  order: 20,
  icon: '👆',
  titleKey: 'tests.touch.title',
  descriptionKey: 'tests.touch.description',
  isSupported: () => navigator.maxTouchPoints > 0,
  component: () => import('./TouchTest.vue'),
}

export default module
