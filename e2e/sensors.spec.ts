import { test, expect } from '@playwright/test'

test('sensors no sensors detected', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto('/test/sensors')
  await expect(page.getByTestId('no-sensors')).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible()

  expect(errors).toEqual([])
})

test('sensors devicemotion activates and passes', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto('/test/sensors')

  await page.evaluate(() => {
    for (let i = 0; i < 12; i += 1) {
      const event = new DeviceMotionEvent('devicemotion', {
        accelerationIncludingGravity: { x: 1, y: 2, z: 9.8 },
        interval: 16,
      })
      window.dispatchEvent(event)
    }
  })

  await expect(page.getByTestId('no-sensors')).toBeHidden({ timeout: 5000 })
  await expect(page.getByTestId('sample-rate')).toContainText(/\d/)

  await page.getByRole('button', { name: 'Pass' }).click()
  await expect(page.getByTestId('status-light-sensors')).toHaveAttribute('data-status', 'passed')

  expect(errors).toEqual([])
})
