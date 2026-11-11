import { test as base, expect, type Page } from "@playwright/test";

export interface MockOptions {
  auth?: boolean;
  frozen?: boolean;
  now?: number;
  noPython?: boolean;
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

/** The torrents as the mock qBittorrent has them now (a fresh full maindata). */
export async function serverTorrents(page: Page): Promise<Record<string, Record<string, unknown>>> {
  const res = await page.request.get("./api/v2/sync/maindata?rid=0");
  const data = (await res.json()) as { torrents: Record<string, Record<string, unknown>> };
  return data.torrents;
}

export async function serverTorrent(page: Page, name: string): Promise<Record<string, unknown>> {
  const all = await serverTorrents(page);
  const found = Object.entries(all).find(([, t]) => String(t.name).startsWith(name));
  if (!found) throw new Error(`no torrent ${name}`);
  return { hash: found[0], ...found[1] };
}
