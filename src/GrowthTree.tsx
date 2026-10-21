import type { Player, GameState } from "../shared/types";
import { ATTACKS, ATTACK_IDS } from "../shared/arsenal";
import {
  ATTACK_BRANCHES,
  branchRequirement,
  MAX_MODULES,
} from "../shared/growth";
import { Icon } from "./icons";
export function GrowthTree({ me, level }: { me: Player; level: number }) {
  const owned = ATTACK_IDS.filter((id) => me.arsenal[id]);
  return (
    <section className="growth-tree" aria-label="技能成长树">
      <header>
        <div>
          <span>BUILD PATH / 成长路线</span>
          <strong>主干成长 → 关联分支 → 形态进化</strong>
        </div>
        <b>
          {owned.length}/{MAX_MODULES} 模块
        </b>
      </header>
      <p>
        攻击 Lv.3 且小队 Lv.4 开放关联分支；Lv.4 / Lv.8
        进化。随机卡只从当前可用节点中抽取。
      </p>
      {owned.map((id) => (
        <article key={id}>
          <div
            className="tree-root"
            style={{ "--tree-color": ATTACKS[id].color } as React.CSSProperties}
          >
            <Icon name={ATTACKS[id].icon} size={15} />
            <strong>{ATTACKS[id].name}</strong>
            <b>Lv.{me.arsenal[id]}</b>
            <div>
              {Array.from({ length: 8 }, (_, i) => (
                <i key={i} className={me.arsenal[id]! > i ? "lit" : ""} />
              ))}
            </div>
          </div>
          <div className="tree-connectors">
            {ATTACK_BRANCHES[id].map((branch) => {
              const reason = branchRequirement(me, branch, level),
                learned = me.arsenal[branch];
              return (
                <section
                  className={
                    learned ? "learned" : reason ? "locked" : "available"
                  }
                  key={branch}
                >
                  <span>
                    <Icon name={ATTACKS[branch].icon} size={12} />
                    {ATTACKS[branch].name}
                  </span>
                  <small>
                    {learned
                      ? `已习得 Lv.${learned}`
                      : reason || "已解锁 · 可在抽卡中出现"}
                  </small>
                </section>
              );
            })}
          </div>
        </article>
      ))}
      <footer>
        <Icon name="crosshair" size={12} />
        弹丸增益只匹配投射模块；无前置 / 已封顶 / 无队友的增益不会浪费卡位。
      </footer>
    </section>
  );
}
