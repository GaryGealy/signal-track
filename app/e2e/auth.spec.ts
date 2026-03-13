import { test, expect } from '@playwright/test';

const testEmail = () => `test-${Date.now()}@example.com`;
const testPassword = 'password123';

test('unauthenticated visit to /dashboard redirects to /login', async ({ page }) => {
	await page.goto('/dashboard');
	await expect(page).toHaveURL('/login');
});

test('login page renders sign in form', async ({ page }) => {
	await page.goto('/login');
	await expect(page.getByRole('heading', { name: 'SignalTrack' })).toBeVisible();
	await expect(page.getByLabel('Email')).toBeVisible();
	await expect(page.getByLabel('Password')).toBeVisible();
});

test('register creates account and redirects to dashboard', async ({ page }) => {
	await page.goto('/login');
	await page.getByRole('button', { name: 'Sign up' }).click();
	await page.getByLabel('Name').fill('Test User');
	await page.getByLabel('Email').fill(testEmail());
	await page.getByLabel('Password').fill(testPassword);
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page).toHaveURL('/dashboard');
});

test('login with valid credentials redirects to dashboard', async ({ page }) => {
	const email = testEmail();
	await page.goto('/login');
	await page.getByRole('button', { name: 'Sign up' }).click();
	await page.getByLabel('Name').fill('Test User');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(testPassword);
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page).toHaveURL('/dashboard');
	await page.context().clearCookies();
	await page.goto('/login');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(testPassword);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL('/dashboard');
});

test('login with wrong password shows error', async ({ page }) => {
	const email = testEmail();
	await page.goto('/login');
	await page.getByRole('button', { name: 'Sign up' }).click();
	await page.getByLabel('Name').fill('Test User');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(testPassword);
	await page.getByRole('button', { name: 'Create account' }).click();
	await page.context().clearCookies();
	await page.goto('/login');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill('wrongpassword');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page.getByText('Invalid email or password')).toBeVisible();
});

test('logout clears session and redirects to login', async ({ page }) => {
	const email = testEmail();
	await page.goto('/login');
	await page.getByRole('button', { name: 'Sign up' }).click();
	await page.getByLabel('Name').fill('Test User');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(testPassword);
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page).toHaveURL('/dashboard');

	await page.getByRole('button', { name: 'Log out' }).click();
	await expect(page).toHaveURL('/login');

	await page.goto('/dashboard');
	await expect(page).toHaveURL('/login');
});
