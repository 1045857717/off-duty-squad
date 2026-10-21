import { ROLES } from "../shared/content";
import { skillMetrics } from "../shared/careers";
import type { Role, Player } from "../shared/types";
export function SkillDetails({
  role,
  player,
  compact = false,
}: {
  role: Role;
  player?: Player;
  compact?: boolean;
}) {
  const m = skillMetrics(player || role);
  return (
    <section
      className={"skill-details" + (compact ? " compact" : "")}
      aria-label="职业技能详细说明"
    >
      <header>
        <span>专属 Q</span>
        <strong>{ROLES[role].skill}</strong>
        <b>Lv.{m.level}</b>
      </header>
      <p>{ROLES[role].skillDesc}</p>
      <dl>
        {m.rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="skill-mechanism">{m.notes}</p>
      <small>{m.growth} 数值为护甲、暴击与目标抗性前。</small>
    </section>
  );
}
