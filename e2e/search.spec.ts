import { expect, resetMock, test } from "./fixtures";

test("searches, filters and sends a result to the add dialog", async ({ page }) => {
  await page.goto("./#/search");
  await expect(page.getByText("Sucht mit 3 eingeschalteten Quellen.")).toBeVisible();
  await page.getByLabel("Suchbegriff").fill("ubuntu");
  await page.getByRole("button", { name: "Suchen" }).click();
  const status = page.getByTestId("search-status");
  await expect(status).toHaveText("8 Ergebnisse");
  const rows = page.getByTestId("search-results").locator("tbody tr");
  await expect(rows).toHaveCount(8);
  // sorted by seeds, most first
  await expect(rows.first()).toContainText("ubuntu-26.04-desktop-amd64.iso");
  // already in the list
  await expect(rows.first()).toContainText("In der Liste");

  await page.getByRole("button", { name: "Mind. Seeds" }).click();
  await page.getByRole("button", { name: "≥ 100" }).click();
  await page.keyboard.press("Escape");
  await expect(rows).toHaveCount(4);
  await expect(status).toContainText("4 angezeigt");

  await page.getByRole("button", { name: "Quellen" }).click();
  await page.getByRole("option", { name: /Archive\.org/ }).click();
  await page.keyboard.press("Escape");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("ubuntu-25.10");

  await rows
    .first()
    .getByRole("button", { name: /laden$/i })
    .click();
  const dialog = page.getByTestId("add-dialog");
  await expect(dialog.getByLabel("Magnet-Link oder URL")).toHaveValue(/dn=ubuntu-25\.10/);
  await dialog.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(dialog).toBeHidden();
  await expect(rows.first()).toContainText("In der Liste");
});

test("keeps the search when coming back, and stops a running search", async ({ page }) => {
  await page.goto("./#/search");
  await page.getByLabel("Suchbegriff").fill("iso");
  await page.getByRole("button", { name: "Suchen" }).click();
  await expect(page.getByTestId("search-status")).toHaveText("8 Ergebnisse");
  await page.locator("[data-sidebar=sidebar]").getByRole("link", { name: "Alle" }).click();
  await page.locator("[data-sidebar=sidebar]").getByRole("link", { name: "Suche" }).click();
  await expect(page.getByTestId("search-status")).toHaveText("8 Ergebnisse");
  await expect(page.getByLabel("Suchbegriff")).toHaveValue("iso");
});

test("explains a missing Python", async ({ page }) => {
  await resetMock(page, { noPython: true });
  await page.goto("./#/search");
  await page.getByLabel("Suchbegriff").fill("ubuntu");
  await page.getByRole("button", { name: "Suchen" }).click();
  await expect(page.getByRole("alert")).toContainText("braucht qBittorrent Python");
});

test("manages search plugins in the settings", async ({ page }) => {
  await page.goto("./#/settings?section=search");
  const list = page.getByTestId("plugin-list");
  await expect(list).toContainText("Public Domain Torrents");
  await page.getByRole("switch", { name: "Public Domain Torrents verwenden" }).click();
  await expect(page.getByRole("switch", { name: "Public Domain Torrents verwenden" })).toBeChecked();
  await page.getByRole("button", { name: "Linuxtracker löschen" }).click();
  await expect(list).not.toContainText("Linuxtracker");
  await page.getByLabel("Plugin hinzufügen").fill("https://example.org/plugins/legittorrents.py");
  await page.getByRole("button", { name: "Hinzufügen", exact: true }).last().click();
  await expect(list).toContainText("legittorrents");

  await page.locator("[data-sidebar=sidebar]").getByRole("link", { name: "Suche" }).click();
  await expect(page.getByText("Sucht mit 4 eingeschalteten Quellen.")).toBeVisible();
});

test("phone: search results as a list @phone", async ({ page }) => {
  await page.goto("./#/search");
  await page.getByLabel("Suchbegriff").fill("ubuntu 26.04");
  await page.getByRole("button", { name: "Suchen" }).click();
  await expect(page.getByTestId("search-status")).toHaveText("7 Ergebnisse");
  await expect(
    page
      .getByTestId("search-results")
      .getByRole("button", { name: /laden$/i })
      .first(),
  ).toBeVisible();
});
