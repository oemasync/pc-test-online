import type { Component } from 'vue'

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
  // A single emoji (or short text) rendered as-is in the overview grid card.
  icon: string
  titleKey: string
  descriptionKey: string
  component: () => Promise<Component | { default: Component }>
  isSupported?: () => boolean
}
