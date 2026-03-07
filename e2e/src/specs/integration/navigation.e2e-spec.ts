import { LoginResponseDto } from '@immich/sdk';
import { expect, test } from '@playwright/test';
import { utils } from 'src/utils';

test.describe('Navigation Integration', () => {
  let admin: LoginResponseDto;

  test.beforeAll(async () => {
    utils.initSdk();
    await utils.resetDatabase();
    admin = await utils.adminSetup();
  });

  test('sidebar navigation links work correctly', async ({ context, page }) => {
    await utils.setAuthCookies(context, admin.accessToken);
    await page.goto('/photos');

    // Navigate to albums
    await page.getByRole('link', { name: 'Albums', exact: true }).click();
    await expect(page).toHaveURL('/albums');

    // Navigate to explore
    await page.getByRole('link', { name: 'Explore' }).click();
    await expect(page).toHaveURL('/explore');

    // Navigate back to photos
    await page.getByRole('link', { name: 'Photos' }).click();
    await expect(page).toHaveURL('/photos');
  });

  test('admin can access admin settings', async ({ context, page }) => {
    await utils.setAuthCookies(context, admin.accessToken);
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin/);
  });

  test('server info is accessible from admin page', async ({ context, page }) => {
    await utils.setAuthCookies(context, admin.accessToken);
    await page.goto('/admin/server-status');

    await expect(page).toHaveURL(/\/admin\/server-status/);
  });
});
