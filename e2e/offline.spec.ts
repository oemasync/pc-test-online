import { test, expect } from '@playwright/test'

test('app works offline after service worker install', async ({ page, context }) => {
  await page.goto('/')
  await page.waitForFunction(() => 'serviceWorker' in navigator)
  await page.evaluate(() => navigator.serviceWorker.ready)

  // Allow the activated worker to take control of this page.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, {
    timeout: 15000,
  })

  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('.overview')).toBeVisible()

  await page.goto('/test/keyboard')
  await expect(page).toHaveURL(/\/test\/keyboard/)
  await expect(page.getByTestId('pass-button')).toBeVisible()
})