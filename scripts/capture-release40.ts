import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "../server/app";
import { finishDeployment } from "../tests/browser-support";
const data = await fs.mkdtemp(path.join(tmpdir(), "release40-capture-")),
  out = "test-results/release40";
const app = createServer({ dataDir: data });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
});
try {
  await fs.mkdir(out, { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.addInitScript(() => {
    (window as any).__name = (f: any) => f;
    localStorage.setItem("offduty-name", JSON.stringify("下班搭子"));
  });
  await page.goto("http://127.0.0.1:" + (app.http.address() as any).port);
  await page.getByRole("region", { name: "公开房间大厅" }).waitFor();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out + "/lobby.png" });
  await page.getByRole("button", { name: "图鉴与档案", exact: true }).click();
  await page.getByRole("dialog", { name: "工友随身图鉴" }).waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + "/codex.png" });
  await page.getByRole("button", { name: "关闭对话框", exact: true }).click();
  await page.getByRole("button", { name: "创建小队", exact: true }).click();
  await page.getByLabel("你的行动代号").fill("下班搭子");
  await page.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await page.getByRole("region", { name: "小队准备大厅" }).waitFor();
  await page.getByRole("button", { name: "添加3位AI", exact: true }).click();
  await page.waitForFunction(
    () => window.__OFFDUTY__!.state!.players.length === 4,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: out + "/ready.png" });
  await page.getByRole("button", { name: "小队出发", exact: true }).click();
  await finishDeployment(page);
  await page.waitForTimeout(3600);
  await page.keyboard.down("d");
  await page.waitForTimeout(1300);
  await page.keyboard.up("d");
  await page.keyboard.press("q");
  await page.waitForTimeout(120);
  await page.screenshot({ path: out + "/gameplay.png" });
  const state = await page.evaluate(() => ({
    phase: window.__OFFDUTY__!.state!.phase,
    players: window.__OFFDUTY__!.state!.players.map((p) => ({
      name: p.name,
      bot: p.bot,
      hp: p.hp,
      maxHp: p.maxHp,
    })),
    enemies: window.__OFFDUTY__!.state!.enemies.length,
  }));
  await page.keyboard.press("F9");
  await page.locator(".quiet-embedded").waitFor();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(450);
  await page.locator(".app").screenshot({ path: out + "/quiet.png" });
  await fs.writeFile(
    out + "/capture.json",
    JSON.stringify(
      {
        version: "4.0.0",
        method:
          "Real UI, no state injection; one human client plus three actual server bots",
        state,
      },
      null,
      2,
    ),
  );
  console.log("CAPTURE_PASS", JSON.stringify(state));
} finally {
  await browser.close();
  await app.close();
  const target = path.resolve(data);
  if (
    !target.startsWith(path.resolve(tmpdir()) + path.sep) ||
    !path.basename(target).startsWith("release40-capture-")
  )
    throw Error("Unsafe capture cleanup");
  await fs.rm(target, { recursive: true, force: true });
}
