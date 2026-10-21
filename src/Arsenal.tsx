import { GrowthTree } from "./GrowthTree";
import { useState } from "react";
import type { Player } from "../shared/types";
import { ATTACKS, ATTACK_IDS, synergies, attackStats } from "../shared/arsenal";
import { ROLES } from "../shared/content";
import { Icon } from "./icons";
export function DraftPicker({
  me,
  onChoose,
}: {
  me: Player;
  onChoose: (id: string) => void;
}) {
  return (
    <section className="initial-draft" aria-label="开局攻击选择">
      <header>
        <span>INITIAL LOADOUT / 办公装备接入</span>
        <strong>选择你的第一种攻击</strong>
        <small>三选一 · Q {ROLES[me.role].skill}始终保留 · 后续升级叠加</small>
      </header>
      <div>
        {me.offers.map((card, i) => (
          <button
            key={card.id}
            onClick={() => onChoose(card.id)}
            style={
              {
                "--attack-color": ATTACKS[card.attackSkill!]?.color,
              } as React.CSSProperties
            }
          >
            <kbd>{i + 1}</kbd>
            <Icon name={card.icon} size={23} />
            <span>
              <strong>{card.name}</strong>
              <em>LV.1 / {ATTACKS[card.attackSkill!]?.element}</em>
              <small>{card.desc}</small>
            </span>
            <Icon name="plus" size={13} />
          </button>
        ))}
      </div>
    </section>
  );
}
export function ArsenalStrip({
  me,
  level = 1,
}: {
  me: Player;
  level?: number;
}) {
  const [open, setOpen] = useState(false);
  const learned = ATTACK_IDS.filter((id) => me.arsenal[id]);
  return (
    <section
      className={"arsenal-strip " + (open ? "expanded" : "")}
      aria-label="已习得攻击模块"
    >
      <button
        className="arsenal-toggle"
        onClick={(e) => {
          setOpen((v) => !v);
          e.currentTarget.blur();
        }}
        aria-expanded={open}
      >
        <Icon name="grid" size={12} />
        <span>构筑 {learned.length}</span>
      </button>
      <div className="arsenal-modules">
        {learned.map((id) => (
          <button
            key={id}
            className={`module-tier-${me.arsenal[id]! >= 8 ? 2 : me.arsenal[id]! >= 4 ? 1 : 0}`}
            title={`${ATTACKS[id].name} LV.${me.arsenal[id]} · ${ATTACKS[id].desc} · ${attackStats(id, me.arsenal[id]!).cooldown.toFixed(2)}秒基础间隔`}
            style={
              {
                "--attack-color": ATTACKS[id].color,
                "--module-power": me.arsenal[id]! / 8,
              } as React.CSSProperties
            }
          >
            <Icon name={ATTACKS[id].icon} size={12} />
            <span>
              {me.arsenal[id]! >= 4 ? ATTACKS[id].evolution : ATTACKS[id].name}
            </span>
            <b>{me.arsenal[id]}</b>
            {me.arsenal[id]! >= 4 && <i />}
          </button>
        ))}
      </div>
      {open && (
        <div className="build-details">
          <GrowthTree me={me} level={level} />
          <strong>能力共存 · 每张升级卡保留全部攻击</strong>
          {learned.map((id) => (
            <p key={id}>
              <b style={{ color: ATTACKS[id].color }}>
                {ATTACKS[id].name} LV.{me.arsenal[id]}
              </b>{" "}
              {ATTACKS[id].desc}
            </p>
          ))}
          {synergies(me).map((s) => (
            <p key={s.id} className="synergy">
              <b>✧ {s.name}</b> {s.desc}
            </p>
          ))}
          {!synergies(me).length && (
            <p>组合寒霜+烈焰、雷电+引力、僚机+追踪弹可激活联动。</p>
          )}
        </div>
      )}
    </section>
  );
}
