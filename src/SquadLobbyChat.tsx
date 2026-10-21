import { useState, useEffect, useRef } from "react";
import type { GameState, RoomReply } from "../shared/types";
import { Icon } from "./icons";
import { messageTime } from "./Social";
export function SquadLobbyChat({
  state,
  request,
  active = true,
  embedded = false,
}: {
  state: GameState;
  request: (event: string, data?: unknown) => Promise<RoomReply>;
  active?: boolean;
  embedded?: boolean;
}) {
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [collapsed, setCollapsed] = useState(
      () => !embedded && window.matchMedia("(max-width:620px)").matches,
    );
  const log = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [state.chat.at(-1)?.id, active]);
  useEffect(() => {
    if (embedded) return;
    const mq = window.matchMedia("(max-width:620px)");
    const change = () => setCollapsed(mq.matches);
    mq.addEventListener("change", change);
    return () => mq.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const focus = () => {
      setCollapsed(false);
      requestAnimationFrame(() => input.current?.focus());
    };
    window.addEventListener("squad-chat:focus", focus);
    return () => window.removeEventListener("squad-chat:focus", focus);
  }, []);
  if (!active) return null;
  return (
    <section
      className={
        "squad-lobby-chat " +
        (embedded ? "is-embedded " : "") +
        (collapsed ? "is-collapsed" : "")
      }
      aria-label="小队大厅聊天"
    >
      <header>
        <span>
          <Icon name="users" size={18} />
          <strong>{embedded ? "本小队专线" : "小队茶水间"}</strong>
          <b>
            {state.players.filter((p) => p.connected && !p.bot).length +
              state.spectators.filter((p) => p.connected).length}{" "}
            人在线
          </b>
          {!embedded && (
            <button
              className="squad-chat-toggle"
              aria-label={collapsed ? "展开茶水间" : "收起茶水间"}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((v) => !v)}
            >
              <Icon name={collapsed ? "plus" : "minus"} size={15} />
            </button>
          )}
        </span>
        <small>本小队与观众可见 · 公共发言请切换频道</small>
      </header>
      <div
        ref={log}
        className="squad-chat-messages"
        role="log"
        aria-live="polite"
      >
        {state.chat.slice(-45).map((m) => (
          <p key={m.id} className={m.system ? "system" : ""}>
            <time>{messageTime(m.at)}</time>
            <strong>
              {m.name}
              {m.spectator && <em>观战</em>}
            </strong>
            <span>{m.text}</span>
          </p>
        ))}
        {!state.chat.length && (
          <p className="system">进群先别报工时，先报个到。</p>
        )}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim() || busy) return;
          setBusy(true);
          const r = await request("chat:send", { text });
          setBusy(false);
          if (r.ok) {
            setText("");
            input.current?.blur();
          }
        }}
      >
        <input
          ref={input}
          aria-label="聊天内容"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={160}
          placeholder="给队友发句话，发完就能准备出发"
          onKeyDown={(e) => {
            if (e.key === "F8" || e.key === "F10") return;
            e.stopPropagation();
            if (e.nativeEvent.isComposing && e.key === "Enter")
              e.preventDefault();
          }}
        />
        <button type="submit" disabled={busy || !text.trim()}>
          发送
          <Icon name="arrow" size={14} />
        </button>
      </form>
    </section>
  );
}
