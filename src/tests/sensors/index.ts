import type { TestModule } from '@/core/types'

const module: TestModule = {
  id: 'sensors',
  order: 40,
  icon: '🧭',
  titleKey: 'tests.sensors.title',
  descriptionKey: 'tests.sensors.description',
  component: () => import('./SensorsTest.vue'),
  isSupported: () => true,
}

export default module
