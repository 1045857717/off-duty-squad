import { useState } from "react";
import { RulesSelector } from "./RulesSelector";
import { SkillDetails } from "./SkillDetails";
import type { GameState, RoomReply } from "../shared/types";
import { ROLES } from "../shared/content";
import { ABILITIES } from "../shared/rogue";
import { Avatar } from "./hooks";
import { Icon } from "./icons";
import { OfficeBackdrop } from "./LobbyScene";

export function ReadyRoom({
  state,
  playerId,
  busy,
  request,
  onInvite,
}: {
  state: GameState;
  playerId: string;
  busy: boolean;
  request: (e: string, d?: unknown) => Promise<RoomReply>;
  onInvite: () => void;
}) {
  const [kickTarget, setKickTarget] = useState<string | null>(null),
    [kicking, setKicking] = useState(false);
  const host = state.host === playerId,
    me = state.players.find((p) => p.id === playerId);
  const waiting = state.players.filter(
    (p) => !p.bot && (!p.connected || (p.id !== state.host && !p.ready)),
  );
  const survival = state.mode === "survival";
  return (
    <section
      className={"ready-room " + (survival ? "ruins-brief" : "facility-brief")}
      aria-label="小队准备大厅"
    >
      <RulesSelector
        mode={state.mode}
        difficulty={state.difficulty}
        disabled={!host || busy}
        onMode={(mode) => void request("room:options", { mode })}
        onDifficulty={(difficulty) =>
          void request("room:options", { difficulty })
        }
      />
      <header className="ready-room-heading">
        <span className="lobby-assembly-label">
          <b className="lobby-step">02</b> 工友集合 <span>人到齐，就开摸</span>
        </span>
        <button
          className="ready-code"
          onClick={onInvite}
          aria-label="复制邀请链接"
        >
          <Icon name="link" size={13} /> {state.code} · 喊同事
        </button>
        <h2>{state.squadName}</h2>
        <p>
          {survival
            ? "今天的任务：让打印机先下班。"
            : "今天的任务：把下班权抢回来。"}{" "}
          职业随便搭，队友记得捞。
        </p>
        <div className="ready-ai-toolbar">
          <span>AI 伙伴</span>
          <div className="ai-seat-pills" role="group" aria-label="AI 伙伴数量">
            {Array.from(
              { length: 5 - state.players.filter((p) => !p.bot).length },
              (_, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!host || busy || state.phase === "countdown"}
                  aria-label={"添加" + i + "位AI"}
                  aria-pressed={state.players.filter((p) => p.bot).length === i}
                  onClick={() => void request("room:options", { botCount: i })}
                >
                  {i}
                  <small>AI</small>
                </button>
              ),
            )}
          </div>
        </div>
      </header>
      <div className="ready-staging">
        <OfficeBackdrop />
        <div className="ready-roster">
          {Array.from({ length: 4 }, (_, i) => {
            const p = state.players[i];
            if (!p)
              return (
                <button key={i} className="ready-seat empty" onClick={onInvite}>
                  <span className="ready-seat-number">0{i + 1} / 虚位以待</span>
                  <span className="empty-worker" aria-hidden="true">
                    <Icon name="plus" size={25} />
                  </span>
                  <strong>工位留给你</strong>
                  <small>点击复制邀请链接</small>
                </button>
              );
            const ready = p.bot || p.id === state.host || p.ready;
            return (
              <article
                key={p.id}
                className={
                  "ready-seat " +
                  (ready && p.connected ? "is-ready" : "is-waiting")
                }
                style={{ "--operative-color": p.color } as React.CSSProperties}
              >
                <div className="ready-seat-number">
                  0{i + 1} /{" "}
                  {p.id === state.host ? "房主" : p.bot ? "AI 伙伴" : "工友"}
                  <i className={p.connected ? "online" : "offline"} />
                </div>
                <div className="ready-portrait">
                  <Avatar role={p.role} size={145} />
                  <span className="portrait-scan" />
                </div>
                <h3>
                  {p.name}
                  {p.id === playerId && <em>你</em>}
                </h3>
                <span className="ready-role">
                  {ROLES[p.role].name}{" "}
                  <span> / {p.bot ? "AI 伙伴" : "真人玩家"}</span>
                </span>
                <div className="ready-loadout">
                  <Icon name={ABILITIES[p.ability].icon} size={13} />
                  {ROLES[p.role].skill}
                  <small>Q</small>
                </div>
                <footer>
                  <Icon
                    name={!p.connected ? "moon" : ready ? "check" : "clock"}
                    size={12}
                  />
                  {!p.connected
                    ? "连接中断"
                    : p.id === state.host
                      ? "房主 · 发起出发"
                      : ready
                        ? "已准备"
                        : "尚未准备"}
                </footer>
                {host && p.id !== playerId && (
                  <div className="seat-management">
                    {kickTarget === p.id ? (
                      <div
                        className="kick-confirm"
                        role="group"
                        aria-label={`确认移出${p.name}`}
                      >
                        <span>移出这位工友？</span>
                        <button
                          disabled={kicking}
                          onClick={async () => {
                            setKicking(true);
                            await request("room:kick", { playerId: p.id });
                            setKicking(false);
                            setKickTarget(null);
                          }}
                        >
                          确认移出
                        </button>
                        <button
                          disabled={kicking}
                          onClick={() => setKickTarget(null)}
                        >
                          留下他
                        </button>
                      </div>
                    ) : (
                      <button
                        className="manage-teammate"
                        aria-label={`管理队员 ${p.name}`}
                        title="管理队员"
                        onClick={() => setKickTarget(p.id)}
                      >
                        <Icon name="users" size={12} />
                        <span>管理</span>
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
      {me && (
        <details className="ready-skill-expand">
          <summary>查看 {ROLES[me.role].skill} 的伤害与详细机制</summary>
          <SkillDetails role={me.role} player={me} />
        </details>
      )}
      <footer className="ready-launch">
        <b className="lobby-step">03</b>
        <div aria-live="polite">
          <i className={waiting.length ? "wait-dot" : "signal-dot"} />
          <strong>
            {waiting.length
              ? `等待 ${waiting.map((p) => p.name).join("、")} 准备`
              : "小队已准备"}
          </strong>
          <small>
            {state.players.length}/4 队员 ·{" "}
            {state.spectators.filter((p) => p.connected).length} 观战 ·
            可单人开始
          </small>
        </div>
        {host && me && (
          <button
            className="btn btn-primary launch-only"
            disabled={busy || !!waiting.length || state.phase === "countdown"}
            onClick={() => void request("game:start")}
          >
            <Icon name="play" size={16} />
            小队出发
            <Icon name="arrow" size={16} />
          </button>
        )}
        {!host && me && (
          <button
            className={"btn " + (me.ready ? "btn-secondary" : "btn-primary")}
            disabled={busy}
            onClick={() => void request("player:ready", { ready: !me.ready })}
          >
            <Icon name={me.ready ? "check" : "shield"} size={15} />
            {me.ready ? "取消准备" : "我已准备"}
          </button>
        )}
        {!me && (
          <span className="ready-spectator">
            <Icon name="eye" size={14} />
            你正在观战整备过程
          </span>
        )}
      </footer>
    </section>
  );
}

export function EmptySignal() {
  return (
    <div className="empty-signal" aria-label="等待建立小队信道">
      <div className="signal-orbit">
        <Icon name="compass" size={70} />
        <i />
        <i />
      </div>
      <span className="eyebrow">PAID BREAK CREW / 第七整活部门</span>
      <h2>
        信号仍在。
        <br />
        等你们一起出发。
      </h2>
      <p>
        创建小队，或输入同事的房间码。
        <br />
        这里的每一位队友，都会是真实的连接。
      </p>
      <span className="empty-signal-footer">
        4 人实时合作 <b> / </b> 夺回下班权 <b> / </b> 无限防守
      </span>
    </div>
  );
}
