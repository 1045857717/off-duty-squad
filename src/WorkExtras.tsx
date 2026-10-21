import { useState } from "react";
import { useLocalStorage } from "./hooks";
import { Icon } from "./icons";
const letters = "ABCDEFGH";
const initialCells: Record<string, string> = {
  A1: "项目 / 成本项",
  B1: "预算",
  C1: "实际",
  D1: "差额",
  E1: "完成率",
  A2: "产品需求",
  B2: "18000",
  C2: "14500",
  D2: "=B2-C2",
  E2: "86%",
  A3: "界面设计",
  B3: "24000",
  C3: "21500",
  D3: "=B3-C3",
  E3: "92%",
  A4: "服务开发",
  B4: "42000",
  C4: "36000",
  D4: "=B4-C4",
  E4: "78%",
  A5: "测试验收",
  B5: "16000",
  C5: "10800",
  D5: "=B5-C5",
  E5: "65%",
  A7: "费用合计",
  B7: "=SUM(B2:B5)",
  C7: "=SUM(C2:C5)",
  D7: "=B7-C7",
};
export function evaluateCell(
  raw: string,
  cells: Record<string, string>,
  depth = 0,
): string {
  if (!raw.startsWith("=")) return raw;
  if (depth > 10) return "#循环引用";
  const get = (ref: string) =>
    Number(evaluateCell(cells[ref] || "0", cells, depth + 1)) || 0;
  const expr = raw
    .slice(1)
    .toUpperCase()
    .replace(/SUM\(([A-H])(\d+):([A-H])(\d+)\)/g, (_, a, r, b, t) => {
      let sum = 0;
      for (let y = Number(r); y <= Number(t); y++)
        for (let x = letters.indexOf(a); x <= letters.indexOf(b); x++)
          sum += get(letters[x] + y);
      return String(sum);
    })
    .replace(/[A-H]\d+/g, (r) => String(get(r)));
  const tokens = expr.match(/(?:\d*\.)?\d+|[+*/()-]/g);
  if (!tokens || tokens.join("") !== expr.replace(/\s/g, ""))
    return "#公式错误";
  let i = 0;
  const factor = (): number => {
    const t = tokens[i++];
    if (t === "(") {
      const n = add();
      if (tokens[i++] !== ")") throw Error();
      return n;
    }
    if (t === "-") return -factor();
    if (t === "+") return factor();
    const n = Number(t);
    if (!Number.isFinite(n)) throw Error();
    return n;
  };
  const multiply = () => {
    let n = factor();
    while (tokens[i] === "*" || tokens[i] === "/") {
      const op = tokens[i++],
        v = factor();
      n = op === "*" ? n * v : n / v;
    }
    return n;
  };
  const add = () => {
    let n = multiply();
    while (tokens[i] === "+" || tokens[i] === "-") {
      const op = tokens[i++],
        v = multiply();
      n = op === "+" ? n + v : n - v;
    }
    return n;
  };
  try {
    const result = add();
    return i === tokens.length && Number.isFinite(result)
      ? String(Math.round(result * 100) / 100)
      : "#公式错误";
  } catch {
    return "#公式错误";
  }
}
export function ExcelWorkspace() {
  const [books, setBooks] = useLocalStorage<
      Record<string, Record<string, string>>
    >("offduty-excel-v24", {
      预算明细: initialCells,
      进度计划: {
        A1: "交付事项",
        B1: "负责人",
        C1: "截止日期",
        D1: "状态",
        A2: "接口联调",
        B2: "研发组",
        C2: "本周五",
        D2: "进行中",
      },
    }),
    [sheet, setSheet] = useState("预算明细"),
    [selected, setSelected] = useState("B7"),
    [rows, setRows] = useState(20),
    [editing, setEditing] = useState(""),
    [bold, setBold] = useState(false),
    [saved, setSaved] = useState(false);
  const cells = books[sheet] || {},
    write = (id: string, value: string) =>
      setBooks((b) => ({ ...b, [sheet]: { ...b[sheet], [id]: value } }));
  return (
    <section className="excel-workspace" aria-label="Excel风格工作表">
      <header>
        <span className="excel-mark">X</span>
        <strong>项目预算与交付分析.xlsx</strong>
        <small>已自动保存到本地</small>
        <button
          onClick={() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }}
        >
          {saved ? "已保存" : "保存"}
        </button>
      </header>
      <nav>
        {[
          "文件",
          "开始",
          "插入",
          "页面布局",
          "公式",
          "数据",
          "审阅",
          "视图",
        ].map((t) => (
          <button
            key={t}
            onClick={() => {
              if (t === "数据") setSheet("进度计划");
              if (t === "公式") write(selected, "=SUM(B2:B5)");
            }}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="excel-ribbon">
        <button onClick={() => setBold((v) => !v)} aria-pressed={bold}>
          <b>B</b>
          <small>加粗</small>
        </button>
        <label>
          字体
          <select aria-label="表格字体">
            <option>等线</option>
            <option>宋体</option>
            <option>微软雅黑</option>
          </select>
        </label>
        <button onClick={() => write(selected, "=SUM(B2:B5)")}>
          Σ<small>自动求和</small>
        </button>
        <button onClick={() => setRows((n) => n + 1)}>
          ＋<small>插入行</small>
        </button>
        <button
          onClick={() => {
            const name = `工作表${Object.keys(books).length + 1}`;
            setBooks((b) => ({ ...b, [name]: {} }));
            setSheet(name);
          }}
        >
          ▤<small>新工作表</small>
        </button>
        <button
          onClick={() => {
            const text = Array.from({ length: rows }, (_, i) =>
              Array.from(
                letters,
                (c) =>
                  '"' +
                  evaluateCell(cells[c + (i + 1)] || "", cells).replace(
                    /"/g,
                    '""',
                  ) +
                  '"',
              ).join(","),
            ).join("\r\n");
            const link = document.createElement("a");
            link.href = URL.createObjectURL(
              new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }),
            );
            link.download = sheet + ".csv";
            link.click();
            URL.revokeObjectURL(link.href);
          }}
        >
          ⇩<small>导出CSV</small>
        </button>
        <span>单元格 / 对齐方式 / 数字格式</span>
      </div>
      <div className="excel-formula">
        <b>{selected}</b>
        <em>fx</em>
        <input
          aria-label="Excel公式栏"
          value={cells[selected] || ""}
          onChange={(e) => write(selected, e.target.value)}
          placeholder="输入内容或 =SUM(B2:B5)"
        />
      </div>
      <div className="excel-grid">
        <table style={{ fontWeight: bold ? 600 : 400 }}>
          <thead>
            <tr>
              <th />
              {Array.from(letters, (c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i}>
                <th>{i + 1}</th>
                {Array.from(letters, (c) => {
                  const id = c + (i + 1),
                    value = cells[id] || "";
                  return (
                    <td
                      key={id}
                      className={
                        (selected === id ? "selected " : "") +
                        (i === 0 ? "table-heading" : "")
                      }
                    >
                      <input
                        aria-label={`单元格 ${id}`}
                        value={
                          editing === id ? value : evaluateCell(value, cells)
                        }
                        onFocus={() => {
                          setSelected(id);
                          setEditing(id);
                        }}
                        onBlur={() => setEditing("")}
                        onChange={(e) => write(id, e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer>
        <span>就绪</span>
        <div>
          {Object.keys(books).map((t) => (
            <button
              key={t}
              className={sheet === t ? "selected" : ""}
              onClick={() => setSheet(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <small>
          Σ {selected}: {evaluateCell(cells[selected] || "", cells)} · 100%
        </small>
      </footer>
    </section>
  );
}
export function MailWorkspace() {
  const [selected, setSelected] = useState(0),
    [draft, setDraft] = useLocalStorage("offduty-mail-draft", {
      subject: "周会进度同步",
      body: "各位好，\n\n本周已完成事项及风险如下：\n\n1. 核心流程联调\n2. 异常状态回归\n3. 下一阶段交付安排\n\n请补充相关信息。",
    });
  const messages = [
    "本周项目例会与事项同步",
    "设计评审记录 / 第三轮",
    "交付清单确认",
    "环境与接口联调安排",
    "本月成本报表更新",
  ];
  return (
    <section className="mail-workspace" aria-label="邮件工作台">
      <aside>
        <strong>Mail / 工作邮箱</strong>
        <button onClick={() => setSelected(-1)}>＋ 新建草稿</button>
        <p>
          收件箱 <b>5</b>
        </p>
        <p>
          本地草稿 <b>1</b>
        </p>
        <p>归档</p>
        <small>本地演示工作台</small>
      </aside>
      <div className="mail-list">
        {messages.map((m, i) => (
          <button
            key={m}
            className={selected === i ? "selected" : ""}
            onClick={() => setSelected(i)}
          >
            <b>{["项目协作组", "设计中心", "质量团队"][i % 3]}</b>
            <strong>{m}</strong>
            <small>事项已整理，请查看并更新进度…</small>
          </button>
        ))}
      </div>
      <main>
        {selected < 0 ? (
          <>
            <h2>编辑本地草稿</h2>
            <input
              aria-label="邮件草稿主题"
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            />
            <textarea
              aria-label="邮件草稿正文"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
            <p>草稿自动保存到本地</p>
          </>
        ) : (
          <>
            <small>工作协作 / 本地资料</small>
            <h2>{messages[selected]}</h2>
            <p>项目协作组 · 内部工作记录</p>
            <hr />
            <p>各位好，</p>
            <p>
              请根据本周交付清单更新事项状态，检查关联文档和验收记录。未解决事项请补充负责人、预计完成时间及后续计划。
            </p>
            <p>感谢配合。</p>
            <button
              onClick={() => {
                setDraft({ ...draft, subject: "回复：" + messages[selected] });
                setSelected(-1);
              }}
            >
              回复并编辑草稿
            </button>
          </>
        )}
      </main>
    </section>
  );
}
export function CodeWorkspace() {
  const [code, setCode] = useLocalStorage(
      "offduty-code-note",
      "// 项目交付检查\nexport function summarize(items) {\n  return items.reduce((total, item) => {\n    total.completed += item.done ? 1 : 0;\n    total.pending += item.done ? 0 : 1;\n    return total;\n  }, { completed: 0, pending: 0 });\n}\n",
    ),
    [file, setFile] = useState("summary.ts"),
    [find, setFind] = useState("");
  return (
    <section className="code-workspace" aria-label="代码工作台">
      <aside>
        <strong>EXPLORER</strong>
        {["src/summary.ts", "docs/notes.md", "config.json"].map((f) => (
          <button key={f} onClick={() => setFile(f.split("/").at(-1)!)}>
            {f}
          </button>
        ))}
      </aside>
      <main>
        <header>
          <span>{file}</span>
          <input
            aria-label="代码查找"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            placeholder="查找文本"
          />
          <small>
            {find ? `${code.split(find).length - 1} 处匹配` : "自动保存"}
          </small>
        </header>
        <div>
          <pre>
            {code
              .split("\n")
              .map((_, i) => i + 1)
              .join("\n")}
          </pre>
          <textarea
            spellCheck={false}
            aria-label="代码编辑器"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <footer>
          UTF-8　TypeScript　Ln {code.split("\n").length}　已保存到本地
        </footer>
      </main>
    </section>
  );
}
export function MetricsWorkspace() {
  const [period, setPeriod] = useState("本周");
  return (
    <section className="metrics-workspace" aria-label="经营分析报表">
      <header>
        <div>
          <span>BUSINESS INTELLIGENCE</span>
          <h2>项目交付与资源分析</h2>
        </div>
        <select
          aria-label="分析周期"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          {["本周", "本月", "本季度"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </header>
      <div className="metric-kpis">
        {[
          ["交付完成率", "86.4%", "↑ 8.2%"],
          ["已用工时", "1,248", "预算内"],
          ["进行中项目", "12", "3项待评审"],
          ["待确认事项", "7", "本地计划"],
        ].map(([label, value, sub]) => (
          <article key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <span>{sub}</span>
          </article>
        ))}
      </div>
      <section className="metrics-chart">
        <h3>{period}资源投入与交付趋势</h3>
        <div>
          {Array.from({ length: 12 }, (_, i) => (
            <article key={i}>
              <i
                style={{
                  height: `${30 + ((i * 13 + period.length * 7) % 65)}%`,
                }}
              />
              <b
                style={{
                  height: `${20 + ((i * 17 + period.length * 11) % 72)}%`,
                }}
              />
              <small>{i + 1}</small>
            </article>
          ))}
        </div>
        <footer>
          <span>资源投入</span>
          <span>交付产出</span>
        </footer>
      </section>
      <table>
        <thead>
          <tr>
            <th>业务模块</th>
            <th>负责人</th>
            <th>投入占比</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {["产品规划", "设计开发", "服务联调", "质量交付"].map((s, i) => (
            <tr key={s}>
              <td>{s}</td>
              <td>{["产品组", "研发组", "项目组", "质量组"][i]}</td>
              <td>{[18, 36, 27, 19][i]}%</td>
              <td>按计划推进</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
