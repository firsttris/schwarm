import { expect, openTorrents, row, serverTorrent, serverTorrents, test } from "./fixtures";

test("limits dialog sets speed and share limits", async ({ page }) => {
  await openTorrents(page);
  await row(page, "debian").click({ button: "right", delay: 50 });
  await page.getByRole("menuitem", { name: "Limits …" }).click();
  const dialog = page.getByRole("dialog", { name: "Limits" });
  await dialog.getByLabel("Download").fill("2,5");
  await dialog.getByLabel("Eigene Grenze").check();
  await dialog.getByRole("textbox", { name: "Bis Ratio" }).fill("1,5");
  await dialog.getByLabel("Danach").click();
  await page.getByRole("option", { name: "Stoppen" }).click();
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Limits gespeichert")).toBeVisible();
  const t = await serverTorrent(page, "debian");
  expect(t.dl_limit).toBe(2_500_000);
  expect(t.ratio_limit).toBe(1.5);
  expect(t.share_limit_action).toBe("Stop");

  // opens again with the saved values
  await row(page, "debian").click({ button: "right", delay: 50 });
  await page.getByRole("menuitem", { name: "Limits …" }).click();
  await expect(dialog.getByLabel("Download")).toHaveValue("2,5");
  await expect(dialog.getByRole("textbox", { name: "Bis Ratio" })).toHaveValue("1.5");
});

test("speed menu switches the slow mode and edits the limits", async ({ page }) => {
  await openTorrents(page);
  await page.getByTestId("global-speeds").click();
  await expect(page.getByRole("menu")).toContainText("unbegrenzt / 5 MB/s");
  await expect(page.getByRole("menu")).toContainText("Mo–Fr 08:00–18:00");
  await page.getByRole("menuitem", { name: /Langsamer Modus/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("global-speeds")).toContainText("Langsam");
  await expect(page.getByRole("menu")).toHaveCount(0);

  await page.getByTestId("global-speeds").click();
  await page.getByRole("menuitem", { name: "Limits bearbeiten …" }).click();
  const dialog = page.getByRole("dialog", { name: "Tempo-Limits" });
  await dialog.getByRole("group", { name: "Normal" }).getByLabel("Upload").fill("");
  await dialog.getByRole("group", { name: "Langsamer Modus" }).getByLabel("Download").fill("4");
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(dialog).toBeHidden();
  await page.getByTestId("global-speeds").click();
  await expect(page.getByRole("menu")).toContainText("unbegrenzt / unbegrenzt");
  await expect(page.getByRole("menu")).toContainText("4 MB/s / 2 MB/s");
});

test("categories and tags: create, edit, delete, remove unused", async ({ page }) => {
  await openTorrents(page);
  await page.getByRole("button", { name: "Kategorien verwalten" }).click();
  const dialog = page.getByTestId("manage-dialog");
  await dialog.getByRole("button", { name: "Kategorie", exact: true }).click();
  await dialog.getByLabel("Name").fill("Serien");
  await dialog.getByLabel("Speichern in").fill("/downloads/serien");
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(dialog.getByTestId("category-list")).toContainText("/downloads/serien");
  await expect(dialog.getByTestId("category-list")).toContainText("unbenutzt");

  // subcategory of Filme
  await dialog.getByRole("button", { name: "Filme /downloads/filme" }).click();
  await dialog.getByRole("button", { name: "Unterkategorie" }).click();
  await expect(dialog.getByLabel("Name")).toHaveValue("Filme/");
  await dialog.getByLabel("Name").fill("Filme/4K");
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(dialog.getByTestId("category-list")).toContainText("Filme/4K");

  await dialog.getByRole("button", { name: "Linux bearbeiten" }).click();
  await expect(dialog.getByLabel("Name")).toBeDisabled();
  await dialog.getByLabel("Speichern in").fill("/data/linux");
  await dialog.getByRole("button", { name: "Speichern" }).click();
  await expect(dialog.getByTestId("category-list")).toContainText("/data/linux");

  await dialog.getByRole("button", { name: "Unbenutzte entfernen" }).click();
  await expect(dialog.getByTestId("category-list")).not.toContainText("Serien");
  await expect(dialog.getByTestId("category-list")).not.toContainText("Filme/4K");

  await dialog.getByRole("tab", { name: "Tags" }).click();
  await dialog.getByLabel("Neuer Tag").fill("Neu, Später");
  await dialog.getByRole("button", { name: "Tag", exact: true }).click();
  await expect(dialog.getByTestId("tag-list")).toContainText("Später");
  await dialog.getByRole("button", { name: "Archiv löschen" }).click();
  await expect(dialog.getByTestId("tag-list")).not.toContainText("Archiv");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-sidebar=sidebar]").getByRole("link", { name: "Später" })).toBeVisible();
});

test("app menu stops and starts all torrents and pauses the session", async ({ page }) => {
  await openTorrents(page);
  await page.getByTestId("app-menu").click();
  await page.getByRole("menuitem", { name: "Alle stoppen" }).click();
  await expect(page.getByTestId("summary")).toHaveText("10 gestoppt.");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.getByTestId("app-menu").click();
  await page.getByRole("menuitem", { name: "Alles anhalten" }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.getByTestId("app-menu").click();
  await expect(page.getByRole("menuitem", { name: "Weitermachen" })).toBeVisible();
});

test("drags a torrent up in the queue while sorted by queue", async ({ page }) => {
  await openTorrents(page);
  await page.getByRole("button", { name: "Ansicht" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Warteschlange" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Nach Warteschlange sortieren" }).click();
  const before = await serverTorrent(page, "enwiki");
  await row(page, "enwiki").dragTo(row(page, "ubuntu"));
  await expect.poll(async () => (await serverTorrent(page, "enwiki")).priority).toBe(1);
  expect(before.priority).toBeGreaterThan(1);
  const order = Object.values(await serverTorrents(page))
    .filter((t) => Number(t.priority) > 0)
    .sort((a, b) => Number(a.priority) - Number(b.priority))
    .map((t) => String(t.name).slice(0, 6));
  expect(order[0]).toBe("enwiki");
  expect(order[1]).toBe("ubuntu");
});
