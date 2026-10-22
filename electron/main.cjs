const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  screen,
  shell,
  Tray,
  Menu,
  nativeImage,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
// Automated smoke checks use a separate profile and mutex, preserving any
// game window the user already has open.
if (process.argv.includes("--smoke-test")) {
  const profile = path.join(__dirname, "../test-results/native-profile-22");
  fs.mkdirSync(profile, { recursive: true });
  app.setPath("userData", profile);
}
let win,
  pass = false,
  compact = false,
  normalBounds;
let localServer;
let tray;
const raw = process.env.GAME_URL || "http://localhost:3000";
let url;
try {
  url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) throw Error("scheme");
} catch {
  console.error("GAME_URL 必须是 HTTP 或 HTTPS 游戏地址。");
  process.exit(1);
}
const send = (status) => {
  if (win && !win.isDestroyed()) win.webContents.send("desktop:status", status);
};
function togglePass() {
  pass = !pass;
  win.setIgnoreMouseEvents(pass, { forward: true });
  if (!pass) {
    win.show();
    win.focus();
    send("interactive");
  }
}
function showWindow() {
  if (!win) return;
  win.show();
  win.focus();
  send("shown");
}
function toggleWindow() {
  if (!win) return;
  if (win.isVisible()) {
    send("hidden");
    win.hide();
  } else showWindow();
}
function updateTray() {
  if (!tray) return;
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: win?.isVisible()
          ? "收起窗口  Ctrl+Shift+B"
          : "继续工作  Ctrl+Shift+B",
        click: toggleWindow,
      },
      {
        label: "迷你 / 完整窗口",
        click: () => {
          showWindow();
          send("compact");
        },
      },
      { type: "separator" },
      { label: "关闭工作区", click: () => app.quit() },
    ]),
  );
}
function createTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, "tray.png")));
  tray.setToolTip("工作台 · 点击收起/继续 · Ctrl+Shift+B");
  tray.on("click", toggleWindow);
  updateTray();
}
async function ensureServer() {
  if (app.isPackaged) return;
  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return;
  try {
    const r = await fetch(new URL("/api/health", url), {
      signal: AbortSignal.timeout(1800),
    });
    if (r.ok) return;
  } catch {}
  if (!fs.existsSync(path.join(__dirname, "../dist/index.html")))
    throw Error("请先运行 npm run build。");
  require("tsx/cjs");
  const { createServer } = require("../server/app.ts");
  localServer = createServer();
  await new Promise((resolve, reject) => {
    localServer.http.once("error", reject);
    localServer.http.listen(Number(url.port) || 3000, "0.0.0.0", resolve);
  });
}
async function create() {
  await ensureServer();
  const area = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({
    width: Math.min(1420, area.width - 70),
    height: Math.min(980, area.height - 60),
    minWidth: 500,
    minHeight: 340,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    thickFrame: false,
    roundedCorners: false,
    autoHideMenuBar: true,
    hasShadow: false,
    resizable: false,
    alwaysOnTop: true,
    show: false,
    title: "带薪摸鱼 · PAID BREAK CREW",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.removeMenu();
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    try {
      if (
        new URL(target).origin === url.origin ||
        new URL(target).origin === "https://api.xiebc.cc" ||
        (new URL(target).origin === "https://github.com" &&
          /^\/1045857717\/off-duty-squad(?:\/|$)/.test(
            new URL(target).pathname,
          ))
      )
        void shell.openExternal(target);
    } catch {}
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, target) => {
    try {
      if (new URL(target).origin !== url.origin) event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });
  win.on("show", () => {
    send("shown");
    updateTray();
  });
  win.on("hide", () => {
    send("hidden");
    updateTray();
  });
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => (win = null));
  await win.loadURL(url.toString());
  const compactArg = process.argv.includes("--compact");
  if (compactArg)
    await win.webContents.executeJavaScript(
      `document.dispatchEvent(new KeyboardEvent('keydown',{key:'F9',bubbles:true}))`,
    );
  if (process.argv.includes("--smoke-test")) {
    await new Promise((r) => setTimeout(r, 1600));
    if (process.argv.includes("--perf-test")) {
      await win.webContents.executeJavaScript(
        `document.querySelector('.solo-button')?.click()`,
      );
      await new Promise((r) => setTimeout(r, 2000));
      await win.webContents.executeJavaScript(
        `document.querySelector('.launch-only')?.click()`,
      );
      await new Promise((r) => setTimeout(r, 3400));
      await win.webContents.executeJavaScript(
        `document.querySelector('.deployment-screen .initial-draft>div>button')?.click()`,
      );
      await new Promise((r) => setTimeout(r, 1600));
      const perf = await win.webContents.executeJavaScript(
        `new Promise(resolve=>{let frames=0;const proto=window.Phaser.Renderer.WebGL.WebGLRenderer.prototype,original=proto.render,start=performance.now();proto.render=function(...args){frames++;return original.apply(this,args)};setTimeout(()=>{proto.render=original;resolve({frames,duration:performance.now()-start,fps:frames/((performance.now()-start)/1000),pixelRatio:devicePixelRatio,canvasWidth:document.querySelector('canvas').width,cssWidth:document.querySelector('canvas').getBoundingClientRect().width})},6000)})`,
      );
      console.log("NATIVE_HIGH_REFRESH", JSON.stringify(perf));
    }
    // Exercise the actual settings path, including useSettings -> IPC and no
    // second opacity layer inside the transparent native window.
    await win.webContents.executeJavaScript(
      `document.dispatchEvent(new KeyboardEvent('keydown',{key:'F2',bubbles:true}))`,
    );
    await new Promise((r) => setTimeout(r, 100));
    await win.webContents.executeJavaScript(
      `(()=>{const input=document.querySelector('input[aria-label="游戏整体透明度"]');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(input,'0.5');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
    await new Promise((r) => setTimeout(r, 150));
    const wholeAlpha = {
      native: win.getOpacity(),
      ui: await win.webContents.executeJavaScript(
        `getComputedStyle(document.querySelector('.app')).opacity`,
      ),
    };
    if (Math.abs(wholeAlpha.native - 0.43) > 0.03 || wholeAlpha.ui !== "1")
      throw Error(
        "Whole-interface desktop opacity did not reach native window: " +
          JSON.stringify(wholeAlpha),
      );
    console.log("WHOLE_INTERFACE_OPACITY", JSON.stringify(wholeAlpha));
    await win.webContents.executeJavaScript(
      `(()=>{const input=document.querySelector('input[aria-label="游戏整体透明度"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'1');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));[...document.querySelectorAll('button')].find(b=>b.textContent.includes('设置好了'))?.click();})()`,
    );
    await new Promise((r) => setTimeout(r, 100));
    const info = await win.webContents.executeJavaScript(
      `({title:document.title,desktop:window.desktop?.isDesktop,canvas:!!document.querySelector('canvas'),compact:document.documentElement.classList.contains('compact-mode')})`,
    );
    await win.webContents.executeJavaScript(
      `window.desktop.setOpacity(.55);window.desktop.setPinned(false);window.desktop.setPassthrough(true);`,
    );
    await new Promise((r) => setTimeout(r, 100));
    const controls = {
      opacity: win.getOpacity(),
      pinned: win.isAlwaysOnTop(),
      passthrough: pass,
    };
    if (
      Math.abs(controls.opacity - 0.55) > 0.02 ||
      controls.pinned ||
      !controls.passthrough
    )
      throw Error("Desktop control smoke test failed.");
    await win.webContents.executeJavaScript(
      `window.desktop.setPassthrough(false);window.desktop.setPinned(true);window.desktop.setOpacity(.86);`,
    );
    await new Promise((r) => setTimeout(r, 100));
    console.log(
      "DESKTOP_SMOKE",
      JSON.stringify({
        ...info,
        controlsVerified: controls,
        transparentBackground: win.getBackgroundColor(),
        opacity: win.getOpacity(),
        bounds: win.getBounds(),
        contentBounds: win.getContentBounds(),
        menuVisible: win.isMenuBarVisible(),
      }),
    );
    await win.webContents.executeJavaScript("window.desktop.hide()");
    await new Promise((r) => setTimeout(r, 150));
    if (win.isVisible()) throw Error("Hide IPC did not hide the native window");
    showWindow();
    await new Promise((r) => setTimeout(r, 150));
    console.log(
      "WINDOW_VISIBILITY_SMOKE",
      JSON.stringify({
        hiddenThenShown: win.isVisible(),
        trayReady: !!tray && !tray.isDestroyed(),
        backgroundThrottling: win.webContents.getBackgroundThrottling(),
      }),
    );
    const compactBefore = win.getContentBounds();
    await win.webContents.executeJavaScript(
      `document.dispatchEvent(new KeyboardEvent('keydown',{key:'F9',bubbles:true}))`,
    );
    await new Promise((r) => setTimeout(r, 180));
    const expanded = win.getContentBounds();
    await win.webContents.executeJavaScript(
      `document.dispatchEvent(new KeyboardEvent('keydown',{key:'F9',bubbles:true}))`,
    );
    await new Promise((r) => setTimeout(r, 180));
    const compactAfter = win.getContentBounds();
    if (
      expanded.width <= compactBefore.width ||
      Math.abs(compactAfter.width - 520) > 2 ||
      Math.abs(compactAfter.height - 350) > 2
    )
      throw Error("F9 did not resize native window correctly");
    console.log(
      "F9_NATIVE_RESIZE_PASS",
      JSON.stringify({ compactBefore, expanded, compactAfter }),
    );
    const image = await win.webContents.capturePage();
    fs.writeFileSync(
      path.join(__dirname, "../desktop-preview.png"),
      image.toPNG(),
    );
    setTimeout(() => app.quit(), 500);
  }
}
function trusted(event) {
  return win && !win.isDestroyed() && event.sender === win.webContents;
}
ipcMain.on("desktop:opacity", (e, v) => {
  if (trusted(e) && typeof v === "number" && Number.isFinite(v))
    win.setOpacity(Math.max(0.05, Math.min(1, v)));
});
ipcMain.on("desktop:compact", (e, v) => {
  if (!trusted(e) || typeof v !== "boolean" || v === compact) return;
  compact = v;
  win.setTitle(v ? "状态面板" : "带薪摸鱼 · PAID BREAK CREW");
  if (v) {
    normalBounds = win.getBounds();
    const area = screen.getDisplayMatching(normalBounds).workArea;
    win.setMinimumSize(420, 300);
    win.setContentSize(520, 350);
    win.setBounds({
      width: 520,
      height: 350,
      x: area.x + area.width - 536,
      y: area.y + area.height - 366,
    });
  } else if (normalBounds) win.setBounds(normalBounds);
});
ipcMain.on("desktop:passthrough", (e, v) => {
  if (!trusted(e)) return;
  pass = v === true;
  win.setIgnoreMouseEvents(pass, { forward: true });
});
ipcMain.on("desktop:pinned", (e, v) => {
  if (trusted(e)) win.setAlwaysOnTop(v === true);
});
ipcMain.on("desktop:hide", (e) => {
  if (trusted(e)) win.hide();
});
ipcMain.on("desktop:close", (e) => {
  if (trusted(e)) win.close();
});
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      win.show();
      win.focus();
    }
  });
  app.whenReady().then(async () => {
    try {
      createTray();
      await create();
      globalShortcut.register("CommandOrControl+Shift+X", togglePass);
      globalShortcut.register("CommandOrControl+Shift+B", toggleWindow);
      globalShortcut.register("CommandOrControl+Shift+M", () =>
        send("compact"),
      );
    } catch (err) {
      console.error(err);
      if (process.argv.includes("--smoke-test")) {
        app.exit(1);
        return;
      }
      const { dialog } = require("electron");
      dialog.showErrorBox("带薪摸鱼无法启动", String(err.message || err));
      app.quit();
    }
  });
  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
    tray?.destroy();
    if (localServer) void localServer.close();
  });
  app.on("window-all-closed", () => app.quit());
}
