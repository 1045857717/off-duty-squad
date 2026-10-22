import { useState, useRef, useEffect } from "react";
import type { Settings } from "../shared/types";
import { useLocalStorage } from "./hooks";
import { Icon } from "./icons";
type Flavor = "vscode" | "idea";
const seeds: Record<Flavor, Record<string, string>> = {
  vscode: {
    "src/services/report.ts": `import { type Report, type Summary } from '../types';\n\nexport async function buildSummary(items: Report[]): Promise<Summary> {\n  const completed = items.filter((item) => item.status === 'done');\n  const totalHours = items.reduce((sum, item) => sum + item.hours, 0);\n\n  return {\n    completed: completed.length,\n    pending: items.length - completed.length,\n    totalHours,\n    updatedAt: new Date().toISOString(),\n  };\n}\n\nexport function formatProgress(value: number): string {\n  return new Intl.NumberFormat('zh-CN', {\n    style: 'percent',\n    maximumFractionDigits: 1,\n  }).format(value);\n}\n`,
    "src/App.tsx": `import { useEffect, useState } from 'react';\nimport { buildSummary } from './services/report';\n\nexport default function App() {\n  const [summary, setSummary] = useState(null);\n\n  useEffect(() => {\n    fetch('/api/reports')\n      .then((response) => response.json())\n      .then(buildSummary)\n      .then(setSummary);\n  }, []);\n\n  return <main className="dashboard">\n    <h1>Project overview</h1>\n    <pre>{JSON.stringify(summary, null, 2)}</pre>\n  </main>;\n}\n`,
    "package.json":
      '{\n  "name": "ops-console",\n  "version": "1.4.0",\n  "private": true,\n  "scripts": {\n    "dev": "vite --host",\n    "test": "vitest run",\n    "build": "tsc && vite build"\n  }\n}\n',
    "README.md":
      "# Operations Console\n\nInternal reporting and project delivery dashboard.\n\n## Development\n\n```bash\nnpm install\nnpm run dev\n```\n\n## Checklist\n\n- [x] API contracts reviewed\n- [x] Report summary updated\n- [ ] Release notes pending\n",
  },
  idea: {
    "src/main/java/com/acme/report/ReportService.java": `package com.acme.report;\n\nimport java.time.LocalDateTime;\nimport java.util.List;\nimport org.springframework.stereotype.Service;\n\n@Service\npublic class ReportService {\n    private final ReportRepository repository;\n\n    public ReportService(ReportRepository repository) {\n        this.repository = repository;\n    }\n\n    public ReportSummary summarize(String projectId) {\n        List<Report> reports = repository.findByProjectId(projectId);\n        long completed = reports.stream()\n                .filter(Report::isCompleted)\n                .count();\n\n        return new ReportSummary(\n                reports.size(), completed, LocalDateTime.now());\n    }\n}\n`,
    "src/main/resources/application.yml":
      "server:\n  port: 8080\nspring:\n  application:\n    name: report-service\n  profiles:\n    active: development\nlogging:\n  level:\n    com.acme: DEBUG\n",
    "pom.xml":
      "<project>\n    <modelVersion>4.0.0</modelVersion>\n    <groupId>com.acme</groupId>\n    <artifactId>report-service</artifactId>\n    <version>1.0.0-SNAPSHOT</version>\n    <properties>\n        <java.version>21</java.version>\n    </properties>\n</project>\n",
    "README.md":
      "# Report Service\n\nProject delivery reporting service.\n\n## Run\n\n```bash\nmvn spring-boot:run\n```\n\n## Modules\n\n- Report aggregation\n- Project summaries\n- Delivery metrics\n",
  },
};
function highlighted(code: string) {
  const parts = code.split(
    /(\/\/[^\n]*|#[^\n]*|"[^"\n]*"|'[^'\n]*'|`[^`]*`|\b(?:import|from|export|async|await|function|const|let|return|if|new|type|class|public|private|final|package|long|void|this|true|false|null)\b|\b\d+(?:\.\d+)?\b)/g,
  );
  return parts.map((part, i) => (
    <span
      key={i}
      className={
        /^(\/\/|#)/.test(part)
          ? "tok-comment"
          : /^["'`]/.test(part)
            ? "tok-string"
            : /^(import|from|export|async|await|function|const|let|return|if|new|type|class|public|private|final|package|long|void|this|true|false|null)$/.test(
                  part,
                )
              ? "tok-keyword"
              : /^\d/.test(part)
                ? "tok-number"
                : undefined
      }
    >
      {part}
    </span>
  ));
}
export function IDEWorkspace({
  flavor,
  onReturn,
  onSwitch,
}: {
  flavor: Flavor;
  onReturn: () => void;
  onSwitch: (v: Settings["workEntry"]) => void;
}) {
  const idea = flavor === "idea",
    [files, setFiles] = useLocalStorage<Record<string, string>>(
      "offduty-ide-" + flavor,
      seeds[flavor],
    );
  const names = Object.keys(files),
    [file, setFile] = useState(names[0]),
    [tabs, setTabs] = useState([names[0], names[1]]),
    [explorer, setExplorer] = useState(true),
    [terminal, setTerminal] = useState(true),
    [tool, setTool] = useState("files"),
    [menu, setMenu] = useState(""),
    [find, setFind] = useState(""),
    [finding, setFinding] = useState(false),
    [cursor, setCursor] = useState({ line: 1, col: 1 }),
    [command, setCommand] = useState(""),
    [output, setOutput] = useState(
      idea
        ? [
            "PS C:\\workspace\\report-service> git status",
            "On branch feature/report-summary",
            "Your branch is up to date with origin/feature/report-summary.",
          ]
        : [
            "PS C:\\workspace\\ops-console> git status",
            "On branch feature/report-summary",
            "Changes not staged for commit:",
            "  modified: src/services/report.ts",
          ],
    );
  const editor = useRef<HTMLTextAreaElement>(null),
    syntax = useRef<HTMLPreElement>(null),
    numbers = useRef<HTMLPreElement>(null),
    findInput = useRef<HTMLInputElement>(null),
    termLog = useRef<HTMLDivElement>(null);
  const code = files[file] || "",
    base = file.split("/").at(-1),
    matches = find ? code.split(find).length - 1 : 0;
  useEffect(() => {
    document.title = idea
      ? `${base} — report-service — IntelliJ IDEA`
      : `${base} — ops-console — Visual Studio Code`;
  }, [idea, base]);
  const open = (path: string) => {
    setFile(path);
    setTabs((t) => (t.includes(path) ? t : [...t, path]));
    setCursor({ line: 1, col: 1 });
  };
  const save = () => {
    setMenu("");
    editor.current?.focus();
  };
  const locate = () => {
    const el = editor.current;
    if (!el || !find) return;
    let at = code.indexOf(find, el.selectionEnd);
    if (at < 0) at = code.indexOf(find);
    if (at >= 0) {
      el.focus();
      el.setSelectionRange(at, at + find.length);
      el.scrollTop = Math.max(
        0,
        (code.slice(0, at).split("\n").length - 5) * 22,
      );
      sync();
    }
  };
  const sync = () => {
    if (editor.current && syntax.current && numbers.current) {
      syntax.current.scrollTop = editor.current.scrollTop;
      syntax.current.scrollLeft = editor.current.scrollLeft;
      numbers.current.scrollTop = editor.current.scrollTop;
    }
  };
  const updateCursor = () => {
    const s = code.slice(0, editor.current?.selectionStart || 0).split("\n");
    setCursor({ line: s.length, col: s.at(-1)!.length + 1 });
  };
  const menuAction = (action: string) => {
    setMenu("");
    if (action === "terminal") setTerminal((v) => !v);
    else if (action === "explorer") setExplorer((v) => !v);
    else if (action === "find") {
      setFinding(true);
      setTimeout(() => findInput.current?.focus(), 0);
    } else if (action === "save") save();
    else if (action === "close" && tabs.length > 1) {
      const t = tabs.filter((t) => t !== file);
      setTabs(t);
      setFile(t[0]);
    }
  };
  const run = () => {
    const cmd = command.trim();
    if (!cmd) return;
    setCommand("");
    if (cmd === "clear" || cmd === "cls") {
      setOutput([]);
      return;
    }
    const response =
      cmd === "help"
        ? [
            "Commands in this example workspace: pwd, ls, git status, clear, help",
          ]
        : cmd === "pwd"
          ? [`C:\\workspace\\${idea ? "report-service" : "ops-console"}`]
          : cmd === "ls" || cmd === "dir"
            ? names.map((n) => "  " + n)
            : cmd === "git status"
              ? [
                  "On branch feature/report-summary",
                  ...names
                    .filter((n) => files[n] !== seeds[flavor][n])
                    .map((n) => "  modified: " + n),
                  "Working tree checked.",
                ]
              : [
                  "示例终端：文件编辑已保存；此界面不执行系统命令。输入 help 查看可用命令。",
                ];
    setOutput((o) =>
      [
        ...o,
        `PS C:\\workspace\\${idea ? "report-service" : "ops-console"}> ${cmd}`,
        ...response,
      ].slice(-70),
    );
    setTimeout(
      () => termLog.current?.scrollTo(0, termLog.current.scrollHeight),
      0,
    );
  };
  return (
    <section
      data-work-style={idea ? "idea" : "code"}
      className={"work-screen ide-workspace ide-" + flavor}
      aria-label={idea ? "IntelliJ IDEA 工作界面" : "VS Code 工作界面"}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          save();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
          e.preventDefault();
          menuAction("find");
        }
        if (e.key === "Escape") {
          setMenu("");
          setFinding(false);
        }
      }}
    >
      <header className="ide-titlebar">
        <span className="ide-app-logo">{idea ? "IJ" : "⌘"}</span>
        {idea ? (
          <>
            <button
              className="ide-main-menu"
              aria-label="主菜单"
              onClick={() => setMenu(menu === "File" ? "" : "File")}
            >
              ☰
            </button>
            <b>report-service</b>
            <button
              className="ide-branch"
              onClick={() => {
                setTool("git");
                setExplorer(true);
              }}
            >
              ⌁ feature/report-summary
            </button>
          </>
        ) : (
          <nav>
            {[
              "File",
              "Edit",
              "Selection",
              "View",
              "Go",
              "Run",
              "Terminal",
              "Help",
            ].map((m) => (
              <button key={m} onClick={() => setMenu(menu === m ? "" : m)}>
                {m}
              </button>
            ))}
          </nav>
        )}
        <span className="ide-window-title">
          {idea
            ? "ReportApplication"
            : `${base} — ops-console — Visual Studio Code`}
        </span>
        {idea && (
          <button
            className="ide-run-config"
            onClick={() => {
              setTerminal(true);
              setOutput((o) => [
                ...o,
                "Run configuration: ReportApplication",
                "示例工作区已就绪。",
              ]);
            }}
          >
            <Icon name="play" size={14} />
            ReportApplication
          </button>
        )}
        <button
          className="ide-switch"
          aria-label="切换工作界面"
          aria-haspopup="menu"
          aria-expanded={menu === "switch"}
          onClick={() => setMenu(menu === "switch" ? "" : "switch")}
        >
          <Icon name="grid" size={14} />
        </button>
        <button className="ide-return" title="继续 · F8" onClick={onReturn}>
          继续<kbd>F8</kbd>
        </button>
      </header>
      {menu && (
        <div className="ide-menu" data-menu={menu} role="menu">
          {menu === "switch" ? (
            (
              [
                ["code", "VS Code"],
                ["idea", "IntelliJ IDEA"],
                ["excel", "Excel 表格"],
                ["tasks", "任务管理"],
                ["board", "项目看板"],
                ["docs", "文档编辑"],
                ["sheet", "数据报表"],
                ["mail", "邮件工作台"],
                ["metrics", "经营分析"],
              ] as const
            ).map(([v, label]) => (
              <button
                role="menuitem"
                key={v}
                onClick={() => {
                  setMenu("");
                  onSwitch(v);
                }}
              >
                {label}
                <span>{(idea ? v === "idea" : v === "code") ? "✓" : ""}</span>
              </button>
            ))
          ) : (
            <>
              {[
                ["save", "Save", "Ctrl+S"],
                ["find", "Find", "Ctrl+F"],
                ["close", "Close Editor", ""],
                ["explorer", "Toggle Explorer", ""],
                ["terminal", "Toggle Terminal", ""],
              ].map(([a, b, k]) => (
                <button role="menuitem" key={a} onClick={() => menuAction(a)}>
                  {b}
                  <small>{k}</small>
                </button>
              ))}
            </>
          )}
        </div>
      )}
      <div className="ide-body">
        <nav className="ide-activity">
          {[
            ["files", "book", "Explorer"],
            ["search", "target", "Search"],
            ["git", "leaf", "Source Control"],
            ["run", "play", "Run and Debug"],
            ["extensions", "grid", "Extensions"],
          ].map(([id, icon, label]) => (
            <button
              key={id}
              aria-label={label}
              title={label}
              className={tool === id ? "selected" : ""}
              onClick={() => {
                setTool(id);
                setExplorer(true);
                if (id === "search") menuAction("find");
              }}
            >
              <Icon name={icon} size={21} />
            </button>
          ))}
          <button
            className="ide-bottom-setting"
            title="工作界面设置"
            aria-label="工作界面设置"
            onClick={() => setMenu("switch")}
          >
            <Icon name="settings" size={20} />
          </button>
        </nav>
        {explorer && (
          <aside className="ide-explorer">
            <header>
              {idea
                ? "Project"
                : tool === "git"
                  ? "SOURCE CONTROL"
                  : tool === "search"
                    ? "SEARCH"
                    : "EXPLORER"}
              <button
                aria-label="收起项目文件"
                onClick={() => setExplorer(false)}
              >
                ···
              </button>
            </header>
            {tool === "git" ? (
              <>
                <input
                  aria-label="提交说明"
                  placeholder="Message (Ctrl+Enter to commit)"
                />
                <p className="ide-tree-heading">
                  Changes{" "}
                  <span>
                    {names.filter((n) => files[n] !== seeds[flavor][n]).length}
                  </span>
                </p>
                {names
                  .filter((n) => files[n] !== seeds[flavor][n])
                  .map((n) => (
                    <button key={n} onClick={() => open(n)}>
                      {n.split("/").at(-1)} <em>M</em>
                    </button>
                  ))}
              </>
            ) : (
              <>
                <p className="ide-tree-heading">
                  ⌄ {idea ? "report-service" : "OPS-CONSOLE"}
                  <span>···</span>
                </p>
                <p className="ide-tree-folder">
                  ⌄ {idea ? "src / main / java / com.acme.report" : "src"}
                </p>
                {names.map((n, i) => (
                  <button
                    key={n}
                    className={"ide-file " + (file === n ? "selected" : "")}
                    onClick={() => open(n)}
                    style={{ paddingLeft: n.startsWith("src") ? 27 : 15 }}
                  >
                    <i
                      className={
                        "filetype " +
                        (n.endsWith(".java")
                          ? "java"
                          : n.endsWith(".tsx")
                            ? "tsx"
                            : n.endsWith(".ts")
                              ? "ts"
                              : "plain")
                      }
                    >
                      {n.endsWith(".java")
                        ? "J"
                        : n.endsWith(".ts")
                          ? "TS"
                          : n.endsWith(".tsx")
                            ? "TS"
                            : "◇"}
                    </i>
                    <span>{n.split("/").at(-1)}</span>
                    {files[n] !== seeds[flavor][n] && <em>M</em>}
                  </button>
                ))}
                <p className="ide-tree-folder">
                  › {idea ? "External Libraries" : "node_modules"}
                </p>
                <p className="ide-tree-folder">
                  › {idea ? "Scratches and Consoles" : ".vscode"}
                </p>
              </>
            )}
            <footer>
              <span>› {idea ? "Structure" : "OUTLINE"}</span>
              <span>› {idea ? "Services" : "TIMELINE"}</span>
            </footer>
          </aside>
        )}
        <main className="ide-main">
          <div className="ide-tabs" role="tablist" aria-label="编辑器文件">
            {tabs.map((t) => (
              <div key={t} className={file === t ? "active" : ""}>
                <button
                  role="tab"
                  aria-label={t.split("/").at(-1)}
                  aria-selected={file === t}
                  onClick={() => open(t)}
                >
                  <i>
                    {t.endsWith(".java")
                      ? "J"
                      : t.endsWith(".ts")
                        ? "TS"
                        : t.endsWith(".tsx")
                          ? "TS"
                          : "◇"}
                  </i>
                  {t.split("/").at(-1)}
                </button>
                <button
                  aria-label={`关闭 ${t.split("/").at(-1)}`}
                  disabled={tabs.length === 1}
                  onClick={() => {
                    const next = tabs.filter((v) => v !== t);
                    setTabs(next);
                    if (file === t) setFile(next[0]);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="ide-breadcrumb">
            {file.split("/").join(" › ")}
            <small>{idea ? "ReportService" : "{} buildSummary"}</small>
          </div>
          <div className="ide-editor-wrap">
            {finding && (
              <form
                className="ide-find"
                onSubmit={(e) => {
                  e.preventDefault();
                  locate();
                }}
              >
                <input
                  ref={findInput}
                  aria-label="代码查找"
                  value={find}
                  onChange={(e) => setFind(e.target.value)}
                  placeholder="Find"
                />
                <span>{matches} results</span>
                <button title="下一个匹配" type="submit">
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="关闭代码查找"
                  onClick={() => setFinding(false)}
                >
                  ×
                </button>
              </form>
            )}
            <pre ref={numbers} className="ide-gutter" aria-hidden="true">
              {code
                .split("\n")
                .map((_, i) => i + 1)
                .join("\n")}
            </pre>
            <div className="ide-code-layer">
              <pre ref={syntax} className="ide-syntax" aria-hidden="true">
                {highlighted(code)}
                {"\n"}
              </pre>
              <textarea
                ref={editor}
                spellCheck={false}
                aria-label="代码编辑器"
                value={code}
                onChange={(e) =>
                  setFiles((f) => ({ ...f, [file]: e.target.value }))
                }
                onScroll={sync}
                onSelect={updateCursor}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const el = e.currentTarget,
                      start = el.selectionStart,
                      end = el.selectionEnd,
                      indent = idea ? "    " : "  ";
                    setFiles((f) => ({
                      ...f,
                      [file]: code.slice(0, start) + indent + code.slice(end),
                    }));
                    requestAnimationFrame(() =>
                      el.setSelectionRange(
                        start + indent.length,
                        start + indent.length,
                      ),
                    );
                  }
                }}
              />
            </div>
            <div className="ide-overview" aria-hidden="true">
              {code
                .split("\n")
                .slice(0, 48)
                .map((line, i) => (
                  <i
                    key={i}
                    style={{ width: `${Math.min(94, line.length * 1.3)}%` }}
                  />
                ))}
            </div>
          </div>
          {terminal && (
            <section className="ide-terminal" aria-label="IDE终端">
              <header>
                <nav>
                  {[
                    idea ? "Terminal" : "PROBLEMS",
                    idea ? "Build" : "OUTPUT",
                    idea ? "Services" : "DEBUG CONSOLE",
                    idea ? "Problems" : "TERMINAL",
                  ].map((label) => (
                    <button
                      key={label}
                      className={
                        label === (idea ? "Terminal" : "TERMINAL")
                          ? "selected"
                          : ""
                      }
                      onClick={() => {
                        if (label === (idea ? "Terminal" : "TERMINAL")) return;
                        setOutput((o) => [
                          ...o,
                          label === "PROBLEMS" || label === "Problems"
                            ? "No problems have been detected in the workspace."
                            : `${label}: example workspace ready.`,
                        ]);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
                <span>PowerShell</span>
                <button
                  aria-label="关闭终端"
                  onClick={() => setTerminal(false)}
                >
                  ×
                </button>
              </header>
              <div className="ide-terminal-log" ref={termLog}>
                {output.map((s, i) => (
                  <div key={i}>{s}</div>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run();
                }}
              >
                <label htmlFor={"terminal-" + flavor}>PS&gt;</label>
                <input
                  id={"terminal-" + flavor}
                  aria-label="终端命令"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </form>
            </section>
          )}
        </main>
      </div>
      <footer className="ide-status">
        <button
          onClick={() => {
            setTool("git");
            setExplorer(true);
          }}
        >
          ⌁ feature/report-summary*
        </button>
        <span>⊗ 0　⚠ 0</span>
        <span className="ide-status-spacer" />
        <span>
          Ln {cursor.line}, Col {cursor.col}
        </span>
        <span>Spaces: {idea ? 4 : 2}</span>
        <span>UTF-8</span>
        <span>
          {idea
            ? "Java 21"
            : file.endsWith(".tsx")
              ? "TypeScript JSX"
              : file.endsWith(".ts")
                ? "TypeScript"
                : file.endsWith(".json")
                  ? "JSON"
                  : "Markdown"}
        </span>
        <button onClick={() => setTerminal((v) => !v)} title="切换终端">
          ⌘
        </button>
        <small title="文件保存在本浏览器；示例终端不执行系统命令">
          本地保存
        </small>
      </footer>
    </section>
  );
}
