import { useEffect, useState } from "react";
import type { RoomReply, RoomSummary } from "../shared/types";
import { Icon } from "./icons";
export function PublicLobby({
  name,
  role,
  request,
  onCreate,
  onJoin,
  online,
}: {
  online?: number;
  name: string;
  role: string;
  request: (e: string, d?: unknown) => Promise<RoomReply>;
  onCreate: () => void;
  onJoin: () => void;
}) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/rooms");
        const list = await response.json();
        if (active && Array.isArray(list)) setRooms(list);
      } catch {
      } finally {
        if (active) setLoading(false);
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 2200);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const filtered = rooms.filter(
    (r) =>
      !query ||
      `${r.squadName} ${r.code}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="public-lobby" aria-label="公开房间大厅">
      <header>
        <div>
          <span className="eyebrow">
            <i /> LIVE OPERATIONS / 实时公开房间
          </span>
          <h2>找齐同事，一起下班。</h2>
          <p>真实房间 · 随时加入 / 观战 · {rooms.length} 条在线信道</p>
          <small className="lobby-online" aria-label="全站在线概况">
            <Icon name="users" size={12} />
            全站在线 <b>{online ?? "—"}</b> 位工友
            <span>含大厅、对局与观战</span>
          </small>
        </div>
        <button className="btn btn-primary" onClick={onCreate}>
          <Icon name="plus" size={14} />
          创建小队
        </button>
      </header>
      <div className="public-lobby-tools">
        <span className="room-list-count">
          {filtered.length} 个公开房间 · 随时观战
        </span>
        <label>
          <Icon name="compass" size={12} />
          <input
            aria-label="搜索公开房间"
            placeholder="搜索小队 / 房间码"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="live-room-list">
        {filtered.map((r) => (
          <article
            key={r.code}
            className={
              r.mode === "survival" ? "room-cataclysm" : "room-expedition"
            }
          >
            <span className="room-mode-art">
              <Icon
                name={r.mode === "survival" ? "shield" : "compass"}
                size={29}
              />
              <i />
            </span>
            <section>
              <div>
                <b>{r.mode === "survival" ? "园区发癫局" : "夺回下班权"}</b>
                <em>
                  {r.phase === "lobby"
                    ? "整备中"
                    : r.phase === "countdown"
                      ? "即将出发"
                      : r.phase === "draft"
                        ? "选择初始技能"
                        : r.phase === "playing"
                          ? "行动中"
                          : "已结算"}
                </em>
              </div>
              <h3>{r.squadName}</h3>
              <p>
                <code>{r.code}</code>
                <span>
                  {r.players} 真人{r.bots ? ` + ${r.bots} AI` : ""} / 4 ·{" "}
                  {r.spectators} 观战
                </span>
                <span>
                  {r.difficulty === "nightmare"
                    ? "老板开挂"
                    : r.difficulty === "relaxed"
                      ? "带薪散步"
                      : "正常发癫"}{" "}
                  / {r.mode === "survival" ? `第${r.wave}波` : `LV.${r.level}`}
                </span>
              </p>
            </section>
            <div className="live-room-actions">
              <button
                title="进入真实观战频道"
                onClick={() =>
                  void request("room:watch", { code: r.code, name })
                }
              >
                <Icon name="eye" size={13} />
                观战
              </button>
              <button
                disabled={
                  (r.players >= 4 && !(r.bots || 0)) ||
                  ["won", "lost"].includes(r.phase)
                }
                onClick={() =>
                  void request("room:join", { code: r.code, name, role })
                }
              >
                {r.phase === "playing" ? "中途加入" : "加入小队"}
                <Icon name="arrow" size={13} />
              </button>
            </div>
          </article>
        ))}
        {!filtered.length && (
          <div className="lobby-no-rooms">
            <div className="signal-orbit">
              <Icon name="compass" size={48} />
              <i />
              <i />
            </div>
            <strong>
              {loading
                ? "正在接收小队信号…"
                : query
                  ? "没有匹配的房间"
                  : "还没找到下班搭子？"}
            </strong>
            <p>
              {query
                ? "换一个关键词，或查看全部房间。"
                : "创建一个房间，让同事通过同一地址加入。"}
            </p>
            <button onClick={onJoin}>
              输入房间码加入 <Icon name="arrow" size={12} />
            </button>
          </div>
        )}
      </div>
      <footer>
        <i />
        房间自动更新 · 每个房间都可观战
        <span>随机地图 / 团队救援 / 无限进化</span>
      </footer>
    </section>
  );
}
export function RentalAds({ slotIds }: { slotIds?: string[] } = {}) {
  const [selected, setSelected] = useState("");
  return (
    <section className="rental-ads" aria-label="广告位招租">
      {[
        ["LOBBY-01", "小队大厅推荐位", "房间列表下方 · 静态品牌展示"],
        ["ARCHIVE-02", "战绩档案合作位", "战绩与排行榜 · 精准游戏人群"],
        ["COMMUNITY-03", "社区伙伴展示位", "大厅合作专区 · 工具 / 品牌推广"],
      ]
        .filter(([id]) => !slotIds || slotIds.includes(id))
        .map(([id, title, desc]) => (
          <article key={id}>
            <span className="rental-title">广告位出租</span>
            <small className="rental-slot-id">{id}</small>
            <strong>{title}</strong>
            <p>{desc}</p>
            <b className="rental-contact">联系QQ：1045857717</b>
            <button
              onClick={() => {
                if (navigator.clipboard)
                  void navigator.clipboard
                    .writeText(`广告位：${id} · 合作QQ：1045857717`)
                    .then(() => setSelected(id))
                    .catch(() => setSelected("view:" + id));
                else setSelected("view:" + id);
              }}
            >
              {selected === id
                ? "位置编号已复制"
                : selected === "view:" + id
                  ? `位置编号：${id}`
                  : "复制广告位编号"}
              <Icon name="arrow" size={12} />
            </button>
          </article>
        ))}
      <small>
        广告位出租 · 联系QQ：1045857717 · 只在大厅展示 · 战斗画面不放广告
      </small>
    </section>
  );
}
