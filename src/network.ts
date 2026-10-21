import type { ChatMessage } from "../shared/types";
import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import type { GameState, RoomReply, Input } from "../shared/types";
export const IS_FLOATING =
  new URLSearchParams(location.search).get("floating") === "1";
export function useNetwork(notify: (message: string) => void) {
  const [state, setState] = useState<GameState | null>(null),
    [connected, setConnected] = useState(false),
    [playerId, setPlayerId] = useState(""),
    [latency, setLatency] = useState(0),
    [busy, setBusy] = useState(false),
    [lobbyMessages, setLobbyMessages] = useState<ChatMessage[]>([]),
    [presence, setPresence] = useState<{
      online: number;
      players: number;
      spectators: number;
      lobby: number;
      rooms: number;
    } | null>(null);
  const ref = useRef<Socket | null>(null),
    notifyRef = useRef(notify),
    latest = useRef<GameState | null>(null),
    delegated = useRef(false);
  notifyRef.current = notify;
  useEffect(() => {
    const socket = io({
      autoConnect: !IS_FLOATING,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 750,
      timeout: 5000,
    });
    ref.current = socket;
    let published: GameState | null = null;
    socket.on("connect", () => {
      setConnected(true);
      if (delegated.current) return;
      const token = sessionStorage.getItem("offduty-session");
      if (token)
        socket
          .timeout(5000)
          .emit(
            "room:resume",
            { token, floating: IS_FLOATING },
            (err: Error | null, r: RoomReply) => {
              if (err) return;
              if (r.ok) setPlayerId(r.playerId!);
              else {
                sessionStorage.removeItem("offduty-session");
                latest.current = null;
                setState(null);
                setPlayerId("");
                notifyRef.current(r.error || "请重新加入房间。");
              }
            },
          );
    });
    socket.on("presence", (value) => setPresence(value));
    socket.on("disconnect", () => {
      setConnected(false);
      setPresence(null);
    });
    socket.on("connect_error", () => setConnected(false));
    socket.on("state", (s: GameState) => {
      const previous = latest.current;
      if (!s.world && previous?.code === s.code)
        s = { ...s, world: previous.world };
      if (!s.world) return;
      latest.current = s;
      if (
        !delegated.current &&
        (!previous ||
          previous.phase !== s.phase ||
          previous.code !== s.code ||
          previous.players.length !== s.players.length)
      ) {
        published = s;
        setState(s);
      }
    });
    socket.on("lobby:history", (messages) => setLobbyMessages(messages));
    socket.on("lobby:message", (message) =>
      setLobbyMessages((rows) =>
        [...rows.filter((m) => m.id !== message.id), message].slice(-60),
      ),
    );
    socket.on("chat", (message) => {
      if (!latest.current) return;
      const chat = latest.current.chat.some((m) => m.id === message.id)
        ? latest.current.chat
        : [...latest.current.chat, message].slice(-60);
      latest.current = { ...latest.current, chat };
      if (!delegated.current) setState(latest.current);
    });
    socket.on("room:closed", (data) => {
      sessionStorage.removeItem("offduty-session");
      latest.current = null;
      setState(null);
      setPlayerId("");
      notifyRef.current(data.message || "房间已关闭。");
    });
    socket.on("room:kicked", (data) => {
      sessionStorage.removeItem("offduty-session");
      latest.current = null;
      setState(null);
      setPlayerId("");
      notifyRef.current(data.message || "你已离开小队。");
    });
    socket.on("session:replaced", () => {
      if (delegated.current) return;
      if (!IS_FLOATING) sessionStorage.removeItem("offduty-session");
      latest.current = null;
      setState(null);
      setPlayerId("");
      notifyRef.current("此身份已移交到另一个窗口。");
    });
    const uiTimer = setInterval(() => {
      if (delegated.current || document.hidden || published === latest.current)
        return;
      published = latest.current;
      setState(published);
    }, 120);
    const pingTimer = setInterval(() => {
      if (!socket.connected || delegated.current || document.hidden) return;
      const t = performance.now();
      socket.timeout(2500).emit("ping:latency", {}, (err: Error | null) => {
        if (!err) setLatency(Math.max(1, Math.round(performance.now() - t)));
      });
    }, 3000);
    const message = (e: MessageEvent) => {
      if (
        !IS_FLOATING ||
        e.origin !== location.origin ||
        e.data?.type !== "offduty:window-session" ||
        typeof e.data.token !== "string"
      )
        return;
      if (e.source !== window.opener && e.source !== window.parent) return;
      sessionStorage.setItem("offduty-session", e.data.token);
      socket.connect();
    };
    window.addEventListener("message", message);
    if (
      IS_FLOATING &&
      window.parent !== window &&
      sessionStorage.getItem("offduty-session")
    )
      socket.connect();
    const ready = () => {
      if (!IS_FLOATING || socket.connected) return;
      const owner = window.opener || window.parent;
      if (owner !== window)
        owner.postMessage(
          { type: "offduty:window-ready" },
          window.parent !== window ? "*" : location.origin,
        );
    };
    ready();
    const handshake = setInterval(ready, 250);
    return () => {
      clearInterval(uiTimer);
      clearInterval(pingTimer);
      clearInterval(handshake);
      window.removeEventListener("message", message);
      socket.disconnect();
    };
  }, []);
  const request = useCallback(
    async (event: string, data: unknown = {}): Promise<RoomReply> => {
      const socket = ref.current;
      if (!socket?.connected) {
        notifyRef.current("未连接到游戏服务，正在尝试重连。");
        return { ok: false };
      }
      setBusy(true);
      return new Promise((resolve) =>
        socket
          .timeout(6000)
          .emit(event, data, (err: Error | null, r: RoomReply) => {
            setBusy(false);
            if (err) {
              notifyRef.current("网络响应超时，请稍后重试。");
              resolve({ ok: false });
              return;
            }
            if (r.ok) {
              if (r.token) {
                sessionStorage.setItem("offduty-session", r.token);
                setPlayerId(r.playerId!);
              }
              if (event === "room:leave") {
                sessionStorage.removeItem("offduty-session");
                latest.current = null;
                setState(null);
                setPlayerId("");
              }
            } else notifyRef.current(r.error || "操作失败");
            resolve(r);
          }),
      );
    },
    [],
  );
  const send = useCallback((input: Input) => {
    if (ref.current?.connected && !delegated.current)
      ref.current.volatile.emit("input", input);
  }, []);
  const delegate = useCallback(() => {
    delegated.current = true;
  }, []);
  const reclaim = useCallback(async () => {
    delegated.current = false;
    const token = sessionStorage.getItem("offduty-session");
    if (token) await request("room:resume", { token, floating: false });
  }, [request]);
  return {
    state,
    lobbyMessages,
    presence,
    latest,
    connected,
    playerId,
    latency,
    busy,
    request,
    send,
    delegate,
    reclaim,
  };
}
