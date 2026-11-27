import type { TestModule } from '@/core/types'

const module: TestModule = {
  id: 'keyboard',
  order: 10,
  icon: '⌨️',
  titleKey: 'tests.keyboard.title',
  descriptionKey: 'tests.keyboard.description',
  component: () => import('./KeyboardTest.vue'),
}

export default module
