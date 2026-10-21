import type { Effect } from "./types";
/** Hostile ground target guides are intentionally limited to bomber windup. */
export function isBlastWarning(e: Effect) {
  return e.kind === "attack" && e.enemyKind === "bomber" && e.warning === true;
}
