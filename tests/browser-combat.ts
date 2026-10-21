import { generateOffers } from "../shared/rogue";
import { launchFromDraft, prepareInBrowser } from "./browser-support";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { createServer } from "../server/app";
import { gainExperience } from "../server/simulation";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import type { Ability, Effect } from "../shared/types";
import { ABILITIES } from "../shared/rogue";
const dir = mkdtempSync(path.join(tmpdir(), "abyss-combat-")),
  app = createServer({ dataDir: dir });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${(app.http.address() as any).port}`;
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
  headless: true,
});
const errors: string[] = [],
  passed: string[] = [];
await fs.mkdir("test-results/combat", { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() =>
    document.querySelector(".connection")?.textContent?.includes("服务已连接"),
  );
  await page.getByRole("button", { name: /先一个人试跑/ }).click();
  await launchFromDraft(page);
  await page.waitForFunction(
    () => window.__OFFDUTY__?.state?.phase === "playing",
  );
  const code = await page.evaluate(() => window.__OFFDUTY__!.state!.code),
    g = app.rooms.get(code)!,
    me = g.state.players[0];
  g.state.enemies = [];
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  me.invulnerable = 9999;
  gainExperience(g, 400);
  me.pendingUpgrades = 4;
  me.offers = generateOffers(g, me);
  await page.getByRole("region", { name: "随机改装" }).waitFor();
  assert.equal(await page.locator(".augment-backdrop").count(), 0);
  const dock = await page.locator(".augment-dock").boundingBox(),
    stage = await page.locator(".game-stage").boundingBox();
  assert.ok(
    dock && stage && dock.y > stage.y + stage.height * 0.6 && dock.height < 140,
  );
  const x = me.x,
    seq = me.attackSeq;
  await page.keyboard.down("d");
  await page.locator("canvas").hover({ position: { x: 300, y: 300 } });
  await page.mouse.down();
  await page.waitForTimeout(180);
  const card = me.offers[0];
  await page.keyboard.press("1");
  await page.waitForTimeout(500);
  await page.keyboard.up("d");
  await page.mouse.up();
  assert.ok(me.x > x + 15, "movement must stay active under upgrade dock");
  assert.ok(me.attackSeq > seq, "shooting must stay active");
  assert.ok(
    card.attackSkill
      ? !!me.arsenal[card.attackSkill]
      : card.id === "signature"
        ? me.signatureLevel > 1
        : me.upgrades.includes(card.id),
  );
  const before = me.pendingUpgrades,
    second = me.offers[1];
  await page.keyboard.press("2");
  await page.waitForTimeout(500);
  assert.equal(me.pendingUpgrades, before - 1);
  assert.ok(
    second.attackSkill
      ? !!me.arsenal[second.attackSkill]
      : second.id === "signature"
        ? me.signatureLevel > 1
        : me.upgrades.includes(second.id),
  );
  const third = me.offers[2];
  await page.keyboard.press("3");
  await page.waitForTimeout(500);
  assert.ok(
    third.attackSkill
      ? !!me.arsenal[third.attackSkill]
      : third.id === "signature"
        ? me.signatureLevel > 1
        : me.upgrades.includes(third.id),
  );
  passed.push(
    "Upgrade dock occupies edge only; movement and shooting stay live while1/2/3 select real server offers.",
  );
  await page.screenshot({ path: "test-results/combat/quick-upgrades.png" });
  if (await page.locator(".augment-dock").count())
    await page.getByRole("button", { name: "暂存强化" }).click();
  g.state.chat.push({
    id: "live-test",
    name: "观战同事",
    text: "右侧有精英，小心包抄！",
    at: Date.now(),
    spectator: true,
  });
  await page
    .getByRole("log", { name: "实时聊天消息" })
    .getByText("右侧有精英，小心包抄！")
    .waitFor();
  assert.match(
    await page.locator(".live-chat-feed time").last().innerText(),
    /^\d{2}:\d{2}:\d{2}$/,
  );
  assert.equal(await page.locator(".chat-panel").count(), 0);
  assert.equal(
    await page
      .locator(".live-chat-feed")
      .evaluate((el) => getComputedStyle(el).pointerEvents),
    "none",
  );
  passed.push(
    "Incoming spectator message and timestamp are automatically visible on transparent passive feed.",
  );
  await page.getByRole("button", { name: "打开聊天" }).click();
  const pendingBeforeTyping = me.pendingUpgrades;
  await page.getByLabel("聊天内容").fill("123");
  await page.waitForTimeout(500);
  assert.equal(me.pendingUpgrades, pendingBeforeTyping);
  await page.getByLabel("聊天内容").press("Escape");
  me.alive = false;
  me.hp = 0;
  me.downTime = 80;
  g.state.players[1].invulnerable = 9999;
  await page.locator(".downed-alert").waitFor();
  const dead = await page.locator(".downed-alert").boundingBox();
  assert.ok(
    dead && stage && dead.y > stage.y + stage.height * 0.6 && dead.height < 60,
  );
  assert.equal(await page.locator(".augment-dock").count(), 0);
  assert.ok(await page.locator("canvas").isVisible());
  await page.screenshot({ path: "test-results/combat/downed-view.png" });
  passed.push(
    "Downed state preserves visible canvas with only a slim rescue strip; no center overlay.",
  );
  me.alive = true;
  me.hp = me.maxHp;
  await page.locator(".downed-alert").waitFor({ state: "detached" });
  await page.keyboard.press("F2");
  await page.getByLabel("游戏整体透明度").fill("0.55");
  await page.getByRole("button", { name: "设置好了" }).click();
  assert.ok(
    Math.abs(
      (await page
        .locator(".app")
        .evaluate((el) => Number(getComputedStyle(el).opacity))) - 0.55,
    ) < 0.01,
  );
  await page.keyboard.press("F2");
  await page.getByLabel("游戏整体透明度").fill("1");
  await page.getByRole("button", { name: "设置好了" }).click();
  passed.push(
    "Whole interface opacity covers navigation, canvas, combat UI and settings.",
  );
  const imageHashes = new Set<string>();
  for (const ability of Object.keys(ABILITIES) as Ability[]) {
    g.state.effects = [];
    g.state.bullets = [];
    me.ability = ability;
    me.skillCd = 0;
    g.state.enemies = [
      {
        id: 900,
        kind: "tank",
        x: me.x + 90,
        y: me.y,
        hp: 100000,
        maxHp: 100000,
        speed: 0,
        cd: 999,
        angle: 0,
        hitFlash: 0,
      },
    ];
    await page.waitForTimeout(70);
    await page.keyboard.press("q");
    await page.waitForFunction(
      (ability) =>
        window.__OFFDUTY__!.state!.effects.some((e) => e.ability === ability),
      ability,
    );
    await page.waitForTimeout(95);
    const image = await page
      .locator(".game-stage")
      .screenshot({ path: `test-results/combat/skill-${ability}.png` });
    imageHashes.add(
      (await import("node:crypto"))
        .createHash("sha256")
        .update(image)
        .digest("hex"),
    );
  }
  assert.equal(imageHashes.size, Object.keys(ABILITIES).length);
  passed.push(
    "All twenty-eight occupational skills carry distinct identities and produce rendered visual frames without errors.",
  );
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed, errors }, null, 2));
  await fs.writeFile(
    "test-results/combat/result.json",
    JSON.stringify({ passed, errors }, null, 2),
  );
} finally {
  await browser.close();
  await app.close();
  rmSync(dir, { recursive: true, force: true });
}
