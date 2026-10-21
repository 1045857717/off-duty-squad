import { useState, useRef, useEffect } from "react";
import type {
  ChatMessage,
  RoomReply,
  GameState,
  Player,
} from "../shared/types";
import { Icon } from "./icons";
import { messageTime } from "./Social";
export function LobbyChat({
  messages,
  name,
  request,
}: {
  messages: ChatMessage[];
  name: string;
  request: (e: string, d?: unknown) => Promise<RoomReply>;
}) {
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (end.current?.parentElement)
      end.current.parentElement.scrollTop =
        end.current.parentElement.scrollHeight;
  }, [messages.length]);
  return (
    <section className="lobby-chat" aria-label="公共大厅聊天">
      <header>
        <span>
          <Icon name="users" size={14} />
          下班搭子群
        </span>
        <small>公共频道 · 不同房间的同事都能看见</small>
      </header>
      <div role="log" aria-live="polite">
        {messages.length ? (
          messages.slice(-20).map((m) => (
            <p key={m.id}>
              <time>{messageTime(m.at)}</time>
              <b>{m.name}</b>
              <span>{m.text}</span>
            </p>
          ))
        ) : (
          <p className="chat-welcome">
            群公告：不问进度，只问人齐了没。发条消息，找个下班搭子。
          </p>
        )}
        <div ref={end} />
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          const result = await request("lobby:chat", { name, text });
          if (result.ok) setText("");
        }}
      >
        <input
          aria-label="大厅聊天内容"
          maxLength={160}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="喊个同事，一起下班…"
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing && e.key === "Enter")
              e.preventDefault();
            e.stopPropagation();
          }}
        />
        <button type="submit">
          发送
          <Icon name="arrow" size={12} />
        </button>
      </form>
    </section>
  );
}
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
