import { useState } from "react";
import { ProfessionCard } from "./ProfessionCard";
import { ROLES } from "../shared/content";
import {
  CAREER_CATEGORIES,
  careerCategory,
  type CareerCategory,
} from "../shared/careers";
import { Avatar } from "./hooks";
import { Icon } from "./icons";
import type { Role } from "../shared/types";
export function JobPicker({
  role,
  onRole,
  large = false,
}: {
  role: Role;
  onRole: (role: Role) => void;
  large?: boolean;
}) {
  const [filter, setFilter] = useState(""),
    [category, setCategory] = useState<CareerCategory>("all"),
    [suggest, setSuggest] = useState(false),
    [saved, setSaved] = useState(false);
  const jobs = (Object.keys(ROLES) as Role[]).filter(
    (r) =>
      (category === "all" || careerCategory(r) === category) &&
      (!filter ||
        `${ROLES[r].name}${ROLES[r].skill}${ROLES[r].en}`
          .toLowerCase()
          .includes(filter.toLowerCase())),
  );
  return (
    <section
      className={"job-picker " + (large ? "large" : "")}
      aria-label="打工人职业选择"
    >
      {large && <ProfessionCard role={role} />}
      <header>
        <span>
          <Icon name="users" size={12} />
          {Object.keys(ROLES).length}个岗位 · 找到你的下班搭子
        </span>
        <label>
          <Icon name="compass" size={11} />
          <input
            aria-label="搜索职业"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="搜索职业 / 技能"
          />
        </label>
      </header>
      <nav className="career-filters" aria-label="职业类型筛选">
        {CAREER_CATEGORIES.map((c) => (
          <button
            type="button"
            key={c.id}
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
            <small>
              {c.id === "all"
                ? Object.keys(ROLES).length
                : (Object.keys(ROLES) as Role[]).filter(
                    (r) => careerCategory(r) === c.id,
                  ).length}
            </small>
          </button>
        ))}
      </nav>
      <div className="job-grid">
        {jobs.map((r) => (
          <button
            type="button"
            key={r}
            aria-label={"选择" + ROLES[r].name}
            aria-pressed={r === role}
            className={r === role ? "selected" : ""}
            style={{ "--role-color": ROLES[r].color } as React.CSSProperties}
            onClick={() => onRole(r)}
          >
            <Avatar role={r} size={large ? 64 : 42} />
            <span>
              <strong>{ROLES[r].name}</strong>
              <small>{ROLES[r].skill}</small>
              {large && <em>{ROLES[r].desc}</em>}
            </span>
            {r === role && <Icon name="check" size={11} />}
          </button>
        ))}
      </div>
      {!jobs.length && (
        <div className="career-empty">
          <Icon name="users" size={23} />
          <strong>暂时还没有这个岗位</strong>
          <p>试试其他类型，或者清空搜索。</p>
          <button
            type="button"
            onClick={() => {
              setFilter("");
              setCategory("all");
            }}
          >
            查看全部职业
          </button>
        </div>
      )}
      <footer className="careers-coming">
        <div>
          <strong>更多职业，敬请期待</strong>
          <small>你的岗位，也值得一个专属技能。</small>
        </div>
        <button
          type="button"
          aria-expanded={suggest}
          onClick={() => setSuggest((v) => !v)}
        >
          没找到职业？
        </button>
      </footer>
      {suggest && (
        <form
          className="career-suggestion"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget,
              text = new FormData(form).get("career")?.toString().trim();
            if (!text) return;
            const values = JSON.parse(
              localStorage.getItem("offduty-career-wishes") || "[]",
            );
            localStorage.setItem(
              "offduty-career-wishes",
              JSON.stringify([...values, text.slice(0, 40)].slice(-20)),
            );
            setSaved(true);
          }}
        >
          <label>
            想看到哪个职业？
            <input
              name="career"
              aria-label="期待的职业"
              maxLength={40}
              required
              placeholder="例如：产品经理 / 外卖骑手"
            />
          </label>
          <button type="submit">记在本机心愿单</button>
          {saved && (
            <p role="status">已记录在这台设备的心愿单，下次仍可查看。</p>
          )}
        </form>
      )}
    </section>
  );
}
