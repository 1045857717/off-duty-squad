import { chromium } from "playwright";
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
  headless: false,
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => console.log("CONSOLE", m.type(), m.text()));
try {
  await p.goto(process.env.GAME_BASE_URL || "http://localhost:3000", {
    waitUntil: "networkidle",
  });
  await p.waitForFunction(() =>
    document.querySelector(".connection")?.textContent.includes("服务已连接"),
  );
  console.log(
    "PiP API",
    await p.evaluate(() => !!window.documentPictureInPicture),
  );
  await p.getByRole("button", { name: /先一个人试跑/ }).click();
  await p.getByRole("region", { name: "小队准备大厅" }).waitFor();
  await p.getByRole("button", { name: "小队出发", exact: true }).click();
  await p.getByRole("region", { name: "地图内初始技能选择" }).waitFor();
  await p
    .locator(".deployment-screen .initial-draft>div>button")
    .first()
    .click();
  await p.waitForFunction(() => window.__OFFDUTY__?.state?.phase === "playing");
  const id = await p.evaluate(() => window.__OFFDUTY__.playerId);
  await p.getByRole("button", { name: "独立小窗", exact: true }).click();
  await p.waitForFunction(
    (id) =>
      window.documentPictureInPicture?.window?.document.querySelector("iframe")
        ?.contentWindow?.__OFFDUTY__?.playerId === id,
    id,
    { timeout: 12000 },
  );
  console.log(
    "PIP_STATE",
    await p.evaluate(() => {
      const w = window.documentPictureInPicture.window,
        f = w.document.querySelector("iframe"),
        s = f.contentWindow.__OFFDUTY__;
      return {
        samePlayer: s.playerId === window.__OFFDUTY__.playerId,
        players: s.state.players.length,
        visible: !f.contentDocument.hidden,
        parentCanvas: document.querySelectorAll("canvas").length,
        childCanvas: f.contentDocument.querySelectorAll("canvas").length,
      };
    }),
  );
  const other = await ctx.newPage();
  await other.goto("about:blank");
  await other.bringToFront();
  await p.waitForFunction(
    () => {
      const text = documentPictureInPicture.window?.document
        .querySelector("iframe")
        ?.contentDocument?.querySelector(".fps-meter")?.textContent;
      return Number.isFinite(parseInt(text)) && parseInt(text) > 25;
    },
    {},
    { timeout: 10000 },
  );
  const background = await p.evaluate(() => {
    const w =
      documentPictureInPicture.window.document.querySelector(
        "iframe",
      ).contentWindow;
    return {
      visible: !w.document.hidden,
      fps: w.document.querySelector(".fps-meter")?.textContent,
    };
  });
  if (
    !background.visible ||
    !Number.isFinite(parseInt(background.fps)) ||
    parseInt(background.fps) < 25
  )
    throw Error(
      "Visible PiP should continue rendering when parent tab is in the background",
    );
  console.log("PIP_BACKGROUND", background);
  await other.close();
  await p.evaluate(() =>
    documentPictureInPicture.window.document
      .querySelector("iframe")
      .contentDocument.querySelector('[aria-label="一键隐藏游戏"]')
      .click(),
  );
  await p.getByRole("button", { name: "继续工作" }).waitFor();
  console.log(
    "PIP_HIDDEN",
    await p.evaluate(() => !documentPictureInPicture.window),
  );
  await p.getByRole("button", { name: "继续工作" }).click();
  await p.waitForFunction(
    (id) =>
      documentPictureInPicture.window?.document.querySelector("iframe")
        ?.contentWindow?.__OFFDUTY__?.playerId === id,
    id,
  );
  console.log("PIP_SHOWN_SAME_PLAYER");
  await p.evaluate(() =>
    documentPictureInPicture.window.document
      .querySelector("iframe")
      .contentDocument.querySelector('[aria-label="返回主页面"]')
      .click(),
  );
  await p.waitForFunction(() => !!document.querySelector("canvas"));
  console.log("PIP_PASS", errors);
} finally {
  await browser.close();
}
