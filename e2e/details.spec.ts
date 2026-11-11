import { expect, openTorrents, test } from "./fixtures";

test("details sheet shows the four tabs", async ({ page }) => {
  await openTorrents(page);
  await page.getByRole("button", { name: "Sintel (2010) 4K Open Movie", exact: true }).click();
  const sheet = page.getByTestId("details-sheet");
  await expect(sheet.getByRole("heading", { name: "Sintel (2010) 4K Open Movie" })).toBeVisible();
  await expect(page).toHaveURL(/torrent=/);

  // Übersicht
  await expect(sheet.getByText("Hochgeladen")).toBeVisible();
  await expect(sheet.getByText("14 von 139")).toBeVisible();
  await expect(sheet.getByText("Info-Hash v1")).toBeVisible();

  // Dateien: tree with priorities
  await sheet.getByRole("tab", { name: "Dateien" }).click();
  await expect(sheet.getByText("Sintel.2010.4K.mkv")).toBeVisible();
  await expect(sheet.getByText("4 von 6 Dateien")).toBeVisible();
  await sheet.getByRole("button", { name: "Priorität von Making-of.mkv" }).click();
  await page.getByRole("menuitemradio", { name: "Hoch" }).click();
  await expect(sheet.getByText("5 von 6 Dateien")).toBeVisible();

  // Peers
  await sheet.getByRole("tab", { name: "Peers" }).click();
  await expect(sheet.getByText("Transmission 4.0.6")).toBeVisible();
  await sheet.getByRole("option").filter({ hasText: "Deluge" }).click();
  await expect(sheet.getByText("192.0.2.88:50321")).toBeVisible();
  await sheet.getByRole("button", { name: "Sperren" }).click();
  await expect(sheet.getByText("Deluge 2.1.1")).toHaveCount(0);

  // Tracker incl. web seeds
  await sheet.getByRole("tab", { name: "Tracker" }).click();
  await expect(sheet.getByTestId("tracker-card")).toHaveCount(3);
  await expect(sheet.getByText("Zeitüberschreitung: Tracker antwortet nicht.")).toBeVisible();
  await expect(sheet.getByText("https://download.blender.org/durian/movies/")).toBeVisible();
  await sheet.getByRole("button", { name: "Tracker hinzufügen" }).click();
  await page.getByRole("textbox", { name: "Tracker" }).fill("udp://tracker.new.example:1337/announce");
  await page.getByRole("dialog", { name: "Tracker hinzufügen" }).getByRole("button", { name: "Hinzufügen" }).click();
  await expect(sheet.getByTestId("tracker-card")).toHaveCount(4);

  await sheet.getByRole("button", { name: "Schließen" }).click();
  await expect(page).not.toHaveURL(/torrent=/);
});
