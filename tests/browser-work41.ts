import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, type Locator } from "playwright";
import { createServer } from "../server/app";

// Uses a fresh real app and actual UI interactions. No saved-state injection or
// DOM replacement. Uses the shared dist through an ephemeral isolated server.
const out = "test-results/work41";
await fs.mkdir(out, { recursive: true });
const data = mkdtempSync(path.join(tmpdir(), "offduty-work41-"));
const backend = createServer({ dataDir: data });
await new Promise<void>((resolve) =>
  backend.http.listen(0, "127.0.0.1", resolve),
);
const target = `http://127.0.0.1:${(backend.http.address() as { port: number }).port}`;
const url = target;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_BROWSER
    ? { executablePath: process.env.PLAYWRIGHT_BROWSER }
    : {}),
});
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
// tsx's function-name helper is needed by serialized browser callbacks.
await page.addInitScript("window.__name=(fn)=>fn");
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
const failures: string[] = [];
const checks: string[] = [];
const report: unknown[] = [];
const contrasts: { mode: string; selector: string; ratio: number }[] = [];
const modes = [
  ["tasks", "任务管理"],
  ["board", "项目看板"],
  ["docs", "文档编辑"],
  ["sheet", "数据报表"],
  ["excel", "Excel 表格"],
  ["mail", "邮件工作台"],
  ["metrics", "经营分析"],
  ["code", "VS Code"],
  ["idea", "IntelliJ IDEA"],
] as const;
type Mode = (typeof modes)[number][0];
const root = page.locator(".work-screen");
const check = (condition: boolean, message: string) => {
  if (!condition) failures.push(message);
};
async function contrast(locator: Locator) {
  return locator.first().evaluate((el) => {
    const rgba = (text: string) => {
      const n = (text.match(/[\d.]+/g) || []).map(Number);
      return [n[0] || 0, n[1] || 0, n[2] || 0, n.length > 3 ? n[3] : 1];
    };
    const layers = [];
    for (let n: Element | null = el; n; n = n.parentElement) layers.unshift(n);
    let background = [255, 255, 255];
    for (const layer of layers) {
      const b = rgba(getComputedStyle(layer).backgroundColor);
      background = background.map((v, i) => v * (1 - b[3]) + b[i] * b[3]);
    }
    const foreground = rgba(getComputedStyle(el).color);
    const color = background.map(
      (v, i) => v * (1 - foreground[3]) + foreground[i] * foreground[3],
    );
    const lum = (a: number[]) =>
      a
        .map((v) => v / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
    const l1 = lum(color),
      l2 = lum(background);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  });
}
async function sample(mode: Mode, selectors: string[]) {
  for (const selector of selectors) {
    const locator = root.locator(selector).first();
    assert.ok(
      await locator.isVisible(),
      `${mode}: missing contrast target ${selector}`,
    );
    const ratio = await contrast(locator);
    contrasts.push({ mode, selector, ratio });
    check(
      ratio >= 4.5,
      `${mode}: ${selector} text contrast ${ratio.toFixed(2)} < 4.5`,
    );
  }
}
async function switchMode(mode: Mode) {
  const label = modes.find(([id]) => id === mode)![1];
  if (await page.locator(".ide-workspace").count()) {
    await page
      .getByRole("button", { name: "切换工作界面", exact: true })
      .click();
    assert.equal(
      await page.getByRole("menuitem").count(),
      9,
      "All nine modes in IDE dropdown",
    );
    await page.getByRole("menuitem", { name: label, exact: true }).click();
  } else {
    await page
      .locator(".work-side")
      .getByRole("button", { name: label, exact: true })
      .click();
  }
  await page.locator(`.work-screen[data-work-style="${mode}"]`).waitFor();
}
async function workEntry(label: string) {
  await page.keyboard.press("F2");
  await page
    .getByRole("combobox", { name: "工作模式进入方式", exact: true })
    .click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await page.getByRole("button", { name: "设置好了", exact: true }).click();
}
async function inspectSettingsSelect() {
  await page.keyboard.press("F2");
  const combo = page.getByRole("combobox", {
    name: "工作模式进入方式",
    exact: true,
  });
  assert.match(await combo.innerText(), /记住上次界面/);
  await combo.click();
  const popup = page.getByRole("listbox", {
    name: "工作模式进入方式",
    exact: true,
  });
  assert.equal(await popup.getByRole("option").count(), 11);
  for (const [, label] of modes)
    assert.equal(
      await popup.getByRole("option", { name: label, exact: true }).count(),
      1,
    );
  const selected = popup.locator('[aria-selected="true"]');
  assert.match(await selected.innerText(), /记住上次界面/);
  const option = popup.getByRole("option", { name: "Excel 表格", exact: true });
  await option.hover();
  for (const [selector, locator] of [
    ["settings trigger", combo],
    ["settings selected option", selected],
    ["settings hovered option", option],
  ] as const) {
    const ratio = await contrast(locator);
    contrasts.push({ mode: "settings", selector, ratio });
    check(ratio >= 4.5, `${selector} contrast ${ratio.toFixed(2)}`);
  }
  const colors = await popup.evaluate((el) => ({
    background: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(el.querySelector('[aria-selected="true"]')!).color,
  }));
  check(
    colors.background === "rgb(48, 35, 60)",
    `Settings popover palette leaked: ${colors.background}`,
  );
  await page.screenshot({ path: `${out}/settings-workmode-dropdown.png` });
  await selected.click();
  await page.getByRole("button", { name: "设置好了", exact: true }).click();
  checks.push(
    "Settings ThemedSelect: eleven options, real selected/hovered colors, last entry preserved",
  );
}
async function neutral() {
  await page.keyboard.press("F10");
  await page.locator(".hidden-veil").waitFor();
  const colors = await page.locator(".hidden-veil").evaluate((el) => ({
    veil: getComputedStyle(el).backgroundColor,
    card: getComputedStyle(el.querySelector("div")!).backgroundColor,
    text: getComputedStyle(el.querySelector("div")!).color,
    button: getComputedStyle(el.querySelector("button")!).backgroundColor,
  }));
  for (const [key, expected] of Object.entries({
    veil: "rgb(237, 240, 243)",
    card: "rgb(255, 255, 255)",
    text: "rgb(60, 74, 85)",
    button: "rgb(238, 240, 242)",
  }))
    check(
      colors[key as keyof typeof colors] === expected,
      `F10 neutral ${key}: ${colors[key as keyof typeof colors]} (expected ${expected})`,
    );
  if (await root.count()) assert.equal(await root.isVisible(), false);
  await page.screenshot({ path: `${out}/f10-neutral.png` });
  await page.keyboard.press("F10");
  await page.locator(".hidden-veil").waitFor({ state: "detached" });
}
try {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(".app.odyssey40").waitFor();
  await neutral();
  await inspectSettingsSelect();
  await page.keyboard.press("F8");
  await root.waitFor();
  assert.equal(await root.getAttribute("data-work-style"), "tasks");
  for (const [mode] of modes) {
    await switchMode(mode);
    const dark = mode === "code" || mode === "idea";
    if (!dark) {
      const toggle = page.getByRole("button", {
        name: "展开工作侧栏",
        exact: true,
      });
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert.equal(
        await root.evaluate((el) =>
          el.classList.contains("work-sidebar-collapsed"),
        ),
        true,
      );
      await toggle.click();
      await sample(mode, [
        ".work-side button.selected",
        ".work-side > span",
        ".work-side small",
      ]);
      await page
        .getByRole("button", { name: "折叠工作侧栏", exact: true })
        .click();
      await sample(mode, [
        ".work-nav input",
        ".work-saved",
        ".work-nav button:last-child",
      ]);
    }
    if (mode === "tasks") {
      await page
        .getByLabel("工作区名称", { exact: true })
        .fill("产品协作 / 工作模式回归");
      await page
        .getByLabel("事项名称1", { exact: true })
        .fill("工作模式回归事项");
      await page.getByLabel("负责人1", { exact: true }).fill("工作41组");
      await page
        .getByLabel("事项状态1", { exact: true })
        .selectOption("已完成");
      await page.getByLabel("事项优先级1", { exact: true }).selectOption("低");
      await sample(mode, [
        ".work-breadcrumb",
        ".work-page-title p",
        ".work-tabs input",
        "th",
        "tbody input:not([type=checkbox])",
        "tbody select",
        ".work-footer",
      ]);
    } else if (mode === "board") {
      assert.equal(
        await page.getByLabel("编辑事项1", { exact: true }).inputValue(),
        "工作模式回归事项",
      );
      await page
        .getByLabel("编辑事项1", { exact: true })
        .fill("工作模式回归事项 / 看板");
      await page
        .getByLabel("事项状态1", { exact: true })
        .selectOption("进行中");
      await sample(mode, [
        ".work-kanban header",
        ".work-kanban header b",
        ".work-kanban article p",
        ".work-kanban article p em",
        ".work-kanban input",
        ".work-kanban select",
      ]);
    } else if (mode === "docs") {
      await page
        .getByLabel("工作文档", { exact: true })
        .fill("# 工作模式验证\n\n浅色文档与真实可编辑正文。");
      await sample(mode, [".work-editor"]);
    } else if (mode === "sheet") {
      const cells = page
        .locator(".work-spreadsheet tbody tr")
        .first()
        .locator("td");
      await cells.nth(1).fill("报表分析组");
      await cells.nth(2).click();
      await page.getByLabel("公式栏", { exact: true }).fill("42");
      await page.locator(".work-page-title h1").click();
      assert.equal(await cells.nth(2).innerText(), "42");
      await sample(mode, [
        ".formula-bar input",
        ".work-spreadsheet th",
        ".work-spreadsheet td",
        ".work-spreadsheet footer",
      ]);
    } else if (mode === "excel") {
      await page.getByLabel("单元格 B2", { exact: true }).fill("21000");
      await page.getByLabel("单元格 B7", { exact: true }).click();
      await page.getByLabel("Excel公式栏", { exact: true }).fill("=SUM(B2:B5)");
      await page
        .getByLabel("表格字体", { exact: true })
        .selectOption("微软雅黑");
      await sample(mode, [
        ".excel-workspace > header small",
        ".excel-grid th",
        ".excel-grid input",
        ".excel-ribbon label",
        ".excel-ribbon > span",
        ".excel-formula em",
        ".excel-formula input",
        ".excel-workspace > footer",
      ]);
    } else if (mode === "mail") {
      await page
        .getByRole("button", { name: "＋ 新建草稿", exact: true })
        .click();
      await page
        .getByLabel("邮件草稿主题", { exact: true })
        .fill("工作模式 / 草稿主题");
      await page
        .getByLabel("邮件草稿正文", { exact: true })
        .fill("本周工作已记录，正文保持可编辑并自动保存。");
      await sample(mode, [
        ".mail-list b",
        ".mail-list strong",
        ".mail-list small",
        ".mail-workspace aside small",
        ".mail-workspace main > input",
        ".mail-workspace main > textarea",
      ]);
    } else if (mode === "metrics") {
      await page.getByLabel("分析周期", { exact: true }).selectOption("本季度");
      assert.match(
        await page.locator(".metrics-chart h3").innerText(),
        /本季度/,
      );
      await sample(mode, [
        ".metrics-workspace header span",
        ".metric-kpis small",
        ".metric-kpis span",
        ".metrics-chart article small",
        ".metrics-chart footer",
        ".metrics-workspace select",
      ]);
    } else {
      const edit = page.getByLabel("代码编辑器", { exact: true });
      const suffix = `\n// ${mode} 工作模式持久编辑\n`;
      const source = await edit.inputValue();
      const edited =
        mode === "idea"
          ? source.replace(
              /\n}\s*$/,
              '\n    private static final String WORK_MODE_NOTE = "工作模式";\n}\n',
            ) + suffix
          : source + suffix;
      await edit.fill(edited);
      assert.match(
        await page.locator(".ide-syntax").innerText(),
        /工作模式持久编辑/,
      );
      await page.keyboard.press("Control+f");
      await page.getByLabel("代码查找", { exact: true }).fill("工作模式");
      await sample(mode, [
        ".ide-find input",
        ".ide-find span",
        ".ide-syntax .tok-keyword",
        ".ide-syntax .tok-string",
        ".ide-syntax .tok-comment",
        ".ide-gutter",
        ".ide-explorer",
        ".ide-terminal-log",
        ".ide-return kbd",
      ]);
      await page
        .getByRole("button", { name: "关闭代码查找", exact: true })
        .click();
      await page.getByLabel("终端命令", { exact: true }).fill("pwd");
      await page.getByLabel("终端命令", { exact: true }).press("Enter");
      assert.match(
        await page.locator(".ide-terminal-log").innerText(),
        mode === "idea" ? /report-service/ : /ops-console/,
      );
      await page
        .getByRole("button", { name: "切换工作界面", exact: true })
        .click();
      assert.equal(await page.getByRole("menuitem").count(), 9);
      await sample(mode, [".ide-menu > button"]);
      await page
        .getByRole("menuitem", { name: "数据报表", exact: true })
        .hover();
      await sample(mode, [".ide-menu > button:hover"]);
      await page.screenshot({ path: `${out}/${mode}-dropdown.png` });
      await page.keyboard.press("Escape");
    }
    const controls = await root.evaluate((el) => {
      const rgb = (v: string) => (v.match(/[\d.]+/g) || []).map(Number);
      return [
        ...el.querySelectorAll("input:not([type=checkbox]), textarea, select"),
      ]
        .filter((item) => item.getClientRects().length)
        .map((item) => {
          const style = getComputedStyle(item);
          let bg = [255, 255, 255];
          const layers = [];
          for (let n: Element | null = item; n; n = n.parentElement)
            layers.unshift(n);
          for (const layer of layers) {
            const c = rgb(getComputedStyle(layer).backgroundColor),
              alpha = c.length > 3 ? c[3] : 1;
            bg = bg.map((v, i) => v * (1 - alpha) + c[i] * alpha);
          }
          return {
            tag: item.tagName,
            label: item.getAttribute("aria-label"),
            background: style.backgroundColor,
            composited: bg,
            color: style.color,
            fill: style.webkitTextFillColor,
            caret: style.caretColor,
            scheme: style.colorScheme,
          };
        });
    });
    for (const control of controls) {
      check(
        control.scheme === (dark ? "dark" : "light"),
        `${mode}: native control scheme ${control.scheme}`,
      );
      if (!dark) {
        check(
          Math.min(...control.composited) >= 220,
          `${mode}: dark ${control.label} ${control.background}`,
        );
      } else if (control.tag === "TEXTAREA") {
        check(
          control.background === "rgba(0, 0, 0, 0)",
          `${mode}: textarea covers syntax`,
        );
        check(
          control.fill === "rgba(0, 0, 0, 0)",
          `${mode}: textarea paints duplicate text`,
        );
        check(
          control.caret !== "rgba(0, 0, 0, 0)",
          `${mode}: invisible editor caret`,
        );
      }
    }
    // Native popup colors and opening behavior, exercised on the real select.
    const select = root.locator("select").first();
    if (await select.count()) {
      await select.click();
      await page.screenshot({ path: `${out}/${mode}-native-dropdown.png` });
      await page.keyboard.press("Escape");
      await sample(mode, ["select"]);
      const optionRatio = await contrast(select.locator("option"));
      contrasts.push({
        mode,
        selector: "select option (native popup colors)",
        ratio: optionRatio,
      });
      check(
        optionRatio >= 4.5,
        `${mode}: native option text contrast ${optionRatio.toFixed(2)}`,
      );
      const optionBg = await select
        .locator("option")
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      check(
        optionBg === "rgb(255, 255, 255)",
        `${mode}: incorrect light option background ${optionBg}`,
      );
    }
    await page.screenshot({ path: `${out}/after-${mode}.png` });
    report.push({ mode, controls });
    checks.push(`${mode}: palette, controls, sidebar/menu, contrast, editing`);
    console.log("WORK41_PASS", mode);
  }
  await neutral();
  // Actual dropdown route from IDEA back to the ninth style, and persisted edits.
  await switchMode("sheet");
  assert.equal(
    await page
      .locator(".work-spreadsheet tbody tr")
      .first()
      .locator("td")
      .nth(2)
      .innerText(),
    "42",
  );
  await page.keyboard.press("F8");
  await root.waitFor({ state: "detached" });
  await page.keyboard.press("F8");
  await root.waitFor();
  assert.equal(await root.getAttribute("data-work-style"), "sheet");
  assert.equal(
    await page
      .getByRole("button", { name: "展开工作侧栏", exact: true })
      .getAttribute("aria-expanded"),
    "false",
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.keyboard.press("F8");
  await root.waitFor();
  await switchMode("docs");
  assert.match(
    await page.getByLabel("工作文档", { exact: true }).inputValue(),
    /真实可编辑正文/,
  );
  await switchMode("excel");
  assert.equal(
    await page.getByLabel("单元格 B2", { exact: true }).inputValue(),
    "21000",
  );
  assert.equal(
    await page.getByLabel("单元格 B7", { exact: true }).inputValue(),
    "103000",
  );
  await switchMode("mail");
  await page.getByRole("button", { name: "＋ 新建草稿", exact: true }).click();
  assert.equal(
    await page.getByLabel("邮件草稿主题", { exact: true }).inputValue(),
    "工作模式 / 草稿主题",
  );
  for (const mode of ["code", "idea"] as const) {
    await switchMode(mode);
    assert.match(
      await page.getByLabel("代码编辑器", { exact: true }).inputValue(),
      new RegExp(`${mode} 工作模式持久编辑`),
    );
  }
  await page.keyboard.press("F8");
  for (const [mode, label] of [
    ["sheet", "数据报表"],
    ["idea", "IntelliJ IDEA"],
  ] as const) {
    await workEntry(label);
    await page.keyboard.press("F8");
    await page.locator(`.work-screen[data-work-style="${mode}"]`).waitFor();
    await page.keyboard.press("F8");
  }
  await workEntry("记住上次界面");
  await page.keyboard.press("F8");
  await page.locator('.work-screen[data-work-style="idea"]').waitFor();
  checks.push(
    "Settings explicit sheet/IDEA entry works; restoring last preserves the last selected style",
  );
  // A smaller laptop still gets the same local palette and reachable switching.
  await page.setViewportSize({ width: 1280, height: 720 });
  await switchMode("excel");
  assert.equal(
    await page
      .getByRole("button", { name: "展开工作侧栏", exact: true })
      .isVisible(),
    true,
  );
  await page.screenshot({ path: `${out}/excel-laptop.png` });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Laptop page overflows horizontally",
  );
  checks.push(
    "F8 collapsed default and reopen; reload persistence; IDE -> data report; F10 isolation checked; 1280x720",
  );
  await fs.writeFile(
    `${out}/report.json`,
    JSON.stringify(
      { checks, contrasts, failures, errors, modes: report },
      null,
      2,
    ),
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, [], "Workspace palette/contrast regression");
  console.log(
    `WORK41_PASS all nine styles; ${contrasts.length} contrast samples; persisted real edits; F8/F10`,
  );
} catch (error) {
  await fs.writeFile(
    `${out}/failure.json`,
    JSON.stringify(
      {
        checks,
        contrasts,
        failures,
        errors,
        error: String(error),
        modes: report,
      },
      null,
      2,
    ),
  );
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await page.close();
  await browser.close();
  await backend.close();
  rmSync(data, { recursive: true, force: true });
}
