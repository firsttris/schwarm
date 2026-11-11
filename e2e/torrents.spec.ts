import { expect, openTorrents, row, test } from "./fixtures";

test("shows the torrents of the mock with summary, counts and footer", async ({ page }) => {
  await openTorrents(page);
  await expect(page.getByTestId("torrent-row")).toHaveCount(10);
  await expect(page.getByTestId("summary")).toHaveText("3 laden, 4 seeden, 2 gestoppt, 1 mit Fehler.");
  await expect(page.getByTestId("row-count")).toHaveText("0 von 10 Zeilen ausgewählt.");
  const sidebar = page.locator("[data-sidebar=sidebar]");
  await expect(sidebar.getByRole("link", { name: "Lädt" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Filme" })).toBeVisible();
  await expect(page.getByTestId("connection-card")).toContainText("193.29.106.24");
  await expect(page.getByTestId("global-speeds")).toContainText("38,4 MB/s");
  await expect(row(page, "ubuntu-26.04")).toContainText("73 %");
  await expect(row(page, "0 A.D.")).toContainText("Fehler");
});

test("filters by status, category and text", async ({ page }) => {
  await openTorrents(page);
  const sidebar = page.locator("[data-sidebar=sidebar]");
  await sidebar.getByRole("link", { name: "Lädt" }).click();
  await expect(page.getByTestId("torrent-row")).toHaveCount(3);
  await expect(page).toHaveURL(/status=downloading/);
  await sidebar.getByRole("link", { name: "Alle" }).click();
  await sidebar.getByRole("link", { name: "Filme" }).click();
  await expect(page.getByTestId("torrent-row")).toHaveCount(3);
  await sidebar.getByRole("link", { name: "Filme" }).click();
  await expect(page.getByTestId("torrent-row")).toHaveCount(10);

  await page.getByTestId("torrent-filter").fill("cinnamon iso");
  await expect(page.getByTestId("torrent-row")).toHaveCount(1);
  await expect(row(page, "linuxmint")).toBeVisible();
  await page.getByRole("button", { name: "Zurücksetzen" }).click();
  await expect(page.getByTestId("torrent-row")).toHaveCount(10);

  // faceted filter
  await page.getByRole("button", { name: "Status", exact: true }).click();
  await page.getByRole("option", { name: /Gestoppt/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("torrent-row")).toHaveCount(2);
});

test("filters with a regular expression on the save path", async ({ page }) => {
  await openTorrents(page);
  await page.getByRole("button", { name: "Filteroptionen" }).click();
  await page.getByRole("menuitemradio", { name: "Speicherort" }).click();
  await page.getByRole("button", { name: "Filteroptionen" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Regulärer Ausdruck" }).click();
  await page.keyboard.press("Escape");
  await page.getByTestId("torrent-filter").fill("/(filme|spiele)$");
  await expect(page.getByTestId("torrent-row")).toHaveCount(4);
});

test("sorts by name and keeps columns from the view menu", async ({ page }) => {
  await openTorrents(page);
  await page.getByRole("button", { name: "Nach Name sortieren" }).click();
  await expect(page.getByTestId("torrent-row").first()).toContainText("0 A.D.");
  await page.getByRole("button", { name: "Ansicht" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Größe" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("columnheader", { name: "Größe" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("columnheader", { name: "Größe" })).toBeVisible();
});

test("selects rows and stops them from the toolbar", async ({ page }) => {
  await openTorrents(page);
  await row(page, "Sintel").getByRole("checkbox").click();
  await row(page, "Fedora").getByRole("checkbox").click();
  await expect(page.getByTestId("selection-count")).toHaveText("2 ausgewählt");
  await expect(page.getByTestId("row-count")).toHaveText("2 von 10 Zeilen ausgewählt.");
  await page.getByRole("button", { name: "Stoppen" }).click();
  await expect(row(page, "Sintel")).toContainText("Gestoppt");
  await expect(row(page, "Fedora")).toContainText("Gestoppt");
  await expect(page.getByTestId("summary")).toHaveText("1 lädt, 4 seeden, 4 gestoppt, 1 mit Fehler.");
});

test("keyboard: select all, space toggles, delete asks", async ({ page }) => {
  await openTorrents(page);
  await row(page, "linuxmint").click();
  await page.keyboard.press(" ");
  await expect(row(page, "linuxmint")).toContainText(/Stockt|Lädt/);
  await page.getByTestId("torrent-table").focus();
  await page.keyboard.press("Control+a");
  await expect(page.getByTestId("row-count")).toHaveText("10 von 10 Zeilen ausgewählt.");
  await page.keyboard.press("Delete");
  await expect(page.getByRole("dialog", { name: "10 Torrents entfernen?" })).toBeVisible();
  await page.getByRole("button", { name: "Abbrechen" }).click();
});

test("context menu sets the category and removes a torrent", async ({ page }) => {
  await openTorrents(page);
  await row(page, "Tears of Steel").click({ button: "right", delay: 50 });
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem", { name: /^Starten/ })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: ".torrent exportieren" })).toBeVisible();
  await menu.getByRole("menuitem", { name: "Kategorie" }).hover();
  await page.getByRole("menuitemradio", { name: "Daten" }).click();
  await expect(row(page, "Tears of Steel")).toContainText("Daten");

  await row(page, "Tears of Steel").click({ button: "right", delay: 50 });
  await page.getByRole("menuitem", { name: /Entfernen/ }).click();
  const dialog = page.getByRole("dialog", { name: "Torrent entfernen?" });
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Entfernen" }).click();
  await expect(row(page, "Tears of Steel")).toHaveCount(0);
  await expect(page.getByTestId("torrent-row")).toHaveCount(9);
});

test("row menu toggles an advanced option and tags", async ({ page }) => {
  await openTorrents(page);
  await page.getByRole("button", { name: "Aktionen für debian-13.2.0-amd64-DVD-1.iso" }).click();
  await page.getByRole("menuitem", { name: "Tags" }).hover();
  await page.getByRole("menuitemcheckbox", { name: "behalten" }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.locator("[data-sidebar=sidebar]").getByRole("link", { name: "behalten" }).click();
  await expect(row(page, "debian")).toBeVisible();
  await expect(page.getByTestId("torrent-row")).toHaveCount(3);
});
