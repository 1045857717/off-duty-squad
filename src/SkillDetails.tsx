import { basicMetrics } from "../shared/basics";
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
  const basic = basicMetrics(role, player?.damage ?? ROLES[role].damage);
  return (
    <section
      className={"skill-details" + (compact ? " compact" : "")}
      aria-label="职业技能详细说明"
    >
      <div className="innate-attack" aria-label="职业普通攻击">
        <span>固有普攻 · 不占改装槽</span>
        <strong>{basic.name}</strong>
        <p>{basic.description}</p>
        <small>
          伤害 {basic.damage} · 基础间隔 {basic.cooldown}s · 距离 {basic.range}{" "}
          · {basic.ranged ? "远程" : "近战"}
        </small>
        <em>开局自带；与随机模块共存，职业 Q 始终保留。</em>
      </div>
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
