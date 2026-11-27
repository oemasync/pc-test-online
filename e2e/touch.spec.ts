import { test, expect } from '@playwright/test'

test.use({ hasTouch: true })

test('touch: two fingers and coverage', async ({ page }) => {
  await page.goto('/test/touch')

  const surface = page.locator('.touch-test__surface')
  await expect(surface).toBeVisible()

  const beforeCoverage = await page
    .locator('.stat-tile')
    .filter({ hasText: /Coverage/i })
    .locator('.stat-tile__value')
    .innerText()

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

  // swipe
  await page.evaluate(
    ({ x0, y0, x1, y1 }) => {
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
      for (let i = 0; i <= 10; i += 1) {
        const t = i / 10
        el.dispatchEvent(move(1, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t))
      }
      el.dispatchEvent(up(1, x1, y1))
    },
    { x0: box.x + 20, y0: box.y + 20, x1: box.x + box.width - 20, y1: box.y + box.height - 20 },
  )

  const afterCoverage = await page
    .locator('.stat-tile')
    .filter({ hasText: /Coverage/i })
    .locator('.stat-tile__value')
    .innerText()
  expect(Number(afterCoverage.replace('%', ''))).toBeGreaterThan(Number(beforeCoverage.replace('%', '')))
})
