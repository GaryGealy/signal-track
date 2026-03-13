import { test, expect } from '@playwright/test';

const testPassword = 'password123';

async function registerAndGoToDashboard(page: import('@playwright/test').Page) {
	const email = `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
	await page.goto('/login');
	await page.getByRole('button', { name: 'Sign up' }).click();
	await page.getByLabel('Name').fill('Test User');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(testPassword);
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page).toHaveURL('/dashboard');
}

test('weight tab navigates to weight detail page', async ({ page }) => {
	await registerAndGoToDashboard(page);
	await page.getByRole('link', { name: 'Weight' }).click();
	await expect(page).toHaveURL('/dashboard/weight');
	await expect(page.getByRole('heading', { name: 'Weight' })).toBeVisible();
});

test('weight detail shows empty state when no entries', async ({ page }) => {
	await registerAndGoToDashboard(page);
	await page.goto('/dashboard/weight');
	await expect(page.getByText('No entries yet.')).toBeVisible();
});

test('weight detail shows entry after adding one', async ({ page }) => {
	await registerAndGoToDashboard(page);
	// Add from dashboard
	await page.getByRole('button', { name: 'Add Weight entry' }).click();
	await page.getByLabel('Weight').fill('185.5');
	await page.getByRole('button', { name: 'Save entry' }).click();
	// Navigate to detail
	await page.getByRole('link', { name: 'Weight' }).click();
	await expect(page.getByText('185.5')).toBeVisible();
});

test('add button in weight detail header opens add sheet', async ({ page }) => {
	await registerAndGoToDashboard(page);
	await page.goto('/dashboard/weight');
	await page.getByRole('button', { name: 'Add Weight entry' }).click();
	await expect(page.getByRole('heading', { name: 'Weight' })).toBeVisible();
});

test('time range picker updates URL on weight detail', async ({ page }) => {
	await registerAndGoToDashboard(page);
	await page.goto('/dashboard/weight');
	await page.getByRole('link', { name: '7d' }).click();
	await expect(page).toHaveURL('/dashboard/weight?range=7');
	await page.getByRole('link', { name: 'All' }).click();
	await expect(page).toHaveURL('/dashboard/weight?range=all');
});

test('can delete a weight entry from detail page', async ({ page }) => {
	await registerAndGoToDashboard(page);
	// Add entry from detail page header button
	await page.goto('/dashboard/weight');
	await page.getByRole('button', { name: 'Add Weight entry' }).click();
	await page.getByLabel('Weight').fill('190.0');
	await page.getByRole('button', { name: 'Save entry' }).click();
	// Verify it appears
	await expect(page.getByText('190.0')).toBeVisible();
	// Delete it
	await page.getByRole('button', { name: 'Delete entry' }).first().click();
	await expect(page.getByText('190.0')).not.toBeVisible();
});

test('blood pressure detail shows two values in history', async ({ page }) => {
	await registerAndGoToDashboard(page);
	// Add BP entry from dashboard
	await page.getByRole('button', { name: 'Add Blood Pressure entry' }).click();
	await page.getByLabel('Systolic').fill('120');
	await page.getByLabel('Diastolic').fill('80');
	await page.getByRole('button', { name: 'Save entry' }).click();
	// Go to BP detail
	await page.getByRole('link', { name: 'BP' }).click();
	await expect(page).toHaveURL('/dashboard/blood-pressure');
	await expect(page.getByText('120/80')).toBeVisible();
});

test('sleep detail shows duration in history', async ({ page }) => {
	await registerAndGoToDashboard(page);
	// Add sleep entry (default 10pm → 6am = 8h)
	await page.getByRole('button', { name: 'Add Sleep entry' }).click();
	await page.getByRole('button', { name: 'Save entry' }).click();
	// Go to sleep detail
	await page.getByRole('link', { name: 'Sleep' }).click();
	await expect(page).toHaveURL('/dashboard/sleep');
	await expect(page.getByText('8h')).toBeVisible();
});

test('work detail shows duration in history', async ({ page }) => {
	await registerAndGoToDashboard(page);
	await page.goto('/dashboard/work');
	// Add from detail page header
	await page.getByRole('button', { name: 'Add Work entry' }).click();
	await page.getByRole('dialog').getByRole('button', { name: '8h' }).click();
	await page.getByRole('button', { name: 'Save entry' }).click();
	await expect(page.getByText('8h')).toBeVisible();
});

test('all four detail tab links are navigable', async ({ page }) => {
	await registerAndGoToDashboard(page);
	await page.getByRole('link', { name: 'Weight' }).click();
	await expect(page).toHaveURL('/dashboard/weight');
	await page.getByRole('link', { name: 'BP' }).click();
	await expect(page).toHaveURL('/dashboard/blood-pressure');
	await page.getByRole('link', { name: 'Sleep' }).click();
	await expect(page).toHaveURL('/dashboard/sleep');
	await page.getByRole('link', { name: 'Work' }).click();
	await expect(page).toHaveURL('/dashboard/work');
});
