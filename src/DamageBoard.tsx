import { whole } from "../shared/balance";
import { rankDamage } from "../shared/ranking";
import { MAP_WALLS, EXIT } from "../shared/content";
import type { GameState } from "../shared/types";
import { Icon } from "./icons";
export function DamageBoard({
  state,
  playerId,
  overlay = false,
}: {
  state: GameState;
  playerId: string;
  overlay?: boolean;
}) {
  const rows = rankDamage(state.players),
    total = state.players.reduce((n, p) => n + p.damageDealt, 0),
    top = Math.max(1, ...state.players.map((p) => p.damageDealt));
  return (
    <section
      className={"damage-board " + (overlay ? "damage-overlay" : "")}
      aria-label="实时伤害排名"
    >
      <div className="damage-heading">
        <span>
          <Icon name="target" size={12} />
          小队火力
        </span>
        <kbd>F7</kbd>
      </div>
      <header className="damage-summary">
        <strong>{whole(total)}</strong>
        <span>
          总伤害 <b>{whole(total / Math.max(1, state.elapsed))} DPS</b>
        </span>
      </header>
      {rows.map(({ player: p, rank, share }) => (
        <div
          className={"damage-row " + (p.id === playerId ? "is-you" : "")}
          key={p.id}
          style={{ "--rank-color": p.color } as React.CSSProperties}
        >
          <span className="damage-rank">{String(rank).padStart(2, "0")}</span>
          <div className="damage-person">
            <div>
              <strong>
                {p.name}
                {p.bot && <em>AI</em>}
              </strong>
              <b className="damage-total">{whole(p.damageDealt)}</b>
            </div>
            <div className="damage-track">
              <i style={{ width: `${(p.damageDealt / top) * 100}%` }} />
            </div>
            <small>
              <span>
                {whole(p.damageDealt / Math.max(1, state.elapsed))} DPS
              </span>
              <span>
                {p.kills} 击败 · {Math.round(share)}%
              </span>
            </small>
          </div>
        </div>
      ))}
      <p className="damage-note">有效伤害 / 不计溢出</p>
    </section>
  );
}
export function MiniMap({
  state,
  playerId,
}: {
  state: GameState;
  playerId: string;
}) {
  return (
    <div className="mini-map" aria-label="任务雷达">
      <span>
        <Icon name="compass" size={10} />
        {state.mode === "survival" ? "CATASTROPHE RADAR" : "MISSION RADAR"}
      </span>
      <svg viewBox={`0 0 ${state.world.w} ${state.world.h}`} aria-hidden="true">
        <rect width={state.world.w} height={state.world.h} fill="#111920" />
        {state.world.walls.map((w, i) => (
          <rect
            key={i}
            x={w.x}
            y={w.y}
            width={w.w}
            height={w.h}
            fill="#648b81"
            opacity=".65"
          />
        ))}
        {state.pickups
          .filter((p) => p.kind === "crystal")
          .map((p) => (
            <circle key={p.id} cx={p.x} cy={p.y} r="12" fill="#cef2aa" />
          ))}
        {state.objective.type === "relay" &&
          state.objective.relays.map((r, i) => (
            <rect
              key={i}
              x={r.x - 14}
              y={r.y - 14}
              width="28"
              height="28"
              fill={r.active ? "#b9ef82" : "#edc385"}
            />
          ))}
        {state.objective.type === "escort" && (
          <circle
            cx={state.objective.drone.x}
            cy={state.objective.drone.y}
            r="18"
            fill="#83cfdb"
          />
        )}
        {state.mode === "expedition" && (
          <ellipse
            cx={state.world.exit.x}
            cy={state.world.exit.y}
            rx="18"
            ry="25"
            fill="none"
            stroke={state.exitOpen ? "#d5f2aa" : "#7da9a1"}
            strokeWidth="7"
          />
        )}
        {state.rescuePing && state.rescuePing.until > state.elapsed && (
          <circle
            cx={state.rescuePing.x}
            cy={state.rescuePing.y}
            r="45"
            fill="none"
            stroke="#eda568"
            strokeWidth="12"
          />
        )}
        {state.players.map((p) => (
          <g key={p.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={p.id === playerId ? "20" : "13"}
              fill={p.color}
              stroke={p.id === playerId ? "#f4f0d0" : "none"}
              strokeWidth="5"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
