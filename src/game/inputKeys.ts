export function editableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return (
    !!el &&
    (el.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))
  );
}
export function gameKeyAction(
  e: {
    code: string;
    repeat?: boolean;
    isComposing?: boolean;
    keyCode?: number;
  },
  shiftDash = false,
) {
  if (e.isComposing || e.keyCode === 229) return "ignore";
  if (
    [
      "KeyE",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(e.code)
  )
    return "hold";
  if (
    !e.repeat &&
    (e.code === "Space" ||
      e.code === "KeyR" ||
      (shiftDash && ["ShiftLeft", "ShiftRight"].includes(e.code)))
  )
    return "dash";
  if (!e.repeat && e.code === "KeyQ") return "skill";
  return "ignore";
}
