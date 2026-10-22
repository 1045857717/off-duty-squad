import { workerQuote } from "../shared/humor";
import { useEffect, useRef } from "react";
import type { GameState, Player } from "../shared/types";
import type { SceneBridge } from "./game/StationScene";
import { Icon } from "./icons";

// Positions are written directly to transforms on the render clock. React only
// creates labels when the actual roster/messages change, never at game FPS.
export function TacticalOverlay({
  state,
  me,
  bridge,
}: {
  state: GameState;
  me?: Player;
  bridge: SceneBridge;
}) {
  const root = useRef<HTMLDivElement>(null),
    latest = useRef(state),
    seen = useRef(new Set<number>());
  latest.current = state;
  const rosterKey = state.players.map((p) => p.id).join("|") + "/" + me?.id;
  useEffect(() => {
    let frame = 0;
    const element = root.current!;
    let width = element.clientWidth,
      height = element.clientHeight;
    const resize = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        width = rect.width;
        height = rect.height;
      }
    });
    resize.observe(element);
    const nodes = new Map<
      string,
      { marker: HTMLElement | null; bubble: HTMLElement | null }
    >();
    for (const p of latest.current.players)
      nodes.set(p.id, {
        marker: element.querySelector<HTMLElement>(`[data-marker="${p.id}"]`),
        bubble: element.querySelector<HTMLElement>(`[data-bubble="${p.id}"]`),
      });
    const update = () => {
      const host = root.current,
        view = bridge.metrics.view,
        s = latest.current;
      if (host && view && !document.hidden && !bridge.hidden) {
        const w = width,
          h = height;
        const project = (x: number, y: number) => ({
          x: ((x - view.x) / view.w) * w,
          y: ((y - view.y) / view.h) * h,
        });
        for (const p of s.players) {
          const pos = bridge.metrics.positions?.[p.id] || p,
            point = project(pos.x, pos.y);
          const marker = nodes.get(p.id)?.marker;
          if (marker) {
            const off =
              point.x < 18 ||
              point.y < 18 ||
              point.x > w - 18 ||
              point.y > h - 18;
            if (marker.hidden === off) marker.hidden = !off;
            const dx = point.x - w / 2,
              dy = point.y - h / 2;
            const scale = Math.min(
              (w / 2 - 58) / Math.max(1, Math.abs(dx)),
              (h / 2 - 70) / Math.max(1, Math.abs(dy)),
            );
            if (off)
              marker.style.transform = `translate3d(${w / 2 + dx * scale}px,${h / 2 + dy * scale}px,0)`;
            if (off)
              marker.style.setProperty("--bearing", `${Math.atan2(dy, dx)}rad`);
            const caption = marker.querySelector<HTMLElement>("span");
            if (off && caption)
              caption.style.translate = dx > 0 ? "calc(-100% - 20px) 0" : "0 0";
            const label = marker.querySelector("small");
            const self = s.players.find((p) => p.id === bridge.playerId);
            if (off && label && self) {
              const text = `${p.alive ? "" : "倒地 · "}${Math.round(Math.hypot(p.x - self.x, p.y - self.y) / 64)}m`;
              if (label.textContent !== text) label.textContent = text;
            }
          }
          const bubble = nodes.get(p.id)?.bubble;
          if (bubble) {
            const last = s.chat
              .filter((m) => m.playerId === p.id && !m.system)
              .at(-1);
            const rescue =
              s.phase === "playing" &&
              !p.alive &&
              (s.rescuePing?.playerId
                ? s.rescuePing.playerId === p.id
                : s.rescuePing?.name === p.name) &&
              (s.rescuePing?.until || 0) > s.elapsed;
            const show = rescue || (last && Date.now() - last.at < 5500);
            if (bubble.hidden === !!show) bubble.hidden = !show;
            if (show) {
              bubble.style.transform = `translate3d(${Math.max(80, Math.min(w - 80, point.x))}px,${Math.max(55, Math.min(h - 65, point.y - 72))}px,0)`;
              bubble.classList.toggle("rescue-speech", !!rescue);
              const content = bubble.querySelector("span");
              const text = rescue ? "我倒地了！帮我一把！" : last!.text;
              if (content && content.textContent !== text)
                content.textContent = text;
            }
          }
        }
        for (const e of s.effects) {
          if (e.kind !== "collect" || seen.current.has(e.id)) continue;
          seen.current.add(e.id);
          if (
            e.pickupKind === "xp" &&
            s.effects.filter((f) => f.kind === "collect").length > 12
          )
            continue;
          const start = project(e.x, e.y),
            target = document.querySelector(
              e.pickupKind === "crystal"
                ? "[data-objective-count]"
                : e.pickupKind === "heal"
                  ? ".vital-track"
                  : ".team-xp",
            );
          if (
            !target ||
            start.x < 0 ||
            start.y < 0 ||
            start.x > w ||
            start.y > h
          )
            continue;
          const rect = host.getBoundingClientRect(),
            end = target.getBoundingClientRect(),
            tx = end.left - rect.left + end.width / 2,
            ty = end.top - rect.top + end.height / 2;
          const gem = document.createElement("i");
          gem.className = `pickup-flight flight-${e.pickupKind}`;
          gem.textContent = e.pickupKind === "heal" ? "+" : "◆";
          host.append(gem);
          const animation = gem.animate(
            [
              {
                transform: `translate(${start.x}px,${start.y}px) scale(.5)`,
                opacity: 0,
              },
              {
                transform: `translate(${start.x}px,${start.y - 23}px) scale(1.3)`,
                opacity: 1,
                offset: 0.18,
              },
              {
                transform: `translate(${(start.x + tx) / 2 + 45}px,${Math.min(start.y, ty) - 50}px) scale(1)`,
                opacity: 1,
                offset: 0.5,
              },
              { transform: `translate(${tx}px,${ty}px) scale(.3)`, opacity: 0 },
            ],
            { duration: 650, easing: "cubic-bezier(.2,.65,.25,1)" },
          );
          animation.onfinish = () => {
            gem.remove();
            target.animate(
              [
                { filter: "brightness(2.4)", transform: "scale(1.16)" },
                { filter: "brightness(1)", transform: "scale(1)" },
              ],
              { duration: 360 },
            );
          };
        }
        if (seen.current.size > 350)
          seen.current = new Set(s.effects.map((e) => e.id));
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [bridge, rosterKey]);
  return (
    <div ref={root} className="tactical-overlay" aria-label="队友方向与发言">
      {state.players
        .filter((p) => p.id !== me?.id)
        .map((p) => (
          <div
            key={p.id}
            data-marker={p.id}
            hidden
            className={"teammate-bearing " + (!p.alive ? "needs-rescue" : "")}
            style={{ "--ally": p.color } as React.CSSProperties}
          >
            <i>➤</i>
            <span>
              {p.name}
              <small />
            </span>
          </div>
        ))}
      {state.players.map((p) => (
        <div key={p.id} data-bubble={p.id} hidden className="world-speech">
          <b>{p.name}</b>
          <span />
          <i className="speech-dots">
            <i />
            <i />
            <i />
          </i>
        </div>
      ))}
    </div>
  );
}

export function BattleIntro({ state }: { state: GameState }) {
  const survival = state.mode === "survival";
  return (
    <div
      className={
        "battle-intro " + (survival ? "intro-cataclysm" : "intro-expedition")
      }
      key={state.runId + "/" + state.world.seed}
      aria-label="行动开始"
    >
      <span>
        {survival ? "OFFICE RUMBLE / 园区发癫" : "CLOCK OUT / 夺回下班权"}
      </span>
      <strong>
        {survival ? "老板画饼，我来开席。" : "工位已疯，快乐开工。"}
      </strong>
      <p>
        {survival
          ? "保持移动 · 彼此掩护 · 活过下一波"
          : "清除威胁 · 完成目标 · 全员撤离"}
      </p>
      <small className="intro-worker-quote">
        {workerQuote(state.seed + state.wave)}
      </small>
      <i />
    </div>
  );
}
export function EvolutionBeacon({
  me,
  onClick,
}: {
  me: Player;
  onClick: () => void;
}) {
  return (
    <button
      className="evolution-beacon"
      onClick={onClick}
      aria-label={`有 ${me.pendingUpgrades} 次技能可学习`}
    >
      <i className="beacon-rings" />
      <Icon name="sparkle" size={19} />
      <span>
        <strong>
          基因进化已就绪 <b>×{me.pendingUpgrades}</b>
        </strong>
        <small>战斗继续 · 1 / 2 / 3 立即学习</small>
      </span>
      <kbd>U</kbd>
    </button>
  );
}
