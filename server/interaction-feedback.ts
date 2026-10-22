import type { Game, Player } from "../shared/types";
/** A personal authoritative receipt is not overwritten by another teammate's action. */
export function interactionReceipt(
  g: Game,
  p: Player,
  label: string,
  message: string,
) {
  p.interactionFeedback = {
    seq: (p.interactionFeedback?.seq || 0) + 1,
    at: g.state.elapsed,
    status: "complete",
    label,
    message,
  };
  if (p.interaction?.status === "complete") p.interaction.message = message;
}
