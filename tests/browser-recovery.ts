import { launchFromDraft, prepareInBrowser } from "./browser-support";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { createServer } from "../server/app";
import { gainExperience } from "../server/simulation";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
const dir = mkdtempSync(path.join(tmpdir(), "abyss-recovery-")),
  app = createServer({ dataDir: dir });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${(app.http.address() as any).port}`;
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
  headless: true,
});
try {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForFunction(() =>
    document.querySelector(".connection")?.textContent?.includes("服务已连接"),
  );
  await p.getByRole("button", { name: /先一个人试跑/ }).click();
  await launchFromDraft(p);
  await p.waitForFunction(() => window.__OFFDUTY__?.state?.phase === "playing");
  const code = await p.evaluate(() => window.__OFFDUTY__!.state!.code),
    g = app.rooms.get(code)!;
  g.state.enemies = [];
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  g.state.players[0].invulnerable = 999;
  gainExperience(g, 250);
  await p.getByRole("region", { name: "随机改装" }).waitFor();
  g.state.players.forEach((q) => {
    q.alive = false;
    q.hp = 0;
  });
  await p.locator(".debrief-sheet").waitFor();
  await p.getByRole("button", { name: "重整队伍，再来一把" }).click();
  await p.waitForFunction(() => window.__OFFDUTY__?.state?.phase === "lobby");
  await prepareInBrowser(p);
  await launchFromDraft(p);
  await p.waitForFunction(() => window.__OFFDUTY__?.state?.phase === "playing");
  const reset = app.rooms.get(code)!;
  reset.state.enemies = [];
  reset.state.spawnCd = 999;
  reset.state.players[0].invulnerable = 999;
  await p.waitForTimeout(650);
  const x = reset.state.players[0].x;
  await p.keyboard.down("d");
  await p.waitForTimeout(250);
  await p.keyboard.up("d");
  assert.ok(
    reset.state.players[0].x > x + 20,
    `restart movement blocked: ${x}->${reset.state.players[0].x}`,
  );
  console.log("RESTART_MOVEMENT_PASS");
  reset.state.players.forEach((q) => {
    q.alive = false;
    q.hp = 0;
  });
  await p.locator(".debrief-sheet").waitFor();
  await p.getByRole("button", { name: "重整队伍，再来一把" }).click();
  await p.waitForFunction(() => window.__OFFDUTY__?.state?.phase === "lobby");
  await p
    .locator(".mode-cards button")
    .filter({ hasText: "夺回下班权" })
    .click();
  await p.waitForTimeout(200);
  assert.equal(
    app.rooms.get(code)!.state.mode,
    "expedition",
    "mode card must update existing lobby room",
  );
  await prepareInBrowser(p);
  await launchFromDraft(p);
  await p.waitForFunction(() => window.__OFFDUTY__?.state?.phase === "playing");
  assert.equal(app.rooms.get(code)!.state.mode, "expedition");
  assert.equal(app.rooms.get(code)!.state.world.w, 2560);
  console.log("MODE_SELECTION_PASS");
} finally {
  await browser.close();
  await app.close();
  rmSync(dir, { recursive: true, force: true });
}
