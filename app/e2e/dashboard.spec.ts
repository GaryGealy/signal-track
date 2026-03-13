import { test, expect } from '@playwright/test';
import { registerAndGoToDashboard } from './helpers';

test('root redirects to dashboard', async ({ page }) => {
	await registerAndGoToDashboard(page);
	await page.goto('/');
	await expect(page).toHaveURL('/dashboard');
});

test('dashboard shows page title', async ({ page }) => {
	await registerAndGoToDashboard(page);
	await expect(page.getByText('Your signals')).toBeVisible();
});

test('dashboard shows all 4 metric cards', async ({ page }) => {
	await registerAndGoToDashboard(page);
	await expect(page.getByRole('button', { name: 'Add Weight entry' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Add Blood Pressure entry' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Add Sleep entry' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Add Work entry' })).toBeVisible();
});

test('dashboard shows bottom tab bar', async ({ page }) => {
	await registerAndGoToDashboard(page);
	await expect(page.getByRole('navigation')).toBeVisible();
});
