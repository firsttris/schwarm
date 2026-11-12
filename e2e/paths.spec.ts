import type { Locator } from "@playwright/test";
import { expect, openTorrents, test } from "./fixtures";

const magnet = "magnet:?xt=urn:btih:9c2e6b8f2b4e0f6c3a1d5e7f9a0b1c2d3e4f5a6b&dn=Cosmos+Laundromat+4K";

/** The values the browser offers for a field with a <datalist>. */
async function suggestions(input: Locator): Promise<string[]> {
  const list = await input.getAttribute("list");
  return input
    .page()
    .locator(`datalist[id="${list}"] option`)
    .evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
}

test("downloads a finished file of a torrent", async ({ page }) => {
  await openTorrents(page);
  await page.getByRole("button", { name: "Sintel (2010) 4K Open Movie", exact: true }).click();
  const sheet = page.getByTestId("details-sheet");
  await sheet.getByRole("tab", { name: "Dateien" }).click();
  // finished subtitles can be downloaded, the film at 39 % not
  const link = sheet.getByRole("link", { name: "Sintel.de.srt herunterladen" });
  await expect(link).toHaveAttribute("href", /api\/v2\/torrents\/downloadFile\?hash=[0-9a-f]{40}&file=1$/);
  await expect(sheet.getByRole("link", { name: "Sintel.2010.4K.mkv herunterladen" })).toHaveCount(0);
  const res = await page.request.get(`./${await link.getAttribute("href")}`);
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain("Sintel.de.srt");
});

test("add dialog: free space, folder suggestions and the .torrent of a magnet link", async ({ page }) => {
  await openTorrents(page);
  await page.getByRole("button", { name: "Hinzufügen" }).click();
  const dialog = page.getByTestId("add-dialog");
  await expect(dialog.getByTestId("add-free")).toHaveText("412 GB frei");

  const path = dialog.getByLabel("Speichern in");
  await path.fill("/downloads/f");
  await expect.poll(() => suggestions(path)).toEqual(["/downloads/filme/"]);
  await path.fill("/downloads/");
  await expect.poll(() => suggestions(path)).toContain("/downloads/incomplete/");

  await dialog.getByLabel("Magnet-Link oder URL").fill(magnet);
  const save = dialog.getByRole("link", { name: "Als .torrent-Datei speichern" });
  await expect(save).toHaveAttribute("href", /api\/v2\/torrents\/saveMetadata\?source=magnet/);
  const res = await page.request.get(`./${await save.getAttribute("href")}`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/x-bittorrent");
});

test("folder suggestions in the settings and for moving a torrent", async ({ page }) => {
  await page.goto("./#/settings?section=downloads");
  const folder = page.getByLabel("Standardordner");
  await folder.fill("/d");
  await expect.poll(() => suggestions(folder)).toEqual(["/data/", "/downloads/"]);

  await openTorrents(page);
  await page.getByTestId("torrent-row").filter({ hasText: "debian" }).click({ button: "right", delay: 50 });
  await page.getByRole("menuitem", { name: "Speicherort ändern …" }).click();
  const location = page.getByLabel("Neuer Ordner");
  await location.fill("/data/");
  await expect.poll(() => suggestions(location)).toEqual(["/data/filme/", "/data/serien/"]);
});
