import { useEffect, useState } from "react";
import { Modal } from "./components";
import { Icon } from "./icons";
type DesktopRelease = {
  available: boolean;
  version: string;
  url: string;
  bytes: number;
  platform: string;
};
export function DesktopDownload({ onClose }: { onClose: () => void }) {
  const [release, setRelease] = useState<DesktopRelease | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/desktop")
      .then((r) => r.json())
      .then((v) => {
        if (active) setRelease(v);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const config = () => {
    const blob = new Blob([JSON.stringify({ url: location.origin }, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "game-server.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <Modal
      title="把下班窗口带到桌面"
      eyebrow="DESKTOP / WINDOWS"
      onClose={onClose}
      wide
    >
      <div className="desktop-download">
        <div className="desktop-download-art">
          <Icon name="window" size={36} />
          <strong>无边框 · 整窗透明 · 全局隐藏</strong>
          <p>网页里继续游戏，也可以下载桌面客户端。</p>
        </div>
        <ol>
          <li>下载并解压 Windows x64 便携包，无需安装 Node。</li>
          <li>运行「薪水小偷.exe」，输入下方同一个服务器地址。</li>
          <li>
            加入同一个房间；F9 迷你窗口，F10 隐藏，Ctrl+Shift+B 全局恢复。
          </li>
        </ol>
        <label>
          当前服务器地址
          <input
            aria-label="桌面端服务器地址"
            readOnly
            value={location.origin}
          />
        </label>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void navigator.clipboard?.writeText(location.origin)}
        >
          复制服务器地址
        </button>
        <button type="button" className="text-btn" onClick={config}>
          下载连接配置（放在 EXE 旁）
        </button>
        {release?.available ? (
          <a
            className="btn btn-primary desktop-download-link"
            href={release.url}
            download
          >
            下载 Windows x64 · v{release.version} ·{" "}
            {Math.round(release.bytes / 1024 / 1024)} MB
            <Icon name="arrow" />
          </a>
        ) : (
          <p role="status">此服务器暂未发布桌面包。可继续使用网页画中画。</p>
        )}
        <small>
          便携版未代码签名，下载后解压再运行。桌面客户端连接当前游戏服务器，游戏数据仍以服务器为准。
        </small>
      </div>
    </Modal>
  );
}
export function DesktopDownloadLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="desktop-entry" onClick={onClick}>
      <Icon name="window" size={15} />
      <span>
        下载桌面端<small>无边框透明小窗 · Windows</small>
      </span>
      <Icon name="arrow" size={14} />
    </button>
  );
}
