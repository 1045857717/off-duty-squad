import { Icon } from "./icons";
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

/** Readable lobby overview; complete mechanics expand into normal page flow. */
export function SkillSummary({
  role,
  player,
}: {
  role: Role;
  player?: Player;
}) {
  const basic = basicMetrics(role, player?.damage ?? ROLES[role].damage);
  const signature = skillMetrics(player || role);
  return (
    <section className="profession-combat-summary" aria-label="职业攻击与技能">
      <div className="profession-action-row">
        <kbd title="鼠标左键攻击；T 切换自动攻击">左键</kbd>
        <div>
          <strong>{basic.name}</strong>
          <p>
            {basic.ranged ? "远程" : "近战"} · 伤害 {basic.damage} · 间隔{" "}
            {basic.cooldown}s
          </p>
        </div>
      </div>
      <div className="profession-action-row">
        <kbd>Q</kbd>
        <div>
          <strong>{ROLES[role].skill}</strong>
          <p>
            {signature.rows
              .slice(0, 2)
              .map(([label, value]) => label + " " + value)
              .join(" · ")}
          </p>
        </div>
      </div>
      <details className="lobby-profession-details" key={role}>
        <summary>
          完整机制与成长数值 <Icon name="chevron" size={14} />
        </summary>
        <SkillDetails role={role} player={player} />
      </details>
    </section>
  );
}
