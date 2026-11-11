import { expect, openTorrents, test } from "./fixtures";

const magnet = "magnet:?xt=urn:btih:9c2e6b8f2b4e0f6c3a1d5e7f9a0b1c2d3e4f5a6b&dn=Cosmos+Laundromat+4K";

test("adds a magnet link with a category", async ({ page }) => {
  await openTorrents(page);
  await page.getByRole("button", { name: "Hinzufügen" }).click();
  const dialog = page.getByTestId("add-dialog");
  await dialog.getByLabel("Magnet-Link oder URL").fill(magnet);
  await expect(dialog.getByText("Cosmos Laundromat 4K")).toBeVisible();
  await dialog.getByLabel("Kategorie").click();
  await page.getByRole("option", { name: "Filme" }).click();
  await expect(dialog.getByLabel("Speichern in")).toHaveValue("/downloads/filme");
  await dialog.getByText("Weitere Optionen").click();
  await dialog.getByLabel("Tags").fill("4K");
  await dialog.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(dialog).toBeHidden();
  const added = page.getByTestId("torrent-row").filter({ hasText: "Cosmos Laundromat 4K" });
  await expect(added).toContainText("Filme");
  await expect(page.getByTestId("torrent-row")).toHaveCount(11);
});

test("adds a .torrent file", async ({ page }) => {
  await openTorrents(page);
  await page.getByRole("button", { name: "Hinzufügen" }).click();
  const dialog = page.getByTestId("add-dialog");
  await dialog.getByRole("tab", { name: "Datei" }).click();
  await dialog.getByTestId("add-file-input").setInputFiles({
    name: "Spring (2019).torrent",
    mimeType: "application/x-bittorrent",
    buffer: Buffer.from("d4:infod4:name6:Springee"),
  });
  await expect(dialog.getByText("Spring (2019).torrent")).toBeVisible();
  await dialog.getByLabel("Sofort starten").uncheck();
  await dialog.getByRole("button", { name: "Hinzufügen" }).click();
  const added = page.getByTestId("torrent-row").filter({ hasText: "Spring (2019)" });
  await expect(added).toContainText("Gestoppt");
});
