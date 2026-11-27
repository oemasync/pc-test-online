import { test, expect } from '@playwright/test'

test('gamepad: standard mapping renders with a stubbed pad', async ({ page }) => {
    await page.addInitScript((mapping) => {
        const pad = {
            index: 0,
            id: 'Fake Gamepad',
            connected: true,
            mapping,
            buttons: Array.from({ length: 4 }, () => ({ pressed: false, value: 0, touched: false })),
            axes: [0, 0, 0, 0],
            timestamp: 0,
            vibrationActuator: { playEffect: async () => 'complete' },
        }
        Object.defineProperty(navigator, 'getGamepads', {
            configurable: true,
            writable: true,
            value: () => [pad],
        })
        setTimeout(() => window.dispatchEvent(new Event('gamepadconnected')), 50)
    }, 'standard')

    await page.goto('/test/gamepad')
    await expect(page.getByText('Standard mapping')).toBeVisible()
    await expect(page.getByText('0 / 4')).toBeVisible()
    await expect(page.getByText('No gamepad detected')).not.toBeVisible()
})

test('gamepad: generic mapping uses the generic label', async ({ page }) => {
    await page.addInitScript(() => {
        const pad = {
            index: 0,
            id: 'Fake Generic Gamepad',
            connected: true,
            mapping: '',
            buttons: Array.from({ length: 2 }, () => ({ pressed: false, value: 0, touched: false })),
            axes: [0, 0],
            timestamp: 0,
        }
        Object.defineProperty(navigator, 'getGamepads', {
            configurable: true,
            writable: true,
            value: () => [pad],
        })
        setTimeout(() => window.dispatchEvent(new Event('gamepaddisconnected')), 50)
        setTimeout(() => window.dispatchEvent(new Event('gamepadconnected')), 100)
    })

    await page.goto('/test/gamepad')
    await expect(page.getByText('Generic mapping')).toBeVisible()
    await expect(page.getByText('No gamepad detected')).not.toBeVisible()
})
