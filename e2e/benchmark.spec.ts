import { test, expect } from '@playwright/test';

test('benchmark quick mode runs, verifies checksums, supports abort and pass', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/test/benchmark');

    // Quick mode is default
    await page.getByTestId('run-button').click();

    // progress advances
    await expect(page.locator('progress')).not.toHaveAttribute('value', '0', { timeout: 10000 });
    // wait for completion: pass button enabled
    await expect(page.getByTestId('pass-button')).toBeEnabled({ timeout: 45000 });

    // scores render
    await expect(page.getByText(/Single-thread score/i)).toBeVisible();
    await expect(page.getByText(/Verified/i)).toBeVisible();

    // pass the completed run
    await page.getByTestId('pass-button').click();
    await expect(page.getByTestId('status-light-benchmark')).toHaveAttribute(
        'data-status',
        'passed'
    );

    // abort test: run again then abort
    await page.getByTestId('run-button').click();
    await page.getByTestId('abort-button').click();

    expect(consoleErrors).toEqual([]);
});
