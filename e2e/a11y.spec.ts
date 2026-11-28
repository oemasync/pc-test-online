import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const MODULES = [
  'benchmark',
  'gamepad',
  'webcam',
  'touch',
  'battery',
  'system',
  'display',
  'sensors',
  'mouse',
  'speakers',
  'microphone',
  'keyboard',
]

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']

async function runAxe(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  return results.violations
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`a11y ${scheme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
    })

    test('/', async ({ page }) => {
      await page.goto('/')
      const v = await runAxe(page)
      expect(v, JSON.stringify(v, null, 2)).toEqual([])
    })

    test('/summary', async ({ page }) => {
      await page.goto('/summary')
      const v = await runAxe(page)
      expect(v, JSON.stringify(v, null, 2)).toEqual([])
    })

    test('404', async ({ page }) => {
      await page.goto('/this-route-does-not-exist')
      const v = await runAxe(page)
      expect(v, JSON.stringify(v, null, 2)).toEqual([])
    })

    for (const id of MODULES) {
      test(`/test/${id}`, async ({ page }) => {
        await page.goto(`/test/${id}`)
        // wait a bit for async component
        await page.waitForTimeout(500)
        const v = await runAxe(page)
        expect(v, JSON.stringify(v, null, 2)).toEqual([])
      })
    }
  })
}
