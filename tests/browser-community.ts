import { chromium, type Page } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { io, type Socket } from "socket.io-client";
import { createServer } from "../server/app";
import { launchFromDraft } from "./browser-support";
const dataDir = mkdtempSync(path.join(tmpdir(), "community36-"));
const app = createServer({ dataDir });
await new Promise<void>((r) => app.http.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + (app.http.address() as any).port;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
});
const errors: string[] = [],
  passed: string[] = [],
  helpers: Socket[] = [];
await fs.mkdir("test-results/community", { recursive: true });
const done = (text: string) => {
  passed.push(text);
  console.log("COMMUNITY_PASS", text);
};
const open = async (name: string, width = 1440) => {
  const p = await browser.newPage({ viewport: { width, height: 1000 } });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.addInitScript((name) => {
    (window as any).__name = (f: any) => f;
    localStorage.setItem("offduty-name", JSON.stringify(name));
  }, name);
  await p.goto(base);
  await p.getByRole("region", { name: "公开房间大厅" }).waitFor();
  return p;
};
const tabs = (p: Page) => p.getByRole("region", { name: "大厅聊天频道" });
const publicTab = (p: Page) => tabs(p).getByRole("tab", { name: /公共聊天室/ });
const squadTab = (p: Page) => tabs(p).getByRole("tab", { name: /小队茶水间/ });
const publicLog = (p: Page) =>
  p.getByRole("region", { name: "公共大厅聊天" }).getByRole("log");
const say = async (p: Page, text: string) => {
  await publicTab(p).click();
  const input = p.getByLabel("大厅聊天内容", { exact: true });
  await input.fill(text);
  await input.press("Enter");
  await input.waitFor();
  await p.waitForFunction(() => {
    const input = document.querySelector(
      'input[aria-label="大厅聊天内容"]',
    ) as HTMLInputElement;
    return input?.value === "" && document.activeElement !== input;
  });
};
const create = async (p: Page, name: string) => {
  await p.getByRole("button", { name: "创建小队", exact: true }).click();
  await p.getByLabel("你的行动代号").fill(name);
  await p.getByRole("button", { name: "创建小队，邀请同事" }).click();
  await p.getByRole("region", { name: "小队准备大厅" }).waitFor();
  return p.evaluate(() => window.__OFFDUTY__!.state!.code);
};
const snap = (p: Page, name: string) =>
  p.screenshot({
    path: "test-results/community/" + name + ".png",
    fullPage: false,
  });
const helper = async () => {
  const socket = io(base, { transports: ["websocket"], forceNew: true });
  helpers.push(socket);
  await new Promise<void>((r) => socket.once("connect", r));
  return socket;
};
const ack = (s: Socket, event: string, data: unknown) =>
  s.timeout(4000).emitWithAck(event, data);
try {
  const a = await open("公屏工友A"),
    b = await open("公屏工友B"),
    viewer = await open("板凳观众"),
    outside = await open("围观工友");
  assert.match(await a.locator(".scene-copy h2").innerText(), /班是公司的/);
  assert.match(await a.locator(".scene-copy h2").innerText(), /鱼是自己的/);
  assert.match(
    await a.locator(".scene-copy p").innerText(),
    /摸到的鱼，才算自己挣到的/,
  );
  await say(a, "工资没涨，先涨点战斗力");
  await publicLog(b)
    .getByText("工资没涨，先涨点战斗力", { exact: true })
    .waitFor();
  assert.match(
    await publicLog(b).locator("time").last().innerText(),
    /\d{2}:\d{2}/,
  );
  await snap(a, "lobby-public-chat");
  done(
    "大厅直接可见公共聊天室，跨浏览器同步昵称/时间/消息，发送后清空并退出输入；新标语显示正确",
  );
  const roomA = await create(a, "甲组工友"),
    roomB = await create(b, "乙组工友");
  assert.notEqual(roomA, roomB);
  await squadTab(a).waitFor();
  await viewer.getByLabel("搜索公开房间").fill(roomA);
  await viewer
    .locator(".live-room-list article")
    .filter({ hasText: roomA })
    .getByRole("button", { name: "观战", exact: true })
    .click();
  await viewer.getByRole("region", { name: "小队准备大厅" }).waitFor();
  await say(a, "跨房间吹水，队伍不用退");
  await tabs(b)
    .getByLabel(/条公共未读/)
    .waitFor();
  assert.equal(await squadTab(b).getAttribute("aria-selected"), "true");
  assert.equal(
    await b
      .getByRole("region", { name: "小队大厅聊天" })
      .getByText("跨房间吹水，队伍不用退", { exact: true })
      .count(),
    0,
  );
  await publicTab(b).click();
  await publicLog(b)
    .getByText("跨房间吹水，队伍不用退", { exact: true })
    .waitFor();
  assert.equal(
    await tabs(b)
      .getByLabel(/条公共未读/)
      .count(),
    0,
  );
  done(
    "不同房间保持各自小队，公屏消息产生未读提示，查看后清零且不串入队内频道",
  );
  await squadTab(a).click();
  const privateInput = a.getByLabel("聊天内容", { exact: true });
  await privateInput.fill("甲组茶水暗号");
  await privateInput.press("Enter");
  await viewer
    .getByRole("region", { name: "小队大厅聊天" })
    .getByText("甲组茶水暗号", { exact: true })
    .waitFor();
  assert.equal(
    await publicLog(b).getByText("甲组茶水暗号", { exact: true }).count(),
    0,
  );
  await say(viewer, "观众自带板凳");
  await publicLog(b).getByText("观众自带板凳", { exact: true }).waitFor();
  assert.match(
    await publicLog(b)
      .locator(".public-chat-message")
      .filter({ hasText: "观众自带板凳" })
      .innerText(),
    /观战/,
  );
  done("小队私聊仅本队与观众可见；观战者可向公共聊天室发言并显示观战标识");
  await privateInput.fill("暂存的队内吐槽");
  await publicTab(a).click();
  const publicInput = a.getByLabel("大厅聊天内容", { exact: true });
  await publicInput.fill("暂存的公屏吐槽");
  await squadTab(a).click();
  assert.equal(
    await a.getByLabel("聊天内容", { exact: true }).inputValue(),
    "暂存的队内吐槽",
  );
  await publicTab(a).click();
  assert.equal(
    await a.getByLabel("大厅聊天内容", { exact: true }).inputValue(),
    "暂存的公屏吐槽",
  );
  done("频道切换保留各自未发送草稿");
  await publicInput.fill("中文候选确认不误发");
  await publicInput.dispatchEvent("compositionstart");
  await publicInput.dispatchEvent("keydown", {
    key: "Enter",
    code: "Enter",
    isComposing: true,
    keyCode: 229,
    bubbles: true,
    cancelable: true,
  });
  await a.waitForTimeout(100);
  assert.equal(await publicInput.inputValue(), "中文候选确认不误发");
  assert.equal(
    await publicLog(b).getByText("中文候选确认不误发", { exact: true }).count(),
    0,
  );
  await publicInput.dispatchEvent("compositionend");
  await publicInput.press("Enter");
  await publicLog(b).getByText("中文候选确认不误发", { exact: true }).waitFor();
  done("中文输入法确认候选词不会误提交消息");
  const autoBefore = await a
    .getByRole("button", { name: "自动开火快捷开关", exact: true })
    .getAttribute("aria-pressed");
  await publicInput.fill("");
  await publicInput.press("t");
  assert.equal(
    await a
      .getByRole("button", { name: "自动开火快捷开关", exact: true })
      .getAttribute("aria-pressed"),
    autoBefore,
  );
  await publicInput.fill("切工作也保留这句吐槽");
  await publicInput.press("F8");
  await a.locator(".work-screen").waitFor();
  await a.keyboard.press("F8");
  await publicInput.waitFor();
  assert.equal(await publicInput.inputValue(), "切工作也保留这句吐槽");
  await publicInput.fill("");
  done("公屏输入不误触T开火，F8在输入中仍能切换工作并保留草稿");
  const injector = await helper();
  await ack(injector, "lobby:chat", {
    name: "文本工友",
    text: '<img src=x onerror="window.__CHAT_XSS=1">',
  });
  await publicLog(a)
    .getByText('<img src=x onerror="window.__CHAT_XSS=1">', { exact: true })
    .waitFor();
  assert.equal(await a.evaluate(() => (window as any).__CHAT_XSS), undefined);
  assert.equal(await publicLog(a).locator("img").count(), 0);
  done("聊天中的 HTML 作为文本呈现");
  for (let group = 0; group < 16; group++) {
    const sender = await helper();
    for (let n = 0; n < 4; n++) {
      const id = group * 4 + n;
      assert.equal(
        (
          await ack(sender, "lobby:chat", {
            name: "缓存工友",
            text: "公屏缓存消息-" + id,
          })
        ).ok,
        true,
      );
    }
  }
  await publicLog(a).getByText("公屏缓存消息-63", { exact: true }).waitFor();
  assert.equal(await publicLog(a).locator(".public-chat-message").count(), 60);
  await publicLog(a).evaluate((el) => {
    el.scrollTop = 0;
    el.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  const lastSender = await helper();
  await ack(lastSender, "lobby:chat", {
    name: "尾部工友",
    text: "第六十条以后继续更新",
  });
  await a.getByRole("button", { name: /有新消息，回到底部/ }).waitFor();
  assert.ok(await publicLog(a).evaluate((el) => el.scrollTop < 40));
  await a.getByRole("button", { name: /有新消息，回到底部/ }).click();
  assert.ok(
    await publicLog(a).evaluate(
      (el) => el.scrollHeight - el.scrollTop - el.clientHeight < 2,
    ),
  );
  await snap(a, "ready-public-chat");
  done("60条容量后仍能接收/自动跟随；翻阅旧消息时保持位置并提示新消息");
  helpers.forEach((s) => s.disconnect());
  await launchFromDraft(a);
  const game = app.rooms.get(roomA)!;
  game.state.enemies = [];
  game.state.spawnCd = 999;
  game.state.eventCd = 999;
  game.state.waveEnds = 999;
  const me = game.state.players.find((p) => p.name === "甲组工友")!;
  me.invulnerable = 9999;
  const chamber = [...game.state.world.rooms].sort(
    (a, b) => b.w * b.h - a.w * a.h,
  )[0];
  me.x = chamber.x + chamber.w / 2;
  me.y = chamber.y + chamber.h / 2;
  await a.getByRole("button", { name: "展开聊天频道", exact: true }).waitFor();
  await say(a, "我在图里也能吹水");
  await publicLog(b).getByText("我在图里也能吹水", { exact: true }).waitFor();
  const beforeX = me.x;
  await a.keyboard.down("d");
  await a.waitForTimeout(220);
  await a.keyboard.up("d");
  assert.ok(me.x > beforeX + 10);
  await snap(a, "combat-public-chat");
  done("对局中默认收起，展开后可跨房间发言，发送后仍能继续移动");
  await outside.setViewportSize({ width: 390, height: 844 });
  await publicTab(outside).click();
  await publicLog(outside)
    .getByText("我在图里也能吹水", { exact: true })
    .waitFor();
  const box = await tabs(outside).boundingBox();
  if (!box || box.x < 0 || box.x + box.width > 391) {
    await snap(outside, "mobile-overflow");
    await fs.writeFile(
      "test-results/community/mobile-geometry.json",
      JSON.stringify(
        await tabs(outside).evaluate((el) => {
          const rows = [];
          for (let n: Element | null = el; n; n = n.parentElement) {
            const r = n.getBoundingClientRect(),
              s = getComputedStyle(n);
            rows.push({
              tag: n.className,
              x: r.x,
              w: r.width,
              grid: s.gridTemplateColumns,
              position: s.position,
              min: s.minWidth,
              width: s.width,
              transform: s.transform,
            });
          }
          return {
            rows,
            viewport: innerWidth,
            scroll: document.documentElement.scrollWidth,
          };
        }),
        null,
        2,
      ),
    );
  }
  assert.ok(box && box.x >= 0 && box.x + box.width <= 391, JSON.stringify(box));
  assert.ok(
    await outside.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await snap(outside, "mobile-public-chat");
  done("390px 手机公共聊天室可用且不产生横向溢出");
  assert.equal(errors.length, 0, errors.join("\n"));
  await fs.writeFile(
    "test-results/community/report.json",
    JSON.stringify({ passed, errors, rooms: [roomA, roomB] }, null, 2),
  );
  console.log(JSON.stringify({ passed, errors }, null, 2));
} finally {
  helpers.forEach((s) => s.disconnect());
  await browser.close();
  await app.close();
  const cleanupPath = path.resolve(dataDir);
  if (
    !cleanupPath.startsWith(path.resolve(tmpdir()) + path.sep) ||
    !path.basename(cleanupPath).startsWith("community36-")
  )
    throw new Error("Unsafe browser-test cleanup path");
  rmSync(cleanupPath, { recursive: true, force: true });
}
