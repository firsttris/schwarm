import { expect, test } from "./fixtures";

test("phone: list, status tabs and full-screen details @phone", async ({ page }) => {
  await page.goto("./#/torrents");
  const rows = page.getByTestId("phone-row");
  await expect(rows).toHaveCount(10);
  await page.getByRole("tab", { name: /Seedet 4/ }).click();
  await expect(rows).toHaveCount(4);
  await page.getByRole("tab", { name: "Alle" }).click();
  await rows.filter({ hasText: "ubuntu" }).click();
  const details = page.getByRole("dialog", { name: "ubuntu-26.04-desktop-amd64.iso" });
  await expect(details.getByText("73 %")).toBeVisible();
  await expect(details.getByRole("tab", { name: "Übersicht" })).toBeVisible();
  await details.getByRole("button", { name: "Zurück" }).click();
  await expect(details).toBeHidden();
});

test("phone: bottom navigation and touch targets @phone", async ({ page }) => {
  await page.goto("./#/torrents");
  const nav = page.getByRole("navigation", { name: "Hauptmenü" });
  for (const link of await nav.getByRole("link").all()) {
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await nav.getByRole("link", { name: "Einstellungen" }).click();
  await expect(page.getByRole("heading", { name: "Oberfläche" })).toBeVisible();
});

test("phone: long press opens the actions @phone", async ({ page }) => {
  await page.goto("./#/torrents");
  const item = page.getByTestId("phone-row").filter({ hasText: "debian" });
  await item.dispatchEvent("contextmenu");
  await expect(page.getByRole("menuitem", { name: "Stoppen" })).toBeVisible();
});
