import { test, expect } from '@playwright/test';

test('microphone level moves and pass', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/test/microphone');
    const meter = page.locator('.level-meter__readout');
    await expect(meter).toBeVisible();

    await expect
        .poll(
            async () => {
                const text = await meter.textContent();
                const match = text?.match(/-?\d+(?:\.\d+)?/);
                return match ? Number(match[0]) : -Infinity;
            },
            { timeout: 15000 }
        )
        .toBeGreaterThan(-60);

    await page.getByRole('button', { name: 'Pass' }).click();
    await expect(page.getByTestId('status-light-microphone')).toHaveAttribute(
        'data-status',
        'passed'
    );

    expect(errors).toEqual([]);
});
