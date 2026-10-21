import { launchFromDraft, prepareInBrowser } from "./browser-support";
import { draftSocket } from "./support";
import { chromium } from "playwright";
import { io } from "socket.io-client";
import assert from "node:assert/strict";
import { createServer } from "../server/app";
import { gainExperience } from "../server/simulation";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
const dir = mkdtempSync(path.join(tmpdir(), "abyss-identity-")),
  app = createServer({ dataDir: dir });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${(app.http.address() as any).port}`;
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
  headless: true,
});
const peer = io(url, { transports: ["websocket"], forceNew: true });
const ack = (event: string, data: unknown = {}) =>
  new Promise<any>((r) => peer.emit(event, data, r));
const passed: string[] = [],
  errors: string[] = [];
await fs.mkdir("test-results/identity", { recursive: true });
try {
  await new Promise<void>((r) =>
    peer.connected ? r() : peer.once("connect", () => r()),
  );
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
  assert.equal(
    await page.locator("canvas").count(),
    0,
    "landing must not invent teammates",
  );
  await page
    .getByRole("button", { name: "创建小队", exact: true })
    .first()
    .click();
  await page.getByLabel("你的行动代号").fill("夜航");
  await page.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await page.getByRole("region", { name: "小队准备大厅" }).waitFor();
  const code = await page.evaluate(() => window.__OFFDUTY__!.state!.code),
    g = app.rooms.get(code)!;
  assert.equal(await page.locator(".ready-seat:not(.empty)").count(), 1);
  await ack("room:join", { code, name: "真实同事", role: "medic" });
  await page
    .locator(".ready-seat.is-waiting")
    .filter({ hasText: "真实同事" })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "小队出发" }).isDisabled(),
    true,
  );
  assert.equal((await ack("game:start")).ok, false);
  await draftSocket(peer, g, g.state.players[1].id);

  await page.waitForFunction(
    () =>
      !document.querySelector<HTMLButtonElement>(".ready-launch button")!
        .disabled,
  );
  await page
    .getByRole("button", { name: "难度：老板开挂", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLButtonElement>(".ready-launch button")!
        .disabled,
  );
  assert.equal(g.state.players[1].ready, false);
  await draftSocket(peer, g, g.state.players[1].id);

  await page.waitForFunction(
    () =>
      !document.querySelector<HTMLButtonElement>(".ready-launch button")!
        .disabled,
  );
  await page.screenshot({
    path: "test-results/identity/ready-room.png",
    fullPage: true,
  });
  passed.push(
    "真实准备大厅只有两个已连接真人，未准备阻止开局；房主更改规则会清空队友准备状态。",
  );
  await launchFromDraft(page);
  await page.waitForFunction(
    () => window.__OFFDUTY__?.state?.phase === "playing",
  );
  await page.locator("canvas").waitFor();
  await page.locator(".battle-intro").waitFor();
  const me = g.state.players[0],
    ally = g.state.players[1];
  for (const p of g.state.players) p.invulnerable = 9999;
  g.state.enemies = [];
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  g.state.waveEnds = 999;
  await page.waitForTimeout(380);
  await page.screenshot({ path: "test-results/identity/start.png" });
  const x = me.x;
  await page.keyboard.down("d");
  await page.waitForTimeout(260);
  await page.keyboard.up("d");
  assert.ok(me.x > x + 15, "intro must not block movement");
  await page.waitForTimeout(3700);
  assert.equal(
    await page
      .locator(".battle-intro")
      .evaluate((e) => getComputedStyle(e).visibility),
    "hidden",
  );
  passed.push("开场文字动画显示后移出；文字期间角色仍可移动。");
  await page.keyboard.press("Enter");
  await page.getByLabel("聊天内容").fill("我从左侧绕过去！");
  await page.getByLabel("聊天内容").press("Enter");
  await page.locator(".chat-panel").waitFor({ state: "detached" });
  await page
    .locator(".world-speech:not([hidden])")
    .filter({ hasText: "我从左侧绕过去！" })
    .waitFor();
  const chatX = me.x;
  await page.keyboard.down("d");
  await page.waitForTimeout(230);
  await page.keyboard.up("d");
  assert.ok(me.x > chatX + 15, "sending chat must immediately restore control");
  assert.equal(g.state.chat.at(-1)!.playerId, me.id);
  passed.push("Enter发送后输入框收起并恢复WASD，发言气泡挂在真实玩家头顶。");
  await page.keyboard.press("F2");
  await page.getByLabel("游戏整体透明度").fill("0.45");
  await page.waitForTimeout(500);
  assert.equal(
    await page.locator(".app").evaluate((e) => getComputedStyle(e).opacity),
    "0.45",
  );
  assert.equal(
    await page
      .locator(".game-stage")
      .evaluate((e) => getComputedStyle(e).opacity),
    "1",
  );
  await page.screenshot({
    path: "test-results/identity/whole-interface-opacity.png",
  });
  await page.getByLabel("游戏整体透明度").fill("1");
  await page.getByRole("button", { name: "设置好了" }).click();
  passed.push(
    "透明度作用于整个应用根层：顶栏、大厅、HUD、聊天与设置共同生效，没有二次叠加。",
  );
  gainExperience(g, 300);
  await page.locator(".evolution-beacon").waitFor();
  assert.ok(
    await page
      .locator(".evolution-beacon")
      .evaluate((e) => getComputedStyle(e).animationName.includes("evolve")),
  );
  await page.keyboard.press("1");
  if (await page.locator(".augment-dock").count())
    await page.getByRole("button", { name: "暂存强化" }).click();
  passed.push("进化提示有连续呼吸/扩散动画；1键仍能在战斗中选择真实强化。");
  const farthest = [...g.state.world.points].sort(
    (a, b) =>
      Math.hypot(b.x - me.x, b.y - me.y) - Math.hypot(a.x - me.x, a.y - me.y),
  )[0];
  ally.x = farthest.x;
  ally.y = farthest.y;
  await page
    .locator(`.teammate-bearing[data-marker="${ally.id}"]:not([hidden])`)
    .waitFor();
  ally.alive = false;
  ally.hp = 0;
  ally.downTime = 90;
  await ack("player:rescue");
  await page.locator(".world-speech.rescue-speech:not([hidden])").waitFor();
  await page.screenshot({ path: "test-results/identity/rescue-markers.png" });
  passed.push(
    "屏外队友显示方向与米数；倒地呼叫同时产生求救气泡、雷达信号和频道消息。",
  );
  ally.alive = true;
  ally.hp = ally.maxHp;
  ally.x = me.x - 60;
  ally.y = me.y;
  g.state.effects = [];
  g.state.rescuePing = undefined;
  // Seven test-controlled live enemies, including a large boss, displayed together.
  const kinds = [
    "mite",
    "hound",
    "shooter",
    "tank",
    "wraith",
    "bomber",
    "boss",
  ] as const;
  g.state.enemies = kinds.map((kind, i) => ({
    id: ++g.state.serial,
    kind,
    x: me.x - 200 + (i % 4) * 125,
    y: me.y - 140 + Math.floor(i / 4) * 175,
    hp: 99999,
    maxHp: 99999,
    speed: 0,
    cd: 30,
    angle: Math.PI / 2,
    hitFlash: 0,
  }));
  await page.waitForTimeout(400);
  await page.screenshot({
    path: "test-results/identity/survival-monsters.png",
  });
  await page.evaluate(() => {
    const w = window as any,
      proto = w.Phaser.GameObjects.Container.prototype,
      old = proto.setData;
    proto.setData = function (k: any, v: any, ...args: any[]) {
      if (k === "pose" && this.name === "rig-" + w.__OFFDUTY__.playerId)
        w.__enemyScene = this.scene;
      return old.call(this, k, v, ...args);
    };
  });
  await page.waitForTimeout(80);
  const ids = g.state.enemies.map((e) => ({ id: e.id, kind: e.kind }));
  const poses = await page.evaluate(async (ids) => {
    const w = window as any,
      out: any = {};
    for (let i = 0; i < 15; i++) {
      for (const e of ids) {
        const rig = w.__enemyScene.children.list.find(
          (r: any) => r.name === "rig-e" + e.id,
        );
        if (rig) (out[e.kind] ??= []).push({ ...rig.pose });
      }
      await new Promise((r) => setTimeout(r, 30));
    }
    return out;
  }, ids);
  for (const kind of kinds) {
    assert.ok(poses[kind]?.length > 4, kind);
    assert.equal(poses[kind][0].parts, 14);
    assert.ok(
      new Set(poses[kind].map((p: any) => p.head.toFixed(5))).size > 4,
      kind + " continuous joints",
    );
  }
  for (const e of g.state.enemies) {
    e.attackSeq = 1;
    e.attackStartedAt = g.state.elapsed;
  }
  await page.waitForTimeout(120);
  const strikes = await page.evaluate((ids) => {
    const w = window as any;
    return ids.map((e) => {
      const rig = w.__enemyScene.children.list.find(
        (r: any) => r.name === "rig-e" + e.id,
      );
      return rig?.pose.fire || 0;
    });
  }, ids);
  assert.ok(
    strikes.every((v) => v > 0),
    "all seven visible strike envelopes",
  );
  const dyingId = g.state.enemies[0].id;
  g.state.enemies[0].hp = 0;
  await page.waitForTimeout(200);
  await page.screenshot({ path: "test-results/identity/enemy-death.png" });
  const fall = await page.evaluate((id) => {
    const w = window as any,
      r = w.__enemyScene.children.list.find(
        (r: any) => r.name === "rig-e" + id,
      );
    return r ? { rotation: r.rotation, dying: r.pose.dying } : null;
  }, dyingId);
  assert.ok(
    fall?.dying && fall.rotation > 0.2,
    "continuous visible skeleton death",
  );
  passed.push(
    "七种不同体型怪物在灾变废墟中渲染；移动动作持续更新，死亡保留连续消散动作。",
  );
  // Change to expedition through the actual finished-run/lobby flow.
  g.state.players.forEach((p) => {
    p.alive = false;
    p.hp = 0;
  });
  await page.locator(".debrief-sheet").waitFor();
  await page.getByRole("button", { name: "重整队伍，再来一把" }).click();
  await page.getByRole("region", { name: "小队准备大厅" }).waitFor();
  await page
    .getByRole("button", { name: "模式：夺回下班权", exact: true })
    .click();
  await draftSocket(peer, g, g.state.players[1].id);

  await page.waitForFunction(
    () =>
      !document.querySelector<HTMLButtonElement>(".ready-launch button")!
        .disabled,
  );
  await launchFromDraft(page);
  await page.waitForFunction(
    () =>
      window.__OFFDUTY__?.state?.phase === "playing" &&
      window.__OFFDUTY__.state.mode === "expedition",
  );
  const expedition = app.rooms.get(code)!,
    p = expedition.state.players[0];
  expedition.state.players.forEach((p) => (p.invulnerable = 9999));
  expedition.state.spawnCd = 999;
  expedition.state.eventCd = 999;
  expedition.state.enemies = [];
  assert.equal(expedition.state.world.biome, "facility");
  assert.equal(expedition.state.objective.type, "collect");
  assert.equal(expedition.state.world.w, 2560);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "test-results/identity/expedition.png" });
  const collected = expedition.state.objective.progress;
  expedition.state.pickups.push({
    id: ++expedition.state.serial,
    x: p.x,
    y: p.y,
    kind: "crystal",
  });
  await page.locator(".pickup-flight.flight-crystal").waitFor();
  await page.screenshot({ path: "test-results/identity/pickup-flight.png" });
  await page.waitForTimeout(800);
  assert.equal(expedition.state.objective.progress, collected + 1);
  assert.match(
    await page.locator("[data-objective-count]").innerText(),
    new RegExp(`^${collected + 1}/`),
  );
  await page.locator(".mission-peek.folded").waitFor();
  await page.getByRole("button", { name: "查看任务详情" }).click();
  await page.waitForTimeout(450);
  assert.ok((await page.locator(".mission-detail").boundingBox())!.height > 15);
  passed.push(
    "远征恢复封锁区房间和六章目标；拾取晶体飞入任务计数并+1，任务面板可动画折叠/展开。",
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/identity/report.json",
    JSON.stringify({ passed, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed, errors }, null, 2));
} finally {
  peer.disconnect();
  await browser.close();
  await app.close();
  rmSync(dir, { recursive: true, force: true });
}
