import { memo, useEffect, useState } from "react";
import type { SceneBridge } from "./game/StationScene";
import type { NetworkHealth } from "./networkHealth";
import { classifyFrameScheduling } from "./frameDiagnostics";

export const PerformanceDiagnostics = memo(function PerformanceDiagnostics({
  bridge,
  networkHealth,
  notify,
}: {
  bridge: SceneBridge;
  networkHealth: NetworkHealth;
  notify: (message: string) => void;
}) {
  const sample = () => {
    const frame = bridge.metrics.frameDiagnostics;
    return {
      fps: bridge.metrics.fps,
      cap: bridge.settings.frameCap,
      frame: frame && performance.now() - frame.sampledAt < 2500 ? frame : null,
      rtt: networkHealth.read(),
      sync: networkHealth.stream.read(),
    };
  };
  const [reading, setReading] = useState(sample);
  useEffect(() => {
    const timer = setInterval(() => setReading(sample()), 1000);
    return () => clearInterval(timer);
  }, [bridge, networkHealth]);
  const number = (value: number | null | undefined, suffix: string) =>
    value == null ? "尚未测得" : `${Math.round(value * 10) / 10}${suffix}`;
  const frame = reading.frame,
    near60 = classifyFrameScheduling(frame).kind === "near-60";
  const transport =
    reading.sync.transport === "websocket"
      ? "WebSocket"
      : reading.sync.transport === "polling"
        ? "HTTP 轮询（兼容连接）"
        : "连接中";
  const syncStatus = {
    fresh: "同步正常",
    late: "到包间隔变长",
    stalled: "同步停顿",
    unmeasured: "等待对局同步",
    disconnected: "已断线",
  }[reading.sync.status];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            schema: 1,
            recordedAt: new Date().toISOString(),
            renderedFps: reading.fps,
            configuredFrameCap: reading.cap,
            frame: reading.frame,
            rtt: reading.rtt,
            sync: reading.sync,
          },
          null,
          2,
        ),
      );
      notify("已复制性能诊断，可粘贴用于排查。");
    } catch {
      notify("当前浏览器无法复制，请记录面板中的数值。");
    }
  };
  return (
    <details className="performance-diagnostics">
      <summary>
        帧率与联机诊断<span>查看 60 帧原因</span>
      </summary>
      <div className="diagnostic-content">
        <dl>
          <div>
            <dt>实际绘制</dt>
            <dd>{number(reading.fps || null, " FPS")}</dd>
          </div>
          <div>
            <dt>浏览器回调</dt>
            <dd>{number(frame?.callbackHz, " 次/秒")}</dd>
          </div>
          <div>
            <dt>设置目标</dt>
            <dd>
              {reading.cap ? `${reading.cap} FPS 上限` : "高刷 · 跟随浏览器"}
            </dd>
          </div>
          <div>
            <dt>CPU 帧内 P95</dt>
            <dd>{number(frame?.cpuStepP95Ms, " ms")}</dd>
          </div>
          <div>
            <dt>连接通道</dt>
            <dd>{transport}</dd>
          </div>
          <div>
            <dt>往返耗时 RTT</dt>
            <dd>{number(reading.rtt.rttMs, " ms")}</dd>
          </div>
          <div>
            <dt>游戏同步</dt>
            <dd>
              {syncStatus}
              {reading.sync.snapshotHz !== null
                ? ` · ${reading.sync.snapshotHz} 次/秒`
                : ""}
            </dd>
          </div>
          <div>
            <dt>距上次状态</dt>
            <dd>{number(reading.sync.ageMs, " ms")}</dd>
          </div>
          <div>
            <dt>到包抖动</dt>
            <dd>{number(reading.sync.jitterMs, " ms")}</dd>
          </div>
        </dl>
        <p className="diagnostic-guidance">
          {near60
            ? "当前样本的浏览器回调约为 60 次/秒。先做空载对照，再检查显示器刷新率、浏览器节能或远程/虚拟显示限制。"
            : "目标上限不会创造额外的浏览器回调。空载测试也低时先看显示与浏览器调度；空载高、游戏低时再看渲染负载。"}
        </p>
        <p className="diagnostic-note">
          空载测试请在大厅或对局结束后运行，联机对局不会暂停。回调频率不等于物理面板刷新认证。CPU
          帧内时间不包含 GPU 完成与帧间任务；RTT
          包含网络、服务端处理及客户端排队。到包抖动是间隔的平均绝对偏差，不是丢包率。
        </p>
        <div className="diagnostic-actions">
          <a href="/frame-check.html" target="_blank" rel="noreferrer">
            空载刷新测试 ↗
          </a>
          <button type="button" onClick={copy}>
            复制诊断数据
          </button>
        </div>
      </div>
    </details>
  );
});
