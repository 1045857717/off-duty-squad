import { ThemedSelect } from "./ThemedSelect";
import { RANK_PERIODS, type RankPeriod } from "../shared/rankPeriod";
import { RentalAds } from "./PublicLobby";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { Modal, Key } from "./components";
import type {
  GameState,
  RoomReply,
  RoomSummary,
  ScoreEntry,
  Mode,
  Difficulty,
} from "../shared/types";
export function AdSlot() {
  return (
    <a
      className="relay-ad"
      href="https://api.xiebc.cc"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="ad-label">合作推广</span>
      <span className="ad-mark">
        <Icon name="bolt" size={18} />
      </span>
      <span>
        <strong>AI 中转站</strong>
        <small>连接你的 AI 工作流 · 稳定接入，灵活调用</small>
      </span>
      <span className="ad-action">
        了解服务
        <Icon name="arrow" size={13} />
      </span>
    </a>
  );
}
export function messageTime(at: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(at));
}
export function ChatFeed({ state }: { state: GameState }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const messages = state.chat
    .filter((m) => !m.system && now - m.at < 60000)
    .slice(-5);
  const feed = messages.length
    ? messages
    : state.chat.filter((m) => now - m.at < 18000).slice(-2);
  return (
    <div
      className="live-chat-feed"
      aria-label="实时聊天消息"
      role="log"
      aria-live="polite"
    >
      {feed.map((m) => (
        <div
          key={m.id}
          className={
            (m.system ? "is-system " : "") +
            (now - m.at > 22000 ? "is-older" : "")
          }
        >
          <time dateTime={new Date(m.at).toISOString()}>
            {messageTime(m.at)}
          </time>
          <strong>
            {m.name}
            {m.spectator && <em>观战</em>}
          </strong>
          <span>{m.text}</span>
        </div>
      ))}
    </div>
  );
}
export function ChatPanel({
  state,
  request,
  open,
  onClose,
  playerId,
}: {
  state: GameState;
  request: (e: string, d?: unknown) => Promise<RoomReply>;
  open: boolean;
  onClose: () => void;
  playerId: string;
}) {
  const [text, setText] = useState(""),
    end = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [state.chat.length, open]);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  if (!open) return null;
  const spectator = !state.players.some((p) => p.id === playerId);
  return (
    <section className="chat-panel" aria-label="房间聊天">
      <header>
        <span>
          <Icon name="users" size={13} />
          房间频道{" "}
          <small>{spectator ? "观战者" : "小队成员"} · 观战可发言</small>
        </span>
        <button aria-label="关闭聊天" onClick={onClose}>
          <Icon name="close" size={13} />
        </button>
      </header>
      <div className="chat-messages">
        {state.chat.map((m) => (
          <div key={m.id} className={m.system ? "chat-system" : ""}>
            <time
              className="chat-timestamp"
              dateTime={new Date(m.at).toISOString()}
            >
              {messageTime(m.at)}
            </time>
            <strong>
              {m.name}
              {m.spectator && <em>观战</em>}
            </strong>
            <span>{m.text}</span>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          const r = await request("chat:send", { text });
          if (r.ok) {
            setText("");
            input.current?.blur();
            onClose();
          }
        }}
      >
        <input
          ref={input}
          aria-label="聊天内容"
          maxLength={160}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter 发送 · Esc 收起"
          onKeyDown={(e) => {
            if (e.key === "F8" || e.key === "F10") return;
            if (e.nativeEvent.isComposing || e.keyCode === 229) {
              if (e.key === "Enter") e.preventDefault();
              e.stopPropagation();
              return;
            }
            if (e.key === "Escape") onClose();
            e.stopPropagation();
          }}
        />
        <button type="submit">
          <Icon name="arrow" size={15} />
        </button>
      </form>
    </section>
  );
}
export function RoomBrowser({
  name,
  role,
  request,
  onClose,
  onJoined,
}: {
  name: string;
  role: string;
  request: (e: string, d?: unknown) => Promise<RoomReply>;
  onClose: () => void;
  onJoined: () => void;
}) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]),
    [loading, setLoading] = useState(false);
  const refresh = async () => {
    setLoading(true);
    const r = await request("rooms:list");
    if (r.ok) setRooms(r.rooms || []);
    setLoading(false);
  };
  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <Modal
      title="整活搭子在哪里"
      eyebrow="PUBLIC ROOMS / 加入与观战"
      onClose={onClose}
      wide
    >
      <div className="room-browser-tools">
        <p>所有房间均可观战，进行中的行动也能加入。</p>
        <button
          className="text-btn"
          onClick={() => void refresh()}
          disabled={loading}
        >
          刷新房间
          <Icon name="compass" size={13} />
        </button>
      </div>
      <div className="public-rooms">
        {rooms.length ? (
          rooms.map((r) => (
            <article key={r.code}>
              <div className="public-room-top">
                <span>
                  {r.mode === "survival" ? "园区发癫局" : "夺回下班权"}
                  <em>
                    {r.difficulty === "nightmare"
                      ? "噩梦"
                      : r.difficulty === "relaxed"
                        ? "缓行"
                        : "极限"}
                  </em>
                </span>
                <small>
                  {r.phase === "lobby"
                    ? "整备中"
                    : r.phase === "playing"
                      ? "行动中"
                      : r.phase === "countdown"
                        ? "即将出发"
                        : r.phase === "draft"
                          ? "选择初始技能"
                          : "已结算"}
                </small>
              </div>
              <h3>{r.squadName}</h3>
              <p>
                <b>{r.code}</b> · {r.players}/4 队员 · {r.spectators} 观战 ·{" "}
                {r.mode === "survival" ? `第${r.wave}波` : `LV.${r.level}`}
              </p>
              <div>
                <button
                  className="btn btn-secondary"
                  onClick={async () => {
                    const a = await request("room:watch", {
                      code: r.code,
                      name,
                    });
                    if (a.ok) onJoined();
                  }}
                >
                  <Icon name="eye" size={13} />
                  观战
                </button>
                <button
                  className="btn btn-primary"
                  disabled={
                    (r.players >= 4 && !(r.bots || 0)) ||
                    ["won", "lost"].includes(r.phase)
                  }
                  onClick={async () => {
                    const a = await request("room:join", {
                      code: r.code,
                      name,
                      role,
                    });
                    if (a.ok) onJoined();
                  }}
                >
                  {r.phase === "playing" ? "中途加入" : "加入小队"}
                  <Icon name="arrow" size={13} />
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-public">
            <Icon name="compass" size={32} />
            <strong>暂时没有活动房间</strong>
            <p>创建一支小队，新的信号就会出现在这里。</p>
          </div>
        )}
      </div>
      <AdSlot />
    </Modal>
  );
}
export function SquadRanks({
  request,
  onClose,
}: {
  request: (e: string, d?: unknown) => Promise<RoomReply>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("survival"),
    [difficulty, setDifficulty] = useState<Difficulty>("normal"),
    [period, setPeriod] = useState<RankPeriod>("all"),
    [scores, setScores] = useState<ScoreEntry[]>([]),
    [loading, setLoading] = useState(true),
    [range, setRange] = useState<RoomReply["rankingWindow"]>();
  useEffect(() => {
    let active = true;
    setLoading(true);
    void request("scores:list", { mode, difficulty, period }).then((r) => {
      if (active) {
        setScores(r.scores || []);
        setRange(r.rankingWindow);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [mode, difficulty, period]);
  const format = (v: number) =>
    new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(v);
  return (
    <Modal
      title="今天谁最会下班？"
      eyebrow="SQUAD LEADERBOARD / 全服小队荣誉榜"
      onClose={onClose}
      wide
    >
      <section className="rank-v34">
        <div className="rank-periods" role="tablist" aria-label="排名统计周期">
          {RANK_PERIODS.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={period === id}
              onClick={() => setPeriod(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="rank-scope">
          <div>
            <strong>{range?.label || "总榜"}</strong>
            <small>
              {period === "all"
                ? "服务器已保存的全部成绩"
                : range?.start && range.end
                  ? `${format(range.start)} — ${format(range.end - 1)}`
                  : "正在读取统计时间…"}
              <span>北京时间 · 周一开启新一周</span>
            </small>
          </div>
          <Icon name="trophy" size={31} />
        </div>
        <div className="rank-rule-filters">
          <label>
            行动模式
            <ThemedSelect
              label="排行榜模式"
              value={mode}
              onChange={(v) => setMode(v as Mode)}
              options={[
                ["survival", "园区发癫局"],
                ["expedition", "夺回下班权"],
              ]}
            />
          </label>
          <label>
            整活难度
            <ThemedSelect
              label="排行榜难度"
              value={difficulty}
              onChange={(v) => setDifficulty(v as Difficulty)}
              options={[
                ["normal", "正常发癫"],
                ["nightmare", "老板开挂"],
                ["relaxed", "带薪散步"],
              ]}
            />
          </label>
          <p>
            模式、难度分别计分
            <br />
            <span>成绩按对局结束时间归入周期</span>
          </p>
        </div>
        <div className="rank-table-head">
          <span>名次 / 小队</span>
          <span>行动记录</span>
          <span>下班积分</span>
        </div>
        <div className="squad-rank-list" aria-live="polite">
          {!loading &&
            scores.map((s, i) => (
              <div key={s.id} className={i < 3 ? "podium" : ""}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <section>
                  <strong>{s.squadName}</strong>
                  <small>{s.members.join(" / ")}</small>
                  <em>
                    {mode === "survival" ? `第${s.wave}波` : `第${s.mission}章`}{" "}
                    · Lv.{s.level} · {s.kills}击败 ·{" "}
                    {Math.floor(s.elapsed / 60)}m{s.elapsed % 60}s
                  </em>
                </section>
                <b>
                  {s.score.toLocaleString()}
                  <small>积分</small>
                </b>
              </div>
            ))}
          {loading ? (
            <div className="rank-empty">正在调取工友战绩…</div>
          ) : (
            !scores.length && (
              <div className="rank-empty">
                <Icon name="trophy" size={32} />
                <strong>这个分区，还在等第一队工友。</strong>
                <p>完成至少15秒的对局后，成绩会自动记入对应模式与时间榜。</p>
              </div>
            )
          )}
        </div>
        <footer>
          <Icon name="book" size={15} />
          <p>
            各周期取前50名。服务器保留最近50000条战绩；历史成绩受存储保留范围影响。
          </p>
        </footer>
      </section>
      <RentalAds slotIds={["ARCHIVE-02"]} />
    </Modal>
  );
}
