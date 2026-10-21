import { useEffect, useRef } from "react";
export function SmoothInteraction({
  progress,
  charging,
  complete,
  identity,
  rate,
}: {
  progress: number;
  charging: boolean;
  complete: boolean;
  identity: string;
  rate: number;
}) {
  const bar = useRef<HTMLElement>(null),
    label = useRef<HTMLElement>(null),
    latest = useRef({
      progress,
      charging,
      complete,
      identity,
      rate,
      at: performance.now(),
    }),
    display = useRef(0),
    previousId = useRef(identity);
  if (
    latest.current.progress !== progress ||
    latest.current.charging !== charging ||
    latest.current.complete !== complete ||
    latest.current.identity !== identity ||
    latest.current.rate !== rate
  )
    latest.current = {
      progress,
      charging,
      complete,
      identity,
      rate,
      at: performance.now(),
    };
  useEffect(() => {
    let frame = 0,
      last = performance.now();
    const update = (now: number) => {
      const s = latest.current,
        dt = Math.min(40, now - last);
      last = now;
      if (s.identity !== previousId.current) {
        display.current = s.progress;
        previousId.current = s.identity;
      }
      const aim = s.complete
        ? 1
        : Math.min(
            0.98,
            s.progress +
              (s.charging ? Math.min(0.15, (now - s.at) / 1000) * s.rate : 0),
          );
      display.current += (aim - display.current) * (1 - Math.exp(-dt / 55));
      if (s.complete && display.current > 0.998) display.current = 1;
      const value = Math.max(0, Math.min(1, display.current));
      if (bar.current) bar.current.style.transform = `scaleX(${value})`;
      if (label.current)
        label.current.textContent = Math.round(value * 100) + "%";
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="smooth-channel-meter">
      <div
        className="interaction-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <i ref={bar} />
      </div>
      <b ref={label}>0%</b>
    </div>
  );
}
