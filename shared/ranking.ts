import type { Player } from "./types";
export function rankDamage(players: Player[]) {
  const total = players.reduce((sum, p) => sum + (p.damageDealt || 0), 0);
  return [...players]
    .sort(
      (a, b) =>
        (b.damageDealt || 0) - (a.damageDealt || 0) ||
        b.kills - a.kills ||
        a.id.localeCompare(b.id),
    )
    .map((player, index) => ({
      player,
      rank: index + 1,
      share: total ? ((player.damageDealt || 0) / total) * 100 : 0,
    }));
}
