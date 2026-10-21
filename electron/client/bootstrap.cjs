const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("node:fs"),
  path = require("node:path");
let setup;
function valid(raw) {
  try {
    const u = new URL(raw);
    return ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.origin
      : "";
  } catch {
    return "";
  }
}
const prefs = path.join(app.getPath("userData"), "game-server.json");
const nearby = path.join(path.dirname(process.execPath), "game-server.json");
let address = valid(process.env.GAME_URL || "");
for (const file of [nearby, prefs]) {
  if (address) break;
  try {
    address = valid(JSON.parse(fs.readFileSync(file, "utf8")).url);
  } catch {}
}
function launch(url) {
  process.env.GAME_URL = url;
  require("../main.cjs");
}
if (address) launch(address);
else
  app.whenReady().then(() => {
    setup = new BrowserWindow({
      width: 600,
      height: 500,
      resizable: false,
      autoHideMenuBar: true,
      title: "下班之前 · 连接服务器",
      webPreferences: {
        preload: path.join(__dirname, "setup-preload.cjs"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    setup.loadFile(path.join(__dirname, "setup.html"));
  });
ipcMain.handle("client:connect", async (event, raw) => {
  if (!setup || event.sender !== setup.webContents)
    return { ok: false, error: "窗口已失效" };
  const url = valid(raw);
  if (!url)
    return { ok: false, error: "请输入完整的 http:// 或 https:// 地址" };
  try {
    const response = await fetch(url + "/api/health", {
      signal: AbortSignal.timeout(7000),
    });
    const health = await response.json();
    if (!response.ok || health.status !== "ok") throw Error("health");
  } catch {
    return {
      ok: false,
      error: "无法连接这个服务器，请确认服务已启动、地址正确并允许网络访问。",
    };
  }
  fs.mkdirSync(path.dirname(prefs), { recursive: true });
  fs.writeFileSync(prefs, JSON.stringify({ url }, null, 2));
  launch(url);
  setup.hide();
  setTimeout(() => {
    setup?.destroy();
    setup = null;
  }, 900);
  return { ok: true };
});
