import { SkillDetails } from "./SkillDetails";
import { ProfessionCard } from "./ProfessionCard";
import { JobPicker } from "./JobPicker";
import type { GameState, Role, RoomReply } from "../shared/types";
import { ROLES } from "../shared/content";
import { Avatar } from "./hooks";
import { Icon } from "./icons";
import { ABILITIES } from "../shared/rogue";
export function TeamPanel({
  state,
  playerId,
  role,
  busy,
  onCreate,
  onJoin,
  onSolo,
  onRole,
  onInvite,
  request,
  onLeave,
}: {
  state: GameState | null;
  playerId: string;
  role: Role;
  busy: boolean;
  onCreate: () => void;
  onJoin: () => void;
  onSolo: () => void;
  onRole: (r: Role) => void;
  onInvite: () => void;
  request: (e: string, d?: unknown) => Promise<RoomReply>;
  onLeave: () => void;
}) {
  const players = state?.players || [],
    host = state?.host === playerId,
    lobby = !state || state.phase === "lobby";
  return (
    <aside className="team-panel">
      <div className="panel-top">
        <div>
          <h2>
            小队集结{" "}
            <span>
              {String(players.length).padStart(2, "0")}
              <small> / 04</small>
            </span>
          </h2>
        </div>
        <Icon name="users" size={20} />
      </div>
      <div className="team-slots">
        {Array.from({ length: 4 }, (_, i) => {
          const p = players[i],
            self = p?.id === playerId;
          return p ? (
            <div
              className={
                "team-slot occupied " +
                (self ? "self " : "") +
                ((p.ready || p.bot || p.id === state?.host) && p.connected
                  ? "is-ready"
                  : "")
              }
              key={i}
            >
              <div
                className="avatar-well"
                style={{ "--role-color": p.color } as React.CSSProperties}
              >
                <Avatar role={p.role} size={35} />
                <span
                  className={"presence " + (!p.connected ? "offline" : "")}
                />
              </div>
              <div className="slot-info">
                <strong>
                  {p.name}
                  {self && <em>你</em>}
                  {p.bot && <em>AI</em>}
                </strong>
                <small>
                  {ROLES[p.role].name} ·{" "}
                  {state?.phase === "playing"
                    ? p.alive
                      ? `${Math.ceil(p.hp)} / ${p.maxHp} HP`
                      : "等待救援"
                    : !p.connected
                      ? "暂时离线"
                      : p.ready || p.bot || p.id === state?.host
                        ? "已准备"
                        : "尚未准备"}
                </small>
                {state?.phase === "playing" && (
                  <div className="mini-health">
                    <i
                      style={{
                        width: `${(p.hp / p.maxHp) * 100}%`,
                        background: p.color,
                      }}
                    />
                  </div>
                )}
              </div>
              <span className="slot-status">
                {p.id === state?.host ? (
                  <Icon name="flag" size={13} />
                ) : lobby ? (
                  <Icon
                    name={p.ready && p.connected ? "check" : "clock"}
                    size={13}
                  />
                ) : p.alive ? (
                  <Icon name="check" size={13} />
                ) : (
                  <Icon name="heart" size={13} />
                )}
              </span>
            </div>
          ) : (
            <button
              className="team-slot empty"
              key={i}
              onClick={state ? onInvite : onCreate}
            >
              <span className="empty-avatar">
                <Icon name="plus" size={16} />
              </span>
              <span>
                虚位以待
                <small>{i === 1 ? "喊个同事，一起出发" : "邀请一位队友"}</small>
              </span>
              <span className="slot-number">0{i + 1}</span>
            </button>
          );
        })}
      </div>
      {state ? (
        <div className="room-box">
          <span>
            房间码{" "}
            <button className="text-btn" onClick={onInvite}>
              邀请同事
              <Icon name="link" size={12} />
            </button>
          </span>
          <button className="room-code" onClick={onInvite} title="复制邀请链接">
            {state.code}
            <Icon name="copy" size={15} />
          </button>
        </div>
      ) : (
        <div className="team-actions">
          <button
            className="btn btn-secondary full"
            onClick={onJoin}
            disabled={busy}
          >
            <Icon name="link" size={16} />
            输入房间码加入
          </button>
          <span className="team-hint">无需注册 · 同一地址，实时联机</span>
        </div>
      )}
      <div className="role-section">
        <div className="section-label">
          {lobby ? "选择你的职业" : "专属职业技能"}
          <span>{lobby ? "各有所长" : "Q 释放"}</span>
        </div>
        {lobby ? (
          <>
            <ProfessionCard role={role} />
            <JobPicker role={role} onRole={onRole} />
            <div className="role-description">
              <span style={{ color: ROLES[role].color }}>
                <Icon
                  name={
                    role === "scout"
                      ? "target"
                      : role === "engineer"
                        ? "tool"
                        : role === "medic"
                          ? "heart"
                          : "shield"
                  }
                  size={17}
                />
                {ROLES[role].skill}
              </span>
              <SkillDetails
                role={role}
                player={state?.players.find((p) => p.id === playerId)}
                compact
              />
            </div>
          </>
        ) : (
          <div className="role-description active">
            <span style={{ color: ROLES[role].color }}>
              <Icon
                name={
                  role === "scout"
                    ? "target"
                    : role === "engineer"
                      ? "tool"
                      : role === "medic"
                        ? "heart"
                        : "shield"
                }
                size={20}
              />
              {ROLES[role].skill} · LV.
              {state?.players.find((p) => p.id === playerId)?.signatureLevel ||
                1}
            </span>
            <details className="battle-role-guide">
              <summary>查看职业招式与详细数值</summary>
              <SkillDetails
                role={role}
                player={state?.players.find((p) => p.id === playerId)}
                compact
              />
            </details>
          </div>
        )}
      </div>
      {state && lobby && (
        <div className="room-options">
          <div>
            <span>AI 伙伴</span>
            <div
              className="ai-seat-pills"
              role="group"
              aria-label="AI 伙伴数量"
            >
              {Array.from(
                { length: 5 - players.filter((p) => !p.bot).length },
                (_, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!host || busy}
                    aria-label={`添加${i}位AI`}
                    aria-pressed={players.filter((p) => p.bot).length === i}
                    onClick={() =>
                      void request("room:options", { botCount: i })
                    }
                  >
                    {i}
                    <small>AI</small>
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      )}
      {!state ? (
        <button className="solo-button" onClick={onSolo} disabled={busy}>
          <Icon name="play" size={13} />
          先一个人试跑<span>含 AI 伙伴</span>
          <Icon name="chevron" size={12} />
        </button>
      ) : (
        <button className="leave-button" onClick={onLeave}>
          <Icon name="logout" size={13} />
          离开小队
        </button>
      )}
      <div className="squad-note">
        <Icon name="cup" size={15} />
        <p>
          手别停，梗别冷。
          <small>离谱进化 · 职场整活 · 队友互捞</small>
        </p>
      </div>
    </aside>
  );
}
