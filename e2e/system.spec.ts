import type { Page } from "@playwright/test";
import pkg from "../package.json" with { type: "json" };
import { expect, test } from "./fixtures";

async function openAppMenu(page: Page) {
  await page.goto("./#/torrents");
  await expect(page.getByTestId("torrent-row").first()).toBeVisible();
  await page.getByTestId("app-menu").click();
}

test("statistics show what qBittorrent counts", async ({ page }) => {
  await page.goto("./#/torrents");
  await page.locator("[data-sidebar=sidebar]").getByRole("link", { name: "Statistik" }).click();
  const stats = page.getByTestId("statistics");
  const alltime = stats.getByRole("region", { name: "Insgesamt" });
  await expect(alltime).toContainText("2,81 TB");
  await expect(alltime).toContainText("3,96 TB");
  await expect(alltime).toContainText("1,41");
  const session = stats.getByRole("region", { name: "Seit dem Start" });
  await expect(session).toContainText("3 Tage");
  await expect(session).toContainText("23,4 MB");
  await expect(stats.getByRole("region", { name: "Festplatte" })).toContainText("1,15 %");
  await expect(stats.getByRole("region", { name: "Netz" })).toContainText("Wartende Tracker-Anfragen2");
  await expect(stats.getByRole("img", { name: /Tempo der letzten Minuten/ })).toBeVisible();
});

test("log: filter by kind and text, blocked peers", async ({ page }) => {
  await page.goto("./#/settings?section=log");
  const list = page.getByTestId("log-list").locator("li");
  await expect(list).toHaveCount(18);
  // newest first
  await expect(list.first()).toContainText("Torrent download finished");

  await page.getByRole("button", { name: /^Allgemein/ }).click();
  await page.getByRole("button", { name: /^Info/ }).click();
  await expect(list).toHaveCount(3);
  await page.getByRole("button", { name: /^Warnung/ }).click();
  await expect(list).toHaveCount(1);
  await expect(list.first()).toContainText("Tracker error");

  await page.getByRole("button", { name: /^Warnung/ }).click();
  await page.getByLabel("Meldungen durchsuchen").fill("upnp");
  await expect(list).toHaveCount(1);
  await expect(list.first()).toHaveAttribute("data-level", "warning");

  await page.getByRole("tab", { name: "Gesperrte Peers" }).click();
  const peers = page.getByTestId("peer-log").locator("li");
  await expect(peers).toHaveCount(3);
  await expect(peers.first()).toContainText("2a01:4f8:c0c:1a2::1");
  await expect(peers.nth(1)).toContainText("Gesperrt");
});

test("log picks up new messages", async ({ page }) => {
  await page.goto("./#/settings?section=log");
  const list = page.getByTestId("log-list").locator("li");
  await expect(list).toHaveCount(18);
  await page.request.post("./api/v2/torrents/add", {
    form: { urls: "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=Sintel" },
  });
  await expect(list.first()).toContainText('Added new torrent. Torrent: "Sintel"');
});

test("cookies: add, change and remove", async ({ page }) => {
  await page.goto("./#/settings?section=cookies");
  const cookies = page.getByTestId("cookie-list").getByRole("group");
  await expect(cookies).toHaveCount(1);
  await page.getByRole("button", { name: "Cookie hinzufügen" }).click();
  const added = cookies.nth(1);
  await added.getByLabel("Domain").fill("rss.example.org");
  await added.getByLabel("Name").fill("uid");
  await added.getByLabel("Wert").fill("42");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("button", { name: "Speichern" })).toBeDisabled();
  let server = await (await page.request.get("./api/v2/app/cookies")).json();
  expect(server).toEqual([
    expect.objectContaining({ name: "session", domain: "tracker.example.org" }),
    { domain: "rss.example.org", path: "/", name: "uid", value: "42" },
  ]);

  await cookies.first().getByRole("button", { name: "Entfernen" }).click();
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("button", { name: "Speichern" })).toBeDisabled();
  server = await (await page.request.get("./api/v2/app/cookies")).json();
  expect(server.map((c: { name: string }) => c.name)).toEqual(["uid"]);
});

test("creates a torrent and offers the file", async ({ page }) => {
  await openAppMenu(page);
  await page.getByRole("menuitem", { name: "Torrent erstellen …" }).click();
  const dialog = page.getByTestId("creator-dialog");
  await dialog.getByLabel("Datei oder Ordner auf dem Server").fill("/downloads/urlaub");
  await dialog.getByLabel("Tracker").fill("udp://tracker.example.org:1337/announce\n\nudp://backup.example.org:80");
  await dialog.getByLabel("Privat (nicht über DHT verteilen)").check();
  await dialog.getByRole("button", { name: "Erstellen", exact: true }).click();

  const tasks = dialog.getByTestId("creator-tasks").locator("li");
  await expect(tasks).toHaveCount(1);
  await expect(tasks.first()).toContainText("urlaub");
  await expect(tasks.first()).toContainText("Fertig", { timeout: 10_000 });
  const link = tasks.first().getByRole("link", { name: ".torrent" });
  await expect(link).toHaveAttribute("href", /torrentcreator\/torrentFile\?taskID=mock-task-1/);
  const file = await page.request.get(`./${await link.getAttribute("href")}`);
  expect(await file.text()).toContain("6:urlaub");

  const [task] = await (await page.request.get("./api/v2/torrentcreator/status")).json();
  expect(task).toMatchObject({
    sourcePath: "/downloads/urlaub",
    private: true,
    trackers: ["udp://tracker.example.org:1337/announce", "", "udp://backup.example.org:80"],
  });

  await tasks.first().getByRole("button", { name: "urlaub löschen" }).click();
  await expect(dialog.getByText("Noch nichts erstellt")).toBeVisible();
});

test("a failed torrent shows why", async ({ page }) => {
  await page.goto("./#/settings?section=system");
  await page.getByRole("button", { name: "Erstellen …" }).click();
  const dialog = page.getByTestId("creator-dialog");
  await dialog.getByLabel("Datei oder Ordner auf dem Server").fill("/downloads/missing");
  await dialog.getByRole("button", { name: "Erstellen", exact: true }).click();
  const task = dialog.getByTestId("creator-tasks").locator("li").first();
  await expect(task).toContainText("Fehlgeschlagen", { timeout: 10_000 });
  await expect(task).toContainText("The path does not exist");
});

test("about shows the versions", async ({ page }) => {
  await openAppMenu(page);
  await page.getByRole("menuitem", { name: "Über Schwarm" }).click();
  const about = page.getByTestId("about");
  await expect(about).toContainText(`Schwarm${pkg.version}`);
  await expect(about).toContainText("qBittorrent5.3.0");
  await expect(about).toContainText("libtorrent2.0.11.0");
  await expect(about).toContainText("linux · 64 Bit");
});

test("quits qBittorrent after asking", async ({ page }) => {
  await openAppMenu(page);
  await page.getByRole("menuitem", { name: "qBittorrent beenden …" }).click();
  const confirm = page.getByRole("alertdialog", { name: "qBittorrent beenden?" });
  await confirm.getByRole("button", { name: "Abbrechen" }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByTestId("torrent-row").first()).toBeVisible();

  await page.getByTestId("app-menu").click();
  await page.getByRole("menuitem", { name: "qBittorrent beenden …" }).click();
  await confirm.getByRole("button", { name: "Beenden" }).click();
  await expect(page.getByRole("heading", { name: "qBittorrent ist beendet" })).toBeVisible();
});

test("phone: statistics and the system page @phone", async ({ page }) => {
  await page.goto("./#/settings?section=system");
  await expect(page.getByTestId("about")).toContainText("2.0.11.0");
  await page.getByRole("link", { name: "Öffnen" }).click();
  await expect(page.getByRole("heading", { name: "Statistik" })).toBeVisible();
  await expect(page.getByTestId("statistics").getByRole("region", { name: "Insgesamt" })).toContainText("2,81 TB");
});
