import { devices, type Page } from "@playwright/test";
import { expect, openTorrents, resetMock, row, test } from "./fixtures";

/**
 * The pictures for the README and the pull requests (docs/screenshots/): desktop and phone,
 * light and dark. Run with `bun run screenshots`.
 */
const dir = "docs/screenshots";
const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const { defaultBrowserType: _, ...phone } = devices["Pixel 7"];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`desktop ${scheme}`, () => {
    test.use({ ...desktop, colorScheme: scheme });

    test(`list ${scheme}`, async ({ page }) => {
      await openTorrents(page);
      await row(page, "Sintel").getByRole("checkbox").click();
      await row(page, "Fedora").getByRole("checkbox").click();
      await shot(page, `desktop-list-${scheme}`);
    });

    test(`context menu ${scheme}`, async ({ page }) => {
      await openTorrents(page);
      await row(page, "Sintel").getByRole("checkbox").click();
      await row(page, "Fedora").getByRole("checkbox").click();
      await row(page, "Fedora").click({ button: "right", delay: 50 });
      await page.getByRole("menuitem", { name: "Erweitert" }).hover();
      await expect(page.getByRole("menuitemcheckbox", { name: "Super-Seeding" })).toBeVisible();
      await shot(page, `desktop-menu-${scheme}`);
    });

    test(`details ${scheme}`, async ({ page }) => {
      // let the transfer run a few seconds so the speed chart has a curve
      await resetMock(page, { frozen: false });
      await openTorrents(page);
      await page.getByRole("button", { name: "ubuntu-26.04-desktop-amd64.iso", exact: true }).click();
      await page.waitForTimeout(9000);
      await shot(page, `desktop-details-${scheme}`);
      await page.getByTestId("details-sheet").getByRole("tab", { name: "Dateien" }).click();
      await page.goto(`./#/torrents?torrent=${await sintelHash(page)}&tab=files`);
      await expect(page.getByText("Sintel.2010.4K.mkv")).toBeVisible();
      await shot(page, `desktop-files-${scheme}`);
      await page.getByTestId("details-sheet").getByRole("tab", { name: "Tracker" }).click();
      await expect(page.getByTestId("tracker-card").first()).toBeVisible();
      await shot(page, `desktop-trackers-${scheme}`);
    });

    test(`add dialog ${scheme}`, async ({ page }) => {
      await openTorrents(page);
      await page.getByRole("button", { name: "Hinzufügen" }).click();
      const dialog = page.getByTestId("add-dialog");
      await dialog
        .getByLabel("Magnet-Link oder URL")
        .fill("magnet:?xt=urn:btih:3b245504cf5f11bbdbe1201cea6a6bf45aee1bc0&dn=ubuntu-26.04-desktop-amd64.iso");
      await dialog.getByLabel("Kategorie").click();
      await page.getByRole("option", { name: "Linux" }).click();
      await shot(page, `desktop-add-${scheme}`);
    });
  });

  test.describe(`phone ${scheme}`, () => {
    test.use({ ...phone, colorScheme: scheme });

    test(`phone list ${scheme}`, async ({ page }) => {
      await page.goto("./#/torrents");
      await expect(page.getByTestId("phone-row").first()).toBeVisible();
      await shot(page, `phone-list-${scheme}`);
    });

    test(`phone details ${scheme}`, async ({ page }) => {
      await page.goto("./#/torrents");
      await page.getByTestId("phone-row").filter({ hasText: "ubuntu" }).click();
      await expect(page.getByRole("tab", { name: "Übersicht" })).toBeVisible();
      await shot(page, `phone-details-${scheme}`);
    });
  });
}

async function sintelHash(page: Page): Promise<string> {
  const res = await page.request.get("./api/v2/sync/maindata?rid=0");
  const data = await res.json();
  return Object.entries(data.torrents as Record<string, { name: string }>).find(([, t]) =>
    t.name.startsWith("Sintel"),
  )![0];
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/${name}.png`, animations: "disabled" });
}
