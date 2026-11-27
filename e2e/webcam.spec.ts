import { test, expect } from '@playwright/test'

test('webcam live preview', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await page.goto('/test/webcam')

  const video = page.locator('video')
  await expect(video).toBeVisible()
  await expect
    .poll(async () => video.evaluate((element) => element.videoWidth > 0 && element.srcObject !== null))
    .toBeTruthy()

  await expect(page.getByText(/\d+ × \d+/)).toBeVisible()

  const measuredValue = page
    .locator('.stat-tile', { hasText: 'Measured FPS' })
    .locator('.stat-tile__value')
  await expect.poll(async () => Number.parseFloat((await measuredValue.textContent()) ?? '0')).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Pass' }).click()
  await expect(page.locator('[data-testid="status-light-webcam"]')).toHaveAttribute('data-status', 'passed')

  expect(consoleErrors).toEqual([])
})
