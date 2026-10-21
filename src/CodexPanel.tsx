import { useState, useEffect, useRef } from "react";
import { drawProp } from "./game/RigAtlas";
import type { Role, AttackId, EnemyKind } from "../shared/types";
import { ENEMY_DEFS, ATTACK_MOTIONS } from "../shared/combatProfiles";
import { ATTACKS, ATTACK_IDS, attackStats } from "../shared/arsenal";
import { ATTACK_BRANCHES } from "../shared/growth";
import { ROLES } from "../shared/content";
import { careerPortrait } from "../shared/careers";
import { gameplayModel } from "./game/paintedActors";
import { Modal, Key } from "./components";
import { Icon } from "./icons";
import { SkillDetails } from "./SkillDetails";
import type { Records } from "./panels";
export function CodexPanel({
  records,
  initial = "enemies",
  role,
  onRole,
  canChoose,
  onClose,
}: {
  records: Records;
  initial?: "enemies" | "equipment" | "roles" | "records";
  role: Role;
  onRole: (role: Role) => void;
  canChoose: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState(initial),
    [query, setQuery] = useState(""),
    [enemy, setEnemy] = useState<EnemyKind>("mite"),
    [attack, setAttack] = useState<AttackId>("pulse"),
    [job, setJob] = useState<Role>(role),
    [level, setLevel] = useState(1);
  const enemies = Object.keys(ENEMY_DEFS) as EnemyKind[],
    roles = Object.keys(ROLES) as Role[],
    match = (v: string) => v.toLowerCase().includes(query.toLowerCase()),
    def = ENEMY_DEFS[enemy],
    a = ATTACKS[attack],
    stats = attackStats(attack, level);
  return (
    <Modal
      title="工友随身图鉴"
      eyebrow="FIELD CODEX / 看懂对手，再放心发癫"
      onClose={onClose}
      wide
    >
      <div className="codex-v34">
        <nav className="codex-tabs" role="tablist" aria-label="图鉴分类">
          {(
            [
              ["enemies", "敌人图鉴", enemies.length, "target"],
              ["equipment", "攻击技能", ATTACK_IDS.length, "bolt"],
              ["roles", "职业技能", roles.length, "users"],
              ["records", "个人档案", null, "book"],
            ] as const
          ).map(([id, label, n, icon]) => (
            <button
              role="tab"
              aria-selected={tab === id}
              key={id}
              onClick={() => {
                setTab(id);
                setQuery("");
              }}
            >
              <Icon name={icon} size={16} />
              {label}
              {n !== null && <b>{n}</b>}
            </button>
          ))}
        </nav>
        {tab === "records" ? (
          <section className="codex-records">
            <header>
              <small>此浏览器的工友履历</small>
              <h3>每次出发，都算认真活过。</h3>
              <p>
                本机档案记录累计经历；全服小队战绩在排行榜按模式、难度和日期查看。
              </p>
            </header>
            <div className="codex-record-grid">
              {[
                [records.runs, "行动次数"],
                [records.wins, "准点下班"],
                [records.kills, "累计击败"],
                [records.rescues, "累计捞人"],
                [records.crystals, "门禁回收"],
                [records.highestMission, "最深章节"],
              ].map(([n, label]) => (
                <article key={label}>
                  <strong>{n}</strong>
                  <span>{label}</span>
                </article>
              ))}
            </div>
            <div className="codex-milestones">
              {[
                [records.runs > 0, "第一天外勤", "完成过一次行动"],
                [records.wins > 0, "下班权捍卫者", "通关六章合作模式"],
                [records.rescues > 0, "靠谱工友", "救起过倒地的同事"],
                [records.kills >= 50, "清理班味", "累计击败50个加班怪"],
              ].map(([done, label, desc]) => (
                <article key={String(label)} className={done ? "earned" : ""}>
                  <Icon name={done ? "check" : "shield"} size={20} />
                  <span>
                    <b>{label}</b>
                    <small>{desc}</small>
                  </span>
                </article>
              ))}
            </div>
            <p className="codex-footnote">
              保存在当前浏览器，清除浏览器数据会重置这份履历。
            </p>
          </section>
        ) : (
          <>
            <label className="codex-search">
              <Icon name="target" size={15} />
              <input
                aria-label="搜索图鉴"
                placeholder={
                  tab === "enemies"
                    ? "搜索敌人或攻击方式…"
                    : tab === "equipment"
                      ? "搜索武器、属性或效果…"
                      : "搜索职业或专属技能…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <span>
                {tab === "enemies"
                  ? "7种办公室怪人"
                  : tab === "equipment"
                    ? "技能随构筑一起成长"
                    : "职业Q始终独立保留"}
              </span>
            </label>
            <div className="codex-layout">
              <nav className="codex-index" aria-label="图鉴条目">
                {tab === "enemies" &&
                  enemies
                    .filter((id) =>
                      match(
                        ENEMY_DEFS[id].name +
                          ENEMY_DEFS[id].attack +
                          ENEMY_DEFS[id].title,
                      ),
                    )
                    .map((id) => (
                      <button
                        key={id}
                        aria-pressed={enemy === id}
                        onClick={() => setEnemy(id)}
                      >
                        <div className={"codex-avatar enemy-" + id}>
                          <img
                            src={careerPortrait(ENEMY_DEFS[id].role as Role)}
                            alt=""
                          />
                          <Icon name={ENEMY_DEFS[id].icon} size={13} />
                        </div>
                        <span>
                          <strong>{ENEMY_DEFS[id].name}</strong>
                          <small>{ENEMY_DEFS[id].title}</small>
                        </span>
                        <Icon name="chevron" size={13} />
                      </button>
                    ))}
                {tab === "equipment" &&
                  ATTACK_IDS.filter((id) =>
                    match(
                      ATTACKS[id].name + ATTACKS[id].desc + ATTACKS[id].element,
                    ),
                  ).map((id) => (
                    <button
                      key={id}
                      aria-pressed={attack === id}
                      onClick={() => setAttack(id)}
                    >
                      <span className="codex-skill-icon">
                        <Icon name={ATTACKS[id].icon} size={20} />
                      </span>
                      <span>
                        <strong>{ATTACKS[id].name}</strong>
                        <small>
                          {ATTACKS[id].element} · {ATTACK_MOTIONS[id].accent}
                        </small>
                      </span>
                      <Icon name="chevron" size={13} />
                    </button>
                  ))}
                {tab === "roles" &&
                  roles
                    .filter((id) =>
                      match(
                        ROLES[id].name + ROLES[id].skill + ROLES[id].skillDesc,
                      ),
                    )
                    .map((id) => (
                      <button
                        key={id}
                        aria-pressed={job === id}
                        onClick={() => setJob(id)}
                      >
                        <img
                          className="codex-portrait"
                          src={careerPortrait(id)}
                          alt=""
                        />
                        <span>
                          <strong>{ROLES[id].name}</strong>
                          <small>{ROLES[id].skill}</small>
                        </span>
                        <Icon name="chevron" size={13} />
                      </button>
                    ))}
                {query &&
                  ((tab === "enemies" &&
                    !enemies.some((id) =>
                      match(
                        ENEMY_DEFS[id].name +
                          ENEMY_DEFS[id].attack +
                          ENEMY_DEFS[id].title,
                      ),
                    )) ||
                    (tab === "equipment" &&
                      !ATTACK_IDS.some((id) =>
                        match(
                          ATTACKS[id].name +
                            ATTACKS[id].desc +
                            ATTACKS[id].element,
                        ),
                      )) ||
                    (tab === "roles" &&
                      !roles.some((id) =>
                        match(
                          ROLES[id].name +
                            ROLES[id].skill +
                            ROLES[id].skillDesc,
                        ),
                      ))) && (
                    <p className="codex-empty">
                      没找到这一条，换个关键词试试。
                    </p>
                  )}
              </nav>
              <section className="codex-detail" aria-label="图鉴详细说明">
                {tab === "enemies" ? (
                  <>
                    <header>
                      <EnemyFigure kind={enemy} model={def.model} />
                      <div>
                        <span className="codex-kicker">
                          OFFICE MONSTER / {def.title}
                        </span>
                        <h3>{def.name}</h3>
                        <p>{def.attack}</p>
                      </div>
                    </header>
                    <div className="codex-metrics">
                      {[
                        [def.hp, "基础生命"],
                        [def.damage, "基础攻击"],
                        [`${def.speed}`, "基础移速"],
                        [`${def.windup}s`, "出手前摇"],
                      ].map(([v, l]) => (
                        <article key={l}>
                          <strong>{v}</strong>
                          <small>{l}</small>
                        </article>
                      ))}
                    </div>
                    <div className="codex-advice">
                      <Icon name="shield" size={23} />
                      <div>
                        <h4>怎么躲？</h4>
                        <p>{def.counter}</p>
                      </div>
                    </div>
                    <h4>看哪里，才知道它要出手</h4>
                    <p>
                      {enemy === "bomber"
                        ? "看桶体闪烁和地面红圈。其他敌人不画地面红圈，改看肢体蓄力、手中道具、头顶符号和弹丸轨迹。"
                        : "看抬肘、收腿、后仰和头顶警示；出手后有清晰挥击或枪口/打印口反馈。挨打时会显示伤害来源与方向。"}
                    </p>
                    <p className="codex-footnote">
                      数值为未缩放基础参数；实际生命、伤害会随模式、关卡、难度、人数与精英词缀变化。
                    </p>
                  </>
                ) : tab === "equipment" ? (
                  <>
                    <header>
                      <span className="codex-detail-icon">
                        <Icon name={a.icon} size={36} />
                      </span>
                      <div>
                        <span className="codex-kicker">
                          {a.element} / {ATTACK_MOTIONS[attack].accent}
                        </span>
                        <h3>{a.name}</h3>
                        <p>{a.desc}</p>
                      </div>
                    </header>
                    <div
                      className="codex-levels"
                      role="group"
                      aria-label="技能预览等级"
                    >
                      {[1, 4, 8].map((l) => (
                        <button
                          aria-pressed={level === l}
                          key={l}
                          onClick={() => setLevel(l)}
                        >
                          Lv.{l}
                          {l === 4 ? " · 进化" : l === 8 ? " · 满级" : ""}
                        </button>
                      ))}
                    </div>
                    <div className="codex-metrics">
                      {[
                        [`${stats.power.toFixed(2)}×`, "攻击力倍率"],
                        [`${stats.cooldown.toFixed(2)}s`, "基础间隔"],
                        [`${stats.radius}`, "效果范围"],
                        [stats.tier + 1, "形态阶段"],
                      ].map(([v, l]) => (
                        <article key={l}>
                          <strong>{v}</strong>
                          <small>{l}</small>
                        </article>
                      ))}
                    </div>
                    <div className="codex-advice">
                      <Icon name="sparkle" size={23} />
                      <div>
                        <h4>最终进化：{a.evolution}</h4>
                        <p>
                          Lv.4和Lv.8提升规模、特效层级；强化已有技能会叠加成长，不会把它替换。
                        </p>
                      </div>
                    </div>
                    <h4>关联成长分支</h4>
                    <div className="codex-branches">
                      {ATTACK_BRANCHES[attack].map((id) => (
                        <button
                          key={id}
                          onClick={() => {
                            setAttack(id);
                            setLevel(1);
                          }}
                        >
                          <Icon name={ATTACKS[id].icon} size={14} />
                          {ATTACKS[id].name}
                          <Icon name="arrow" size={12} />
                        </button>
                      ))}
                    </div>
                    <p className="codex-footnote">
                      主干至少Lv.3且小队Lv.4才开放关联分支；最多4个攻击模块。实际间隔还受角色攻速影响。
                    </p>
                  </>
                ) : (
                  <>
                    <header>
                      <img
                        className="codex-role-large"
                        src={careerPortrait(job)}
                        alt={ROLES[job].name}
                      />
                      <div>
                        <span className="codex-kicker">
                          OCCUPATION / 职业专属Q
                        </span>
                        <h3>{ROLES[job].name}</h3>
                        <p>{ROLES[job].skillDesc}</p>
                      </div>
                    </header>
                    <SkillDetails role={job} />
                    <button
                      className="btn btn-primary full"
                      disabled={!canChoose}
                      onClick={() => {
                        onRole(job);
                        onClose();
                      }}
                    >
                      {canChoose
                        ? `使用${ROLES[job].name}`
                        : "对局中保留当前职业，回到准备区后可更换"}
                      <Icon name="arrow" size={15} />
                    </button>
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function EnemyFigure({ kind, model }: { kind: EnemyKind; model: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (!active || !ref.current) return;
      const c = ref.current.getContext("2d")!;
      c.clearRect(0, 0, 220, 270);
      c.save();
      c.scale(2, 2);
      c.translate(55, 74);
      c.drawImage(image, 256, 0, 256, 320, -42, -53, 84, 105);
      drawProp(c, "enemy-" + kind);
      c.restore();
    };
    image.src = "/art/gameplay-v34/" + model + ".png";
    return () => {
      active = false;
    };
  }, [kind, model]);
  return (
    <canvas
      ref={ref}
      width={220}
      height={270}
      className="codex-enemy-figure"
      aria-label={ENEMY_DEFS[kind].name + "外观"}
    />
  );
}
