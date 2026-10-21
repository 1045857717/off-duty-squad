import { SmoothInteraction } from "./SmoothInteraction";
import { useState } from "react";
import type { GameState, Player } from "../shared/types";
import { Icon } from "./icons";
export function BossVitals({ state }: { state: GameState }) {
  const bosses = state.enemies.filter((e) => e.kind === "boss" && e.hp > 0);
  if (!bosses.length) return null;
  return (
    <section className="global-boss-vitals" aria-label="全局BOSS血条">
      {bosses.slice(0, 2).map((b) => (
        <article key={b.id}>
          <header>
            <span>
              <Icon name="target" size={12} />
              巨饼总监
              {(b.bossPhase || 0) === 0
                ? " · 护具阶段"
                : b.bossPhase === 1
                  ? " · 追猎阶段"
                  : " · 点名召集"}
            </span>
            <b>
              {Math.ceil(b.hp).toLocaleString()} /{" "}
              {Math.ceil(b.maxHp).toLocaleString()}
            </b>
          </header>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={b.maxHp}
            aria-valuenow={b.hp}
          >
            <i style={{ width: `${(b.hp / b.maxHp) * 100}%` }} />
          </div>
        </article>
      ))}
      {bosses.length > 2 && <small>还有 {bosses.length - 2} 位首领在场</small>}
    </section>
  );
}
export function PartsHelp({ coins }: { coins: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="parts-resource">
      <button aria-label="零件用途" onClick={() => setOpen((v) => !v)}>
        <Icon name="tool" size={11} />
        <span>零件</span>
        <b>{coins}</b>
      </button>
      {open && (
        <section className="parts-popover">
          <strong>全队共享的局内零件</strong>
          <p>击杀加班怪、回收门禁卡和波次奖励获得。</p>
          <dl>
            <dt>应急物资柜</dt>
            <dd>20 · 一次随机强化</dd>
            <dt>工具补给箱</dt>
            <dd>45 · 一次随机强化</dd>
            <dt>加班审批台</dt>
            <dd>35 · 高风险强化 / 永久增加敌潮</dd>
            <dt>医药补给点</dt>
            <dd>免费 · 治疗与护盾</dd>
          </dl>
          <small>
            靠近设施按住 E。费用以设施当前显示为准，本局结束后重置。
          </small>
        </section>
      )}
    </div>
  );
}
export function InteractionHUD({
  state,
  me,
}: {
  state: GameState;
  me: Player;
}) {
  const current = me.interaction;
  const ally = state.players.find(
    (p) =>
      !p.alive && p.id !== me.id && Math.hypot(p.x - me.x, p.y - me.y) < 95,
  );
  const relay =
    state.objective.type === "relay"
      ? state.objective.relays.find(
          (r) => !r.active && Math.hypot(r.x - me.x, r.y - me.y) < 95,
        )
      : undefined;
  const environment = state.officeProps?.find(
    (o) => !o.cd && Math.hypot(o.x - me.x, o.y - me.y) < 100,
  );
  const object = environment
    ? { ...environment, cost: 0, used: false }
    : state.objects.find(
        (o) => !o.used && Math.hypot(o.x - me.x, o.y - me.y) < 100,
      );
  if (!current && !ally && !relay && !object) return null;
  const target = current || {
    label: ally ? `救援 ${ally.name}` : relay ? "配电箱" : object!.label,
    progress: ally
      ? ally.revive / 2.7
      : relay
        ? relay.charge
        : object!.progress / 0.7,
    targetX: ally?.x ?? relay?.x ?? object!.x,
    targetY: ally?.y ?? relay?.y ?? object!.y,
    cost: object?.cost || 0,
    status: "idle",
  };
  const distance = Math.hypot(target.targetX - me.x, target.targetY - me.y),
    close = distance <= (relay ? 74 : 70),
    blocked =
      target.status !== "complete" &&
      (target.status === "blocked" || target.cost > state.coins);
  return (
    <section
      className={
        "interaction-channel " + target.status + (blocked ? " blocked" : "")
      }
      aria-label="E交互进度"
    >
      <span className="interact-key">
        {target.status === "complete" ? <Icon name="check" size={15} /> : "E"}
      </span>
      <div>
        <header>
          <strong>{target.label}</strong>
          <b>
            {target.status === "complete"
              ? "已完成"
              : blocked
                ? `缺少 ${target.cost - state.coins} 零件`
                : current
                  ? "正在同步"
                  : "等待交互"}
          </b>
        </header>
        <SmoothInteraction
          progress={Math.min(1, target.progress)}
          charging={target.status === "charging"}
          complete={target.status === "complete"}
          identity={`${target.label}/${target.targetX}/${target.targetY}`}
          rate={
            current?.type === "revive"
              ? (me.role === "medic" ? 1.5 : 1) / 2.7
              : current?.type === "relay"
                ? me.role === "engineer"
                  ? 0.2
                  : 0.14
                : 1 / 0.7
          }
        />
        <small>
          {target.status === "complete"
            ? "奖励与资源已同步"
            : blocked
              ? "零件全队共享，击杀与门禁回收可获得"
              : !close
                ? "再靠近一些，进入互动范围"
                : current
                  ? "正在交互 · 保持按住 E"
                  : "按住 E 开始 / 继续交互"}
          {target.cost > 0 && !blocked ? ` · 消耗 ${target.cost} 零件` : ""}
        </small>
      </div>
    </section>
  );
}
