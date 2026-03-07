import { expect, test } from '@playwright/test';
import { utils } from 'src/utils';

test.describe('Auth Flow Integration', () => {
  test.beforeAll(() => {
    utils.initSdk();
  });

  test.beforeEach(async () => {
    await utils.resetDatabase();
  });

  test('full admin registration and login flow', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Getting Started' }).click();

    await expect(page).toHaveTitle(/Admin Registration/);
    await page.getByLabel('Admin Email').fill('admin@immich.app');
    await page.getByLabel('Admin Password', { exact: true }).fill('password');
    await page.getByLabel('Confirm Admin Password').fill('password');
    await page.getByLabel('Name').fill('Immich Admin');
    await page.getByRole('button', { name: 'Sign up' }).click();

    await expect(page).toHaveTitle(/Login/);
    await page.goto('/auth/login?autoLaunch=0');
    await page.getByLabel('Email').fill('admin@immich.app');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL('/auth/onboarding');
    await page.getByRole('button', { name: 'Theme' }).click();
    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('button', { name: 'Server Privacy' }).click();
    await page.getByRole('button', { name: 'User Privacy' }).click();
    await page.getByRole('button', { name: 'Storage Template' }).click();
    await page.getByRole('button', { name: 'Backups' }).click();
    await page.getByRole('button', { name: 'Mobile App' }).click();
    await page.getByRole('button', { name: 'Done' }).click();

    await expect(page).toHaveURL('/photos');
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await utils.adminSetup();
    await page.goto('/auth/login?autoLaunch=0');
    await page.getByLabel('Email').fill('admin@immich.cloud');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Incorrect email or password')).toBeVisible();
  });

  test('logout redirects to login page', async ({ context, page }) => {
    const admin = await utils.adminSetup();
    await utils.setAuthCookies(context, admin.accessToken);

    await page.goto('/photos');
    await page.locator('[data-testid="user-avatar"]').click();
    await page.getByRole('button', { name: 'Sign Out' }).click();

    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('unauthenticated access redirects to login', async ({ page }) => {
    await utils.adminSetup();
    await page.goto('/photos');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
