import { test, expect } from '@playwright/test';

const testPassword = 'password123';

async function loginAndGoToDashboard(page: import('@playwright/test').Page) {
	const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
	await page.goto('/login');
	await page.getByRole('button', { name: 'Sign up' }).click();
	await page.getByLabel('Name').fill('Test User');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(testPassword);
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page).toHaveURL('/dashboard');
}

test('root redirects to dashboard', async ({ page }) => {
	await loginAndGoToDashboard(page);
	await page.goto('/');
	await expect(page).toHaveURL('/dashboard');
});

test('dashboard shows page title', async ({ page }) => {
	await loginAndGoToDashboard(page);
	await expect(page.getByText('Your signals')).toBeVisible();
});

test('dashboard shows all 4 metric cards', async ({ page }) => {
	await loginAndGoToDashboard(page);
	await expect(page.getByRole('link', { name: 'Add Weight entry' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Add Blood Pressure entry' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Add Sleep entry' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Add Work entry' })).toBeVisible();
});

test('dashboard shows bottom tab bar', async ({ page }) => {
	await loginAndGoToDashboard(page);
	await expect(page.getByRole('navigation')).toBeVisible();
});
