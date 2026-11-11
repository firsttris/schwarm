import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

async function serverPrefs(page: Page): Promise<Record<string, unknown>> {
  const res = await page.request.get("./api/v2/app/preferences");
  return (await res.json()) as Record<string, unknown>;
}

const pref = (page: Page, key: string) => page.locator(`[data-pref="${key}"]`);

test("collects changes and saves them in one setPreferences call", async ({ page }) => {
  await page.goto("./#/settings?section=speed");
  await expect(page.getByRole("heading", { name: "Tempo" })).toBeVisible();
  const saveBar = page.getByTestId("save-bar");
  await expect(saveBar).toHaveCount(0);

  await page.getByRole("link", { name: "Downloads" }).click();
  await page.getByLabel("Standardordner").fill("/data/torrents");
  await expect(saveBar).toContainText("1 Änderung nicht gespeichert");

  // the draft survives a change of section
  await page.getByRole("link", { name: "Verbindung" }).click();
  await page.getByLabel("Verbindungen insgesamt höchstens").fill("300");
  await expect(saveBar).toContainText("2 Änderungen nicht gespeichert");

  await saveBar.getByRole("button", { name: "Speichern" }).click();
  await expect(saveBar).toHaveCount(0);
  const prefs = await serverPrefs(page);
  expect(prefs.save_path).toBe("/data/torrents");
  expect(prefs.max_connec).toBe(300);
});

test("discards changes", async ({ page }) => {
  await page.goto("./#/settings?section=downloads");
  const input = page.getByLabel("Standardordner");
  await expect(input).toHaveValue("/downloads");
  await input.fill("/somewhere");
  await page.getByTestId("save-bar").getByRole("button", { name: "Verwerfen" }).click();
  await expect(input).toHaveValue("/downloads");
  await expect(page.getByTestId("save-bar")).toHaveCount(0);
  expect((await serverPrefs(page)).save_path).toBe("/downloads");
});

test("locks what a VPN container sets until asked", async ({ page }) => {
  await page.goto("./#/settings?section=connection");
  await expect(page.getByTestId("vpn-note")).toContainText("tun0");
  const port = page.getByLabel("Port für eingehende Verbindungen");
  await expect(port).toBeDisabled();
  await expect(page.getByLabel("Verbindungen insgesamt höchstens")).toBeEnabled();
  await page.getByRole("button", { name: "Trotzdem ändern" }).click();
  await expect(port).toBeEnabled();
  await port.fill("6881");
  await page.getByTestId("save-bar").getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByTestId("save-bar")).toHaveCount(0);
  expect((await serverPrefs(page)).listen_port).toBe(6881);
});

test("finds every option by German, English or key", async ({ page }) => {
  await page.goto("./#/settings?section=all");
  const search = page.getByTestId("prefs-search");
  await search.fill("port");
  await expect(pref(page, "listen_port")).toBeVisible();
  await expect(page.getByTestId("prefs-group-connection")).toBeVisible();
  await expect(pref(page, "save_path")).toHaveCount(0);

  await search.fill("web_ui_username");
  await expect(page.locator("[data-pref]")).toHaveCount(1);
  await pref(page, "web_ui_username").getByRole("textbox").fill("tristan");
  await page.getByTestId("save-bar").getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByTestId("save-bar")).toHaveCount(0);
  expect((await serverPrefs(page)).web_ui_username).toBe("tristan");
});

test("speed limits are shown in MB/s and stored in bytes per second", async ({ page }) => {
  await page.goto("./#/settings?section=speed");
  const limit = pref(page, "dl_limit").getByRole("textbox");
  await limit.fill("2,5");
  await page.getByTestId("save-bar").getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByTestId("save-bar")).toHaveCount(0);
  expect((await serverPrefs(page)).dl_limit).toBe(2_500_000);
});

test("phone: section picker and save bar above the navigation @phone", async ({ page }) => {
  await page.goto("./#/settings");
  await expect(page.getByRole("heading", { name: "Downloads" })).toBeVisible();
  await page.getByLabel("Standardordner").fill("/data");
  const bar = page.getByTestId("save-bar");
  await expect(bar).toBeVisible();
  const barBox = await bar.getByRole("button", { name: "Speichern" }).boundingBox();
  const navBox = await page.getByRole("navigation", { name: "Hauptmenü" }).boundingBox();
  expect((barBox?.y ?? 0) + (barBox?.height ?? 0)).toBeLessThanOrEqual(navBox?.y ?? 0);
});
