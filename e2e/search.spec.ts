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

  await page.getByRole("button", { name: "Quellen", exact: true }).click();
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

test("searches only the chosen sources, and remembers them", async ({ page }) => {
  await page.goto("./#/search");
  await page.getByLabel("Suchbegriff").fill("ubuntu");
  const category = page.getByRole("combobox", { name: "Kategorie" });
  await category.click();
  await page.getByRole("option", { name: "Movies" }).click();
  await page.getByRole("button", { name: "Suchen" }).click();
  await expect(page.getByTestId("search-status")).toHaveText("0 Ergebnisse");

  const picker = page.getByRole("button", { name: "Quellen für die Suche" });
  await expect(picker).toHaveText("Alle Quellen");
  await picker.click();
  await page.getByRole("option", { name: "Linuxtracker" }).click();
  await expect(picker).toHaveText("Linuxtracker");
  // the search runs again once the list closes; Linuxtracker has no movies, so all categories
  await page.keyboard.press("Escape");
  await expect(category).toHaveText("Alle Kategorien");
  const engines = page.getByTestId("search-results").locator("tbody tr td:nth-child(5)");
  await expect(engines.first()).toBeVisible();
  for (const engine of await engines.allTextContents()) expect(engine).toBe("Linuxtracker");

  // only the categories Linuxtracker knows
  await category.click();
  await expect(page.getByRole("option", { name: "Software" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Movies" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.reload();
  await expect(page.getByRole("button", { name: "Quellen für die Suche" })).toHaveText("Linuxtracker");
  await expect(page.getByText("Sucht in 1 von 3 eingeschalteten Quellen.")).toBeVisible();

  await page.getByRole("button", { name: "Quellen für die Suche" }).click();
  await page.getByRole("option", { name: "Alle Quellen" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Sucht mit 3 eingeschalteten Quellen.")).toBeVisible();
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
