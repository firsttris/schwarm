import { readFile } from "node:fs/promises";
import { expect, test } from "./fixtures";

test("feeds: read an article, download it, add and rename a feed", async ({ page }) => {
  await page.goto("./#/rss");
  const feeds = page.getByTestId("feed-list");
  await expect(feeds.getByRole("button", { name: /Alle Artikel\s*14/ })).toBeVisible();
  await expect(page.locator("[data-sidebar=sidebar]").getByRole("listitem").filter({ hasText: "RSS" })).toContainText(
    "14",
  );

  await feeds.getByRole("button", { name: /^Ubuntu Releases/ }).click();
  const articles = page.getByTestId("article-list");
  await expect(articles.getByRole("button")).toHaveCount(3);
  await articles.getByRole("button", { name: /Ubuntu 26.04.1 LTS Desktop/ }).click();
  const view = page.getByTestId("article-view");
  await expect(view).toContainText("Erstes Point-Release");
  await expect(feeds.getByRole("button", { name: /^Ubuntu Releases\s*1/ })).toBeVisible();

  await view.getByRole("button", { name: "Laden" }).click();
  await expect(page.getByTestId("add-dialog").getByLabel("Magnet-Link oder URL")).toHaveValue(/dn=Ubuntu%2026\.04\.1/);
  await page.keyboard.press("Escape");

  await feeds.getByRole("button", { name: "Feed", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Feed hinzufügen" });
  await dialog.getByLabel("Adresse").fill("https://feeds.example.org/debian.xml");
  await dialog.getByLabel("Name").fill("Debian News");
  await dialog.getByLabel("Ordner").click();
  await page.getByRole("option", { name: "Linux" }).click();
  await dialog.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(feeds.getByRole("button", { name: "Debian News", exact: true })).toBeVisible();

  await feeds.getByRole("button", { name: "Aktionen für Debian News" }).click();
  await page.getByRole("menuitem", { name: "Umbenennen …" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Debian");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(feeds.getByRole("button", { name: "Debian", exact: true })).toBeVisible();

  await feeds.getByRole("button", { name: /^Alle Artikel/ }).click();
  await page.getByRole("button", { name: "Alle gelesen" }).click();
  await expect(feeds.getByRole("button", { name: /^Alle Artikel$/ })).toBeVisible();
});

test("rules: live preview, save, toggle, delete", async ({ page }) => {
  await page.goto("./#/rss?view=rules&rule=Ubuntu%20LTS");
  const editor = page.getByTestId("rule-editor");
  await expect(editor.getByLabel("Titel enthält", { exact: true })).toHaveValue("ubuntu 26.04 desktop amd64");
  const preview = page.getByTestId("rule-preview");
  // qBittorrent checks "enthält" before "enthält nicht": the arm64 image lacks "amd64" first
  await expect(preview).toContainText("fehlt: „amd64“");
  await expect(preview).toContainText("fehlt: „desktop“");
  await expect(page.getByTestId("rule-server-count")).toContainText("3 passende Artikel");
  await editor.getByLabel("Titel enthält", { exact: true }).fill("ubuntu desktop");
  await expect(preview).toContainText("ausgeschlossen: „arm64“");

  // the preview follows the input before saving
  await editor.getByLabel("Titel enthält", { exact: true }).fill("ubuntu server");
  await expect(preview.getByText("Ubuntu 26.04.1 LTS Server (amd64)").locator("..")).toContainText("Ubuntu Releases");
  await expect(preview).toContainText("fehlt: „server“");
  await editor.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByTestId("rule-server-count")).toContainText("1 passenden Artikel");

  const list = page.getByTestId("rule-list");
  await list.getByRole("switch", { name: "Fedora Workstation aktiv" }).click();
  await expect(list.getByRole("switch", { name: "Fedora Workstation aktiv" })).toBeChecked();

  await editor.getByRole("button", { name: "Ubuntu LTS löschen" }).click();
  await expect(list).not.toContainText("Ubuntu LTS");
});

test("rules: from an article, export and import", async ({ page }) => {
  await page.goto("./#/rss");
  await page
    .getByTestId("article-list")
    .getByRole("button", { name: /Sprite Fright/ })
    .click();
  await page.getByRole("link", { name: "Regel daraus machen" }).click();
  const editor = page.getByTestId("rule-editor");
  await expect(editor.getByLabel("Name")).toHaveValue("Sprite Fright 2021 4K");
  await expect(editor.getByRole("button", { name: "Blender Open Movies" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("rule-preview")).toContainText("Sprite Fright");
  await editor.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByTestId("rule-list")).toContainText("Sprite Fright 2021 4K");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportieren" }).click();
  const file = await (await download).path();
  const exported = JSON.parse(await readFile(file, "utf8"));
  expect(Object.keys(exported)).toContain("Sprite Fright 2021 4K");

  await page.getByTestId("rules-import").setInputFiles({
    name: "rules.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ "Neu importiert": { mustContain: "linux", affectedFeeds: [] } })),
  });
  await expect(page.getByTestId("rule-list")).toContainText("Neu importiert");
});

test("phone: feeds as a list, article full width @phone", async ({ page }) => {
  await page.goto("./#/rss");
  await page
    .getByTestId("article-list")
    .getByRole("button", { name: /Night of the Living Dead/ })
    .click();
  await expect(page.getByTestId("article-view")).toContainText("Public-Domain-Klassiker");
  await page.getByRole("button", { name: "Zurück" }).click();
  await expect(page.getByTestId("article-list")).toBeVisible();
});
