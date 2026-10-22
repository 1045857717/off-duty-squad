import { chromium } from "playwright";
import { io, type Socket } from "socket.io-client";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "../server/app";
import { finishDeployment } from "./browser-support";
const dir = mkdtempSync(path.join(tmpdir(), "playability41-")),
  app = createServer({ dataDir: dir });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${(app.http.address() as any).port}`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
});
const errors: string[] = [],
  passed: string[] = [],
  peers: Socket[] = [];
await fs.mkdir("test-results/playability41", { recursive: true });
const ack = (s: Socket, e: string, d: unknown) =>
  new Promise<any>((r) => s.emit(e, d, r));
try {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
  });
  await page.addInitScript("window.__name=(fn)=>fn");
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByRole("button", { name: "创建小队", exact: true }).click();
  await page.getByLabel("你的行动代号").fill("交互验收");
  await page.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await page.getByRole("region", { name: "小队准备大厅" }).waitFor();
  const code = await page.evaluate(() => window.__OFFDUTY__!.state!.code),
    g = app.rooms.get(code)!,
    me = g.state.players[0];
  const peer = io(base, { transports: ["websocket"], forceNew: true });
  peers.push(peer);
  await new Promise<void>((r) => peer.once("connect", r));
  const joined = await ack(peer, "room:join", {
    code,
    name: "补给队友",
    role: "medic",
  });
  assert.equal(joined.ok, true);
  await ack(peer, "player:ready", { ready: true });
  let drafting = false;
  peer.on("state", async (s) => {
    const p = s.players.find((p: any) => p.id !== me.id);
    if (
      s.phase === "draft" &&
      p?.offers?.length &&
      !p.initialChosen &&
      !drafting
    ) {
      drafting = true;
      await ack(peer, "game:upgrade", { id: p.offers[0].id });
    }
  });
  await page.getByRole("button", { name: "小队出发", exact: true }).click();
  await finishDeployment(page);
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  g.state.enemies = [];
  g.state.officeProps = [];
  g.state.objects = [];
  for (const p of g.state.players) {
    p.invulnerable = 999;
    p.x = me.x;
    p.y = me.y;
  }
  await page.waitForTimeout(150);
  const q = g.state.players[1];
  const setup = async (kind: "chest" | "fountain" | "shrine", cost = 0) => {
    g.state.objects = [
      {
        id: ++g.state.serial,
        kind,
        label:
          kind === "fountain"
            ? "医药补给点"
            : kind === "shrine"
              ? "加班审批台"
              : "应急物资柜",
        x: me.x,
        y: me.y,
        cost,
        used: false,
        progress: 0,
      },
    ];
    me.interaction = undefined;
    me.interactionLatched = false;
    await page.waitForTimeout(140);
  };
  const press = async () => {
    await page.keyboard.down("e");
    await page.waitForTimeout(850);
    await page.keyboard.up("e");
  };
  const receipt = page.getByRole("status", { name: "交互效果反馈" });
  g.state.coins = 50;
  await setup("chest", 20);
  await press();
  await receipt.waitFor();
  assert.match(await receipt.innerText(), /强化.*1.*1.*2.*3.*20/);
  assert.equal(g.state.coins, 30);
  assert.equal(me.pendingUpgrades, 1);
  await page.screenshot({ path: "test-results/playability41/chest.png" });
  const x = me.x;
  await page.keyboard.down("d");
  await page.waitForTimeout(240);
  await page.keyboard.up("d");
  assert.ok(me.x > x + 15, "receipt blocked movement");
  passed.push("真实键盘E开启补给，零件准确扣除，显示强化按键，回执不阻挡移动");
  await page.waitForTimeout(1100);
  q.x = me.x + 35;
  q.y = me.y;
  me.hp = me.maxHp - 40;
  me.shield = 0;
  q.hp = q.maxHp - 12;
  q.shield = 0;
  await setup("fountain");
  await press();
  await receipt.waitFor();
  assert.match(await receipt.innerText(), /生命.*护盾/);
  assert.equal(q.interactionFeedback?.status, "complete");
  assert.match(q.interactionFeedback!.message, /12.*20/);
  await page.waitForFunction(() =>
    window.__OFFDUTY__!.state!.players.every(
      (p) => p.interactionFeedback?.status === "complete",
    ),
  );
  await page.screenshot({ path: "test-results/playability41/fountain.png" });
  passed.push("两位真实联机玩家收到各自实际治疗/护盾回执");
  await page.waitForTimeout(1100);
  me.hp = me.maxHp;
  me.shield = me.shieldCap + 20;
  q.hp = q.maxHp;
  q.shield = q.shieldCap + 20;
  await setup("fountain");
  await press();
  await page.getByRole("alert", { name: "交互失败反馈" }).waitFor();
  assert.equal(g.state.objects[0].used, false);
  await page.screenshot({
    path: "test-results/playability41/retained-supply.png",
  });
  passed.push("生命和护盾充足时明确说明补给保留，未消耗道具");
  g.state.objects = [];
  me.interaction = undefined;
  me.interactionLatched = false;
  g.state.officeProps = [
    {
      id: ++g.state.serial,
      kind: "sprinkler",
      label: "消防喷淋",
      x: me.x,
      y: me.y,
      progress: 0,
      active: 0,
      cd: 0,
      used: 0,
    },
  ];
  await page.waitForTimeout(160);
  assert.match(await page.getByLabel("E交互进度").innerText(), /减速.*10/);
  await page.keyboard.down("e");
  await page.waitForTimeout(1050);
  await page.keyboard.up("e");
  await receipt.waitFor();
  assert.match(await receipt.innerText(), /减速50%.*10/);
  assert.ok(g.state.officeProps[0].active > 8);
  await page.screenshot({ path: "test-results/playability41/sprinkler.png" });
  passed.push("环境机关操作前可预览用途，操作后显示持续时间及实际效果");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed, errors }, null, 2));
  await fs.writeFile(
    "test-results/playability41/report.json",
    JSON.stringify({ passed, errors }, null, 2),
  );
} finally {
  peers.forEach((s) => s.disconnect());
  await browser.close();
  await app.close();
  rmSync(dir, { recursive: true, force: true });
}
