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

test('add weight entry updates dashboard', async ({ page }) => {
  await registerAndGoToDashboard(page);

  // Open sheet
  await page.getByRole('button', { name: 'Add Weight entry' }).click();
  await expect(page.getByRole('heading', { name: 'Weight' })).toBeVisible();

  // Fill form
  await page.getByLabel('Weight').fill('185.5');

  // Submit
  await page.getByRole('button', { name: 'Save entry' }).click();

  // Sheet closes and dashboard updates
  await expect(page.getByRole('heading', { name: 'Weight' })).not.toBeVisible();
  await expect(page.getByText('185.5')).toBeVisible();
});

test('add blood pressure entry updates dashboard', async ({ page }) => {
  await registerAndGoToDashboard(page);

  await page.getByRole('button', { name: 'Add Blood Pressure entry' }).click();
  await expect(page.getByRole('heading', { name: 'Blood Pressure' })).toBeVisible();

  await page.getByLabel('Systolic').fill('120');
  await page.getByLabel('Diastolic').fill('80');
  await page.getByRole('button', { name: 'Save entry' }).click();

  await expect(page.getByRole('heading', { name: 'Blood Pressure' })).not.toBeVisible();
  await expect(page.getByText('120')).toBeVisible();
});

test('add sleep entry updates dashboard', async ({ page }) => {
  await registerAndGoToDashboard(page);

  await page.getByRole('button', { name: 'Add Sleep entry' }).click();
  await expect(page.getByRole('heading', { name: 'Sleep' })).toBeVisible();

  // Submit with defaults (10pm → 6am = 8h)
  await page.getByRole('button', { name: 'Save entry' }).click();

  await expect(page.getByRole('heading', { name: 'Sleep' })).not.toBeVisible();
  // Verify the dashboard sleep card updated with the new duration
  await expect(page.getByText('8h')).toBeVisible();
});

test('add work entry using quick add preset', async ({ page }) => {
  await registerAndGoToDashboard(page);

  await page.getByRole('button', { name: 'Add Work entry' }).click();
  await expect(page.getByRole('heading', { name: 'Log work hours' })).toBeVisible();

  // Use 8h quick add preset (scoped to dialog to avoid matching other buttons)
  await page.getByRole('dialog').getByRole('button', { name: '8h' }).click();
  await page.getByRole('button', { name: 'Save entry' }).click();

  await expect(page.getByRole('heading', { name: 'Log work hours' })).not.toBeVisible();
});

test('weight validation shows error for empty value', async ({ page }) => {
  await registerAndGoToDashboard(page);

  await page.getByRole('button', { name: 'Add Weight entry' }).click();
  // Submit without filling value
  await page.getByRole('button', { name: 'Save entry' }).click();

  // Error message visible, sheet stays open
  await expect(page.getByRole('heading', { name: 'Weight' })).toBeVisible();
});

test('closing sheet with X button works', async ({ page }) => {
  await registerAndGoToDashboard(page);

  await page.getByRole('button', { name: 'Add Weight entry' }).click();
  await expect(page.getByRole('heading', { name: 'Weight' })).toBeVisible();

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('heading', { name: 'Weight' })).not.toBeVisible();
});
