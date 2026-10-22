import { useState, useEffect, useRef, useCallback } from "react";
import { ROLES } from "../shared/content";
import type { Settings, Role } from "../shared/types";
import { careerPortrait40 } from "./game/humanArt40";
export const DEFAULT_SETTINGS: Settings = {
  volume: 0.35,
  sound: false,
  lowMotion: false,
  opacity: 0.86,
  compact: false,
  autoFire: true,
  showGuide: true,
  frameCap: 0,
  quality: "high",
  showDamage: true,
  gameOpacity: 1,
  shiftDash: false,
  workEntry: "last",
};
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      return {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(localStorage.getItem("offduty-settings") || "{}"),
        compact: false,
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const update = useCallback(
    (patch: Partial<Settings>) =>
      setSettings((s) => ({
        ...s,
        ...(patch.compact === true ? { sound: false } : {}),
        ...patch,
      })),
    [],
  );
  useEffect(() => {
    localStorage.setItem(
      "offduty-settings",
      JSON.stringify({ ...settings, compact: false }),
    );
    document.documentElement.classList.toggle(
      "reduce-motion",
      settings.lowMotion,
    );
    document.documentElement.classList.toggle("compact-mode", settings.compact);
    window.desktop?.setCompact(settings.compact);
    window.desktop?.setOpacity(settings.opacity * settings.gameOpacity);
  }, [settings]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "offduty-settings" || !e.newValue) return;
      try {
        const saved = JSON.parse(e.newValue);
        setSettings((current) => ({
          ...DEFAULT_SETTINGS,
          ...saved,
          compact: current.compact,
        }));
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return { settings, update };
}
const avatars = new Map<Role, string>();
export function Avatar({
  role,
  size = 44,
  className = "",
}: {
  role: Role;
  size?: number;
  className?: string;
}) {
  if (!avatars.has(role)) avatars.set(role, careerPortrait40(role));
  return (
    <img
      className={"pixel-avatar " + className}
      src={avatars.get(role)}
      width={size}
      height={size * 1.2}
      alt={ROLES[role].name + "肖像"}
      draggable="false"
    />
  );
}
export function useToast() {
  const [toast, setToast] = useState(""),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((text: string) => {
    setToast(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, notify };
}
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") ?? initial;
    } catch {
      return initial;
    }
  });
  useEffect(
    () => localStorage.setItem(key, JSON.stringify(value)),
    [key, value],
  );
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || !e.newValue) return;
      try {
        const next = JSON.parse(e.newValue);
        setValue((current) =>
          JSON.stringify(current) === JSON.stringify(next) ? current : next,
        );
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);
  return [value, setValue] as const;
}
