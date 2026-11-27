import { test, expect } from '@playwright/test';

test('system readouts render', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => {
        if (m.type() === 'error') errors.push(m.text());
    });

    await page.goto('/test/system');

    // cores: a number > 0
    await expect(page.getByText(/Logical cores/i)).toBeVisible();

    // GPU string present
    await expect(
        page
            .locator('dd')
            .filter({ hasText: /SwiftShader|Vulkan|ANGLE|GeForce|Intel|Mali|Apple/i })
            .first()
    ).toBeVisible();

    // screen size present
    await expect(page.getByText(/\d+x\d+/)).toBeVisible();

    await page.getByRole('button', { name: 'Pass' }).click();
    await expect(page.locator('[data-testid="status-light-system"]')).toHaveAttribute(
        'data-status',
        'passed'
    );

    expect(errors).toEqual([]);
});
