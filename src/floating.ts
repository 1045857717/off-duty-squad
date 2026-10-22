import { useState, useRef, useEffect, useCallback } from "react";
import { IS_FLOATING } from "./network";
type DocumentPiP = {
  requestWindow: (options: {
    width: number;
    height: number;
  }) => Promise<Window>;
};
declare global {
  interface Window {
    documentPictureInPicture?: DocumentPiP;
  }
}
type Owner = {
  delegate: () => void;
  reclaim: () => Promise<void>;
};
export function useFloatingWindow(
  owner: Owner,
  notify: (s: string) => void,
  makeCompact: () => void,
) {
  const [detached, setDetached] = useState(false),
    [concealed, setConcealed] = useState(false),
    [mode, setMode] = useState<"pip" | "popup" | null>(null);
  const child = useRef<Window | null>(null),
    frame = useRef<HTMLIFrameElement | null>(null),
    ownerRef = useRef(owner),
    preferPopup = useRef(false);
  ownerRef.current = owner;
  const restore = useCallback(() => {
    const w = child.current;
    child.current = null;
    frame.current = null;
    if (w && !w.closed) w.close();
    setDetached(false);
    setConcealed(false);
    setMode(null);
    void ownerRef.current.reclaim();
  }, []);
  const conceal = useCallback(() => {
    const w = child.current;
    child.current = null;
    frame.current = null;
    if (w && !w.closed) w.close();
    setDetached(false);
    setConcealed(true);
    setMode(null);
    void ownerRef.current.reclaim();
  }, []);
  useEffect(() => {
    const message = (e: MessageEvent) => {
      if (e.origin !== location.origin) return;
      const target = frame.current?.contentWindow || child.current;
      if (!target || e.source !== target) return;
      if (e.data?.type === "offduty:window-ready") {
        const token = sessionStorage.getItem("offduty-session");
        if (token)
          target.postMessage(
            { type: "offduty:window-session", token },
            location.origin,
          );
      }
      if (e.data?.type === "offduty:window-return") restore();
      if (e.data?.type === "offduty:window-hide") conceal();
    };
    window.addEventListener("message", message);
    const watch = setInterval(() => {
      if (child.current?.closed) restore();
    }, 300);
    const unload = () => child.current?.close();
    window.addEventListener("pagehide", unload);
    return () => {
      window.removeEventListener("message", message);
      window.removeEventListener("pagehide", unload);
      clearInterval(watch);
      child.current?.close();
    };
  }, [restore, conceal]);
  const open = useCallback(async () => {
    if (window.desktop) {
      makeCompact();
      return;
    }
    if (child.current && !child.current.closed) {
      child.current.focus();
      return;
    }
    if (!sessionStorage.getItem("offduty-session")) {
      notify("先创建小队或开始试跑，再把本局弹出为独立小窗。");
      return;
    }
    const url = new URL(location.pathname, location.origin);
    url.searchParams.set("floating", "1");
    try {
      if (window.documentPictureInPicture && !preferPopup.current) {
        const w = await window.documentPictureInPicture.requestWindow({
          width: 520,
          height: 350,
        });
        child.current = w;
        w.document.title = "状态面板";
        w.document.body.style.cssText =
          "margin:0;background:#14221a;width:100vw;height:100vh;overflow:hidden";
        const f = w.document.createElement("iframe");
        frame.current = f;
        f.src = url.toString();
        f.title = "状态面板";
        f.style.cssText = "border:0;display:block;width:100%;height:100%";
        w.addEventListener("message", (e) => {
          if (e.origin === location.origin && e.source === f.contentWindow) {
            if (e.data?.type === "offduty:window-ready") {
              const token = sessionStorage.getItem("offduty-session");
              if (token)
                f.contentWindow?.postMessage(
                  { type: "offduty:window-session", token },
                  location.origin,
                );
            }
            if (e.data?.type === "offduty:window-return") restore();
            if (e.data?.type === "offduty:window-hide") conceal();
          }
        });
        w.document.body.append(f);
        setMode("pip");
      } else {
        const w = window.open(
          url,
          "off-duty-game",
          "popup=yes,width=520,height=350,resizable=yes,scrollbars=no",
        );
        if (!w) throw Error("popup");
        child.current = w;
        setMode("popup");
      }
      ownerRef.current.delegate();
      setConcealed(false);
      setDetached(true);
      notify("游戏已移到独立小窗。关闭小窗或点“收回游戏”即可返回。");
    } catch {
      child.current?.close();
      child.current = null;
      frame.current = null;
      preferPopup.current = true;
      notify("画中画未能打开。请允许弹窗后再点一次，将使用独立游戏窗口。");
    }
  }, [makeCompact, notify, restore, conceal]);
  const focus = useCallback(() => child.current?.focus(), []);
  const returnToOwner = useCallback(() => {
    const target = window.opener || window.parent;
    target.postMessage(
      { type: "offduty:window-return" },
      window.parent !== window ? "*" : location.origin,
    );
  }, []);
  const hideFloating = useCallback(() => {
    const target = window.opener || window.parent;
    target.postMessage(
      { type: "offduty:window-hide" },
      window.parent !== window ? "*" : location.origin,
    );
  }, []);
  return {
    detached,
    concealed,
    mode,
    open,
    restore,
    conceal,
    focus,
    isFloating: IS_FLOATING,
    returnToOwner,
    hideFloating,
  };
}
