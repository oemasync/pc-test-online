import { describe, expect, it } from 'vitest'
import { buildReport } from '@/core/report'
import { resultsStore } from '@/core/results'

describe('report', () => {
  it('builds a report with version, timestamp, userAgent and results', () => {
    resultsStore.reset()
    resultsStore.start('keyboard')
    resultsStore.pass('keyboard', { keys: 2 })
    const report = buildReport()
    expect(report.appVersion).toBeTruthy()
    expect(report.timestamp).toMatch(/^\d{4}-/)
    expect(typeof report.userAgent).toBe('string')
    expect(report.results).toHaveLength(1)
    expect(report.results[0]!.id).toBe('keyboard')
  })
})
