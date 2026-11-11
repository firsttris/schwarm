import { expect, openTorrents, test } from "./fixtures";

test("renames several files with a pattern and one file by hand", async ({ page }) => {
  await openTorrents(page);
  await page.getByRole("button", { name: "Sintel (2010) 4K Open Movie", exact: true }).click();
  const sheet = page.getByTestId("details-sheet");
  await sheet.getByRole("tab", { name: "Dateien" }).click();
  await sheet.getByRole("button", { name: "Umbenennen …" }).click();
  const dialog = page.getByTestId("rename-files-dialog");
  await dialog.getByLabel("Suchen nach").fill("Sintel\\.(\\w\\w)\\.srt");
  await dialog.getByLabel("Ersetzen durch").fill("Untertitel-$1.srt");
  await dialog.getByLabel("Regulärer Ausdruck").check();
  await expect(dialog.getByTestId("rename-preview")).toContainText("Untertitel-de.srt");
  await expect(dialog.getByText("Vorschau: 3 Änderungen")).toBeVisible();
  await dialog.getByRole("button", { name: "3 umbenennen" }).click();
  await expect(dialog).toBeHidden();
  await expect(sheet.getByText("Untertitel-fr.srt")).toBeVisible();

  await sheet.getByRole("button", { name: "Poster.jpg umbenennen" }).click();
  await page.getByRole("textbox", { name: "Name" }).fill("Plakat.jpg");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(sheet.getByText("Plakat.jpg")).toBeVisible();
});

test("add dialog shows the metadata and lets choose files", async ({ page }) => {
  await openTorrents(page);
  await page.getByRole("button", { name: "Hinzufügen" }).click();
  const dialog = page.getByTestId("add-dialog");
  await dialog
    .getByLabel("Magnet-Link oder URL")
    .fill("magnet:?xt=urn:btih:9c2e6b8f2b4e0f6c3a1d5e7f9a0b1c2d3e4f5a6b&dn=Cosmos+Laundromat");
  await expect(dialog.getByTestId("add-preview")).toContainText("Infos werden geholt");
  await expect(dialog.getByTestId("add-preview")).toContainText("4 Dateien");
  await dialog.getByRole("button", { name: "Dateien wählen" }).click();
  await dialog.getByRole("checkbox", { name: "Extras laden" }).uncheck();
  await expect(dialog.getByTestId("add-preview")).toContainText("3 von 4 Dateien");
  await dialog.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Cosmos Laundromat", exact: true }).click();
  const sheet = page.getByTestId("details-sheet");
  await sheet.getByRole("tab", { name: "Dateien" }).click();
  await expect(sheet.getByText("3 von 4 Dateien")).toBeVisible();
});
