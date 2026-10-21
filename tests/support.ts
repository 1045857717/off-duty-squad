import type { Game } from "../shared/types";
import { attackOffer } from "../shared/arsenal";
import { chooseUpgrade, startGame, tickGame } from "../server/simulation";
export function prepareFixture(g: Game) {
  for (const p of g.state.players) p.ready = true;
}
export function startFixture(g: Game, id: string) {
  const ok = startGame(g, id);
  if (!ok) return false;
  for (let i = 0; i < 190; i++) tickGame(g, 1 / 60);
  for (const p of g.state.players) {
    if (!p.initialChosen) {
      p.offers = [attackOffer(p, "pulse")];
      chooseUpgrade(g, p.id, p.offers[0].id);
    }
  }
  return true;
}
export function autoDraftSocket(s: any, id?: string) {
  let busy = false;
  s.on("state", async (state: any) => {
    const p = id
      ? state.players.find((p: any) => p.id === id)
      : state.players.find((p: any) => !p.bot && p.id === s.__testPlayerId);
    if (
      !p ||
      p.initialChosen ||
      !p.offers?.length ||
      !["draft", "playing"].includes(state.phase) ||
      busy
    )
      return;
    busy = true;
    await new Promise((r) => s.emit("game:upgrade", { id: p.offers[0].id }, r));
    busy = false;
  });
}
export async function draftSocket(s: any, g: Game, id: string) {
  s.__testPlayerId = id;
  if (!s.__autoDraft) {
    autoDraftSocket(s, id);
    s.__autoDraft = true;
  }
  return new Promise<any>((r) => s.emit("player:ready", { ready: true }, r));
}
