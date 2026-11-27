import { test, expect } from '@playwright/test'

test('shell flow', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Keyboard Test')).toBeVisible()

  await page.getByText('Keyboard Test').click()
  await expect(page).toHaveURL(/\/test\/keyboard/)

  const countBefore = await page.getByText(/\d+ \/ \d+/).textContent()
  await page.keyboard.press('KeyA')
  await expect(page.getByText(/\d+ \/ \d+/)).not.toHaveText(countBefore ?? '')

  await page.getByRole('button', { name: 'Pass' }).click()

  // sidebar light passed: check status light? At least summary
  await page.goto('/summary')
  await expect(page.getByText('Passed')).toBeVisible()

  // Reset clears
  await page.goto('/')
  await page.getByRole('button', { name: 'Reset' }).click()
  await page.goto('/summary')
  await expect(page.getByText('No tests run yet.')).toBeVisible()
})
