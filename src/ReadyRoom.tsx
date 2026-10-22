import { useState } from "react";
import { RulesSelector } from "./RulesSelector";
import { SkillDetails } from "./SkillDetails";
import type { GameState, RoomReply } from "../shared/types";
import { ROLES } from "../shared/content";
import { DraftPicker } from "./Arsenal";
import { ABILITIES } from "../shared/rogue";
import { Avatar } from "./hooks";
import { Icon } from "./icons";

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
      <header className="ready-room-heading">
        <span className="eyebrow">
          <i className="signal-dot" /> LIVE SQUAD / 实时整备
        </span>
        <span className="ready-code">信道 {state.code}</span>
        <h2>{state.squadName}</h2>
        <p>
          每一席都是真实连接的队员。确认职业，等同伴准备后出发。初始技能进入地图后选择。
        </p>
      </header>
      <div className="ready-roster">
        {Array.from({ length: 4 }, (_, i) => {
          const p = state.players[i];
          if (!p)
            return (
              <button key={i} className="ready-seat empty" onClick={onInvite}>
                <span className="ready-seat-number">0{i + 1} / OPEN</span>
                <Icon name="plus" size={25} />
                <strong>等待队友加入</strong>
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
                {p.id === state.host
                  ? "LEADER"
                  : p.bot
                    ? "AI PARTNER"
                    : "OPERATIVE"}
                <i className={p.connected ? "online" : "offline"} />
              </div>
              <div className="ready-portrait">
                <Avatar role={p.role} size={100} />
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
      <RulesSelector
        mode={state.mode}
        difficulty={state.difficulty}
        disabled={!host || busy}
        onMode={(mode) => void request("room:options", { mode })}
        onDifficulty={(difficulty) =>
          void request("room:options", { difficulty })
        }
      />
      <div className="ready-mode-brief">
        <span className="ready-mode-emblem">
          <Icon name={survival ? "shield" : "compass"} size={27} />
        </span>
        <div>
          <small>
            {survival ? "ENDLESS / 灾变围城" : "EXPEDITION / 封锁区远征"}
          </small>
          <h3>
            {survival
              ? "守住彼此，撑过下一波。"
              : "穿过六层办公楼，带着同事下班。"}
          </h3>
          <p>
            {survival
              ? "整活园区与随机道路 · 无限波次 · 每 5 波首领 · 波间补给 · 击杀与生存计分"
              : "房间与岔路探索 · 收集 / 启动 / 护送 / 首领 · 解锁撤离口 · 完成六章通关"}
          </p>
        </div>
        <b>
          {state.difficulty === "nightmare"
            ? "老板开挂"
            : state.difficulty === "relaxed"
              ? "带薪散步"
              : "正常发癫"}
        </b>
      </div>
      {me && (
        <details className="ready-skill-expand">
          <summary>查看 {ROLES[me.role].skill} 的伤害与详细机制</summary>
          <SkillDetails role={me.role} player={me} />
        </details>
      )}
      <footer className="ready-launch">
        <div>
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
            disabled={busy || !!waiting.length}
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
      <span className="eyebrow">SALARY THIEVES / 第七整活部门</span>
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
