import type { Page } from "playwright";
export async function prepareInBrowser(page: Page) {
  await page.getByRole("region", { name: "小队准备大厅" }).waitFor();
  const ready = page.getByRole("button", { name: "我已准备", exact: true });
  if (await ready.count()) await ready.click();
}
export async function finishDeployment(page: Page) {
  await page.getByRole("region", { name: "地图内初始技能选择" }).waitFor();
  const cards = page.locator(".deployment-screen .initial-draft>div>button");
  if (await cards.count()) await cards.first().click();
  await page.waitForFunction(
    () => window.__OFFDUTY__?.state?.phase === "playing",
  );
}
export async function launchFromDraft(page: Page) {
  await prepareInBrowser(page);
  await page.getByRole("button", { name: "小队出发", exact: true }).click();
  await finishDeployment(page);
}
