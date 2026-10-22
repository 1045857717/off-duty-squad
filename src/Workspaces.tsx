import { IDEWorkspace } from "./IDEWorkspace";
import "./work41.css";
import type { Settings } from "../shared/types";
import {
  ExcelWorkspace,
  MailWorkspace,
  CodeWorkspace,
  MetricsWorkspace,
} from "./WorkExtras";
import { useState, useEffect } from "react";
import { Icon } from "./icons";
import { useLocalStorage } from "./hooks";
type Task = {
  id: number;
  name: string;
  owner: string;
  status: string;
  priority: string;
};
const initial: Task[] = [
  {
    id: 1,
    name: "需求文档梳理与接口契约确认",
    owner: "产品组",
    status: "进行中",
    priority: "高",
  },
  {
    id: 2,
    name: "核心接口联调与回归验证",
    owner: "研发组",
    status: "进行中",
    priority: "高",
  },
  {
    id: 3,
    name: "设计系统及交互方案评审",
    owner: "设计组",
    status: "已完成",
    priority: "中",
  },
  {
    id: 4,
    name: "异常状态与边界场景整理",
    owner: "质量组",
    status: "待开始",
    priority: "中",
  },
  {
    id: 5,
    name: "本周迭代风险与进度同步",
    owner: "项目组",
    status: "进行中",
    priority: "中",
  },
];
export function Workspaces({
  onReturn,
  entry = "last",
}: {
  onReturn: () => void;
  entry?: Settings["workEntry"];
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useLocalStorage("offduty-work-view", "tasks"),
    [tasks, setTasks] = useLocalStorage<Task[]>("offduty-work-tasks", initial),
    [note, setNote] = useLocalStorage(
      "offduty-work-note",
      "# 本周迭代计划\n\n## 目标\n完成核心流程验证，收敛体验问题，确认交付范围。\n\n## 会议纪要\n- 接口联调按既定节点推进\n- 质量团队补充异常流程用例\n- 下一轮评审关注性能与反馈一致性\n",
    ),
    [search, setSearch] = useState(""),
    [title, setTitle] = useState("产品与研发协作 / 本周工作"),
    [selected, setSelected] = useState<number | null>(null),
    [cell, setCell] = useState<string | null>(null),
    [cellKey, setCellKey] = useState(""),
    [sheetCells, setSheetCells] = useLocalStorage<Record<string, string>>(
      "offduty-work-sheet",
      {},
    );
  useEffect(() => {
    const modes = [
      "tasks",
      "board",
      "docs",
      "sheet",
      "excel",
      "mail",
      "code",
      "idea",
      "metrics",
    ];
    if (entry === "random")
      setView(modes[Math.floor(Math.random() * modes.length)]);
    else if (entry !== "last") setView(entry);
  }, []);
  const change = (id: number, patch: Partial<Task>) =>
    setTasks((t) =>
      t.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  if (view === "code" || view === "idea")
    return (
      <IDEWorkspace
        key={view}
        flavor={view === "idea" ? "idea" : "vscode"}
        onReturn={onReturn}
        onSwitch={setView}
      />
    );
  const specialized = ["excel", "mail", "metrics"].includes(view);
  return (
    <div
      data-work-style={view}
      className={
        "work-screen rich-work " +
        (!sidebarOpen ? "work-sidebar-collapsed" : "")
      }
    >
      <div className="work-nav">
        <button
          className="work-sidebar-toggle"
          aria-label={sidebarOpen ? "折叠工作侧栏" : "展开工作侧栏"}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((v) => !v)}
        >
          <Icon name="grid" size={20} />
        </button>
        <strong>
          {view === "excel"
            ? "Excel"
            : view === "mail"
              ? "Mail"
              : view === "metrics"
                ? "Analytics"
                : "Workspace"}
        </strong>
        <input
          aria-label="工作区名称"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <span className="work-saved">
          <i />
          本地已保存
        </span>
        <button onClick={onReturn} title="继续 · F8">
          返回 <kbd>F8</kbd>
        </button>
      </div>
      <aside className="work-side">
        <span>团队空间</span>
        {[
          ["tasks", "任务管理", "check"],
          ["board", "项目看板", "grid"],
          ["docs", "文档编辑", "book"],
          ["sheet", "数据报表", "terminal"],
          ["excel", "Excel 表格", "grid"],
          ["mail", "邮件工作台", "users"],
          ["code", "VS Code", "terminal"],
          ["idea", "IntelliJ IDEA", "terminal"],
          ["metrics", "经营分析", "target"],
        ].map(([id, label, icon]) => (
          <button
            key={id}
            aria-label={label}
            title={label}
            className={view === id ? "selected" : ""}
            onClick={() => setView(id)}
          >
            <Icon name={icon} size={16} />
            <span>{label}</span>
          </button>
        ))}
        <small>项目协作 / 内部工作台</small>
      </aside>
      <main>
        {!specialized && (
          <>
            <div className="work-breadcrumb">
              工作空间 / 协作项目 /{" "}
              {view === "docs"
                ? "文档"
                : view === "sheet"
                  ? "数据"
                  : view === "board"
                    ? "看板"
                    : view === "excel"
                      ? "Excel"
                      : view === "mail"
                        ? "邮件"
                        : view === "code"
                          ? "代码"
                          : view === "metrics"
                            ? "分析"
                            : "事项"}
            </div>
            <div className="work-page-title">
              <div>
                <h1>
                  {view === "docs"
                    ? "迭代计划与会议纪要"
                    : view === "sheet"
                      ? "本周资源与交付统计"
                      : view === "board"
                        ? "项目进度看板"
                        : view === "excel"
                          ? "预算与资源工作簿"
                          : view === "mail"
                            ? "工作邮件与草稿"
                            : view === "code"
                              ? "项目代码与资料"
                              : view === "metrics"
                                ? "资源投入与经营分析"
                                : "本周事项与进度"}
                </h1>
                <p>团队协作 · 持续更新</p>
              </div>
              <button
                onClick={() =>
                  setTasks((t) => [
                    ...t,
                    {
                      id: Date.now(),
                      name: "新增工作事项",
                      owner: "项目组",
                      status: "待开始",
                      priority: "中",
                    },
                  ])
                }
              >
                ＋ 新增事项
              </button>
            </div>
            <div className="work-tabs">
              {[
                ["tasks", "列表"],
                ["board", "看板"],
                ["docs", "文档"],
                ["sheet", "报表"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={view === id ? "active" : ""}
                  onClick={() => setView(id)}
                >
                  {label}
                </button>
              ))}
              <input
                aria-label="搜索工作事项"
                placeholder="搜索事项…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </>
        )}
        {view === "excel" ? (
          <ExcelWorkspace />
        ) : view === "mail" ? (
          <MailWorkspace />
        ) : view === "code" ? (
          <CodeWorkspace />
        ) : view === "metrics" ? (
          <MetricsWorkspace />
        ) : view === "docs" ? (
          <textarea
            className="work-editor"
            aria-label="工作文档"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            spellCheck={false}
          />
        ) : view === "board" ? (
          <div className="work-kanban">
            {["待开始", "进行中", "已完成"].map((status) => (
              <section key={status}>
                <header>
                  {status}
                  <b>{tasks.filter((t) => t.status === status).length}</b>
                </header>
                {tasks
                  .filter((t) => t.status === status && t.name.includes(search))
                  .map((t) => (
                    <article key={t.id}>
                      <input
                        value={t.name}
                        aria-label={"编辑事项" + t.id}
                        onChange={(e) => change(t.id, { name: e.target.value })}
                      />
                      <p>
                        {t.owner}
                        <em>{t.priority}优先级</em>
                      </p>
                      <select
                        aria-label={"事项状态" + t.id}
                        value={t.status}
                        onChange={(e) =>
                          change(t.id, { status: e.target.value })
                        }
                      >
                        {["待开始", "进行中", "已完成"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </article>
                  ))}
              </section>
            ))}
          </div>
        ) : view === "sheet" ? (
          <div className="work-spreadsheet">
            <div className="formula-bar">
              <span>fx</span>
              <input
                aria-label="公式栏"
                value={cell || "选择单元格开始编辑"}
                onChange={(e) => {
                  setCell(e.target.value);
                  if (cellKey)
                    setSheetCells((c) => ({ ...c, [cellKey]: e.target.value }));
                }}
              />
            </div>
            <table>
              <thead>
                <tr>
                  {[
                    "",
                    "A · 工作模块",
                    "B · 负责人",
                    "C · 预计工时",
                    "D · 已用工时",
                    "E · 进度",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, i) => (
                  <tr key={t.id}>
                    <th>{i + 1}</th>
                    {[
                      t.name,
                      t.owner,
                      String(8 + i * 3),
                      String(5 + i * 2),
                      t.status === "已完成"
                        ? "100%"
                        : t.status === "进行中"
                          ? "65%"
                          : "0%",
                    ].map((v, j) => (
                      <td
                        key={j}
                        contentEditable
                        suppressContentEditableWarning
                        onFocus={() => {
                          const key = t.id + ":" + j;
                          setCellKey(key);
                          setCell(sheetCells[key] ?? v);
                        }}
                        onBlur={(e) => {
                          const text = e.currentTarget.textContent || "";
                          setSheetCells((c) => ({
                            ...c,
                            [t.id + ":" + j]: text,
                          }));
                          if (j === 0)
                            change(t.id, {
                              name: text || t.name,
                            });
                          if (j === 1)
                            change(t.id, {
                              owner: text || t.owner,
                            });
                        }}
                      >
                        {sheetCells[t.id + ":" + j] ?? v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <footer>合计 {tasks.length} 个模块 · 数据保存在当前浏览器</footer>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>事项</th>
                <th>负责人</th>
                <th>状态</th>
                <th>优先级</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks
                .filter(
                  (t) => t.name.includes(search) || t.owner.includes(search),
                )
                .map((t) => (
                  <tr
                    key={t.id}
                    className={selected === t.id ? "work-row-selected" : ""}
                    onClick={() => setSelected(t.id)}
                  >
                    <td>
                      <input
                        type="checkbox"
                        aria-label={"完成" + t.name}
                        checked={t.status === "已完成"}
                        onChange={(e) =>
                          change(t.id, {
                            status: e.target.checked ? "已完成" : "进行中",
                          })
                        }
                      />
                      <input
                        aria-label={"事项名称" + t.id}
                        value={t.name}
                        onChange={(e) => change(t.id, { name: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={"负责人" + t.id}
                        value={t.owner}
                        onChange={(e) =>
                          change(t.id, { owner: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <select
                        aria-label={"事项状态" + t.id}
                        value={t.status}
                        onChange={(e) =>
                          change(t.id, { status: e.target.value })
                        }
                      >
                        {["待开始", "进行中", "已完成"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label={"事项优先级" + t.id}
                        value={t.priority}
                        onChange={(e) =>
                          change(t.id, { priority: e.target.value })
                        }
                      >
                        {["高", "中", "低"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        onClick={() =>
                          setTasks((a) => a.filter((row) => row.id !== t.id))
                        }
                      >
                        移除
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
        <div className="work-footer">
          <span>
            共{tasks.length}项 ·{" "}
            {tasks.filter((t) => t.status === "已完成").length}项完成
          </span>
          <span>修改自动保存到此浏览器</span>
        </div>
      </main>
    </div>
  );
}
