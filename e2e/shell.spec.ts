import { test, expect } from '@playwright/test'

test('shell flow', async ({ page }) => {
  await page.goto('/')
  const keyboardLink = page.locator('.overview__title', { hasText: 'Keyboard Test' })
  await expect(keyboardLink).toBeVisible()

  await keyboardLink.click()
  await expect(page).toHaveURL(/\/test\/keyboard/)

  const counter = page.getByText(/\d+ \/ \d+/)
  const countBefore = await counter.textContent()
  await page.keyboard.press('KeyA')
  await expect(counter).not.toHaveText(countBefore ?? '')

  await page.getByRole('button', { name: 'Pass' }).click()
  await expect(page.locator('.app__sidebar--left .status-light--passed')).toBeVisible()

  await page.goto('/summary')
  await expect(page.locator('main').getByText('Passed')).toBeVisible()

  await page.goto('/')
  await page.getByRole('button', { name: 'Reset' }).click()
  await page.goto('/summary')
  await expect(page.locator('main').getByText('No tests run yet.')).toBeVisible()
})
