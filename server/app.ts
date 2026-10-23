import { transientSnapshot } from "./snapshot";
import { SnapshotCadence } from "./snapshotCadence";
import { APP_VERSION } from "./version";
import { rankPeriod, rankingWindow } from "../shared/rankPeriod";
import { statSync } from "node:fs";
import { pingTeam, voteRoute } from "./office";
import { ROLE_SIGNATURE } from "../shared/arsenal";
import express from "express";
import { createServer as createHttpServer } from "node:http";
import { randomInt, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server, type Socket } from "socket.io";
import {
  createGame,
  addPlayer,
  removePlayer,
  startGame,
  cancelLaunch,
  setInput,
  tickGame,
  chooseUpgrade,
  restartGame,
  queueAbilities,
  rescueCall,
} from "./simulation";
import { ScoreStore } from "./scores";
import { ROLES, EMPTY_INPUT } from "../shared/content";
import type {
  Game,
  Role,
  RoomReply,
  RoomSummary,
  ChatMessage,
} from "../shared/types";
type Session = {
  token: string;
  playerId: string;
  code: string;
  socketId: string;
  name: string;
  spectator: boolean;
  lastInput: number;
  disconnectedAt: number;
  floating?: boolean;
};
export function createServer(options: { dataDir?: string } = {}) {
  const app = express(),
    http = createHttpServer(app),
    io = new Server(http, {
      maxHttpBufferSize: 8192,
      serveClient: false,
      // Dense late-game JSON otherwise costs tens of Mbps per viewer. Keep
      // compression cheap and bound concurrent zlib work and retained contexts.
      perMessageDeflate: {
        threshold: 1024,
        serverNoContextTakeover: true,
        clientNoContextTakeover: true,
        concurrencyLimit: 4,
        zlibDeflateOptions: { level: 1, memLevel: 7 },
      },
    });
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
    rooms = new Map<string, Game>(),
    sessions = new Map<string, Session>(),
    scores = new ScoreStore(
      options.dataDir || process.env.DATA_DIR || path.join(root, "data"),
    );
  const lobbyChat: ChatMessage[] = [];
  const lastWorld = new WeakMap<Game, unknown>();
  const snapshotCadences = new WeakMap<Game, SnapshotCadence>();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  const presence = () => {
    const people = new Map<string, { spectator: boolean; room: boolean }>();
    for (const socket of io.sockets.sockets.values()) {
      const se = sessions.get(socket.data.token);
      const key = se?.playerId || socket.data.presenceKey || socket.id,
        previous = people.get(key);
      people.set(key, {
        spectator: se?.spectator ?? previous?.spectator ?? false,
        room: !!se || !!previous?.room,
      });
    }
    const rows = [...people.values()];
    return {
      online: rows.length,
      players: rows.filter((p) => p.room && !p.spectator).length,
      spectators: rows.filter((p) => p.spectator).length,
      lobby: rows.filter((p) => !p.room).length,
      rooms: rooms.size,
    };
  };
  app.get("/api/presence", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(presence());
  });
  let previousPresence = "";
  const presenceTick = setInterval(() => {
    const next = presence(),
      key = JSON.stringify(next);
    if (key !== previousPresence) {
      previousPresence = key;
      io.emit("presence", next);
    }
  }, 500);
  const summaries = (): RoomSummary[] =>
    [...rooms.values()]
      .filter((g) => g.state.players.some((p) => !p.bot && p.connected))
      .map((g) => ({
        code: g.state.code,
        squadName: g.state.squadName,
        mode: g.state.mode,
        difficulty: g.state.difficulty,
        phase: g.state.phase,
        players: g.state.players.filter((p) => !p.bot).length,
        bots: g.state.players.filter((p) => p.bot).length,
        maxPlayers: 4,
        spectators: g.state.spectators.filter((p) => p.connected).length,
        wave: g.state.wave,
        level: g.state.level,
        elapsed: Math.floor(g.state.elapsed),
      }));
  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", rooms: rooms.size, version: APP_VERSION }),
  );
  const desktopFile = path.join(root, "releases/offshift-desktop-win-x64.zip");
  app.get("/api/desktop", (_req, res) => {
    const available = existsSync(desktopFile);
    res.json({
      available,
      version: APP_VERSION,
      url: "/downloads/offshift-desktop-win-x64.zip",
      bytes: available ? statSync(desktopFile).size : 0,
      platform: "Windows x64",
    });
  });
  app.get("/downloads/offshift-desktop-win-x64.zip", (_req, res) => {
    if (!existsSync(desktopFile)) {
      res.status(404).json({ error: "此服务器暂未发布桌面客户端" });
      return;
    }
    res.download(desktopFile, "offshift-desktop-win-x64.zip");
  });
  app.get("/api/rooms", (_req, res) => res.json(summaries()));
  app.get("/api/scores", (req, res) =>
    res.json(
      scores.list(
        req.query.mode as any,
        req.query.difficulty as any,
        rankPeriod(req.query.period),
      ),
    ),
  );
  app.use(
    express.static(path.join(root, "dist"), {
      maxAge: "1h",
      setHeaders(res, file) {
        if (file.endsWith("index.html"))
          res.setHeader("Cache-Control", "no-cache");
      },
    }),
  );
  app.get("*", (_req, res) => {
    const index = path.join(root, "dist/index.html");
    if (existsSync(index)) res.sendFile(index);
    else res.status(503).send("请先运行 npm run build，或使用 npm run dev。");
  });
  const broadcast = (g: Game) => {
    const full = lastWorld.get(g) !== g.state.world;
    lastWorld.set(g, g.state.world);
    const packet = full ? g.state : transientSnapshot(g.state);
    if (full) io.to(g.state.code).emit("state", g.state);
    else io.to(g.state.code).volatile.emit("state", packet);
  };
  const sessionOf = (s: Socket) => sessions.get(s.data.token),
    roomOf = (s: Socket) => {
      const se = sessionOf(s);
      return se ? rooms.get(se.code) : undefined;
    };
  const message = (
    g: Game,
    name: string,
    text: string,
    spectator = false,
    system = false,
    playerId?: string,
  ) => {
    const msg: ChatMessage = {
      id: randomUUID(),
      playerId,
      name,
      text,
      at: Date.now(),
      spectator,
      system,
    };
    g.state.chat.push(msg);
    g.state.chat = g.state.chat.slice(-60);
    io.to(g.state.code).emit("chat", msg);
  };
  function disposeAbandoned(g: Game) {
    if (g.state.players.some((p) => !p.bot)) return false;
    io.to(g.state.code).emit("room:closed", {
      message: "最后一位真人已离开，房间已关闭。",
    });
    io.in(g.state.code).socketsLeave(g.state.code);
    for (const [token, se] of sessions)
      if (se.code === g.state.code) {
        const socket = io.sockets.sockets.get(se.socketId);
        if (socket) delete socket.data.token;
        sessions.delete(token);
      }
    rooms.delete(g.state.code);
    g.inputs.clear();
    g.queuedAbilities.clear();
    return true;
  }
  function detach(s: Socket, explicit = false) {
    const se = sessionOf(s);
    if (!se || se.socketId !== s.id) return;
    const g = rooms.get(se.code);
    if (g) {
      s.leave(se.code);
      if (se.spectator) {
        if (explicit)
          g.state.spectators = g.state.spectators.filter(
            (p) => p.id !== se.playerId,
          );
        else {
          const sp = g.state.spectators.find((p) => p.id === se.playerId);
          if (sp) sp.connected = false;
        }
      } else if (explicit) removePlayer(g, se.playerId);
      else {
        const p = g.state.players.find((p) => p.id === se.playerId);
        if (p) {
          p.connected = false;
          if (["lobby", "countdown"].includes(g.state.phase)) {
            p.ready = false;
            cancelLaunch(g);
          }
        }
        setInput(g, se.playerId, EMPTY_INPUT);
        g.queuedAbilities.delete(se.playerId);
        if (g.state.host === se.playerId && !se.floating) {
          const next = g.state.players.find((p) => !p.bot && p.connected);
          if (next) g.state.host = next.id;
        }
      }
      if (explicit) sessions.delete(se.token);
      else se.disconnectedAt = Date.now();
      if (!disposeAbandoned(g)) broadcast(g);
    }
    delete s.data.token;
    if (explicit) delete s.data.presenceKey;
  }
  function attach(s: Socket, g: Game, se: Session) {
    s.data.token = se.token;
    s.data.presenceKey = se.playerId;
    se.socketId = s.id;
    se.disconnectedAt = 0;
    se.lastInput = Date.now();
    s.join(se.code);
    sessions.set(se.token, se);
    if (se.spectator) {
      let sp = g.state.spectators.find((p) => p.id === se.playerId);
      if (!sp) {
        sp = { id: se.playerId, name: se.name, connected: true };
        g.state.spectators.push(sp);
      }
      sp.connected = true;
    } else {
      const p = g.state.players.find((p) => p.id === se.playerId);
      if (p) p.connected = true;
    }
    s.emit("state", g.state);
    broadcast(g);
  }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = () => {
    let c = "";
    do
      c = Array.from(
        { length: 6 },
        () => alphabet[randomInt(alphabet.length)],
      ).join("");
    while (rooms.has(c));
    return c;
  };
  io.on("connection", (s) => {
    s.emit("lobby:history", lobbyChat);
    s.emit("presence", presence());
    let actions: number[] = [],
      created: number[] = [],
      chatTimes: number[] = [],
      publicChatTimes: number[] = [],
      inputAt = 0;
    const bind = (event: string, fn: (data: any) => RoomReply) =>
      s.on(event, (data, cb) => {
        if (typeof cb !== "function") return;
        actions = actions.filter((t) => Date.now() - t < 1000);
        if (actions.length > 30) {
          cb({ ok: false, error: "操作太频繁，请稍后再试。" });
          return;
        }
        actions.push(Date.now());
        try {
          cb(fn(data && typeof data === "object" ? data : {}));
        } catch (err) {
          console.error("Handler", event, String(err));
          cb({ ok: false, error: "操作失败，请重试。" });
        }
      });
    bind("rooms:list", () => ({ ok: true, rooms: summaries() }));
    bind("scores:list", (data) => ({
      ok: true,
      scores: scores.list(data.mode, data.difficulty, rankPeriod(data.period)),
      rankingWindow: rankingWindow(rankPeriod(data.period)),
    }));
    bind("presence:get", () => ({ ok: true, presence: presence() }));
    bind("lobby:history", () => ({ ok: true, messages: lobbyChat }));
    bind("lobby:chat", (data) => {
      publicChatTimes = publicChatTimes.filter((t) => Date.now() - t < 5000);
      if (publicChatTimes.length >= 4)
        return { ok: false, error: "先喝口水，5秒最多4条大厅消息。" };
      const text =
        typeof data.text === "string"
          ? data.text
              .replace(/[\u0000-\u001f]/g, " ")
              .trim()
              .slice(0, 160)
          : "";
      if (!text) return { ok: false, error: "请输入消息。" };
      const session = sessionOf(s);
      const name =
        session?.name ||
        (typeof data.name === "string"
          ? data.name
              .replace(/[\u0000-\u001f]/g, " ")
              .trim()
              .slice(0, 16) || "匿名工友"
          : "匿名工友");
      publicChatTimes.push(Date.now());
      const msg: ChatMessage = {
        id: randomUUID(),
        name,
        text,
        at: Date.now(),
        spectator: session?.spectator ?? false,
        playerId: session?.playerId,
      };
      lobbyChat.push(msg);
      if (lobbyChat.length > 60) lobbyChat.shift();
      io.emit("lobby:message", msg);
      return { ok: true };
    });
    bind("team:ping", (data) => {
      const g = roomOf(s),
        se = sessionOf(s);
      if (
        !g ||
        !se ||
        se.spectator ||
        !["danger", "supply", "gather"].includes(data.kind) ||
        !pingTeam(g, se.playerId, data.kind)
      )
        return { ok: false, error: "标记冷却中，稍后再试。" };
      broadcast(g);
      return { ok: true };
    });
    bind("team:vote", (data) => {
      const g = roomOf(s),
        se = sessionOf(s);
      if (!g || !se || se.spectator || !voteRoute(g, se.playerId, data.route))
        return { ok: false, error: "当前不能投票。" };
      broadcast(g);
      return { ok: true };
    });
    bind("room:create", (data) => {
      if (!Object.hasOwn(ROLES, data.role))
        return { ok: false, error: "请选择有效职业。" };
      created = created.filter((t) => Date.now() - t < 60000);
      if (created.length >= 6 || rooms.size >= 100)
        return { ok: false, error: "创建过于频繁。" };
      created.push(Date.now());
      detach(s, true);
      const c = code(),
        id = randomUUID(),
        token = randomUUID(),
        g = createGame(c, id);
      if (data.mode === "survival") g.state.mode = "survival";
      const previousRules = `${g.state.mode}/${g.state.difficulty}`;
      if (["normal", "relaxed", "nightmare"].includes(data.difficulty))
        g.state.difficulty = data.difficulty;
      g.state.squadName =
        typeof data.squadName === "string"
          ? data.squadName.trim().slice(0, 20) || "深渊小队"
          : "深渊小队";
      addPlayer(
        g,
        id,
        typeof data.name === "string" ? data.name : "匿名干员",
        data.role,
      );
      rooms.set(c, g);
      attach(s, g, {
        token,
        playerId: id,
        code: c,
        socketId: s.id,
        name: g.state.players[0].name,
        spectator: false,
        lastInput: Date.now(),
        disconnectedAt: 0,
      });
      message(
        g,
        "行动控制",
        `${g.state.players[0].name} 创建了小队。`,
        false,
        true,
      );
      return { ok: true, code: c, playerId: id, token };
    });
    function join(data: any, spectator = false): RoomReply {
      const c =
        typeof data.code === "string"
          ? data.code.toUpperCase().replace(/\s/g, "")
          : "";
      const g = rooms.get(c);
      if (!g) return { ok: false, error: "未找到房间，请检查六位房间码。" };
      if (spectator) {
        if (g.state.spectators.length >= 40)
          return { ok: false, error: "观战席暂时已满。" };
      } else {
        if (!Object.hasOwn(ROLES, data.role))
          return { ok: false, error: "请选择有效职业。" };
        if (["won", "lost"].includes(g.state.phase))
          return {
            ok: false,
            error: "本局已结束，可以观战或等待房主返回基地。",
          };
        if (g.state.players.length >= 4) {
          const bot = g.state.players.find((p) => p.bot);
          if (bot) removePlayer(g, bot.id);
          else return { ok: false, error: "小队满员，可以选择观战。" };
        }
      }
      detach(s, true);
      const id = randomUUID(),
        token = randomUUID(),
        name =
          (typeof data.name === "string" ? data.name : "观战同事")
            .trim()
            .slice(0, 12) || "同事";
      if (!spectator) addPlayer(g, id, name, data.role);
      attach(s, g, {
        token,
        playerId: id,
        code: c,
        socketId: s.id,
        name,
        spectator,
        lastInput: Date.now(),
        disconnectedAt: 0,
      });
      message(
        g,
        "行动控制",
        `${name} ${spectator ? "进入了观战席" : "加入了小队" + (g.state.phase === "playing" ? "，已同步等级与补给" : "")}。`,
        false,
        true,
      );
      return { ok: true, code: c, playerId: id, token, spectator };
    }
    bind("room:join", (data) => join(data, data.spectator === true));
    bind("room:watch", (data) => join(data, true));
    bind("room:resume", (data) => {
      const se =
        typeof data.token === "string" ? sessions.get(data.token) : undefined;
      if (!se) return { ok: false, error: "会话已过期，请重新加入或观战。" };
      const g = rooms.get(se.code);
      if (
        !g ||
        (!se.spectator && !g.state.players.some((p) => p.id === se.playerId))
      )
        return { ok: false, error: "房间已关闭。" };
      if (se.socketId !== s.id) {
        const old = io.sockets.sockets.get(se.socketId);
        if (old) {
          old.leave(se.code);
          delete old.data.token;
          old.emit("session:replaced");
        }
      }
      detach(s, false);
      se.floating = data.floating === true;
      attach(s, g, se);
      return {
        ok: true,
        code: se.code,
        playerId: se.playerId,
        token: se.token,
        spectator: se.spectator,
      };
    });
    bind("room:leave", () => {
      detach(s, true);
      return { ok: true };
    });
    bind("player:role", (data) => {
      const g = roomOf(s),
        se = sessionOf(s);
      if (
        !g ||
        !se ||
        se.spectator ||
        g.state.phase !== "lobby" ||
        !Object.hasOwn(ROLES, data.role)
      )
        return { ok: false, error: "此时无法切换基础职业。" };
      const p = g.state.players.find((p) => p.id === se.playerId)!,
        r = ROLES[data.role as Role];
      p.role = data.role;
      p.color = r.color;
      p.hp = r.hp;
      p.maxHp = r.hp;
      p.speed = r.speed + 18;
      p.damage = r.damage;
      p.shieldCap = p.role === "guardian" ? 30 : 0;
      p.shield = p.shieldCap;
      p.ready = p.id === g.state.host;
      p.ability = ROLE_SIGNATURE[p.role];
      p.skillCd = 0;
      broadcast(g);
      return { ok: true };
    });
    bind("player:ready", (data) => {
      const g = roomOf(s),
        se = sessionOf(s);
      if (
        !g ||
        !se ||
        se.spectator ||
        !["lobby", "countdown"].includes(g.state.phase) ||
        typeof data.ready !== "boolean"
      )
        return { ok: false, error: "只能在整备区切换准备状态。" };
      const p = g.state.players.find((p) => p.id === se.playerId);
      if (!p) return { ok: false, error: "你不在这支小队中。" };
      p.ready = p.id === g.state.host || data.ready;
      if (!data.ready) cancelLaunch(g);
      broadcast(g);
      return { ok: true };
    });
    bind("room:options", (data) => {
      const g = roomOf(s),
        se = sessionOf(s);
      if (
        !g ||
        !se ||
        se.playerId !== g.state.host ||
        g.state.phase !== "lobby"
      )
        return { ok: false, error: "只有房主可以调整任务。" };
      const previousRules = `${g.state.mode}/${g.state.difficulty}`;
      if (["normal", "relaxed", "nightmare"].includes(data.difficulty))
        g.state.difficulty = data.difficulty;
      if (data.mode === "survival" || data.mode === "expedition")
        g.state.mode = data.mode;
      if (typeof data.squadName === "string")
        g.state.squadName = data.squadName.trim().slice(0, 20) || "深渊小队";
      if (
        typeof data.botCount === "number" ||
        typeof data.buddy === "boolean"
      ) {
        const humans = g.state.players.filter((p) => !p.bot).length;
        const desired =
          typeof data.botCount === "number"
            ? Math.max(0, Math.min(4 - humans, Math.floor(data.botCount)))
            : data.buddy
              ? 1
              : 0;
        const bots = g.state.players.filter((p) => p.bot);
        for (const bot of bots.slice(desired)) removePlayer(g, bot.id);
        for (let i = bots.length; i < desired; i++)
          addPlayer(
            g,
            "bot-" + randomUUID(),
            ["守夜者", "巡灯者", "破晓者"][i % 3] + " · AI",
            (["medic", "guardian", "engineer"] as Role[])[i % 3],
            true,
          );
      }
      if (previousRules !== `${g.state.mode}/${g.state.difficulty}`)
        for (const p of g.state.players) p.ready = p.bot;
      broadcast(g);
      return { ok: true };
    });
    bind("room:kick", (data) => {
      const g = roomOf(s),
        se = sessionOf(s);
      if (
        !g ||
        !se ||
        se.spectator ||
        g.state.host !== se.playerId ||
        !["lobby", "countdown", "draft"].includes(g.state.phase)
      )
        return { ok: false, error: "只有房主能在整备时移除队员。" };
      const target = g.state.players.find((p) => p.id === data.playerId);
      if (!target || target.id === se.playerId)
        return { ok: false, error: "请选择其他队员。" };
      for (const [token, session] of sessions) {
        if (session.code === g.state.code && session.playerId === target.id) {
          const peer = io.sockets.sockets.get(session.socketId);
          peer?.leave(g.state.code);
          peer?.emit("room:kicked", { message: "房主已将你移出小队。" });
          sessions.delete(token);
          peer?.data && (peer.data.token = undefined);
        }
      }
      cancelLaunch(g);
      removePlayer(g, target.id);
      message(g, "整备频道", `${target.name} 已离开小队。`, false, true);
      broadcast(g);
      return { ok: true };
    });
    bind("game:cancel", () => {
      const g = roomOf(s),
        se = sessionOf(s);
      if (!g || !se || se.playerId !== g.state.host || !cancelLaunch(g))
        return { ok: false, error: "当前不能取消出发。" };
      broadcast(g);
      return { ok: true };
    });
    bind("game:start", () => {
      const g = roomOf(s),
        se = sessionOf(s);
      if (!g || !se || se.spectator || !startGame(g, se.playerId))
        return {
          ok: false,
          error: "请等待所有真人队员连接并准备，再由房主开始行动。",
        };
      broadcast(g);
      return { ok: true };
    });
    bind("game:upgrade", (data) => {
      const g = roomOf(s),
        se = sessionOf(s);
      if (!g || !se || se.spectator || !chooseUpgrade(g, se.playerId, data.id))
        return { ok: false, error: "请选择当前生成的强化卡。" };
      s.emit("state", g.state);
      broadcast(g);
      return { ok: true };
    });
    bind("game:restart", () => {
      const g = roomOf(s),
        se = sessionOf(s);
      if (!g || !se || se.spectator || !restartGame(g, se.playerId))
        return { ok: false, error: "由房主返回基地。" };
      broadcast(g);
      return { ok: true };
    });
    bind("player:rescue", () => {
      const g = roomOf(s),
        se = sessionOf(s);
      if (!g || !se || se.spectator || !rescueCall(g, se.playerId))
        return { ok: false, error: "倒地时可按H呼救，每5秒一次。" };
      message(g, "救援频道", `${se.name}：我倒地了，请来救我！`, false, true);
      broadcast(g);
      return { ok: true };
    });
    bind("chat:send", (data) => {
      const g = roomOf(s),
        se = sessionOf(s);
      if (!g || !se) return { ok: false, error: "请先加入或观战一个房间。" };
      chatTimes = chatTimes.filter((t) => Date.now() - t < 5000);
      if (chatTimes.length >= 5)
        return { ok: false, error: "消息太快，请稍后发送。" };
      const text =
        typeof data.text === "string"
          ? data.text
              .replace(/[\u0000-\u001f]/g, " ")
              .trim()
              .slice(0, 160)
          : "";
      if (!text) return { ok: false, error: "请输入聊天内容。" };
      chatTimes.push(Date.now());
      message(
        g,
        se.name,
        text,
        se.spectator,
        false,
        se.spectator ? undefined : se.playerId,
      );
      return { ok: true };
    });
    s.on("input", (data) => {
      const now = Date.now(),
        se = sessionOf(s),
        g = roomOf(s);
      if (!se || !g || se.spectator) return;
      if (now - inputAt < 12) {
        queueAbilities(g, se.playerId, data);
        return;
      }
      inputAt = now;
      se.lastInput = now;
      setInput(g, se.playerId, data);
    });
    s.on("ping:latency", (_data, cb) => {
      if (typeof cb === "function") cb();
    });
    s.on("disconnect", () => detach(s));
  });
  let previous = performance.now(),
    frame = 0;
  const loop = setInterval(() => {
    const now = performance.now(),
      dt = Math.min(0.08, (now - previous) / 1000);
    previous = now;
    for (const se of sessions.values())
      if (
        !se.spectator &&
        !se.disconnectedAt &&
        Date.now() - se.lastInput > 280
      ) {
        const g = rooms.get(se.code);
        if (g) setInput(g, se.playerId, EMPTY_INPUT);
      }
    for (const g of rooms.values()) {
      tickGame(g, dt);
      if (["won", "lost"].includes(g.state.phase) && !g.state.rankedRecorded) {
        try {
          scores.record(g.state);
          g.state.rankedRecorded = true;
        } catch (e) {
          console.error("Leaderboard write failed; retrying:", String(e));
        }
      }
      let cadence = snapshotCadences.get(g);
      if (!cadence) {
        cadence = new SnapshotCadence();
        snapshotCadences.set(g, cadence);
      }
      const due = cadence.due(frame, g.state);
      if (lastWorld.get(g) !== g.state.world || due) broadcast(g);
    }
    frame++;
  }, 1000 / 60);
  const cleanup = setInterval(() => {
    for (const [token, se] of sessions)
      if (se.disconnectedAt && Date.now() - se.disconnectedAt > 60000) {
        const g = rooms.get(se.code);
        if (g) {
          if (se.spectator)
            g.state.spectators = g.state.spectators.filter(
              (p) => p.id !== se.playerId,
            );
          else removePlayer(g, se.playerId);
          if (!disposeAbandoned(g)) broadcast(g);
        }
        sessions.delete(token);
      }
    for (const [c, g] of rooms)
      if (!g.state.players.some((p) => !p.bot)) disposeAbandoned(g);
  }, 5000);
  return {
    http,
    io,
    rooms,
    scores,
    close: async () => {
      clearInterval(presenceTick);
      clearInterval(loop);
      clearInterval(cleanup);
      await new Promise<void>((r) => io.close(() => r()));
      if (http.listening) await new Promise<void>((r) => http.close(() => r()));
    },
  };
}
