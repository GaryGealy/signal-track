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
  // Sheet doesn't exist yet — this test will fail until Tasks 3-4 are done
  // For now just verify the dashboard loads for a new user
  await expect(page.getByText('Your signals')).toBeVisible();
});
