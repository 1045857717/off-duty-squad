import { chromium } from "playwright";
import assert from "node:assert/strict";
import { createServer } from "../server/app";
import { launchFromDraft } from "./browser-support";
const app = createServer();
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(`http://127.0.0.1:${(app.http.address() as any).port}`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: /先一个人试跑/ }).click();
  await launchFromDraft(page);
  const code = await page.evaluate(() => window.__OFFDUTY__!.state!.code),
    g = app.rooms.get(code)!,
    me = g.state.players[0];
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  g.state.event = { kind: "none", name: "", desc: "", remaining: 999 };
  me.invulnerable = 999;
  g.state.enemies = [
    {
      id: ++g.state.serial,
      kind: "tank",
      x: me.x + 70,
      y: me.y,
      hp: 1e9,
      maxHp: 1e9,
      speed: 0,
      cd: 999,
      stun: 999,
      angle: 0,
      hitFlash: 0,
    },
  ];
  const auto = page.getByRole("button", {
    name: "自动开火快捷开关",
    exact: true,
  });
  if ((await auto.getAttribute("aria-pressed")) === "true")
    await page.keyboard.press("t");
  await page.keyboard.down("d");
  await page.waitForTimeout(160);
  await page.keyboard.up("d");
  await page.keyboard.down("w");
  await page.waitForTimeout(240);
  await page.keyboard.up("w");
  console.log("TURN_REPRO", {
    angle: me.angle,
    expected: -Math.PI / 2,
    nearEnemy: true,
    autoFire: false,
  });
  assert.ok(
    Math.abs(me.angle + Math.PI / 2) < 0.1,
    "附近有怪且关闭自动开火时，角色应跟随向上移动转向",
  );
} finally {
  await browser.close();
  await app.close();
}
