import { test, expect } from '@playwright/test'

test('mouse module', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto('/test/mouse')

  const area = page.locator('.mouse-test')

  // left, middle, right buttons
  await area.click({ button: 'left' })
  await area.click({ button: 'middle' })
  await area.click({ button: 'right' })

  await expect(page.getByTestId('mouse-button-0')).toHaveClass(/mouse-button-tile--tested/)
  await expect(page.getByTestId('mouse-button-1')).toHaveClass(/mouse-button-tile--tested/)
  await expect(page.getByTestId('mouse-button-2')).toHaveClass(/mouse-button-tile--tested/)

  // contextmenu suppressed
  const ctx = await area.evaluate((el) => {
    const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    el.dispatchEvent(e)
    return e.defaultPrevented
  })
  expect(ctx).toBe(true)

  // wheel
  await area.hover()
  await page.mouse.wheel(0, -100)
  await page.mouse.wheel(0, 100)
  await expect(page.getByTestId('wheel-up')).toHaveClass(/mouse-wheel__tile--tested/)
  await expect(page.getByTestId('wheel-down')).toHaveClass(/mouse-wheel__tile--tested/)

  // drag
  const box = page.getByTestId('drag-box')
  const bbox = await box.boundingBox()
  if (bbox) {
    await page.mouse.move(bbox.x + 5, bbox.y + 5)
    await page.mouse.down()
    await page.mouse.move(bbox.x + 40, bbox.y + 20)
    await page.mouse.up()
  }
  await expect(page.getByTestId('drag-done')).toBeVisible()

  // rapid move for polling
  for (let i = 0; i < 20; i += 1) {
    await page.mouse.move(100 + i * 5, 100 + i * 5)
  }

  await page.getByTestId('pass-button').click()
  await expect(page.getByTestId('status-light-mouse')).toHaveAttribute('data-status', 'passed')

  expect(consoleErrors).toEqual([])
})
