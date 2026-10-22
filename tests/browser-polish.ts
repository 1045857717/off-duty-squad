import { chromium, type Page } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer } from "../server/app";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const data = mkdtempSync(path.join(tmpdir(), "polish33-")),
  app = createServer({ dataDir: data });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${(app.http.address() as any).port}`,
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_BROWSER
      ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
      : {}),
  });
const errors: string[] = [],
  passed: string[] = [],
  timers = new Set<ReturnType<typeof setTimeout>>();
let delayedPackets = 0;
await fs.mkdir("test-results/polish", { recursive: true });
const record = passed.push.bind(passed);
passed.push = (...items: string[]) => {
  console.log("POLISH_PASS", ...items);
  return record(...items);
};
const open = async (
  delayed = false,
  viewport = { width: 1440, height: 1000 },
) => {
  const p = await browser.newPage({ viewport });
  await p.addInitScript("window.__name=(fn)=>fn");
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  if (delayed)
    await p.routeWebSocket(/socket\.io/, (ws) => {
      const server = ws.connectToServer();
      let closed = false;
      const later = (fn: () => void) => {
        const t = setTimeout(() => {
          timers.delete(t);
          if (!closed) fn();
        }, 75);
        timers.add(t);
        delayedPackets++;
      };
      server.onMessage((m) => later(() => ws.send(m)));
      ws.onMessage((m) => later(() => server.send(m)));
      ws.onClose(() => {
        closed = true;
        server.close();
      });
      server.onClose(() => {
        closed = true;
        ws.close();
      });
    });
  await p.goto(url, { waitUntil: "networkidle" });
  await p.getByRole("region", { name: "公开房间大厅" }).waitFor();
  return p;
};
const choose = async (p: Page) => {
  await p.getByRole("region", { name: "地图内初始技能选择" }).waitFor();
  await p
    .locator(".deployment-screen .initial-draft>div>button")
    .first()
    .click();
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
const snap = async (p: Page, name: string, full = false) => {
  await p.screenshot({
    path: `test-results/polish/${name}.png`,
    fullPage: full,
  });
};
try {
  const host = await open(),
    peer = await open(true),
    viewer = await open();
  const contrast = await host.locator(".heading-aside").evaluate((el) => {
    const s = getComputedStyle(el),
      rgb = (v: string) =>
        v
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number),
      lum = (a: number[]) =>
        a
          .map((v) => v / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
          .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
    return (
      (lum(rgb(s.backgroundColor)) + 0.05) /
      (lum(rgb(getComputedStyle(el.querySelector("span")!).color)) + 0.05)
    );
  });
  assert.ok(contrast > 4.5, `hero copy contrast ${contrast}`);
  assert.equal(await host.locator(".dossier-stop").count(), 6);
  assert.ok(
    (await host.getByText("联系QQ：1045857717", { exact: true }).count()) >= 3,
  );
  await snap(host, "lobby", true);
  await host
    .getByRole("region", { name: "夺回下班权档案" })
    .getByRole("button")
    .nth(1)
    .click();
  await host.getByRole("dialog").waitFor();
  assert.match(await host.getByRole("dialog").innerText(), /充电|充能|配电/);
  await host.getByRole("button", { name: "关闭对话框", exact: true }).click();
  passed.push(
    "纸面六章档案可打开真实任务；右侧说明对比度达标；三处广告显示联系QQ。",
  );
  await host.getByRole("button", { name: "创建小队", exact: true }).click();
  await host.getByLabel("你的行动代号").fill("整活组长");
  await host.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await host.getByRole("region", { name: "小队准备大厅" }).waitFor();
  const code = await host.evaluate(() => window.__OFFDUTY__!.state!.code),
    g = app.rooms.get(code)!;
  await join(peer, code);
  await join(viewer, code, true);
  await host.evaluate(() => window.scrollTo(0, 0));
  const ready = await host
      .getByRole("region", { name: "小队准备大厅" })
      .boundingBox(),
    chat = await host
      .getByRole("region", { name: "小队大厅聊天" })
      .boundingBox();
  assert.ok(
    ready &&
      chat &&
      chat.x >= ready.x + ready.width - 5 &&
      chat.y < ready.y + ready.height &&
      chat.y + chat.height <= 1000,
    JSON.stringify({ ready, chat }),
  );
  await host.getByLabel("聊天内容").fill("把电充绿，队友捞齐。");
  await host.getByLabel("聊天内容").press("Enter");
  await peer
    .getByRole("log")
    .getByText("把电充绿，队友捞齐。", { exact: true })
    .waitFor();
  await viewer.getByLabel("聊天内容").fill("观战工友：下班路上不谈愿景！");
  await viewer.getByLabel("聊天内容").press("Enter");
  await host
    .getByRole("log")
    .getByText("观战工友：下班路上不谈愿景！", { exact: true })
    .waitFor();
  const seatGeometry = await host
    .locator(".ready-seat:not(.empty)")
    .first()
    .evaluate((e) => ({
      portrait: e.querySelector(".ready-portrait")!.getBoundingClientRect()
        .bottom,
      name: e.querySelector("h3")!.getBoundingClientRect().top,
    }));
  assert.ok(
    seatGeometry.portrait <= seatGeometry.name + 1,
    JSON.stringify(seatGeometry),
  );
  await snap(host, "ready-chat");
  await host.setViewportSize({ width: 1366, height: 768 });
  const footer = await host.locator(".ready-launch").boundingBox();
  const narrowChat = await host
    .getByRole("region", { name: "小队大厅聊天" })
    .boundingBox();
  assert.ok(
    footer &&
      narrowChat &&
      footer.y + footer.height <= 768 &&
      narrowChat.y + narrowChat.height <= 768,
    JSON.stringify({ footer, narrowChat }),
  );
  await snap(host, "ready-768");
  await host.setViewportSize({ width: 1440, height: 1000 });
  passed.push(
    "准备大厅与右侧茶水间同屏；真实队友和观战者双向聊天，在每方向75ms的WebSocket延迟下送达。",
  );
  assert.equal(
    await host
      .getByRole("button", { name: "小队出发", exact: true })
      .isDisabled(),
    true,
  );
  await peer.getByRole("button", { name: "我已准备", exact: true }).click();
  await host.getByRole("button", { name: "小队出发", exact: true }).click();
  await host.getByRole("status", { name: "出发倒计时" }).waitFor();
  await peer
    .getByRole("status", { name: "出发倒计时" })
    .getByRole("button", { name: "取消准备", exact: true })
    .click();
  await host.waitForFunction(
    () => window.__OFFDUTY__?.state?.phase === "lobby",
  );
  assert.equal(g.state.phase, "lobby");
  await peer.getByRole("button", { name: "我已准备", exact: true }).click();
  await host.getByRole("button", { name: "小队出发", exact: true }).click();
  await choose(host);
  assert.equal(g.state.phase, "draft");
  await choose(peer);
  await host.waitForFunction(
    () => window.__OFFDUTY__?.state?.phase === "playing",
  );
  passed.push(
    "真人准备约束、3秒内取消准备、全员地图内选卡等待均在延迟联机下正确。",
  );
  const me = g.state.players.find((p) => p.id === g.state.host)!,
    pid = await peer.evaluate(() => window.__OFFDUTY__!.playerId),
    them = g.state.players.find((p) => p.id === pid)!;
  const room = [...g.state.world.rooms].sort(
    (a, b) => b.w * b.h - a.w * a.h,
  )[0];
  me.x = room.x + room.w / 2;
  me.y = room.y + room.h / 2;
  them.x = me.x - 35;
  them.y = me.y + 35;
  for (const p of g.state.players) p.invulnerable = 9999;
  g.state.enemies = [];
  g.state.spawnCd = 999;
  g.state.eventCd = 999;
  g.state.event = { kind: "none", name: "", desc: "", remaining: 999 };
  await host.waitForTimeout(300);
  await host.evaluate(() => {
    const w = window as any;
    w.__rigSamples = [];
    const proto = w.Phaser.GameObjects.Container.prototype,
      old = proto.setData;
    proto.setData = function (k: any, v: any, ...args: any[]) {
      if (k === "pose" && this.name === "rig-" + w.__OFFDUTY__.playerId) {
        w.__rigSamples.push({ ...v });
        if (w.__rigSamples.length > 400) w.__rigSamples.shift();
        w.__rig = this;
      }
      return old.call(this, k, v, ...args);
    };
  });
  g.state.enemies = [
    {
      id: ++g.state.serial,
      kind: "tank",
      x: me.x + 130,
      y: me.y + 50,
      hp: 1e9,
      maxHp: 1e9,
      speed: 0,
      cd: 999,
      stun: 999,
      angle: 0,
      hitFlash: 0,
    },
  ];
  const auto = host.getByRole("button", {
    name: "自动开火快捷开关",
    exact: true,
  });
  if ((await auto.getAttribute("aria-pressed")) === "true")
    await host.keyboard.press("t");
  await host.keyboard.down("w");
  await host.waitForTimeout(220);
  await host.keyboard.up("w");
  assert.ok(Math.abs(me.angle + Math.PI / 2) < 0.1);
  if ((await auto.getAttribute("aria-pressed")) === "false")
    await host.keyboard.press("t");
  await host.keyboard.down("d");
  await host.waitForTimeout(600);
  await host.keyboard.up("d");
  const motion = await host.evaluate(() => {
    const w = window as any,
      s = w.__rigSamples.filter((p: any) => p.weight > 0.5);
    return {
      samples: s.length,
      legPoses: new Set(s.map((p: any) => p.leftLeg.toFixed(4))).size,
      firingSamples: s.filter((p: any) => p.fire > 0).length,
      parts: w.__rig?.getData("pose")?.parts,
      visible: w.__rig?.visible,
    };
  });
  assert.ok(
    motion.visible &&
      motion.parts === 14 &&
      motion.legPoses > 25 &&
      motion.firingSamples > 1,
    JSON.stringify(motion),
  );
  await fs.writeFile(
    "test-results/polish/motion.json",
    JSON.stringify(motion, null, 2),
  );
  await snap(host, "continuous-motion");
  passed.push(
    "近怪关闭自动开火仍正确转向；实际可见的十四关节角色在持续开火时下肢持续变化，不被攻击动作替换。",
  );
  await peer.keyboard.down("s");
  await peer.waitForTimeout(250);
  await peer.keyboard.up("s");
  await host.waitForTimeout(350);
  const hostView = await host.evaluate(
    (id) => window.__OFFDUTY__!.state!.players.find((p) => p.id === id),
    pid,
  );
  assert.ok(
    hostView && Math.hypot(hostView.x - them.x, hostView.y - them.y) < 15,
  );
  await peer.reload({ waitUntil: "networkidle" });
  await peer.waitForFunction(
    (id) =>
      window.__OFFDUTY__?.playerId === id &&
      window.__OFFDUTY__?.state?.players.some(
        (p) => p.id === id && p.connected,
      ),
    pid,
  );
  assert.equal(g.state.players.filter((p) => p.id === pid).length, 1);
  await peer.keyboard.down("a");
  await peer.waitForTimeout(200);
  await peer.keyboard.up("a");
  passed.push(
    "同屏队友位置与服务器一致；延迟客户端刷新重连保留原身份，没有重复队员，重连后仍能移动。",
  );
  await host.keyboard.press("F10");
  const veil = host.locator(".hidden-veil");
  await veil.waitFor();
  assert.doesNotMatch(
    await veil.innerText(),
    /游戏|怪物|联机|房间|角色|薪水小偷|SALARY THIEVES/,
  );
  assert.equal(await host.title(), "项目协作工作台");
  await veil.getByRole("button", { name: /继续/ }).click();
  await host.waitForTimeout(100);
  assert.equal(await veil.count(), 0);
  passed.push("F10恢复界面与按钮不出现游戏相关文字，页签标题同步变为工作台。");
  await host.keyboard.press("F2");
  await host
    .getByRole("combobox", { name: "工作模式进入方式", exact: true })
    .click();
  await host.getByRole("option", { name: "VS Code", exact: true }).click();
  await host.getByRole("button", { name: "设置好了", exact: true }).click();
  await host.keyboard.press("F8");
  await host.getByRole("region", { name: "VS Code 工作界面" }).waitFor();
  assert.equal(await host.locator(".work-page-title").count(), 0);
  const edit = host.getByLabel("代码编辑器");
  const original = await edit.inputValue();
  await edit.fill(original + "\n// 联机验收保存");
  await host.getByRole("tab", { name: "App.tsx", exact: true }).click();
  assert.doesNotMatch(await edit.inputValue(), /联机验收保存/);
  await host.getByRole("tab", { name: "report.ts", exact: true }).click();
  assert.match(await edit.inputValue(), /联机验收保存/);
  await edit.press("Control+f");
  await host.getByLabel("代码查找", { exact: true }).fill("buildSummary");
  await host.getByLabel("代码查找", { exact: true }).press("Enter");
  await host.getByRole("button", { name: "关闭代码查找", exact: true }).click();
  await snap(host, "vscode");
  await host.getByRole("button", { name: "切换工作界面", exact: true }).click();
  await host
    .getByRole("menuitem", { name: "IntelliJ IDEA", exact: true })
    .click();
  await host.getByRole("region", { name: "IntelliJ IDEA 工作界面" }).waitFor();
  assert.match(
    await host.getByLabel("代码编辑器").inputValue(),
    /class ReportService/,
  );
  await host.getByLabel("终端命令").fill("git status");
  await host.getByLabel("终端命令").press("Enter");
  await host
    .getByRole("region", { name: "IDE终端" })
    .getByText("Working tree checked.", { exact: true })
    .waitFor();
  await snap(host, "idea");
  await host.getByRole("button", { name: "切换工作界面", exact: true }).click();
  await host.getByRole("menuitem", { name: "Excel 表格", exact: true }).click();
  await host.getByRole("region", { name: "Excel风格工作表" }).waitFor();
  assert.equal(await host.locator(".work-page-title").count(), 0);
  await host.keyboard.press("F8");
  passed.push(
    "VS Code/IntelliJ使用独立真实布局，文件各自持久编辑、查找、终端和切换可用；Excel不再套通用大标题。",
  );
  g.state.elapsed = 74;
  me.damageDealt = 12345;
  me.kills = 32;
  me.healingDone = 52;
  me.rescues = 2;
  me.criticalHits = 18;
  them.damageDealt = 8421;
  g.state.stats.kills = 54;
  g.state.phase = "lost";
  for (const p of g.state.players) {
    p.alive = false;
    p.hp = 0;
  }
  await host.getByRole("region", { name: "本局战斗统计" }).waitFor();
  await peer.getByRole("region", { name: "本局战斗统计" }).waitFor();
  assert.equal(
    await peer
      .getByRole("button", { name: "等待房主重整", exact: true })
      .isDisabled(),
    true,
  );
  await host
    .getByRole("button", { name: `查看${them.name}的结算构筑`, exact: true })
    .click();
  assert.match(
    await host.getByRole("complementary", { name: "结算构筑详情" }).innerText(),
    new RegExp(them.name),
  );
  await snap(host, "report");
  await host.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await host.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await snap(host, "report-mobile");
  await host.setViewportSize({ width: 1440, height: 1000 });
  await host
    .getByRole("button", { name: "重整队伍，再来一把", exact: true })
    .click();
  await host.getByRole("region", { name: "小队准备大厅" }).waitFor();
  assert.equal(g.state.phase, "lobby");
  assert.equal(g.state.players.filter((p) => p.id === pid).length, 1);
  passed.push(
    "联机全队结算展示真实整数统计、可查看队员构筑，390px布局无页面溢出；只有房主能重整，所有人回到同一准备大厅。",
  );
  await host
    .getByRole("button", { name: "模式：夺回下班权", exact: true })
    .click();
  await peer.getByRole("button", { name: "我已准备", exact: true }).click();
  await host.getByRole("button", { name: "小队出发", exact: true }).click();
  await choose(host);
  await choose(peer);
  await host.waitForFunction(
    () =>
      window.__OFFDUTY__?.state?.phase === "playing" &&
      window.__OFFDUTY__?.state?.world.biome === "facility",
  );
  assert.equal(g.state.mode, "expedition");
  const restartedMe = g.state.players.find((p) => p.id === g.state.host)!,
    before = restartedMe.x;
  for (const p of g.state.players) p.invulnerable = 999;
  await host.keyboard.down("d");
  await host.waitForTimeout(220);
  await host.keyboard.up("d");
  assert.ok(Math.abs(restartedMe.x - before) > 1);
  passed.push(
    "结算重整后切换六章模式，实际进入办公楼地图，重新选卡后可正常移动。",
  );
  g.state.mission = 5;
  g.state.elapsed = 91;
  g.state.phase = "won";
  await host
    .getByRole("region", { name: "本局战斗统计" })
    .getByText("下班成功，谁也别加班。", { exact: true })
    .waitFor();
  await snap(host, "report-won");
  await host.getByRole("button", { name: "返回大厅", exact: true }).click();
  await host.getByRole("region", { name: "公开房间大厅" }).waitFor();
  await peer.waitForFunction(
    () => window.__OFFDUTY__?.state?.host === window.__OFFDUTY__?.playerId,
  );
  assert.equal(g.state.host, pid);
  passed.push(
    "成功结算分支可见；房主从结算返回大厅后真实队友接任，房间继续保留。",
  );
  const mobile = await open(false, { width: 390, height: 844 });
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await snap(mobile, "lobby-mobile", true);
  await mobile.getByRole("button", { name: /先一个人试跑/ }).click();
  await mobile.getByRole("region", { name: "小队准备大厅" }).waitFor();
  await mobile
    .getByRole("button", { name: "展开聊天频道", exact: true })
    .click();
  const mobileChat = await mobile
    .getByRole("region", { name: "小队大厅聊天" })
    .boundingBox();
  assert.ok(
    mobileChat && mobileChat.y >= 0 && mobileChat.y + mobileChat.height <= 844,
  );
  await snap(mobile, "ready-chat-mobile");
  await mobile
    .getByRole("button", { name: "收起聊天频道", exact: true })
    .click();
  passed.push(
    "1366×768整备按钮和茶水间同屏；手机提供原位折叠茶水间，无需滚动找聊天。",
  );
  assert.ok(delayedPackets > 20);
  assert.deepEqual(errors, []);
  await fs.writeFile(
    "test-results/polish/report.json",
    JSON.stringify(
      {
        passed,
        errors,
        heroContrast: contrast,
        delayedPackets,
        latencyMsPerDirection: 75,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed, errors, delayedPackets }, null, 2));
} finally {
  for (const t of timers) clearTimeout(t);
  await browser.close();
  await app.close();
  rmSync(data, { recursive: true, force: true });
}
