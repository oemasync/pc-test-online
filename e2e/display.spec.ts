import { test, expect } from '@playwright/test';

test('display module', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', message => {
        if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', error => consoleErrors.push(error.message));

    await page.addInitScript(() => {
        (window as { __fullscreenRequested?: boolean }).__fullscreenRequested = false;
        Element.prototype.requestFullscreen = async function () {
            (window as { __fullscreenRequested?: boolean }).__fullscreenRequested = true;
        };
    });

    await page.goto('/test/display');

    await expect(page.getByText('Current color: black')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('Current color: white')).toBeVisible();

    await page.getByRole('button', { name: 'Start fullscreen cycle' }).click();
    expect(
        await page.evaluate(
            () => (window as { __fullscreenRequested?: boolean }).__fullscreenRequested
        )
    ).toBe(true);

    await page.getByRole('button', { name: 'Measure refresh rate' }).click();
    const estimated = page
        .locator('dt', { hasText: 'Estimated rate' })
        .locator('xpath=following-sibling::dd[1]');
    await expect(estimated).not.toHaveText('—', { timeout: 10000 });
    const estimatedText = (await estimated.textContent()) ?? '0';
    expect(Number(estimatedText)).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Pass' }).click();
    await expect(page.locator('[data-testid="status-light-display"]')).toHaveAttribute(
        'data-status',
        'passed'
    );

    expect(consoleErrors).toEqual([]);
});
