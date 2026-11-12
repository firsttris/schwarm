import { expect, openTorrents, test } from "./fixtures";

test("installable: manifest with relative start and icons", async ({ page }) => {
  await openTorrents(page);
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBe("./manifest.json");
  const manifest = await (await page.request.get(`./${href}`)).json();
  expect(manifest).toMatchObject({ name: "Schwarm", start_url: "./", scope: "./", display: "standalone" });
  for (const icon of manifest.icons) {
    expect((await page.request.get(`./${icon.src}`)).status()).toBe(200);
  }
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);
});

test("the app shell starts without qBittorrent once it was opened", async ({ page, context }) => {
  // localhost is a secure context, so the service worker registers here
  await openTorrents(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect(page.getByTestId("torrent-row").first()).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  // the shell is there; the data needs qBittorrent
  await expect(page.locator("[data-sidebar=sidebar]").getByText("Schwarm")).toBeVisible();
  await expect(page.getByTestId("torrent-row")).toHaveCount(0);
  await context.setOffline(false);
});

test("the service worker never answers the API from its cache", async ({ page }) => {
  await openTorrents(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const key of await caches.keys()) {
      for (const request of await (await caches.open(key)).keys()) urls.push(request.url);
    }
    return urls;
  });
  expect(cached.length).toBeGreaterThan(5);
  expect(cached.filter((u) => u.includes("/api/"))).toEqual([]);
});
