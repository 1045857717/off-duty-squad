import type { GameState, Player, OfficeProp, Interactable } from "./types";
export const OFFICE_HINTS: Record<OfficeProp["kind"], string> = {
  printer: "吸引附近敌人8秒，不造成伤害 · 冷却30秒",
  sprinkler: "170范围内敌人减速50%，持续10秒 · 冷却30秒",
  cabinet: "推倒形成障碍5秒，砸伤附近敌人并眩晕1秒 · 冷却30秒",
  shutter: "关闭通道5秒，夹伤附近敌人并眩晕2秒 · 冷却30秒",
};
export const OBJECT_HINTS: Record<Interactable["kind"], string> = {
  chest: "获得1次三选一强化 · 用1 / 2 / 3学习",
  cache: "获得1次三选一强化 · 用1 / 2 / 3学习",
  shrine: "获得1次强化，损失18%最大生命，永久增加12%敌潮强度",
  fountain: "190范围内恢复35%最大生命和20护盾，可救起倒地队友",
};
/** Both the HUD and authoritative server use this nearest-target order. */
export function interactionTarget(s: GameState, p: Player, margin = 0) {
  return (
    candidateTarget(s, p, 0) ||
    (margin > 0 ? candidateTarget(s, p, margin) : undefined)
  );
}
function candidateTarget(s: GameState, p: Player, margin: number) {
  const distance = (o: { x: number; y: number }) =>
    Math.hypot(o.x - p.x, o.y - p.y);
  const ally = s.players.find(
    (q) =>
      q.id !== p.id && !q.alive && q.connected && distance(q) < 70 + margin,
  );
  if (ally)
    return {
      kind: "revive" as const,
      object: ally,
      distance: distance(ally),
      range: 70,
      duration: 2.7 / (p.role === "medic" ? 1.5 : 1),
      hint: "按住E救起队友，队友将恢复部分生命",
    };
  const relay =
    s.objective.type === "relay"
      ? s.objective.relays.find((r) => !r.active && distance(r) < 74 + margin)
      : undefined;
  if (relay)
    return {
      kind: "relay" as const,
      object: relay,
      distance: distance(relay),
      range: 74,
      duration: 1 / (p.role === "engineer" ? 0.2 : 0.14),
      hint: "为任务配电箱充能，充满后任务进度+1",
    };
  const objects = [
    ...s.officeProps
      .filter((o) => distance(o) < 78 + margin)
      .map((o) => ({
        kind: "office" as const,
        object: o,
        distance: distance(o),
        range: 78,
        duration: 0.9,
        hint: OFFICE_HINTS[o.kind],
      })),
    ...s.objects
      .filter((o) => !o.used && distance(o) < 70 + margin)
      .map((o) => ({
        kind: "reward" as const,
        object: o,
        distance: distance(o),
        range: 70,
        duration: 0.7,
        hint: OBJECT_HINTS[o.kind],
      })),
  ];
  // Prefer usable targets at an equal distance, but retain cooldown targets for an explanatory HUD.
  return objects.sort(
    (a, b) =>
      a.distance - b.distance ||
      (a.kind === "office" ? a.object.cd : 0) -
        (b.kind === "office" ? b.object.cd : 0),
  )[0];
}
