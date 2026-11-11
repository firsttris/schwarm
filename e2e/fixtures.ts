import { test as base, expect, type Page } from "@playwright/test";

export interface MockOptions {
  auth?: boolean;
  frozen?: boolean;
  now?: number;
}

/** "Now" of the mock: torrents were added relative to it (dates are not asserted). */
export const NOW = Math.floor(Date.now() / 1000);

export async function resetMock(page: Page, options: MockOptions = {}) {
  const res = await page.request.post("/__mock/reset", { data: { frozen: true, now: NOW, ...options } });
  expect(res.ok()).toBeTruthy();
}

// biome-ignore lint/suspicious/noConfusingVoidType: an auto fixture that provides no value
export const test = base.extend<{ mock: void }>({
  mock: [
    async ({ page }, use) => {
      await resetMock(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };

export async function openTorrents(page: Page, hash = "") {
  await page.goto(`./#/torrents${hash}`);
  await expect(page.getByTestId("torrent-row").first()).toBeVisible();
}

export const row = (page: Page, name: string) => page.getByTestId("torrent-row").filter({ hasText: name });
