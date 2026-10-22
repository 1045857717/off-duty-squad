import type { Effect } from "../../shared/types";
/** Screen space: +X is zero; +Y points down. Every authored directional texture shares this basis. */
export const FX_FORWARD = 0;
export const FX_STAMPS = [
  "slash",
  "electric",
  "frost",
  "mist",
  "shield",
  "coffee",
  "critical",
  "heal",
  "impact",
  "orbit",
  "summon",
] as const;
export type EffectStamp = (typeof FX_STAMPS)[number];
const families: Record<string, EffectStamp> = {
  volley: "electric",
  nova: "impact",
  mend: "heal",
  aegis: "shield",
  frost: "frost",
  chain: "electric",
  orbit: "orbit",
  reaper: "orbit",
  decoy: "summon",
  supply: "heal",
  wok: "impact",
  sanitize: "mist",
  bell: "shield",
  rush: "electric",
  flash: "impact",
  injunction: "shield",
  stampede: "impact",
  takeblame: "impact",
  paidbreak: "heal",
  paperstorm: "orbit",
  quack: "electric",
  crunch: "impact",
  espresso: "coffee",
  bugfix: "frost",
  pie: "impact",
  funding: "electric",
  slides: "orbit",
  rent: "impact",
};
export function effectStamp(e: Effect): EffectStamp | null {
  if (
    e.warning ||
    ["death", "rescue"].includes(e.kind) ||
    (e.kind === "attack" && e.attackSkill && e.owner !== "enemy")
  )
    return null;
  if (e.critical) return "critical";
  if (e.kind === "hit") return null;
  if (e.kind === "heal") return "heal";
  if (e.ability) return families[e.ability] || "summon";
  const module = e.attackSkill;
  if (module)
    return (
      {
        frost: "frost",
        venom: "mist",
        gravity: "mist",
        arc: "electric",
        ricochet: "electric",
        coffee: "coffee",
        flame: "coffee",
        meteor: "impact",
        orbit: "orbit",
        drone: "summon",
        seeker: "summon",
        blade: "slash",
        bat: "slash",
        mop: "slash",
        wrench: "impact",
        pulse: "electric",
      } as const
    )[module];
  return e.kind === "attack" ? "impact" : null;
}
/** A tapered ribbon contained in the real +/-1.05 radian melee sector, never a full ring. */
export function meleeRibbon(angle: number, radius: number, progress: number) {
  const t = Math.max(0, Math.min(1, progress)),
    head = -0.98 + 1.96 * (1 - Math.pow(1 - t, 2));
  const tail = Math.max(-1.02, head - 0.9);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12,
      a = angle + tail + (head - tail) * u,
      r = radius * (0.92 + 0.08 * u);
    points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  for (let i = 12; i >= 0; i--) {
    const u = i / 12,
      a = angle + tail + (head - tail) * u,
      r = radius * (0.92 + 0.08 * u) - (4 + u * 8) * (1 - t * 0.65);
    points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return points;
}
