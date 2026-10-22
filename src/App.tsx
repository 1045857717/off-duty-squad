import { ProjectLinks } from "./ProjectSupport";
import { CodexPanel } from "./CodexPanel";
import { FieldGuide } from "./FieldGuide";
import { MissionBrief, CombatFeedback } from "./FeedbackUI";
import { ExpeditionDossier } from "./ExpeditionDossier";
import { RulesSelector } from "./RulesSelector";
import { LobbyChannels } from "./LobbyChannels";
import { DesktopDownload, DesktopDownloadLink } from "./DesktopDownload";
import { SkillDetails } from "./SkillDetails";
import { JobPicker } from "./JobPicker";
import { OfficeTactics } from "./OfficeUI";
import { PublicLobby, RentalAds } from "./PublicLobby";
import { LaunchCountdown, InitialDeployment } from "./LaunchUI";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type CSSProperties,
} from "react";
import { Icon } from "./icons";
import { Modal, Key } from "./components";
import { useSettings, useToast, useLocalStorage, Avatar } from "./hooks";
import { useNetwork, IS_FLOATING } from "./network";
import { useFloatingWindow } from "./floating";
import { PerformanceMeter } from "./PerformanceMeter";
import { DamageBoard } from "./DamageBoard";
import { ROLES, MISSIONS } from "../shared/content";
import { RoomBrowser, SquadRanks, ChatPanel, ChatFeed, AdSlot } from "./Social";
import { Workspaces } from "./Workspaces";
import { AugmentPicker } from "./GameHUD";
import type { Mode, Difficulty } from "../shared/types";
import type { Role } from "../shared/types";
import type { SceneBridge } from "./game/StationScene";
import GameCanvas from "./game/GameCanvas";
import { playSound } from "./game/audio";
import {
  SettingsPanel,
  HelpPanel,
  ArchivePanel,
  MissionPanel,
  EMPTY_RECORDS,
  type Records,
} from "./panels";
import {
  TacticalOverlay,
  BattleIntro,
  EvolutionBeacon,
} from "./TacticalOverlay";
import { ReadyRoom, EmptySignal } from "./ReadyRoom";
import { TeamPanel } from "./TeamPanel";
import { GameHUD, StageOverlay, TouchControls } from "./GameHUD";

type Panel =
  | "desktop"
  | "create"
  | "join"
  | "settings"
  | "help"
  | "archive"
  | "mission"
  | "leave"
  | "rooms"
  | "ranks"
  | null;
export default function App() {
  const { toast, notify } = useToast(),
    net = useNetwork(notify),
    { settings, update } = useSettings();
  const [role, setRole] = useLocalStorage<Role>("offduty-role", "scout"),
    [name, setName] = useLocalStorage("offduty-name", "下班同学"),
    [records, setRecords] = useLocalStorage<Records>(
      "offduty-records",
      EMPTY_RECORDS,
    );
  const [panel, setPanel] = useState<Panel>(() =>
      new URLSearchParams(location.search).has("room") ? "join" : null,
    ),
    [joinCode, setJoinCode] = useState(
      new URLSearchParams(location.search).get("room") || "",
    ),
    [missionInfo, setMissionInfo] = useState(0),
    [codexTab, setCodexTab] = useState<
      "enemies" | "equipment" | "roles" | "records"
    >("enemies"),
    [boss, setBoss] = useState(false),
    [hidden, setHidden] = useState(false),
    [showRanking, setShowRanking] = useState(true),
    [chatOpen, setChatOpen] = useState(false),
    [augmentOpen, setAugmentOpen] = useState(false),
    [gameMode, setGameMode] = useState<Mode>("survival"),
    [squadName, setSquadName] = useState("准点下班小队"),
    [immersive, setImmersive] = useState(true),
    [brief, setBrief] = useState(false),
    [difficulty, setDifficulty] = useState<Difficulty>("normal");
  useEffect(() => {
    if (
      net.state?.code &&
      ["lobby", "draft", "playing"].includes(net.state.phase)
    )
      window.scrollTo({ top: 0, behavior: "instant" });
  }, [net.state?.code, net.state?.phase]);
  const makeCompact = useCallback(() => update({ compact: true }), [update]);
  const floating = useFloatingWindow(net, notify, makeCompact);
  const hideGame = useCallback(() => {
    if (window.desktop) window.desktop.hide();
    else if (IS_FLOATING) floating.hideFloating();
    else if (floating.detached) floating.conceal();
    else if (floating.concealed) void floating.open();
    else setHidden((v) => !v);
  }, [
    floating.detached,
    floating.concealed,
    floating.hideFloating,
    floating.conceal,
    floating.open,
  ]);
  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon)
      favicon.href =
        hidden || floating.concealed || boss || settings.compact
          ? "/workspace.svg"
          : "/favicon.svg";
    if (hidden || floating.concealed) document.title = "项目协作工作台";
    else if (!boss)
      document.title = settings.compact
        ? "状态面板"
        : "带薪摸鱼 · PAID BREAK CREW";
  }, [hidden, boss, floating.concealed, settings.compact]);
  useEffect(() => {
    if (IS_FLOATING) update({ compact: true });
  }, [update]);
  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (
        e.origin !== location.origin ||
        e.source !== (window.opener || window.parent)
      )
        return;
      if (e.data?.type === "offduty:window-show") setHidden(false);
      if (e.data?.type === "offduty:window-toggle") setHidden((v) => !v);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);
  const s = net.state,
    me = s?.players.find((p) => p.id === net.playerId),
    currentRole = me?.role || role,
    mission = MISSIONS[(s?.mission || 0) % 6],
    inGame = !!s && !["lobby", "countdown"].includes(s.phase);
  useEffect(() => {
    if (inGame || s?.phase === "countdown")
      window.scrollTo({ top: 0, behavior: "instant" });
  }, [inGame, s?.phase]);
  const bridge = useRef<SceneBridge>({
    get state() {
      return net.latest.current;
    },
    playerId: "",
    settings,
    enabled: true,
    hidden: false,
    metrics: { fps: 0 },
    send: net.send,
    touch: {
      x: 0,
      y: 0,
      fire: false,
      dash: false,
      skill: false,
      interact: false,
    },
    sound: () => {},
  }).current;
  bridge.playerId = net.playerId;
  bridge.settings = settings;
  bridge.enabled =
    !panel &&
    !boss &&
    !brief &&
    !hidden &&
    !floating.detached &&
    !floating.concealed &&
    !!me &&
    s?.phase === "playing" &&
    !chatOpen;
  bridge.hidden = hidden || boss || floating.detached || floating.concealed;
  bridge.sound = (k) =>
    playSound(k, settings.sound && !boss && !hidden, settings.volume);
  const chooseCard = useCallback(
    async (index: number) => {
      const current = net.latest.current?.players.find(
        (p) => p.id === net.playerId,
      );
      const card = current?.offers[index];
      if (!card || !current?.alive) return;
      const result = await net.request("game:upgrade", { id: card.id });
      if (result.ok) setAugmentOpen(true);
    },
    [net.request, net.playerId],
  );
  const selectMode = useCallback(
    async (mode: Mode) => {
      if (s && s.phase === "lobby") {
        const result = await net.request("room:options", { mode });
        if (result.ok) setGameMode(mode);
      } else setGameMode(mode);
    },
    [s, net.request],
  );
  useEffect(() => {
    if (s?.phase === "lobby") setGameMode(s.mode);
  }, [s?.phase, s?.mode]);
  useEffect(() => {
    setAugmentOpen(false);
    setChatOpen(false);
    setBrief(false);
    previousPending.current = 0;
    bridge.touch = {
      x: 0,
      y: 0,
      fire: false,
      dash: false,
      skill: false,
      interact: false,
    };
  }, [s?.runId]);
  useEffect(() => {
    if (s?.phase !== "playing") {
      setAugmentOpen(false);
      setChatOpen(false);
      setBrief(false);
    }
  }, [s?.phase]);
  const close = useCallback(() => setPanel(null), []);
  const closeBrief = useCallback(() => setBrief(false), []);
  const previousPending = useRef(0);
  useEffect(() => {
    const pending = me?.pendingUpgrades || 0;
    if (pending > 0 && previousPending.current === 0) setAugmentOpen(true);
    previousPending.current = pending;
  }, [me?.pendingUpgrades]);
  useEffect(() => {
    window.__OFFDUTY__ = {
      get state() {
        return net.latest.current;
      },
      playerId: net.playerId,
    };
  }, [s, net.playerId]);
  useEffect(() => {
    if (me && me.role !== role) setRole(me.role);
  }, [me?.role]);
  useEffect(() => {
    if (!s || !["won", "lost"].includes(s.phase)) return;
    const key = `offduty-recorded-${s.code}-${s.seed}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    setRecords((r) => ({
      runs: r.runs + 1,
      wins: r.wins + (s.phase === "won" ? 1 : 0),
      kills: r.kills + s.stats.kills,
      rescues: r.rescues + s.stats.rescued,
      crystals: r.crystals + s.stats.crystals,
      bestTime:
        s.phase === "won" && (!r.bestTime || s.elapsed < r.bestTime)
          ? s.elapsed
          : r.bestTime,
      highestMission: Math.max(r.highestMission, s.mission + 1),
    }));
  }, [s?.phase]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || (e.altKey && e.code !== "KeyG"))
        return;
      if (e.key === "F8") {
        e.preventDefault();
        setBoss((v) => !v);
        return;
      }
      if (e.key === "F10") {
        e.preventDefault();
        hideGame();
        return;
      }
      if (
        e.isComposing ||
        e.keyCode === 229 ||
        boss ||
        (e.target as HTMLElement).isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      )
        return;
      const numberIndex = [
        "Digit1",
        "Digit2",
        "Digit3",
        "Numpad1",
        "Numpad2",
        "Numpad3",
      ].indexOf(e.code);
      if (
        numberIndex >= 0 &&
        !panel &&
        !brief &&
        me?.offers.length &&
        s &&
        !e.repeat &&
        ["draft", "playing", "upgrade"].includes(s.phase)
      ) {
        e.preventDefault();
        void chooseCard(numberIndex % 3);
        return;
      }
      if (e.key === "Enter" && s) {
        e.preventDefault();
        if (["lobby", "countdown"].includes(s.phase))
          window.dispatchEvent(new Event("squad-chat:focus"));
        else setChatOpen((v) => !v);
      }
      if (e.key.toLowerCase() === "u" && me?.offers.length) {
        e.preventDefault();
        setAugmentOpen((v) => !v);
      }
      if (
        e.key.toLowerCase() === "h" &&
        s?.phase === "playing" &&
        me &&
        !me.alive
      ) {
        e.preventDefault();
        void net.request("player:rescue");
      }
      if (e.code === "KeyT" && !panel && !brief && !chatOpen) {
        e.preventDefault();
        update({ autoFire: !settings.autoFire });
        notify(
          settings.autoFire
            ? "自动开火已关闭 · 按T恢复"
            : "自动开火已开启 · 按T切换",
        );
      }
      if (e.code === "KeyG" && s?.phase === "playing" && me) {
        e.preventDefault();
        void net.request("team:ping", {
          kind: e.shiftKey ? "danger" : e.altKey ? "supply" : "gather",
        });
      }
      if (e.key === "F4") {
        e.preventDefault();
        setImmersive((v) => !v);
      }
      if (e.key === "F6") {
        e.preventDefault();
        if (IS_FLOATING) floating.returnToOwner();
        else void floating.open();
      }
      if (e.key === "F7") {
        e.preventDefault();
        setShowRanking((v) => !v);
      }
      if (e.key === "F3" && !window.desktop && !IS_FLOATING) {
        e.preventDefault();
        setPanel((p) => (p === "desktop" ? null : "desktop"));
      }
      if (e.key === "F2") {
        e.preventDefault();
        setPanel((p) => (p === "settings" ? null : "settings"));
      }
      if (e.key === "F10") {
        e.preventDefault();
        hideGame();
      }
      if (e.key === "F8") {
        e.preventDefault();
        setBoss((v) => !v);
      }
      if (e.key === "F9") {
        e.preventDefault();
        update({ compact: !settings.compact });
      }
      if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        update({ sound: !settings.sound });
      }
      if (
        [" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.key,
        ) &&
        inGame &&
        !panel &&
        !boss
      )
        e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    inGame,
    panel,
    boss,
    settings,
    update,
    hideGame,
    floating.open,
    floating.returnToOwner,
    s,
    me,
    chooseCard,
  ]);
  useEffect(
    () =>
      window.desktop?.onStatus((status) => {
        if (status === "hidden") setHidden(true);
        if (status === "shown") setHidden(false);
        if (status === "boss") setBoss((v) => !v);
        if (status === "compact") update({ compact: !settings.compact });
        if (status === "interactive") notify("鼠标穿透已关闭");
      }),
    [settings.compact],
  );
  const copy = async (
    text: string,
    message = "邀请链接已复制，发给同事就能加入。",
  ) => {
    try {
      if (navigator.clipboard && window.isSecureContext)
        await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.append(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        if (!ok) throw new Error("clipboard");
      }
      notify(message);
    } catch {
      notify(`复制不可用，请分享房间码：${s?.code || ""}`);
    }
  };
  const invite = () => {
    if (!s) return;
    const url = new URL(location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("room", s.code);
    if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      void copy(
        s.code,
        `房间码 ${s.code} 已复制。部署后请分享相同的公网服务器网址。`,
      );
    } else void copy(url.toString());
  };
  const selectRole = (r: Role) => {
    if (s) {
      void net.request("player:role", { role: r });
    } else setRole(r);
  };
  const create = async () => {
    const r = await net.request("room:create", {
      name,
      role,
      difficulty,
      mode: gameMode,
      squadName,
    });
    if (r.ok) setPanel(null);
  };
  const join = async () => {
    const r = await net.request("room:join", { name, role, code: joinCode });
    if (r.ok) {
      setPanel(null);
      history.replaceState(null, "", location.pathname);
    }
  };
  const solo = async () => {
    const r = await net.request("room:create", {
      name,
      role,
      difficulty,
      mode: gameMode,
      squadName,
    });
    if (!r.ok) return;
    await net.request("room:options", { buddy: true });
  };
  const leave = async () => {
    const r = await net.request("room:leave");
    if (r.ok) {
      close();
      update({ compact: false });
    }
  };
  return (
    <div
      className={
        "app odyssey40 " +
        (settings.compact ? "is-compact " : "") +
        (!window.desktop && !IS_FLOATING && settings.compact
          ? "quiet-embedded "
          : "") +
        (floating.detached || floating.concealed ? "is-detached " : "") +
        (hidden ? "window-is-hidden " : "") +
        (immersive ? "window-immersive " : "") +
        (s && ["lobby", "countdown"].includes(s.phase) ? "has-lobby " : "") +
        (inGame ? "in-run" : "lobby41")
      }
      style={
        {
          "--window-opacity": settings.opacity,
          "--game-opacity": window.desktop ? 1 : settings.gameOpacity,
        } as CSSProperties
      }
    >
      <div className="app-body" aria-hidden={boss || undefined}>
        <nav className="sidebar" aria-label="主导航">
          <button
            className="brand-mark"
            title="带薪摸鱼"
            aria-label="行动基地"
            onClick={() => {
              setBrief(false);
              setPanel(null);
            }}
          >
            <Icon name="fish" size={32} />
          </button>
          <div className="nav-items">
            <button
              className={!panel ? "nav-item active" : "nav-item"}
              aria-label="行动基地"
              onClick={() => {
                setBrief(false);
                close();
              }}
            >
              <Icon name="compass" size={21} />
              <span>基地</span>
            </button>
            <button
              className={"nav-item " + (panel === "mission" ? "active" : "")}
              aria-label="任务路线"
              onClick={() => {
                close();
                setBrief(true);
              }}
            >
              <Icon name="flag" size={20} />
              <span>任务</span>
            </button>
            <button
              className={"nav-item " + (panel === "archive" ? "active" : "")}
              aria-label="图鉴与档案"
              onClick={() => {
                setCodexTab("enemies");
                setPanel("archive");
              }}
            >
              <Icon name="book" size={20} />
              <span>图鉴</span>
            </button>
          </div>
          <div className="nav-bottom">
            <button
              className="nav-item"
              aria-label="行动指南"
              onClick={() => setPanel("help")}
            >
              <Icon name="help" size={20} />
              <span>指南</span>
            </button>
            <button
              className="nav-item"
              aria-label="偏好设置"
              onClick={() => setPanel("settings")}
            >
              <Icon name="settings" size={20} />
              <span>设置</span>
            </button>
            <button
              className="nav-avatar"
              aria-label="职业图鉴"
              title="查看职业与专属技能"
              onClick={() => {
                setCodexTab("roles");
                setPanel("archive");
              }}
            >
              <Avatar role={currentRole} size={24} />
              <span />
            </button>
          </div>
        </nav>
        <div className="workspace">
          <header className="topbar">
            <div className="wordmark">
              带薪摸鱼
              <span>
                PAID BREAK CREW <b>CO-OP</b>
              </span>
            </div>
            <span className="header-divider" />
            <div className="breadcrumb">
              同事集结处
              <Icon name="chevron" size={12} />
              <strong>行动基地</strong>
            </div>
            <div className="top-actions">
              <span
                className={
                  "connection " + (!net.connected ? "disconnected" : "")
                }
              >
                <span className="live-dot" />
                {net.connected ? "服务已连接" : "正在连接"}
                <span
                  className="online-total"
                  role="status"
                  aria-label="全站在线人数"
                  title="全站访客，包含大厅、对局和观战；AI不计入"
                >
                  <Icon name="users" size={12} />
                  <b>
                    {net.connected && net.presence ? net.presence.online : "—"}
                  </b>
                  在线
                </span>
                {net.connected && net.latency > 0 && (
                  <small>{net.latency} ms</small>
                )}
              </span>
              <button
                className="quiet-button"
                aria-label="一键工作摸鱼"
                title="工作 / 摸鱼 · F8"
                onClick={() => setBoss(true)}
              >
                <Icon name="terminal" size={14} />
                <span>工作</span>
                <Key>F8</Key>
              </button>
              {!IS_FLOATING && (
                <button
                  className="quiet-button popout-button"
                  aria-label={
                    floating.concealed
                      ? "展示小窗"
                      : floating.detached
                        ? "打开工作区"
                        : "独立小窗"
                  }
                  title="独立小窗 / 打开工作区 · F6；真正无边框请使用透明桌面版"
                  onClick={() => void floating.open()}
                  disabled={net.busy || !s}
                >
                  <Icon name="window" size={15} />
                  {floating.concealed
                    ? "展示小窗"
                    : floating.detached
                      ? "打开工作区"
                      : "独立小窗"}
                  <Key>F6</Key>
                </button>
              )}
              {!window.desktop && !IS_FLOATING && (
                <button
                  type="button"
                  className="quiet-button desktop-download-button"
                  title="下载原生无边框透明客户端 · F3"
                  onClick={() => setPanel("desktop")}
                >
                  <Icon name="window" size={14} />
                  <span>桌面端</span>
                  <Key>F3</Key>
                </button>
              )}
              <button
                className="quiet-button auto-fire-button"
                aria-label="自动开火快捷开关"
                aria-pressed={settings.autoFire}
                title="自动开火 · T"
                onClick={() => update({ autoFire: !settings.autoFire })}
              >
                <Icon name="crosshair" size={14} />
                <span>{settings.autoFire ? "自动" : "手动"}</span>
                <Key>T</Key>
              </button>
              <button
                className="quiet-button hide-game-button"
                aria-label={floating.concealed ? "展示小窗" : "一键隐藏"}
                title="隐藏 / 展示 · F10；桌面全局 Ctrl+Shift+B"
                onClick={hideGame}
              >
                <Icon name="eye" size={15} />
                {floating.concealed ? "展示小窗" : "一键隐藏"}
                <Key>F10</Key>
              </button>
              <button
                className="quiet-button"
                onClick={() => {
                  update({ compact: !settings.compact });
                }}
              >
                <Icon name="window" size={15} />
                {settings.compact ? "恢复大小" : "低调小窗"}
                <Key>F9</Key>
              </button>
              <button
                className="icon-btn audio-toggle"
                title="音效开关 · M"
                aria-label={settings.sound ? "关闭音效" : "开启音效"}
                onClick={() => update({ sound: !settings.sound })}
              >
                <Icon name={settings.sound ? "volume" : "mute"} size={18} />
                <Key>M</Key>
              </button>
              <button
                className="quiet-button"
                aria-label="切换伤害排名"
                title="伤害排名 · F7"
                onClick={() => setShowRanking((v) => !v)}
              >
                <Icon name="target" size={15} />
                <span>伤害排名</span>
                <Key>F7</Key>
              </button>
              <button
                className="quiet-button"
                aria-label="快捷设置"
                title="画质与设置 · F2"
                onClick={() => setPanel("settings")}
              >
                <Icon name="settings" size={15} />
                <span>游戏设置</span>
                <Key>F2</Key>
              </button>
              {window.desktop && (
                <button
                  className="icon-btn desktop-close"
                  aria-label="关闭游戏窗口"
                  title="退出游戏 · Alt+F4"
                  onClick={() => window.desktop?.close()}
                >
                  <Icon name="close" size={17} />
                  <Key>Alt F4</Key>
                </button>
              )}
            </div>
          </header>
          <main className="main-content">
            <div className="page-heading">
              <div>
                <h1>
                  班是公司的，<span>鱼是自己的。</span>
                </h1>
              </div>
              <div className="heading-aside">
                <strong>今日收益：工资照领，鱼照摸</strong>
                <span>摸到的鱼，才算自己挣到的。</span>
                <button className="text-btn" onClick={() => setPanel("help")}>
                  第一次来？<span>看看怎么玩</span>
                  <Icon name="arrow" size={14} />
                </button>
              </div>
            </div>
            <div className="main-grid">
              <section className="mission-column">
                {!s && (
                  <RulesSelector
                    mode={gameMode}
                    difficulty={difficulty}
                    onMode={setGameMode}
                    onDifficulty={setDifficulty}
                  />
                )}
                <section className="stage-shell" aria-label="游戏与任务">
                  <div className="stage-heading">
                    <div className="stage-tabs">
                      <button
                        className={!brief ? "active" : ""}
                        onClick={() => setBrief(false)}
                      >
                        <Icon name="compass" size={15} />
                        {inGame ? "行动现场" : "行动基地"}
                      </button>
                      <button
                        className={brief ? "active" : ""}
                        aria-pressed={brief}
                        onClick={() => setBrief(true)}
                      >
                        <Icon name="terminal" size={14} />
                        任务简报
                      </button>
                    </div>
                    <span className="stage-location">
                      <span className="live-dot" />
                      <b className="active-mode-badge">
                        {(s?.mode || gameMode) === "survival"
                          ? "园区发癫局"
                          : "夺回下班权"}
                      </b>
                      {(s?.mode || gameMode) === "survival"
                        ? "离谱办公园区"
                        : mission.area}
                      <small>
                        {(s?.mode || gameMode) === "survival"
                          ? ` / WAVE ${String(s?.wave || 1).padStart(2, "0")} · ∞`
                          : ` / SECTOR ${String(Math.floor((s?.mission || 0) / 2) + 1).padStart(2, "0")}`}
                      </small>
                    </span>
                    {!inGame && <ProjectLinks />}
                  </div>
                  <div className="game-stage">
                    {s?.phase === "playing" && (
                      <CombatFeedback
                        state={s}
                        me={me}
                        reduced={settings.lowMotion}
                      />
                    )}
                    {s?.phase === "countdown" && (
                      <LaunchCountdown
                        state={s}
                        playerId={net.playerId}
                        request={net.request}
                      />
                    )}
                    {s?.phase === "draft" && (
                      <InitialDeployment
                        state={s}
                        me={me}
                        playerId={net.playerId}
                        request={net.request}
                      />
                    )}
                    {!floating.detached &&
                      !floating.concealed &&
                      (s && ["lobby", "countdown"].includes(s.phase) ? (
                        <ReadyRoom
                          state={s}
                          playerId={net.playerId}
                          busy={net.busy}
                          request={net.request}
                          onInvite={invite}
                        />
                      ) : inGame ? (
                        <GameCanvas key={s?.runId || "base"} bridge={bridge} />
                      ) : (
                        <PublicLobby
                          online={net.presence?.online}
                          name={name}
                          role={role}
                          request={net.request}
                          onCreate={() => setPanel("create")}
                          onJoin={() => setPanel("join")}
                        />
                      ))}
                    {inGame && !floating.detached && !floating.concealed && (
                      <PerformanceMeter bridge={bridge} />
                    )}
                    {s &&
                      inGame &&
                      showRanking &&
                      !floating.detached &&
                      !floating.concealed && (
                        <DamageBoard
                          state={s}
                          playerId={net.playerId}
                          overlay
                        />
                      )}
                    {(floating.detached || floating.concealed) && (
                      <div className="detached-placeholder">
                        <Icon name="window" size={42} />
                        <span className="eyebrow">WORKSPACE AVAILABLE</span>
                        <h2>
                          {floating.concealed
                            ? "当前工作区已收起。"
                            : "工作区已移至独立窗口。"}
                        </h2>
                        <p>
                          {floating.concealed
                            ? "点击“继续工作”恢复窗口。"
                            : floating.mode === "pip"
                              ? "画中画窗口可在其他应用上方继续显示。"
                              : "独立窗口已打开，可以移动和调整大小。"}
                          <br />
                          当前会话保持连接。
                        </p>
                        <div>
                          <button
                            className="btn btn-secondary"
                            onClick={
                              floating.concealed
                                ? () => void floating.open()
                                : floating.focus
                            }
                          >
                            {floating.concealed ? "继续工作" : "打开工作区"}
                          </button>
                          <button
                            className="btn btn-primary"
                            onClick={floating.restore}
                          >
                            返回主窗口
                            <Icon name="arrow" />
                          </button>
                        </div>
                        <small>
                          关闭小窗也会自动返回这里。不要关闭此主页面。
                        </small>
                      </div>
                    )}
                    {inGame &&
                      !brief &&
                      s &&
                      !floating.detached &&
                      !floating.concealed && (
                        <>
                          <TacticalOverlay state={s} me={me} bridge={bridge} />
                          <OfficeTactics
                            state={s}
                            me={me}
                            request={net.request}
                          />
                          {s.phase === "playing" && <BattleIntro state={s} />}
                          <GameHUD
                            state={s}
                            me={me}
                            onRescue={() => void net.request("player:rescue")}
                          />
                          <StageOverlay
                            state={s}
                            me={me}
                            playerId={net.playerId}
                            request={net.request}
                          />
                          {s.phase === "playing" && (
                            <TouchControls bridge={bridge} />
                          )}
                        </>
                      )}
                    {s &&
                      !["lobby", "countdown"].includes(s.phase) &&
                      !floating.detached &&
                      !floating.concealed && (
                        <>
                          <button
                            className="chat-open"
                            aria-label="打开聊天"
                            onClick={() => setChatOpen((v) => !v)}
                          >
                            <Icon name="users" size={13} />
                            <span>频道</span>
                            <Key>Enter</Key>
                          </button>
                          {!chatOpen && <ChatFeed state={s} />}
                          <ChatPanel
                            state={s}
                            playerId={net.playerId}
                            request={net.request}
                            open={chatOpen}
                            onClose={() => setChatOpen(false)}
                          />
                          {s.phase === "playing" &&
                            me &&
                            me.pendingUpgrades > 0 && (
                              <EvolutionBeacon
                                me={me}
                                onClick={() => setAugmentOpen((v) => !v)}
                              />
                            )}
                          {inGame &&
                            me &&
                            me.pendingUpgrades > 0 &&
                            !augmentOpen && (
                              <button
                                className="upgrade-open"
                                onClick={() => setAugmentOpen(true)}
                              >
                                <Icon name="sparkle" size={13} />
                                可进化 {me.pendingUpgrades}
                                <Key>U</Key>
                              </button>
                            )}
                          {me &&
                            me.alive &&
                            augmentOpen &&
                            me.offers.length > 0 &&
                            s.phase === "playing" && (
                              <AugmentPicker
                                me={me}
                                onClose={() => setAugmentOpen(false)}
                                onChoose={async (id) => {
                                  const r = await net.request("game:upgrade", {
                                    id,
                                  });
                                  if (r.ok) setAugmentOpen(true);
                                }}
                              />
                            )}
                        </>
                      )}
                  </div>
                  <div className="stage-footer">
                    <div>
                      <span className="signal-bars">
                        <i />
                        <i />
                        <i />
                        <i />
                      </span>
                      <span>
                        {inGame
                          ? s?.mode === "survival"
                            ? `WAVE ${String(s.wave).padStart(2, "0")} / ∞ · 离谱办公园区 · ${s.waveKills}/${s.waveTarget} 击杀`
                            : `${String((s?.mission || 0) + 1).padStart(2, "0")} / 06 · ${mission.title}`
                          : "基地状态正常"}
                      </span>
                      <span className="footer-separator" />
                      <span className="subtle">
                        {inGame
                          ? s?.difficulty === "relaxed"
                            ? "带薪散步"
                            : s?.difficulty === "nightmare"
                              ? "老板开挂"
                              : "正常发癫"
                          : "检测到有人偷偷快乐。"}
                      </span>
                    </div>
                    <button
                      className="text-btn"
                      onClick={() => setPanel("help")}
                    >
                      <Icon name="help" size={13} />
                      操作指南
                    </button>
                  </div>
                </section>
                {!inGame && (
                  <>
                    <div className="lobby-social">
                      <button onClick={() => setPanel("ranks")}>
                        <Icon name="trophy" />
                        小队总排名
                        <Icon name="arrow" size={14} />
                      </button>
                    </div>
                    {!window.desktop && (
                      <DesktopDownloadLink
                        onClick={() => setPanel("desktop")}
                      />
                    )}
                    <AdSlot />
                    <RentalAds />
                  </>
                )}
                <div className="controls-strip">
                  <div>
                    <span className="key-group">
                      <Key>W</Key>
                      <span>
                        <Key>A</Key>
                        <Key>S</Key>
                        <Key>D</Key>
                      </span>
                    </span>
                    <span>移动</span>
                  </div>
                  <div>
                    <Key>空格 / 右键</Key>
                    <span>冲刺</span>
                  </div>
                  <div>
                    <Key>Q</Key>
                    <span>职业技能</span>
                  </div>
                  <div>
                    <Key>E</Key>
                    <span>交互 / 救援</span>
                  </div>
                  <span className="control-auto">
                    <i />
                    <button
                      type="button"
                      className="autofire-toggle"
                      aria-label="切换自动开火"
                      aria-pressed={settings.autoFire}
                      onClick={() => update({ autoFire: !settings.autoFire })}
                    >
                      <Key>T</Key>自动开火{settings.autoFire ? "开启" : "关闭"}
                    </button>
                  </span>
                </div>
                <ExpeditionDossier
                  state={s}
                  mode={s?.mode || gameMode}
                  onOpen={(i) => {
                    setMissionInfo(i);
                    setPanel("mission");
                  }}
                />
              </section>
              <aside className="squad-side-rail" aria-label="队伍与聊天">
                <LobbyChannels
                  state={s}
                  messages={net.lobbyMessages}
                  name={name}
                  connected={net.connected}
                  online={net.presence?.online}
                  request={net.request}
                />
                <TeamPanel
                  state={s}
                  playerId={net.playerId}
                  role={currentRole}
                  busy={net.busy || floating.detached || floating.concealed}
                  onCreate={() => setPanel("create")}
                  onJoin={() => setPanel("join")}
                  onSolo={() => void solo()}
                  onRole={selectRole}
                  onInvite={invite}
                  request={net.request}
                  onLeave={() => setPanel("leave")}
                />
              </aside>
            </div>
            <footer className="page-footer">
              <span>
                <i />
                一人走得快，一起下班更快乐。
              </span>
              <span>
                MADE FOR YOUR LITTLE BREAK <i>✳</i> PAID BREAK CREW / 2026
              </span>
            </footer>
          </main>
        </div>
        <div className="compact-bar">
          <span className="compact-title">
            <i />
            状态面板
          </span>
          <div>
            <button
              aria-label="一键隐藏游戏"
              data-quiet-action="hide"
              title="隐藏游戏 F10；桌面全局恢复 Ctrl+Shift+B"
              onClick={hideGame}
            >
              <Icon name="minus" size={14} />
              <Key>F10</Key>
            </button>
            {IS_FLOATING ? (
              <button
                aria-label="返回主页面"
                title="返回主页面 · F6"
                onClick={floating.returnToOwner}
              >
                <Icon name="logout" size={14} />
                <Key>F6</Key>
              </button>
            ) : (
              <button
                aria-label="弹出独立小窗"
                title="独立小窗 · F6"
                disabled={!s}
                onClick={() => void floating.open()}
              >
                <Icon name="window" size={14} />
                <Key>F6</Key>
              </button>
            )}
            <button
              aria-label="切换工作面板"
              data-quiet-action="work"
              title="工作面板 F8"
              onClick={() => setBoss(true)}
            >
              <Icon name="eye" size={14} />
              <Key>F8</Key>
            </button>
            <button
              aria-label="音效"
              title="音效开关 · M"
              onClick={() => update({ sound: !settings.sound })}
            >
              <Icon name={settings.sound ? "volume" : "mute"} size={14} />
              <Key>M</Key>
            </button>
            <button
              aria-label="房间聊天"
              title="聊天 · Enter"
              onClick={() => {
                if (s && ["lobby", "countdown"].includes(s.phase))
                  window.dispatchEvent(new Event("squad-chat:focus"));
                else setChatOpen((v) => !v);
              }}
            >
              <Icon name="users" size={14} />
              <Key>↵</Key>
            </button>
            <button
              aria-label="随机强化"
              title="随机改装 · U"
              onClick={() => setAugmentOpen((v) => !v)}
            >
              <Icon name="sparkle" size={14} />
              <Key>U</Key>
            </button>
            <button
              aria-label="伤害排行"
              title="实时伤害排名 · F7"
              onClick={() => setShowRanking((v) => !v)}
            >
              <Icon name="target" size={14} />
              <Key>F7</Key>
            </button>
            <button
              aria-label="设置"
              title="画质与设置 · F2"
              onClick={() => setPanel("settings")}
            >
              <Icon name="settings" size={14} />
              <Key>F2</Key>
            </button>
            <button
              aria-label="切换沉浸模式"
              title="工具栏自动收起 / 常驻 · F4"
              onClick={() => setImmersive((v) => !v)}
            >
              <Icon name="eye" size={14} />
              <Key>F4</Key>
            </button>
            <button
              aria-label="恢复完整窗口"
              data-quiet-action="restore"
              title="恢复 F9"
              onClick={() => update({ compact: false })}
            >
              <Icon name="window" size={14} />
              <Key>F9</Key>
            </button>
          </div>
        </div>
      </div>
      {(panel === "create" || panel === "join") && (
        <Modal
          title={
            panel === "create" ? "留个位置，等同事来。" : "你的同事在等你。"
          }
          eyebrow={
            panel === "create"
              ? "CREATE A SQUAD / 创建小队"
              : "JOIN THE SQUAD / 加入小队"
          }
          onClose={close}
          wide
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void (panel === "create" ? create() : join());
            }}
          >
            <label className="field-label">
              你的行动代号
              <input
                autoComplete="nickname"
                autoFocus
                maxLength={12}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="同事怎么称呼你？"
                required
              />
            </label>
            {panel === "join" && (
              <label className="field-label">
                六位房间码
                <input
                  className="code-input"
                  aria-label="六位房间码"
                  value={joinCode}
                  onChange={(e) =>
                    setJoinCode(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z2-9]/g, "")
                        .slice(0, 6),
                    )
                  }
                  placeholder="ABC234"
                  minLength={6}
                  maxLength={6}
                  required
                  autoComplete="off"
                />
              </label>
            )}
            {panel === "create" && (
              <>
                <label className="field-label">
                  小队名称
                  <input
                    maxLength={20}
                    value={squadName}
                    onChange={(e) => setSquadName(e.target.value)}
                    placeholder="给小队留下名字"
                  />
                </label>
              </>
            )}
            <label className="field-label">
              选择岗位 · 专属 Q 固定，攻击入局后选择
            </label>
            <JobPicker role={role} onRole={setRole} large />
            <SkillDetails role={role} />
            <p className="role-dialog-desc">
              <span style={{ color: ROLES[role].color }}>
                {ROLES[role].desc}
              </span>
              职业决定基础属性和固定
              Q。初始没有攻击装备，进入地图后随机三选一；后续攻击与升级叠加保留。
            </p>
            {panel === "create" && (
              <RulesSelector
                mode={gameMode}
                difficulty={difficulty}
                onMode={setGameMode}
                onDifficulty={setDifficulty}
              />
            )}

            <button
              type="submit"
              className="btn btn-primary full"
              disabled={net.busy || !net.connected}
            >
              {net.busy
                ? "正在集结…"
                : panel === "create"
                  ? "创建小队，邀请同事"
                  : "加入小队"}
              <Icon name="arrow" />
            </button>
            <p className="fineprint">
              {panel === "create"
                ? "创建后获得专属房间码，最多 4 人。也可以添加 AI 伙伴。"
                : "请与同事打开同一个游戏地址，再输入房间码。"}
            </p>
          </form>
        </Modal>
      )}
      {brief && <MissionBrief state={s} mode={gameMode} onClose={closeBrief} />}
      {panel === "desktop" && (
        <DesktopDownload onClose={() => setPanel(null)} />
      )}
      {panel === "settings" && (
        <SettingsPanel
          settings={settings}
          update={update}
          onClose={close}
          notify={notify}
        />
      )}
      {panel === "help" && <FieldGuide onClose={close} />}
      {panel === "archive" && (
        <CodexPanel
          key={codexTab}
          initial={codexTab}
          records={records}
          role={currentRole}
          onRole={selectRole}
          canChoose={!s || s.phase === "lobby"}
          onClose={close}
        />
      )}
      {panel === "mission" && (
        <MissionPanel index={missionInfo} onClose={close} />
      )}
      {panel === "leave" && (
        <Modal title="要先回工位了吗？" eyebrow="LEAVE SQUAD" onClose={close}>
          <p className="body-copy">
            离开后，本局角色与强化会移除。同事们可以继续行动，你也可以凭房间码重新加入。
          </p>
          <div className="dialog-actions">
            <button className="btn btn-secondary" onClick={close}>
              再玩一会儿
            </button>
            <button className="btn btn-primary" onClick={() => void leave()}>
              离开小队
              <Icon name="logout" />
            </button>
          </div>
        </Modal>
      )}
      {hidden && (
        <div className="hidden-veil">
          <div>
            <Icon name="cup" size={32} />
            <span>工作台</span>
            <p>工作区已收起</p>
            <button
              className="btn btn-primary"
              onClick={() => setHidden(false)}
            >
              继续<Key>F10</Key>
            </button>
            <small>按 F10 继续当前工作区。</small>
          </div>
        </div>
      )}
      {panel === "rooms" && (
        <RoomBrowser
          name={name}
          role={role}
          request={net.request}
          onClose={close}
          onJoined={close}
        />
      )}
      {panel === "ranks" && (
        <SquadRanks request={net.request} onClose={close} />
      )}
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={16} />
          {toast}
        </div>
      )}
      {boss && (
        <Workspaces
          entry={settings.workEntry}
          onReturn={() => setBoss(false)}
        />
      )}
    </div>
  );
}
