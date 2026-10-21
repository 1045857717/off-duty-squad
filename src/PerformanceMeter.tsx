import { useEffect, useState } from "react";
import type { SceneBridge } from "./game/StationScene";
export function PerformanceMeter({ bridge }: { bridge: SceneBridge }) {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setFps(bridge.metrics.fps), 1000);
    return () => clearInterval(timer);
  }, [bridge]);
  return (
    <span
      className={
        "fps-meter " +
        (fps > 0 && fps < (bridge.settings.frameCap === 60 ? 50 : 120)
          ? "fps-low"
          : "")
      }
      title="实际渲染帧率 · 默认144+高刷 · F2设置"
    >
      <i />
      {fps || "—"} FPS
    </span>
  );
}
