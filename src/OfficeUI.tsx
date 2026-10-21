import { memo, useState, useRef, useEffect } from "react";
import type {
  ChatMessage,
  RoomReply,
  GameState,
  Player,
} from "../shared/types";
import { Icon } from "./icons";
import { messageTime } from "./Social";
export const LobbyChat = memo(function LobbyChat({
  messages,
  name,
  request,
  active = true,
  connected = true,
  online,
}: {
  messages: ChatMessage[];
  name: string;
  request: (e: string, d?: unknown) => Promise<RoomReply>;
  active?: boolean;
  connected?: boolean;
  online?: number;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hasNew, setHasNew] = useState(false);
  const log = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    following = useRef(true),
    wasActive = useRef(false);
  const composing = useRef(false);
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    if (active && log.current) {
      if (!wasActive.current || following.current) {
        log.current.scrollTop = log.current.scrollHeight;
        following.current = true;
        setHasNew(false);
      } else setHasNew(true);
    }
    wasActive.current = active;
  }, [lastId, active]);
  if (!active) return null;
  return (
    <section
      className="lobby-chat public-community-chat"
      aria-label="公共大厅聊天"
    >
      <header>
        <span>
          <Icon name="users" size={14} />
          全服茶水间
        </span>
        <small>
          <i className={connected ? "is-online" : "is-offline"} />
          {connected
            ? "全服在线 " + (online ?? "—") + " 人 · 跨房间聊天"
            : "连接中 · 草稿会保留"}
        </small>
      </header>
      <div
        className="public-chat-log"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        ref={log}
        onScroll={() => {
          const el = log.current;
          if (el) {
            following.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 36;
            if (following.current) setHasNew(false);
          }
        }}
      >
        {messages.length ? (
          messages.slice(-60).map((m) => (
            <p key={m.id} className={m.spectator ? "is-spectator" : ""}>
              <time dateTime={new Date(m.at).toISOString()}>
                {messageTime(m.at)}
              </time>
              <b>{m.name}</b>
              {m.spectator && <em>观战</em>}
              <span>{m.text}</span>
            </p>
          ))
        ) : (
          <p className="chat-welcome">
            <strong>本群不查考勤，只查谁还活着。</strong>
            <span>
              可以没有工作进度，不能没有精神状态。发句话，找个下班搭子。
            </span>
          </p>
        )}
      </div>
      {hasNew && (
        <button
          type="button"
          className="public-chat-jump"
          onClick={() => {
            if (log.current) log.current.scrollTop = log.current.scrollHeight;
            following.current = true;
            setHasNew(false);
          }}
        >
          有新消息，回到底部 ↓
        </button>
      )}
      {error && (
        <p className="public-chat-error" role="alert">
          {error}
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim() || busy || !connected || composing.current) return;
          const submitted = text;
          setBusy(true);
          setError("");
          try {
            const result = await request("lobby:chat", {
              name,
              text: submitted,
            });
            if (result.ok) {
              setText((current) => (current === submitted ? "" : current));
              if (input.current?.value === submitted) input.current.blur();
              following.current = true;
            } else setError(result.error || "没发出去，草稿还在。");
          } catch {
            setError("没发出去，草稿还在，稍后再试。");
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          ref={input}
          aria-label="大厅聊天内容"
          maxLength={160}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="吐槽两句，别发真需求…"
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
          }}
          onKeyDown={(e) => {
            if (e.key === "F8" || e.key === "F10") return;
            if (
              (e.nativeEvent.isComposing ||
                composing.current ||
                e.nativeEvent.keyCode === 229) &&
              e.key === "Enter"
            )
              e.preventDefault();
            e.stopPropagation();
          }}
        />
        <button type="submit" disabled={busy || !text.trim() || !connected}>
          {busy ? "发送中" : "发送"}
          <Icon name="arrow" size={12} />
        </button>
      </form>
      <footer>全服可见 · 最近 60 条</footer>
    </section>
  );
});
export function OfficeTactics({
  state,
  me,
  request,
}: {
  state: GameState;
  me?: Player;
  request: (e: string, d?: unknown) => Promise<RoomReply>;
}) {
  const vote = state.routeVote;
  return (
    <>
      {state.event.kind === "bonus" && (
        <div className="absurd-bonus">
          <Icon name="bolt" size={13} />
          <strong>老板不在，效率翻倍</strong>
          <span>火力加速 · 跑得更快</span>
          <b>{Math.ceil(state.event.remaining)}s</b>
        </div>
      )}
      <div
        className="office-noise"
        title="高噪声更容易吸引尸群；打印机和手机可以把敌人引向别处"
      >
        <Icon name="volume" size={10} />
        <span>动静</span>
        <i>
          <b style={{ width: `${state.noise}%` }} />
        </i>
        <small>{Math.round(state.noise)}</small>
      </div>
      {me && state.phase === "playing" && (
        <div className="team-ping-controls">
          <button
            title="G 集合 / Shift+G 危险 / Alt+G 补给"
            onClick={() => void request("team:ping", { kind: "gather" })}
          >
            <Icon name="flag" size={11} />
            集合<kbd>G</kbd>
          </button>
          <button
            aria-label="标记危险"
            onClick={() => void request("team:ping", { kind: "danger" })}
          >
            !
          </button>
          <button
            aria-label="标记补给"
            onClick={() => void request("team:ping", { kind: "supply" })}
          >
            ＋
          </button>
        </div>
      )}
      {vote && !vote.resolved && (
        <section className="route-vote" aria-label="小队路线投票">
          <header>
            <strong>接下来怎么走？</strong>
            <span>{Math.ceil(vote.remaining)}s · 真实队员多数票</span>
          </header>
          <div>
            {[
              ["supply", "茶水间补给", "全队恢复12HP，获得8零件"],
              ["overtime", "加班费讨债", "更多追击压力，击杀多1零件"],
              ["detour", "安全通道绕行", "刷怪减缓，延后随机事件"],
            ].map(([id, title, desc]) => (
              <button
                key={id}
                disabled={!me}
                className={vote.ballots[me?.id || ""] === id ? "selected" : ""}
                onClick={() => void request("team:vote", { route: id })}
              >
                <strong>{title}</strong>
                <small>{desc}</small>
                <b>
                  {Object.values(vote.ballots).filter((v) => v === id).length}票
                </b>
              </button>
            ))}
          </div>
        </section>
      )}
      {vote?.resolved && state.breakTime > 0 && (
        <div className="route-chosen">
          小队选择：
          {vote.resolved === "supply"
            ? "茶水间补给"
            : vote.resolved === "overtime"
              ? "加班费讨债"
              : "安全通道绕行"}
        </div>
      )}
    </>
  );
}
