import { LoginResponseDto } from '@immich/sdk';
import { expect, test } from '@playwright/test';
import type { Socket } from 'socket.io-client';
import { utils } from 'src/utils';

test.describe('Search Integration', () => {
  let admin: LoginResponseDto;
  let websocket: Socket;

  test.beforeAll(async () => {
    utils.initSdk();
    await utils.resetDatabase();
    admin = await utils.adminSetup();
    websocket = await utils.connectWebsocket(admin.accessToken);
  });

  test.afterAll(() => {
    utils.disconnectWebsocket(websocket);
  });

  test('search page loads and shows search bar', async ({ context, page }) => {
    await utils.setAuthCookies(context, admin.accessToken);
    await page.goto('/search');

    await expect(page.getByPlaceholder('Search')).toBeVisible();
  });

  test('search with no results shows empty state', async ({ context, page }) => {
    await utils.setAuthCookies(context, admin.accessToken);
    await page.goto('/search');

    await page.getByPlaceholder('Search').fill('nonexistent-query-xyz');
    await page.getByPlaceholder('Search').press('Enter');

    await expect(page.getByText(/No results/i)).toBeVisible();
  });

  test('explore page loads with categories', async ({ context, page }) => {
    await utils.setAuthCookies(context, admin.accessToken);
    await page.goto('/explore');

    await expect(page).toHaveURL('/explore');
  });
});
