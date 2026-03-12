import { test, expect } from '@playwright/test';

test('root redirects to dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/dashboard');
});

test('dashboard shows page title', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Your signals')).toBeVisible();
});

test('dashboard shows all 4 metric cards', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Weight')).toBeVisible();
  await expect(page.getByText('Blood Pressure')).toBeVisible();
  await expect(page.getByText('Sleep')).toBeVisible();
  await expect(page.getByText('Work')).toBeVisible();
});

test('dashboard shows bottom tab bar', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('navigation')).toBeVisible();
});
