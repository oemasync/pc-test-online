import pkg from '../../package.json'
import { getAllResults } from './results'
import type { TestResult } from './types'

export interface Report {
  appVersion: string
  timestamp: string
  userAgent: string
  results: TestResult[]
}

export function buildReport(): Report {
  return {
    appVersion: pkg.version,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    results: Object.values(getAllResults()),
  }
}

export function exportJson(filename = 'pc-test-report.json'): void {
  const report = buildReport()
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
