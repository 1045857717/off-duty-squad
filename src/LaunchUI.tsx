import type { GameState, Player, RoomReply } from "../shared/types";
import { DraftPicker } from "./Arsenal";
import { ROLES } from "../shared/content";
import { Icon } from "./icons";
export function LaunchCountdown({
  state,
  playerId,
  request,
}: {
  state: GameState;
  playerId: string;
  request: (e: string, d?: unknown) => Promise<RoomReply>;
}) {
  if (state.phase !== "countdown") return null;
  const number = Math.max(1, Math.ceil(state.countdown));
  return (
    <section className="launch-countdown" role="status" aria-label="出发倒计时">
      <div className="launch-orbit">
        <i />
        <i />
        <b key={number}>{number}</b>
      </div>
      <span>打卡成功，正在接入快乐</span>
      <strong>倒数三秒，全员开始发癫。</strong>
      <p>职业普攻已就位 · 进入地图选首个改装 · 全员选完开战</p>
      <button
        onClick={() =>
          void request(
            state.host === playerId ? "game:cancel" : "player:ready",
            state.host === playerId ? {} : { ready: false },
          )
        }
      >
        {state.host === playerId ? "取消出发" : "取消准备"}
      </button>
    </section>
  );
}
export function InitialDeployment({
  state,
  me,
  playerId,
  request,
}: {
  state: GameState;
  me?: Player;
  playerId: string;
  request: (e: string, d?: unknown) => Promise<RoomReply>;
}) {
  if (state.phase !== "draft") return null;
  const waiting = state.players.filter((p) => !p.initialChosen);
  return (
    <section className="deployment-screen" aria-label="地图内初始技能选择">
      <header>
        <span>DEPLOYMENT / 小队接入中</span>
        <h2>
          {me?.initialChosen
            ? "改装已装配，等队友一起开工。"
            : "普攻自带，再挑一件反卷装备。"}
        </h2>
        <p>
          当前战场暂停 · {state.players.filter((p) => p.initialChosen).length}/
          {state.players.length} 已完成选择 · 全员完成后自动开战
        </p>
      </header>
      {me && !me.initialChosen ? (
        <DraftPicker
          me={me}
          onChoose={(id) => void request("game:upgrade", { id })}
        />
      ) : (
        <div className="deployment-ready">
          <Icon name="shield" size={36} />
          <strong>攻击模块已装配</strong>
          <span>
            你保留 {me ? ROLES[me.role].skill : "观战视角"} · 等待其他队员
          </span>
        </div>
      )}
      <div className="deployment-roster">
        {state.players.map((p) => (
          <div key={p.id} className={p.initialChosen ? "done" : "waiting"}>
            <i />
            <strong>{p.name}</strong>
            <span>
              {p.initialChosen
                ? "已就绪"
                : !p.connected
                  ? "连接中断"
                  : "正在选择"}
            </span>
            {state.host === playerId &&
              p.id !== playerId &&
              !p.initialChosen && (
                <button
                  aria-label={`移出 ${p.name}`}
                  onClick={() => void request("room:kick", { playerId: p.id })}
                >
                  移出
                </button>
              )}
          </div>
        ))}
      </div>
      <small>
        初始选项在本局内保留，刷新不会重新抽取。
        {waiting.length ? "等同伴选完，一起出发。" : "全员就绪。"}
      </small>
    </section>
  );
}
