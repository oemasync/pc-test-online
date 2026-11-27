export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'

export interface TestResult {
  id: string
  status: TestStatus
  startedAt?: number
  finishedAt?: number
  durationMs: number
  details: Record<string, string | number | boolean>
  note?: string
}

export interface TestModule {
  id: string
  order: number
  icon: string
  titleKey: string
  descriptionKey: string
  component: () => Promise<unknown>
  isSupported?: () => boolean
}
