import { memo, useEffect, useState } from "react";
import type { SceneBridge } from "./game/StationScene";
import type { NetworkHealth, NetworkStatus } from "./networkHealth";

const NETWORK_LABELS: Record<NetworkStatus, string> = {
  good: "良好",
  moderate: "一般",
  poor: "较慢",
  unknown: "测量中",
  disconnected: "已断线",
  "no-response": "无响应",
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
        previous.rttMs === next.rttMs
          ? previous
          : next,
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [bridge, networkHealth]);
  const low =
    reading.fps > 0 && reading.fps < (reading.frameCap === 60 ? 50 : 120);
  return (
    <span
      className="fps-meter performance-meter"
      role="group"
      aria-label="游戏性能"
      aria-description={DESCRIPTION}
      title={DESCRIPTION}
      tabIndex={0}
    >
      <span className={"render-rate" + (low ? " fps-low" : "")}>
        <i aria-hidden="true" />
        {reading.fps || "—"} FPS
      </span>
      <span
        className={"rtt-meter network-" + reading.status}
        data-network-status={reading.status}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 9V7M6 9V4M10 9V1" />
        </svg>
        RTT {reading.rttMs === null ? "—" : reading.rttMs + " ms"}
        <span className="network-label">{NETWORK_LABELS[reading.status]}</span>
      </span>
    </span>
  );
});
