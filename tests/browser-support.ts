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

/** WCAG contrast over the actual composited DOM background; supports light and dark themes. */
export async function readTextContrast(
  page: Page,
  selector: string,
  textSelector?: string,
) {
  return page.locator(selector).evaluate((el, textSelector) => {
    const rgba = (text: string) => {
      const n = (text.match(/[\d.]+/g) || []).map(Number);
      return [n[0] || 0, n[1] || 0, n[2] || 0, n.length > 3 ? n[3] : 1];
    };
    const layers: Element[] = [];
    for (let n: Element | null = el; n; n = n.parentElement) layers.push(n);
    let background = [255, 255, 255];
    for (const layer of layers.reverse()) {
      const b = rgba(getComputedStyle(layer).backgroundColor);
      background = background.map((v, i) => v * (1 - b[3]) + b[i] * b[3]);
    }
    const foreground = rgba(
      getComputedStyle(textSelector ? el.querySelector(textSelector)! : el)
        .color,
    );
    const color = background.map(
      (v, i) => v * (1 - foreground[3]) + foreground[i] * foreground[3],
    );
    const lum = (a: number[]) =>
      a
        .map((v) => v / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
    const l1 = lum(color),
      l2 = lum(background);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }, textSelector);
}
