import { workerQuote } from "../shared/humor";
import { RunReport } from "./RunReport";
import { BossVitals, PartsHelp, InteractionHUD } from "./CombatReadability";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { Key } from "./components";
import { MiniMap, DamageBoard } from "./DamageBoard";
import { ABILITIES, RARITY } from "../shared/rogue";
import { ArsenalStrip } from "./Arsenal";
import { ATTACKS } from "../shared/arsenal";
import { MISSIONS, ROLES } from "../shared/content";
import type { GameState, Player, RoomReply } from "../shared/types";
import type { SceneBridge } from "./game/StationScene";
export function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
export function GameHUD({
  state,
  me,
  onRescue,
}: {
  state: GameState;
  me: Player | undefined;
  onRescue?: () => void;
}) {
  const [expanded, setExpanded] = useState(true),
    [displayProgress, setDisplayProgress] = useState(state.objective.progress);
  useEffect(() => {
    if (state.objective.type !== "collect") {
      setDisplayProgress(state.objective.progress);
      return;
    }
    const flight = state.effects.some(
      (e) => e.kind === "collect" && e.pickupKind === "crystal",
    );
    const timer = setTimeout(
      () => setDisplayProgress(state.objective.progress),
      flight ? 620 : 0,
    );
    return () => clearTimeout(timer);
  }, [state.objective.progress, state.world.seed]);
  useEffect(() => {
    setExpanded(true);
    const t = setTimeout(() => setExpanded(false), 6500);
    return () => clearTimeout(t);
  }, [state.world.seed, state.wave]);
  const o = state.objective,
    title =
      state.mode === "survival"
        ? `园区发癫局 · 第${state.wave}波`
        : MISSIONS[state.mission % 6].objective;
  const ability = me
    ? {
        ...ABILITIES[me.ability],
        name: ROLES[me.role].skill,
        desc: ROLES[me.role].skillDesc,
      }
    : null;
  return (
    <>
      <div
        key={state.world.seed + "/" + state.wave}
        className={"mission-peek " + (expanded ? "expanded" : "folded")}
      >
        <button
          aria-label="查看任务详情"
          onClick={() => setExpanded((v) => !v)}
        >
          <Icon name={state.exitOpen ? "flag" : "compass"} size={13} />
          <strong>
            {expanded
              ? state.exitOpen
                ? "前往出口集合"
                : title
              : state.mode === "survival"
                ? `WAVE ${state.wave}`
                : `任务 ${state.mission + 1}`}
          </strong>
          <span
            data-objective-count
            key={displayProgress}
            className="objective-count"
          >
            {state.mode === "survival"
              ? `${state.waveKills}/${state.waveTarget} 击杀`
              : `${displayProgress}/${o.target}`}
          </span>
          <Icon name="chevron" size={10} />
        </button>
        <div className="mission-detail">
          <p>
            {state.mode === "survival"
              ? `${state.breakTime > 0 ? `整备 ${Math.ceil(state.breakTime)}s` : `本波还需存活 ${Math.max(0, Math.ceil(state.waveEnds - state.stageTime))}s`} · 精英增强 · 每5波首领`
              : MISSIONS[state.mission % 6].brief}
          </p>
        </div>
      </div>
      <BossVitals state={state} />
      {me && <ArsenalStrip me={me} level={state.level} />}
      {me && me.alive && state.phase === "playing" && (
        <InteractionHUD state={state} me={me} />
      )}
      {me && me.hitSeq > 0 && (
        <div
          key={me.hitSeq}
          className={"player-hit-edge " + (me.hitShield ? "shield-hit" : "")}
          aria-hidden="true"
        />
      )}
      {state.mode === "expedition" && state.exitOpen && (
        <div className="exit-guidance" role="status">
          <Icon name="flag" size={14} />
          <strong>撤离口已开启 · 跟随指引集合</strong>
          <small>
            {Math.floor(Math.min(1, state.exitProgress / 1.5) * 100)}%
          </small>
          <i
            style={{ width: `${Math.min(1, state.exitProgress / 1.5) * 100}%` }}
          />
        </div>
      )}
      <div className="run-clock">
        {formatTime(state.elapsed)}
        <small>
          {state.difficulty === "nightmare"
            ? "噩梦"
            : state.difficulty === "relaxed"
              ? "缓行"
              : "极限"}{" "}
          · {state.spectators.filter((p) => p.connected).length} 观战
        </small>
      </div>
      <MiniMap state={state} playerId={me?.id || ""} />
      <div
        className="team-xp"
        title="超额经验会保留，每16秒至多提升一级，避免连续跳级"
      >
        <span>LV.{state.level}</span>
        <i>
          <b
            style={{ width: `${Math.min(1, state.xp / state.xpNext) * 100}%` }}
          />
        </i>
        <small>
          {Math.floor(state.xp)}/{state.xpNext}
        </small>
      </div>
      {state.xp >= state.xpNext && state.elapsed < state.nextLevelAt && (
        <span className="xp-stabilizing">
          经验已结转 · {Math.ceil(state.nextLevelAt - state.elapsed)}s
          后继续进化
        </span>
      )}
      {state.event.kind !== "none" && (
        <div className={"world-event event-" + state.event.kind}>
          <Icon name="bolt" size={11} />
          {state.event.name}
          <small>{Math.ceil(state.event.remaining)}s</small>
        </div>
      )}
      {state.breakTime > 0 && (
        <div className="wave-break">
          第{state.wave - 1}波完成{" "}
          <span>
            {Math.ceil(state.breakTime)}s 后第{state.wave}波
          </span>
        </div>
      )}
      {me ? (
        <>
          <div className="combat-strip">
            <div className="vitals">
              <div className="vital-label">
                <Icon name="heart" size={12} />
                <strong>{Math.ceil(me.hp)}</strong>
                <small>/{me.maxHp}</small>
                {me.shield > 0 && (
                  <span>
                    <Icon name="shield" size={10} />
                    {Math.ceil(me.shield)}
                  </span>
                )}
              </div>
              <div
                className="vital-track"
                aria-label={`生命 ${Math.ceil(me.hp)} 护盾 ${Math.ceil(me.shield)}`}
              >
                <i style={{ width: `${(me.hp / me.maxHp) * 100}%` }} />
                <b
                  style={{
                    width: `${Math.min(1, me.shield / Math.max(30, me.shieldCap)) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div
              className={
                "micro-skill signature-tier-" +
                (me.signatureLevel >= 8 ? 2 : me.signatureLevel >= 4 ? 1 : 0) +
                " " +
                (me.skillCd <= 0 ? "ready" : "")
              }
              title={ability?.desc}
            >
              <Key>Q</Key>
              <Icon name={ability?.icon || "bolt"} size={13} />
              <span>
                {me.skillCd > 0 ? `${Math.ceil(me.skillCd)}s` : ability?.name}
              </span>
            </div>
            <div className={"micro-skill " + (me.dashCd <= 0 ? "ready" : "")}>
              <Key>空格 / 右键</Key>
              <Icon name="bolt" size={12} />
              <span>{me.dashCd > 0 ? `${me.dashCd.toFixed(1)}s` : "冲刺"}</span>
            </div>
            <PartsHelp coins={state.coins} />
          </div>
          {!me.alive &&
            state.phase === "playing" &&
            state.players.some((p) => p.alive && p.connected) && (
              <div className="downed-alert">
                <Icon name="heart" size={13} />
                <span>倒地 · 视野保持开启</span>
                <button onClick={onRescue} disabled={me.rescueCd > 0}>
                  <Key>H</Key>
                  {me.rescueCd > 0 ? `${Math.ceil(me.rescueCd)}s` : "呼叫求救"}
                </button>
                <small>队友按住E救援</small>
              </div>
            )}
        </>
      ) : (
        <div className="spectator-badge">
          <Icon name="eye" size={13} />
          观战中 · 自动追踪存活队员<span>按 Enter 与队伍聊天</span>
        </div>
      )}
      {state.phase === "playing" &&
        state.rescuePing &&
        state.rescuePing.until > state.elapsed && (
          <div className="rescue-banner">
            <Icon name="heart" size={12} />
            {state.rescuePing.name} 呼叫救援 · 位置已标记在雷达
          </div>
        )}
    </>
  );
}
export function AugmentPicker({
  me,
  onChoose,
  onClose,
}: {
  me: Player;
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <section className="augment-dock" role="region" aria-label="随机改装">
      <header>
        <span>
          <Icon name="sparkle" size={12} />
          随机改装 <em>待选 {me.pendingUpgrades}</em>
        </span>
        <small>移动 / 射击不中断</small>
        <button aria-label="暂存强化" onClick={onClose}>
          <Key>U</Key>收起
        </button>
      </header>
      <div className="quick-augment-cards">
        {me.offers.map((offer, index) => (
          <button
            key={offer.id}
            className={"rarity-" + offer.rarity}
            onClick={(event) => {
              event.currentTarget.blur();
              onChoose(offer.id);
            }}
            title={offer.desc}
          >
            <kbd>{index + 1}</kbd>
            <span className="quick-card-copy">
              <strong>
                {offer.name}
                <em>
                  {RARITY[offer.rarity]}
                  {offer.attackSkill
                    ? ` · ${offer.currentLevel ? "升级" : "新增"} LV.${offer.nextLevel}`
                    : offer.id === "signature"
                      ? ` · Q LV.${offer.nextLevel}`
                      : ` · LV.${offer.nextLevel || 1}`}
                </em>
              </strong>
              <small>{offer.desc}</small>
              {offer.growthPath && (
                <span className="offer-growth-path">{offer.growthPath}</span>
              )}
            </span>
            <Icon name={offer.icon} size={17} />
          </button>
        ))}
      </div>
    </section>
  );
}
export function StageOverlay({
  state,
  me,
  playerId,
  request,
}: {
  state: GameState;
  me: Player | undefined;
  playerId: string;
  request: (e: string, d?: unknown) => Promise<RoomReply>;
}) {
  if (state.phase === "upgrade")
    return (
      <>
        <div
          className="chapter-rest-banner"
          title={workerQuote(state.seed + state.wave)}
        >
          <Icon name="flag" size={13} />
          章节已封锁{" "}
          <span>
            {me?.upgradePicked
              ? "等待队员完成整备"
              : "选择1 / 2 / 3领取改装，继续深入"}
          </span>
        </div>
        {me && !me.upgradePicked && (
          <AugmentPicker
            me={me}
            onClose={() => {}}
            onChoose={(id) => void request("game:upgrade", { id })}
          />
        )}
      </>
    );
  if (!["won", "lost"].includes(state.phase)) return null;
  return (
    <RunReport
      state={state}
      playerId={playerId}
      onRestart={() => void request("game:restart")}
      onLeave={() => void request("room:leave")}
    />
  );
}
export function TouchControls({ bridge }: { bridge: SceneBridge }) {
  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        <button
          aria-label="向上移动"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            bridge.touch.y = -1;
          }}
          onPointerUp={() => (bridge.touch.y = 0)}
          onPointerCancel={() => (bridge.touch.y = 0)}
        >
          ↑
        </button>
        <div>
          {[
            [-1, "←"],
            [0, "↓"],
            [1, "→"],
          ].map(([x, label]) => (
            <button
              key={label}
              aria-label={
                label === "←"
                  ? "向左移动"
                  : label === "→"
                    ? "向右移动"
                    : "向下移动"
              }
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                if (x === 0) bridge.touch.y = 1;
                else bridge.touch.x = Number(x);
              }}
              onPointerUp={() => {
                bridge.touch.x = 0;
                bridge.touch.y = 0;
              }}
              onPointerCancel={() => {
                bridge.touch.x = 0;
                bridge.touch.y = 0;
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="touch-actions">
        <button onPointerDown={() => (bridge.touch.skill = true)}>Q</button>
        <button onPointerDown={() => (bridge.touch.dash = true)}>⇢</button>
        <button
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            bridge.touch.interact = true;
          }}
          onPointerUp={() => (bridge.touch.interact = false)}
        >
          E
        </button>
      </div>
    </div>
  );
}
