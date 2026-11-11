import { expect, openTorrents, resetMock, test } from "./fixtures";

test("asks for a login only when qBittorrent answers 403", async ({ page }) => {
  await resetMock(page, { auth: true });
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();
  await page.getByLabel("Benutzername").fill("admin");
  await page.getByLabel("Passwort").fill("falsch");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("alert")).toHaveText("Benutzername oder Passwort stimmen nicht.");
  await page.getByLabel("Passwort").fill("adminadmin");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByTestId("torrent-row")).toHaveCount(10);
});

test("switches between light, dark and system", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openTorrents(page);
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/dark/);
  await page.getByTestId("app-menu").click();
  await page.getByRole("menuitemradio", { name: "Dunkel" }).click();
  await expect(html).toHaveClass(/dark/);
  await page.reload();
  await expect(html).toHaveClass(/dark/);
  await page.getByTestId("app-menu").click();
  await page.getByRole("menuitemradio", { name: "Wie das System" }).click();
  await expect(html).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(html).toHaveClass(/dark/);
});

test("settings keep density and columns in the browser", async ({ page }) => {
  await openTorrents(page);
  await page.locator("[data-sidebar=sidebar]").getByRole("link", { name: "Einstellungen" }).click();
  await expect(page.getByRole("heading", { name: "Oberfläche" })).toBeVisible();
  await page.getByLabel("Kompakt").check();
  await page.getByLabel("Ratio").uncheck();
  await page.locator("[data-sidebar=sidebar]").getByRole("link", { name: "Alle" }).click();
  await expect(page.getByRole("columnheader", { name: "Ratio" })).toHaveCount(0);
  await expect(page.getByTestId("torrent-row").first()).toHaveCSS("height", "40px");
});

test("serves the build like qBittorrent: hash routes, no SPA fallback", async ({ page, request }) => {
  expect((await request.get("./torrents")).status()).toBe(404);
  await page.goto("./#/torrents?status=seeding");
  await expect(page.getByTestId("torrent-row")).toHaveCount(4);
});
