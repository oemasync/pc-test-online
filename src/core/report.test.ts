import { describe, expect, it, vi } from 'vitest'
import { buildReport, exportJson } from '@/core/report'
import { pass, reset, start } from '@/core/results'

describe('report', () => {
  it('builds a report with version, timestamp, userAgent and results', () => {
    reset()
    start('keyboard')
    pass('keyboard', { keys: 2 })
    const report = buildReport()
    expect(report.appVersion).toBeTruthy()
    expect(report.timestamp).toMatch(/^\d{4}-/)
    expect(typeof report.userAgent).toBe('string')
    expect(report.results).toHaveLength(1)
    expect(report.results[0]!.id).toBe('keyboard')
  })

  it('exportJson triggers a download', () => {
    reset()
    start('keyboard')
    pass('keyboard')
    const click = vi.fn()
    const anchor = { href: '', download: '', click } as unknown as HTMLAnchorElement
    const createSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => anchor)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => anchor)
    const createObjectURL = vi.fn(() => 'blob:url')
    const revokeObjectURL = vi.fn()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    exportJson('out.json')
    expect(createSpy).toHaveBeenCalledWith('a')
    expect(anchor.download).toBe('out.json')
    expect(click).toHaveBeenCalled()
    createSpy.mockRestore()
  })
})
