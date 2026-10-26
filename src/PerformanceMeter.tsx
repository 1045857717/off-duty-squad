import { memo, useEffect, useState } from "react";
import type { SceneBridge } from "./game/StationScene";
import type { NetworkHealth, NetworkStatus } from "./networkHealth";
import { classifyFrameScheduling } from "./frameDiagnostics";

const NETWORK_LABELS: Record<NetworkStatus, string> = {
  good: "良好",
  moderate: "一般",
  poor: "较慢",
  unknown: "测量中",
  disconnected: "已断线",
  "no-response": "探测超时",
};
const DESCRIPTION =
  "FPS：实际画面渲染帧率。RTT：到游戏服务器的实测往返耗时；— 表示尚无有效回复。每秒刷新。";

export const PerformanceMeter = memo(function PerformanceMeter({
  bridge,
  networkHealth,
}: {
  bridge: SceneBridge;
  networkHealth: NetworkHealth;
}) {
  const sample = () => ({
    fps: Number.isFinite(bridge.metrics.fps)
      ? Math.max(0, Math.round(bridge.metrics.fps))
      : 0,
    frameCap: bridge.settings.frameCap,
    callbackHz:
      bridge.metrics.frameDiagnostics &&
      performance.now() - bridge.metrics.frameDiagnostics.sampledAt < 2500
        ? bridge.metrics.frameDiagnostics.callbackHz
        : null,
    near60:
      classifyFrameScheduling(bridge.metrics.frameDiagnostics).kind ===
      "near-60",
    sync: networkHealth.stream.read(),
    ...networkHealth.read(),
  });
  const [reading, setReading] = useState(sample);
  useEffect(() => {
    // The scene writes metrics per frame; only this child publishes at 1 Hz.
    const timer = setInterval(() => {
      const next = sample();
      setReading((previous) =>
        previous.fps === next.fps &&
        previous.frameCap === next.frameCap &&
        previous.status === next.status &&
        previous.rttMs === next.rttMs &&
        previous.callbackHz === next.callbackHz &&
        previous.sync.status === next.sync.status &&
        previous.sync.snapshotHz === next.sync.snapshotHz &&
        previous.sync.transport === next.sync.transport
          ? previous
          : next,
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [bridge, networkHealth]);
  const low =
    reading.fps > 0 &&
    reading.fps <
      Math.min(reading.frameCap || 144, reading.callbackHz || 144) * 0.83;
  const label =
    reading.sync.status === "stalled"
      ? "同步停顿"
      : reading.sync.status === "late"
        ? "同步稍慢"
        : NETWORK_LABELS[reading.status];
  const syncLabel = {
    fresh: "同步正常",
    late: "同步稍慢",
    stalled: "同步停顿",
    unmeasured: "等待对局状态",
    disconnected: "已断线",
  }[reading.sync.status];
  const transportLabel =
    reading.sync.transport === "websocket"
      ? "WebSocket"
      : reading.sync.transport === "polling"
        ? "HTTP 轮询"
        : "连接中";
  const description =
    DESCRIPTION +
    ` 当前浏览器回调：${reading.callbackHz === null ? "待测" : Math.round(reading.callbackHz) + "次/秒"}；${reading.frameCap ? "目标上限" + reading.frameCap + "FPS" : "高刷跟随浏览器"}；通道：${transportLabel}；${syncLabel}。F2 可查看诊断与空载对照。`;
  const colorStatus =
    reading.sync.status === "stalled" ? "no-response" : reading.status;
  return (
    <span
      className="fps-meter performance-meter"
      role="group"
      aria-label="游戏性能"
      aria-description={description}
      title={description}
      data-frame-scheduling={reading.near60 ? "near-60" : "other"}
      data-sync-status={reading.sync.status}
      tabIndex={0}
    >
      <span className={"render-rate" + (low ? " fps-low" : "")}>
        <i aria-hidden="true" />
        {reading.fps || "—"} FPS
      </span>
      <span
        className={"rtt-meter network-" + colorStatus}
        data-network-status={reading.status}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 9V7M6 9V4M10 9V1" />
        </svg>
        RTT {reading.rttMs === null ? "—" : reading.rttMs + " ms"}
        <span className="network-label">{label}</span>
      </span>
    </span>
  );
});
