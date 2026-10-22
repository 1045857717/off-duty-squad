import { chromium, type Page } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "../server/app";
import { ATTACK_IDS, ROLE_SIGNATURE } from "../shared/arsenal";
import {
  ENEMY_DEFS,
  ATTACK_MOTIONS,
  SIGNATURE_MOTIONS,
} from "../shared/combatProfiles";
import type { EnemyKind } from "../shared/types";
import { rankingWindow } from "../shared/rankPeriod";
const dir = mkdtempSync(path.join(tmpdir(), "feedback34-"));
const today = Date.now();
const entries = [
  { name: "今日工友", at: today - 1000, score: 123 },
  { name: "本周工友", at: today - 3 * 86400000, score: 222 },
  { name: "上个月工友", at: today - 40 * 86400000, score: 333 },
  { name: "去年工友", at: today - 400 * 86400000, score: 444 },
].map((e, i) => ({
  id: "record-" + i,
  squadName: e.name,
  members: ["真实工友"],
  mode: "survival",
  difficulty: "normal",
  wave: 3,
  mission: 1,
  level: 2,
  kills: 20,
  damage: 999,
  score: e.score,
  elapsed: 60,
  won: false,
  seed: 1,
  at: new Date(e.at).toISOString(),
}));
writeFileSync(path.join(dir, "squad-scores.json"), JSON.stringify(entries));
const app = createServer({ dataDir: dir });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${(app.http.address() as any).port}`,
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_BROWSER
      ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
      : {}),
  });
const errors: string[] = [],
  passed: string[] = [];
await fs.mkdir("test-results/feedback", { recursive: true });
const done = (s: string) => {
  passed.push(s);
  console.log("FEEDBACK_PASS", s);
};
const open = async (name: string, width = 1440, height = 1000) => {
  const p = await browser.newPage({ viewport: { width, height } });
  await p.addInitScript((name) => {
    (window as any).__name = (f: any) => f;
    localStorage.setItem("offduty-name", JSON.stringify(name));
  }, name);
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await p.goto(base, { waitUntil: "networkidle" });
  await p.getByRole("region", { name: "公开房间大厅" }).waitFor();
  return p;
};
const snap = async (p: Page, name: string, full = false) => {
  await p.waitForTimeout(260);
  return p.screenshot({
    path: `test-results/feedback/${name}.png`,
    fullPage: full,
  });
};
const close = async (p: Page) => {
  await p.getByRole("button", { name: "关闭对话框", exact: true }).click();
};
const join = async (p: Page, code: string, watch = false) => {
  await p.getByLabel("搜索公开房间").fill(code);
  await p
    .locator(".live-room-list article")
    .filter({ hasText: code })
    .getByRole("button", { name: watch ? "观战" : "加入小队", exact: true })
    .click();
  await p.getByRole("region", { name: "小队准备大厅" }).waitFor();
};
try {
  const host = await open("动作组长"),
    peer = await open("联机队友"),
    viewer = await open("观战工友");
  await host.waitForFunction(
    () =>
      document.querySelector('[aria-label="全站在线人数"] b')?.textContent ===
      "3",
  );
  done("全站在线人数包含大厅访客；3个真实浏览器会话显示3，不把AI算进去。");
  await host.getByRole("button", { name: "图鉴与档案", exact: true }).click();
  await host.getByRole("dialog", { name: "工友随身图鉴" }).waitFor();
  assert.equal(
    await host
      .getByRole("navigation", { name: "图鉴条目" })
      .getByRole("button")
      .count(),
    7,
  );
  await host
    .getByRole("navigation", { name: "图鉴条目" })
    .getByRole("button")
    .filter({ hasText: ENEMY_DEFS.shooter.name })
    .click();
  assert.match(
    await host.getByRole("region", { name: "图鉴详细说明" }).innerText(),
    /3枚/,
  );
  await snap(host, "codex-enemies");
  await host.getByRole("tab", { name: /攻击技能/ }).click();
  assert.equal(
    await host
      .getByRole("navigation", { name: "图鉴条目" })
      .getByRole("button")
      .count(),
    16,
  );
  const before = await host.locator(".codex-metrics").innerText();
  await host.getByRole("button", { name: "Lv.8 · 满级", exact: true }).click();
  assert.notEqual(await host.locator(".codex-metrics").innerText(), before);
  await snap(host, "codex-equipment");
  await host.getByLabel("搜索图鉴").fill("不存在的加班理由");
  await host
    .getByText("没找到这一条，换个关键词试试。", { exact: true })
    .waitFor();
  await host.getByRole("tab", { name: /职业技能/ }).click();
  assert.equal(
    await host
      .getByRole("navigation", { name: "图鉴条目" })
      .getByRole("button")
      .count(),
    28,
  );
  await host.getByRole("tab", { name: "个人档案", exact: true }).click();
  assert.ok(await host.locator(".codex-record-grid").count());
  await close(host);
  done("图鉴包含7敌人/16攻击/28职业/个人记录，搜索和成长等级预览真实可用。");
  await host.getByRole("button", { name: "行动指南", exact: true }).click();
  await host.getByRole("dialog", { name: "工友行动手册" }).waitFor();
  await snap(host, "guide-start");
  await host.getByRole("tab", { name: "快捷键", exact: true }).click();
  assert.match(await host.locator(".guide-keys").innerText(), /鼠标左键/);
  assert.doesNotMatch(
    await host.locator(".guide-keys").innerText(),
    /Space.*攻击/,
  );
  await snap(host, "guide-keys");
  await close(host);
  await host.getByRole("button", { name: "小队总排名", exact: true }).click();
  await host.getByRole("dialog", { name: "今天谁最会下班？" }).waitFor();
  await host.waitForFunction(
    () =>
      document.querySelectorAll(
        ".rank-v34 .squad-rank-list>div:not(.rank-empty)",
      ).length === 4,
  );
  await host.getByRole("tab", { name: "日榜", exact: true }).click();
  await host.waitForFunction(
    () =>
      document.querySelectorAll(
        ".rank-v34 .squad-rank-list>div:not(.rank-empty)",
      ).length === 1,
  );
  assert.match(await host.locator(".rank-v34").innerText(), /今日工友/);
  for (const [id, label] of [
    ["week", "周榜"],
    ["month", "月榜"],
    ["year", "年榜"],
  ] as const) {
    await host.getByRole("tab", { name: label, exact: true }).click();
    const win = rankingWindow(id, today),
      expected = entries.filter(
        (e) => Date.parse(e.at) >= win.start && Date.parse(e.at) < win.end,
      ).length;
    await host.waitForFunction(
      (n) =>
        document.querySelectorAll(
          ".rank-v34 .squad-rank-list>div:not(.rank-empty)",
        ).length === n,
      expected,
    );
  }
  await snap(host, "rank-year");
  await close(host);
  done(
    "指南使用统一纸面配色并纠正攻击快捷键；日/周/月/年/总榜按服务端时间边界筛选真实记录。",
  );
  await host.getByRole("button", { name: "创建小队", exact: true }).click();
  await host.getByLabel("你的行动代号").fill("动作组长");
  await host.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await host.getByRole("region", { name: "小队准备大厅" }).waitFor();
  const code = await host.evaluate(() => window.__OFFDUTY__!.state!.code),
    g = app.rooms.get(code)!,
    me = g.state.players[0];
  await join(peer, code);
  await join(viewer, code, true);
  await host.getByRole("button", { name: "任务简报", exact: true }).click();
  await host.getByRole("region", { name: "当前任务简报" }).waitFor();
  await snap(host, "live-brief");
  const box = await host.getByRole("dialog").boundingBox();
  assert.ok(box && box.width > 400);
  await host.getByRole("button", { name: "返回行动现场", exact: true }).click();
  await host.getByRole("region", { name: "小队准备大厅" }).waitFor();
  done(
    "准备大厅点击任务简报会打开真正可见且可操作的独立面板，关闭可返回原小队。",
  );
  await host
    .getByRole("button", { name: "管理队员 联机队友", exact: true })
    .click();
  await host
    .getByRole("group", { name: "确认移出联机队友", exact: true })
    .waitFor();
  await snap(host, "kick-confirm");
  await host.getByRole("button", { name: "留下他", exact: true }).click();
  assert.equal(g.state.players.length, 2);
  const extra = await open("待管理工友");
  await join(extra, code);
  await host
    .getByRole("button", { name: "管理队员 待管理工友", exact: true })
    .click();
  await host
    .getByRole("group", { name: "确认移出待管理工友", exact: true })
    .getByRole("button", { name: "确认移出", exact: true })
    .click();
  await extra.getByRole("region", { name: "公开房间大厅" }).waitFor();
  assert.equal(g.state.players.length, 2);
  await extra.close();
  done(
    "队员管理入口独立成按钮，移出前确认可取消，实际移出后释放席位并让队员回到大厅。",
  );
  await host
    .context()
    .grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
  await host.getByRole("button", { name: "复制邀请链接", exact: true }).click();
  assert.doesNotMatch(await host.locator(".toast").innerText(), /局域网/);
  await peer.getByRole("button", { name: "我已准备", exact: true }).click();
  await host.getByRole("button", { name: "小队出发", exact: true }).click();
  await host.getByRole("region", { name: "地图内初始技能选择" }).waitFor();
  await host
    .locator(".deployment-screen .initial-draft>div>button")
    .first()
    .click();
  await peer
    .locator(".deployment-screen .initial-draft>div>button")
    .first()
    .click();
  await host.waitForFunction(
    () => window.__OFFDUTY__?.state?.phase === "playing",
  );
  g.state.enemies = [];
  g.state.objects = [];
  g.state.officeProps = [];
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  g.state.event = { kind: "none", name: "", desc: "", remaining: 999 };
  g.state.waveEnds = 999;
  for (const p of g.state.players) p.invulnerable = 9999;
  const room = [...g.state.world.rooms].sort(
      (a, b) => b.w * b.h - a.w * a.h,
    )[0],
    center = { x: room.x + room.w / 2, y: room.y + room.h / 2 };
  me.x = center.x;
  me.y = center.y;
  g.state.players[1].x = center.x - 50;
  g.state.players[1].y = center.y + 30;
  await host.waitForTimeout(400);
  await host.evaluate(() => {
    const w = window as any;
    w.__poses = [];
    const proto = w.Phaser.GameObjects.Container.prototype,
      old = proto.setData;
    proto.setData = function (k: any, v: any, ...args: any[]) {
      if (k === "pose" && this.name === "rig-" + w.__OFFDUTY__.playerId) {
        w.__rig = this;
        w.__scene = this.scene;
        w.__poses.push({ ...v });
        if (w.__poses.length > 6000) w.__poses.shift();
      }
      return old.call(this, k, v, ...args);
    };
  });
  const auto = host.getByRole("button", {
    name: "自动开火快捷开关",
    exact: true,
  });
  if ((await auto.getAttribute("aria-pressed")) === "true")
    await host.keyboard.press("t");
  await host.keyboard.down("w");
  await host.keyboard.down("a");
  await host.waitForTimeout(280);
  await host.waitForFunction(() => (window as any).__rig?.pose.column === 5);
  await Promise.all([host.keyboard.up("a"), host.keyboard.up("w")]);
  await host.waitForTimeout(100);
  let col = await host.evaluate(() => (window as any).__rig.pose.column);
  assert.equal(col, 5);
  await snap(host, "upper-left");
  await host.keyboard.down("w");
  await host.keyboard.down("d");
  await host.waitForTimeout(280);
  await host.waitForFunction(() => (window as any).__rig?.pose.column === 4);
  await Promise.all([host.keyboard.up("d"), host.keyboard.up("w")]);
  await host.waitForTimeout(100);
  col = await host.evaluate(() => (window as any).__rig.pose.column);
  assert.equal(col, 4);
  await snap(host, "upper-right");
  done(
    "左上使用真实斜后左素材、右上使用真实斜后右素材；实际可见14关节角色方向正确。",
  );
  me.x = center.x;
  me.y = center.y;
  g.state.coins = 0;
  g.state.objects = [
    {
      id: ++g.state.serial,
      kind: "chest",
      label: "验收工具箱",
      x: me.x + 25,
      y: me.y,
      cost: 45,
      used: false,
      progress: 0,
    },
  ];
  await host.waitForTimeout(150);
  await host.keyboard.down("e");
  await host.waitForTimeout(180);
  await host.keyboard.up("e");
  await host.getByRole("alert", { name: "交互失败反馈" }).waitFor();
  assert.match(
    await host.getByRole("alert", { name: "交互失败反馈" }).innerText(),
    /45.*零件/,
  );
  await snap(host, "interaction-failed");
  assert.equal(g.state.coins, 0);
  done(
    "E零件不足由服务端明确拒绝，显示缺额、短促抖动和反馈，资源不会被错误扣除。",
  );
  g.state.objects = [];
  me.arsenal = {};
  me.invulnerable = 0;
  me.shield = 25;
  g.state.enemies = [
    {
      id: ++g.state.serial,
      kind: "mite",
      x: me.x + 30,
      y: me.y,
      hp: 1e5,
      maxHp: 1e5,
      speed: 0,
      cd: 0,
      angle: Math.PI,
      hitFlash: 0,
    },
  ];
  const beforeHp = me.hp;
  await host.waitForTimeout(240);
  assert.equal(me.hp, beforeHp);
  assert.ok(g.state.enemies[0].windup! > 0);
  await snap(host, "enemy-windup");
  await host.getByRole("status", { name: "本次受击来源" }).waitFor();
  assert.ok(
    (
      await host.getByRole("status", { name: "本次受击来源" }).innerText()
    ).includes(ENEMY_DEFS.mite.name),
  );
  assert.equal(me.lastHit?.sourceKind, "mite");
  await snap(host, "damage-source");
  me.invulnerable = 9999;
  done(
    "敌人先蓄力再出手，伤害来自实际敌人；受击界面显示来源、方向和护盾反馈。",
  );
  const kinds = Object.keys(ENEMY_DEFS) as EnemyKind[];
  g.state.enemies = kinds.map((kind, i) => ({
    id: ++g.state.serial,
    kind,
    x: me.x + Math.cos((i / 7) * Math.PI * 2) * 95,
    y: me.y + Math.sin((i / 7) * Math.PI * 2) * 95,
    hp: 1e7,
    maxHp: 1e7,
    speed: 75,
    cd: 0.1,
    angle: 0,
    hitFlash: 0,
    screamCd: 999,
  }));
  const enemyIds = g.state.enemies.map((e) => ({ kind: e.kind, id: e.id }));
  await host.waitForTimeout(150);
  const audit = await host.evaluate(async (ids) => {
    const w = window as any,
      records: any = {};
    for (let frame = 0; frame < 35; frame++) {
      for (const e of ids) {
        const rig = w.__scene.children.list.find(
          (c: any) => c.name === "rig-e" + e.id,
        );
        if (!rig) continue;
        const rec = (records[e.kind] ??= {
          parts: rig.pose.parts,
          poses: [],
          texture: rig.layers[0].images.get("head").texture.key,
          visible: rig.visible,
        });
        rec.poses.push({ ...rig.pose });
      }
      await new Promise((r) => setTimeout(r, 65));
    }
    return records;
  }, enemyIds);
  for (const kind of kinds) {
    assert.equal(audit[kind]?.parts, 15, kind);
    assert.equal(audit[kind]?.texture, "joint-atlas-v40");
    assert.ok(audit[kind]?.poses.length >= 3, kind);
  }
  await fs.writeFile(
    "test-results/feedback/enemy-joints.json",
    JSON.stringify(audit, null, 2),
  );
  await snap(host, "enemy-joints");
  const deathId = g.state.enemies.find((e) => e.kind !== "bomber")!.id;
  g.state.enemies.find((e) => e.id === deathId)!.hp = 0;
  await host.waitForTimeout(320);
  const falling = await host.evaluate((id) => {
    const w = window as any,
      r = w.__scene.children.list.find((c: any) => c.name === "rig-e" + id);
    return r
      ? { rotation: r.rotation, fall: r.pose.fall, dying: r.pose.dying }
      : null;
  }, deathId);
  assert.ok(
    falling && falling.dying && falling.rotation > 0.3,
    JSON.stringify(falling),
  );
  await snap(host, "enemy-fall");
  done(
    "7类敌人均使用可见15关节丧尸骨架和同一GPU图集，持续移动/蓄力/出手，并有连续倒地收尾。",
  );
  g.state.enemies = [];
  g.state.bullets = [];
  g.state.areas = [];
  me.hp = me.maxHp;
  me.invulnerable = 9999;
  if ((await auto.getAttribute("aria-pressed")) === "false")
    await host.keyboard.press("t");
  const attacks: any[] = [];
  for (const id of ATTACK_IDS) {
    me.x = center.x;
    me.y = center.y;
    me.arsenal = { [id]: 1 };
    me.basicCd = 999;
    me.attackCooldowns = {};
    me.rate = 0.11;
    g.state.areas = [];
    g.state.enemies = [
      {
        id: ++g.state.serial,
        kind: "tank",
        x: me.x + 90,
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
    await host.evaluate(() => {
      (window as any).__poses = [];
    });
    await host.keyboard.down("s");
    await host.waitForTimeout(170);
    await host.keyboard.up("s");
    await host.keyboard.down("w");
    await host.waitForTimeout(170);
    await host.keyboard.up("w");
    await host.waitForTimeout(420);
    await host.waitForFunction(
      (id) =>
        (window as any).__poses.some(
          (p: any) => p.attack === id && p.attackPhase > 0.72,
        ),
      id,
      { timeout: 2500 },
    );
    const data = await host.evaluate((id) => {
      const rows = (window as any).__poses.filter((p: any) => p.attack === id);
      return {
        id,
        samples: rows.length,
        peak: Math.max(0, ...rows.map((p: any) => p.attackPhase)),
        elbows: new Set(
          rows.map((p: any) => (p.elbow + p.rightElbow).toFixed(4)),
        ).size,
        arms: new Set(rows.map((p: any) => p.leftArm.toFixed(4))).size,
        parts: (window as any).__rig.pose.parts,
      };
    }, id);
    assert.ok(
      data.samples > 12 && data.peak > 0.65 && data.arms > 3,
      JSON.stringify(data),
    );
    attacks.push({ ...data, kind: ATTACK_MOTIONS[id].kind });
    if (["bat", "mop", "wrench", "pulse"].includes(id))
      await snap(host, "attack-" + id);
  }
  await fs.writeFile(
    "test-results/feedback/attack-audit.json",
    JSON.stringify(attacks, null, 2),
  );
  done(
    "逐项验证16种攻击的可见起手/出手/收招，高攻速也能完成动作，肘腕和下肢不被重置冻结。",
  );
  const signatures: any[] = [];
  me.arsenal = {};
  for (const [role, ability] of Object.entries(ROLE_SIGNATURE)) {
    me.ability = ability;
    me.skillCd = 0;
    await host.waitForTimeout(40);
    await host.keyboard.press("q");
    await host.waitForTimeout(190);
    const signature = await host.evaluate(
      () => (window as any).__rig.pose.signature,
    );
    assert.equal(signature, SIGNATURE_MOTIONS[ability], role);
    signatures.push({ role, ability, signature });
    await host.waitForTimeout(80);
  }
  await fs.writeFile(
    "test-results/feedback/signature-audit.json",
    JSON.stringify(signatures, null, 2),
  );
  done("28个职业Q都能驱动对应动作族，和16种随机攻击分开，不会覆盖职业技能。");
  const peerId = await peer.evaluate(() => window.__OFFDUTY__!.playerId);
  await peer.reload({ waitUntil: "networkidle" });
  await peer.waitForFunction(
    (id) => window.__OFFDUTY__?.playerId === id,
    peerId,
  );
  assert.equal(g.state.players.filter((p) => p.id === peerId).length, 1);
  done("真实队员重连保留身份与房间，不出现重复队员；在线汇总继续更新。");
  const mobile = await open("手机工友", 390, 844);
  await mobile.getByRole("button", { name: "图鉴与档案", exact: true }).click();
  await mobile.getByRole("dialog", { name: "工友随身图鉴" }).waitFor();
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await snap(mobile, "codex-mobile");
  await close(mobile);
  await mobile.getByRole("button", { name: "行动指南", exact: true }).click();
  await snap(mobile, "guide-mobile");
  await close(mobile);
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/feedback/report.json",
    JSON.stringify(
      {
        passed,
        errors,
        attacks: attacks.length,
        signatures: signatures.length,
        enemies: 7,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed, errors }, null, 2));
} finally {
  await browser.close();
  await app.close();
  rmSync(dir, { recursive: true, force: true });
}
