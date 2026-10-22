import { useEffect, useRef, useState } from "react";
import type { Player } from "../shared/types";
import { healthReadout } from "./healthDisplay";
import { Icon } from "./icons";
export function PlayerVitalsHUD({
  player,
  elapsed,
}: {
  player: Player;
  elapsed: number;
}) {
  const v = healthReadout(
    player.hp,
    player.maxHp,
    player.shield,
    player.shieldCap,
    player.alive,
  );
  const previous = useRef(v.ratio);
  const [trail, setTrail] = useState(v.ratio);
  useEffect(() => {
    setTrail((current) =>
      v.ratio < previous.current
        ? Math.max(current, previous.current)
        : v.ratio,
    );
    previous.current = v.ratio;
    const timer = setTimeout(() => setTrail(v.ratio), 340);
    return () => clearTimeout(timer);
  }, [v.ratio]);
  const broken =
    player.hitShield &&
    v.shield === 0 &&
    (player.lastHit?.shieldAbsorbed || 0) > 0 &&
    elapsed - (player.lastHit?.at ?? -99) < 1;
  const label = broken
    ? "护盾破裂"
    : v.status === "critical"
      ? "危险"
      : v.status === "wounded"
        ? "受伤"
        : v.status === "down"
          ? "已倒地"
          : "生命";
  return (
    <div
      className={
        "vitals combat-vitals status-" +
        v.status +
        (broken ? " shield-broken" : "")
      }
      data-health-status={v.status}
      aria-label="你的生命与护盾"
    >
      <div className="vital-label">
        <Icon name="heart" size={17} />
        <strong>{v.hp}</strong>
        <small>/{v.maxHp}</small>
        <em>{label}</em>
        {v.shield > 0 && (
          <span className="vital-shield-amount">
            <Icon name="shield" size={10} />
            {v.shield}盾
          </span>
        )}
      </div>
      <div
        className="vital-track"
        role="progressbar"
        aria-label="角色生命"
        aria-valuemin={0}
        aria-valuemax={v.maxHp}
        aria-valuenow={v.hp}
        aria-valuetext={v.hp + "生命，" + v.shield + "护盾"}
      >
        <span
          className="vital-loss"
          style={{ transform: "scaleX(" + trail + ")" }}
        />
        <i style={{ transform: "scaleX(" + v.ratio + ")" }} />
      </div>
      {v.shield > 0 && (
        <div
          className="vital-shield"
          role="progressbar"
          aria-label="角色护盾"
          aria-valuemin={0}
          aria-valuemax={Math.max(v.shield, player.shieldCap)}
          aria-valuenow={v.shield}
        >
          <b style={{ transform: "scaleX(" + v.shieldRatio + ")" }} />
        </div>
      )}
    </div>
  );
}
