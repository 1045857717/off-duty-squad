import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { FramePacer } from "../framePacer";
import { EMPTY_INPUT } from "../../shared/content";
import { StationScene, type SceneBridge } from "./StationScene";
export default function GameCanvas({ bridge }: { bridge: SceneBridge }) {
  const parent = useRef<HTMLDivElement>(null),
    cap = bridge.settings.frameCap,
    quality = bridge.settings.quality;
  useEffect(() => {
    const el = parent.current!,
      dpr = quality === "high" ? Math.min(2, window.devicePixelRatio || 1) : 1;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: el,
      transparent: true,
      pixelArt: false,
      roundPixels: false,
      antialias: true,
      antialiasGL: true,
      powerPreference: "high-performance",
      scale: {
        mode: Phaser.Scale.NONE,
        width: Math.max(1, Math.round(el.clientWidth * dpr)),
        height: Math.max(1, Math.round(el.clientHeight * dpr)),
        zoom: 1 / dpr,
        autoCenter: Phaser.Scale.NO_CENTER,
      },
      fps: {
        target: 165,
        limit: 0,
        forceSetTimeOut: false,
        smoothStep: false,
      },
      callbacks: {
        postBoot: (engine) => {
          const step = engine.step.bind(engine),
            pacer = new FramePacer(cap || 0);
          // Some remote/multi-display compositors repeat RAF timestamps and
          // then jump a full refresh interval. Pace and animate from the real
          // monotonic clock so that credit and dash motion do not arrive in bursts.
          let previous = performance.now();
          engine.step = () => {
            const now = performance.now(),
              elapsed = pacer.sample(now - previous);
            previous = now;
            if (elapsed !== null) step(now, elapsed);
          };
        },
      },
      audio: { noAudio: true },
      scene: [new StationScene(bridge)],
      banner: false,
    });
    const resize = new ResizeObserver(() => {
      if (el.clientWidth && el.clientHeight)
        game.scale.resize(
          Math.round(el.clientWidth * dpr),
          Math.round(el.clientHeight * dpr),
        );
    });
    resize.observe(el);
    const visibility = setInterval(() => {
      const sleeping = document.hidden || bridge.hidden;
      if (sleeping && game.loop.running) {
        game.scene.getScene("station").input.keyboard?.resetKeys();
        bridge.send({ ...EMPTY_INPUT });
        game.loop.sleep();
      } else if (!sleeping && !game.loop.running) game.loop.wake();
    }, 150);
    return () => {
      clearInterval(visibility);
      resize.disconnect();
      game.destroy(true);
    };
  }, [bridge, cap, quality]);
  return (
    <div
      className="game-canvas"
      ref={parent}
      aria-label="带薪摸鱼游戏场景"
      role="img"
    />
  );
}
