import type { TestModule } from '@/core/types'

const module: TestModule = {
  id: 'mouse',
  order: 20,
  icon: '🖱️',
  titleKey: 'tests.mouse.title',
  descriptionKey: 'tests.mouse.description',
  component: () => import('./MouseTest.vue'),
}

export default module
