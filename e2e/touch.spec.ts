import { test, expect } from '@playwright/test'

test.describe('touch (hasTouch)', () => {
  test.use({ hasTouch: true })

  test('multi-finger, coverage, pass', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    await page.goto('/test/touch')

    const surface = page.locator('.touch-test__surface')
    await expect(surface).toBeVisible()

    const beforeCoverageText = await page
      .locator('.stat-tile')
      .filter({ hasText: /Coverage/i })
      .locator('.stat-tile__value')
      .innerText()
    const beforeCoverage = Number(beforeCoverageText.replace('%', ''))

    const box = await surface.boundingBox()
    if (!box) throw new Error('surface has no box')

    await page.evaluate(
      ({ x, y }) => {
        const el = document.querySelector('.touch-test__surface') as HTMLElement
        const make = (id: number, px: number, py: number) =>
          new PointerEvent('pointerdown', {
            pointerId: id,
            pointerType: 'touch',
            clientX: px,
            clientY: py,
            bubbles: true,
            cancelable: true,
          })
        el.dispatchEvent(make(1, x, y))
        el.dispatchEvent(make(2, x + 40, y + 40))
      },
      { x: box.x + 20, y: box.y + 20 },
    )

    const maxTile = page.locator('.stat-tile').filter({ hasText: /Max simultaneous/i })
    await expect(maxTile.locator('.stat-tile__value')).toHaveText(/[2-9]/)

    await page.evaluate(
      ({ x0, y0, w, h }) => {
        const el = document.querySelector('.touch-test__surface') as HTMLElement
        const move = (id: number, px: number, py: number) =>
          new PointerEvent('pointermove', {
            pointerId: id,
            pointerType: 'touch',
            clientX: px,
            clientY: py,
            bubbles: true,
            cancelable: true,
          })
        const up = (id: number, px: number, py: number) =>
          new PointerEvent('pointerup', {
            pointerId: id,
            pointerType: 'touch',
            clientX: px,
            clientY: py,
            bubbles: true,
            cancelable: true,
          })
        const down = (id: number, px: number, py: number) =>
          new PointerEvent('pointerdown', {
            pointerId: id,
            pointerType: 'touch',
            clientX: px,
            clientY: py,
            bubbles: true,
            cancelable: true,
          })
        el.dispatchEvent(down(1, x0, y0))
        const rows = 12
        for (let r = 0; r < rows; r += 1) {
          const y = y0 + (h * r) / (rows - 1)
          const xStart = r % 2 === 0 ? x0 : x0 + w
          const xEnd = r % 2 === 0 ? x0 + w : x0
          const steps = 20
          for (let i = 0; i <= steps; i += 1) {
            const t = i / steps
            el.dispatchEvent(move(1, xStart + (xEnd - xStart) * t, y))
          }
        }
        el.dispatchEvent(up(1, x0, y0 + h))
      },
      { x0: box.x + 5, y0: box.y + 5, w: box.width - 10, h: box.height - 10 },
    )

    const afterCoverageText = await page
      .locator('.stat-tile')
      .filter({ hasText: /Coverage/i })
      .locator('.stat-tile__value')
      .innerText()
    const afterCoverage = Number(afterCoverageText.replace('%', ''))
    expect(afterCoverage).toBeGreaterThan(beforeCoverage)

    await page.getByTestId('pass-button').click()
    await expect(page.locator('[data-testid="status-light-touch"]')).toHaveAttribute('data-status', 'passed')

    expect(consoleErrors).toEqual([])
  })
})

test.describe('touch (no touch)', () => {
  test.use({ hasTouch: false })

  test('unsupported state with skip', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => consoleErrors.push(err.message))

    await page.goto('/test/touch')
    await expect(page.locator('p').filter({ hasText: /Not supported in this browser/ })).toBeVisible()
    await expect(page.getByTestId('skip-button')).toBeVisible()

    expect(consoleErrors).toEqual([])
  })
})
