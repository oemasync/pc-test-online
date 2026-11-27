import { test, expect } from '@playwright/test';

test('speakers module', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => {
        if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto('/test/speakers');
    await page.getByTestId('play-left').click();
    await expect(page.getByTestId('channel-playing')).toHaveText('left');
    await page.getByTestId('play-sweep').click();
    await page.waitForTimeout(200);
    await page.getByTestId('mark-low').click();
    await page.getByTestId('mark-high').click();
    await expect(page.getByTestId('audible-range')).not.toHaveText('- - -');
    await page.getByTestId('pass-button').click();
    await expect(page.getByTestId('status-light-speakers')).toHaveAttribute(
        'data-status',
        'passed'
    );
    expect(errors).toEqual([]);
});
