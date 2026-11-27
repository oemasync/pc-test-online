import { test, expect } from '@playwright/test';

test('battery readouts update from fake battery', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => {
        if (m.type() === 'error') errors.push(m.text());
    });

    await page.addInitScript(() => {
        let level = 0.5;
        const listeners: Record<string, Set<() => void>> = {};
        const battery = {
            charging: true,
            chargingTime: 100,
            dischargingTime: Infinity,
            get level() {
                return level;
            },
            set level(v: number) {
                level = v;
            },
            addEventListener(type: string, cb: () => void) {
                if (!listeners[type]) listeners[type] = new Set();
                listeners[type].add(cb);
            },
            removeEventListener(type: string, cb: () => void) {
                listeners[type]?.delete(cb);
            },
        };
        // expose a global to drive updates
        (
            window as unknown as { __battery: typeof battery & { setLevel: (v: number) => void } }
        ).__battery = Object.assign(battery, {
            setLevel(v: number) {
                level = v;
                listeners.levelchange?.forEach(cb => cb());
            },
        });
        Object.defineProperty(navigator, 'getBattery', {
            value: async () => battery,
            configurable: true,
        });
    });

    await page.goto('/test/battery');
    await expect(page.getByText('50%')).toBeVisible();

    await page.evaluate(() =>
        (window as unknown as { __battery: { setLevel: (v: number) => void } }).__battery.setLevel(
            0.75
        )
    );
    await expect(page.getByText('75%')).toBeVisible();

    await page.getByRole('button', { name: 'Pass' }).click();
    await expect(page.locator('[data-testid="status-light-battery"]')).toHaveAttribute(
        'data-status',
        'passed'
    );

    expect(errors).toEqual([]);
});

test('battery unsupported shows state and Skip', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', m => {
        if (m.type() === 'error') errors.push(m.text());
    });

    await page.addInitScript(() => {
        delete (Object.getPrototypeOf(navigator) as { getBattery?: unknown }).getBattery;
        delete (navigator as { getBattery?: unknown }).getBattery;
    });

    await page.goto('/test/battery');
    await expect(page.getByText('Not supported in this browser').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible();

    expect(errors).toEqual([]);
});
