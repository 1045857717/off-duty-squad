import { useEffect, useRef, useState } from "react";
import type { ChatMessage, GameState, RoomReply } from "../shared/types";
import { LobbyChat } from "./OfficeUI";
import { SquadLobbyChat } from "./SquadLobbyChat";
import { newChatMessages } from "./community";
import { Icon } from "./icons";
const EMPTY: ChatMessage[] = [];
function useChatUnread(messages: ChatMessage[], visible: boolean) {
  const previous = useRef(messages.at(-1)?.id),
    [unread, setUnread] = useState(0);
  const last = messages.at(-1)?.id;
  useEffect(() => {
    if (visible || !messages.length) setUnread(0);
    else {
      const added = newChatMessages(previous.current, messages);
      if (added) setUnread((value) => Math.min(99, value + added));
    }
    previous.current = last;
  }, [last, visible]);
  // The active channel is already read in this render; the effect resets stored history.
  return visible ? 0 : unread;
}
export function LobbyChannels({
  state,
  messages,
  name,
  connected,
  online,
  request,
}: {
  state: GameState | null;
  messages: ChatMessage[];
  name: string;
  connected: boolean;
  online?: number;
  request: (event: string, data?: unknown) => Promise<RoomReply>;
}) {
  const inRun = !!state && !["lobby", "countdown"].includes(state.phase);
  const [channel, setChannel] = useState<"public" | "squad">(
    state ? "squad" : "public",
  );
  const [collapsed, setCollapsed] = useState(inRun);
  useEffect(() => setChannel(state ? "squad" : "public"), [state?.code]);
  useEffect(() => setCollapsed(inRun), [inRun]);
  useEffect(() => {
    const focus = () => {
      if (state) {
        setChannel("squad");
        setCollapsed(false);
      }
    };
    window.addEventListener("squad-chat:focus", focus);
    return () => window.removeEventListener("squad-chat:focus", focus);
  }, [state?.code]);
  const publicUnread = useChatUnread(
    messages,
    !collapsed && channel === "public",
  );
  const squadUnread = useChatUnread(
    state?.chat || EMPTY,
    !collapsed && channel === "squad",
  );
  const choose = (next: "public" | "squad") => {
    setChannel(next);
    setCollapsed(false);
  };
  return (
    <section
      className={
        "lobby-channels " +
        (collapsed ? "is-collapsed " : "") +
        (inRun ? "is-in-run" : "")
      }
      aria-label="大厅聊天频道"
    >
      <header className="channel-chat-header">
        <div
          role="tablist"
          aria-label="聊天频道"
          onKeyDown={(e) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
              return;
            e.preventDefault();
            e.stopPropagation();
            const next =
              e.key === "Home"
                ? "public"
                : e.key === "End" && state
                  ? "squad"
                  : state
                    ? channel === "public"
                      ? "squad"
                      : "public"
                    : "public";
            choose(next);
            document.getElementById(next + "-chat-tab")?.focus();
          }}
        >
          <button
            type="button"
            role="tab"
            id="public-chat-tab"
            aria-controls="public-chat-panel"
            aria-selected={channel === "public"}
            onClick={(e) => {
              choose("public");
              if (e.detail) e.currentTarget.blur();
            }}
          >
            <Icon name="users" size={13} />
            <span>公共聊天室</span>
            {publicUnread > 0 && (
              <b aria-label={publicUnread + "条公共未读"}>{publicUnread}</b>
            )}
          </button>
          {state && (
            <button
              type="button"
              role="tab"
              id="squad-chat-tab"
              aria-controls="squad-chat-panel"
              aria-selected={channel === "squad"}
              onClick={(e) => {
                choose("squad");
                if (e.detail) e.currentTarget.blur();
              }}
            >
              <Icon name="shield" size={13} />
              <span>小队茶水间</span>
              {squadUnread > 0 && (
                <b aria-label={squadUnread + "条小队未读"}>{squadUnread}</b>
              )}
            </button>
          )}
        </div>
        <button
          type="button"
          className="channel-collapse"
          aria-label={collapsed ? "展开聊天频道" : "收起聊天频道"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          <Icon name={collapsed ? "plus" : "minus"} size={14} />
        </button>
      </header>
      <div className="channel-chat-body" hidden={collapsed}>
        <div
          role="tabpanel"
          id="public-chat-panel"
          aria-labelledby="public-chat-tab"
          hidden={channel !== "public"}
        >
          <LobbyChat
            messages={messages}
            name={name}
            request={request}
            active={!collapsed && channel === "public"}
            connected={connected}
            online={online}
          />
        </div>
        {state && (
          <div
            role="tabpanel"
            id="squad-chat-panel"
            aria-labelledby="squad-chat-tab"
            hidden={channel !== "squad"}
          >
            <SquadLobbyChat
              key={state.code}
              state={state}
              request={request}
              active={!collapsed && channel === "squad"}
              embedded
            />
          </div>
        )}
      </div>
    </section>
  );
}
