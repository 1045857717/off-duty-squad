import type { CSSProperties } from "react";
const paths: Record<string, React.ReactNode> = {
  minus: <path d="M5 12h14" />,
  grid: (
    <>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="15" width="6" height="6" rx="1" />
      <rect x="15" y="15" width="6" height="6" rx="1" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m16 8-2.5 5.5L8 16l2.5-5.5Z" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3a4 4 0 0 1 0 8" />
      <circle cx="9" cy="7" r="4" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4C9 2 2 7 5 16c8 5 16-2 15-12Z" />
      <path d="m4 21 11-12M9 16l-1-6m4 3 6 1" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 2v5m0 10v5M2 12h5m10 0h5" />
    </>
  ),
  heart: (
    <>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
      <path d="M6 12h3l2-4 2 8 2-4h3" />
    </>
  ),
  bolt: <path d="m13 2-9 12h7l-1 8 10-12h-7Z" />,
  tool: (
    <>
      <path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18a2.1 2.1 0 0 0 3 3l5.3-5.3a5 5 0 0 0 6.4-6.4L14 13l-3-3Z" />
    </>
  ),
  book: (
    <>
      <path d="M3 3h6a4 4 0 0 1 4 4v15a4 4 0 0 0-4-3H3Zm18 0h-4a4 4 0 0 0-4 4v15a4 4 0 0 1 4-3h4Z" />
    </>
  ),
  settings: (
    <>
      <path d="m9 3-.7 2.5-2.5 1L3.5 6 2 9l1.8 1.8v2.4L2 15l1.5 3 2.3-.5 2.5 1L9 21h4l.7-2.5 2.5-1 2.3.5 1.5-3-1.8-1.8v-2.4L20 9l-1.5-3-2.3.5-2.5-1L13 3Z" />
      <circle cx="11" cy="12" r="3" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H3V3h12v2" />
    </>
  ),
  link: (
    <>
      <path
        d="m10 13 4-4m-6 6-2 2a4.2 4.2 0 0 1-6-6l4-4a4.2 4.2 0 0 1 6 0m4 2 2-2a4.2 4.2 0 1 1 6 6l-4 4a4.2 4.2 0 0 1-6 0"
        transform="translate(1 0)"
      />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  volume: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" />
    </>
  ),
  mute: (
    <>
      <path d="M11 5 6 9H3v6h3l5 4Zm5 4 6 6m0-6-6 6" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3v.1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  flag: (
    <>
      <path d="M4 22V3m0 0c5-4 10 4 16 0v11c-6 4-11-4-16 0" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 3h8v7a4 4 0 0 1-8 0Zm0 2H3v3a5 5 0 0 0 5 5m8-8h5v3a5 5 0 0 1-5 5m-4 1v7m-5 0h10" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H4v16h5m6-14 6 6-6 6M9 12h12" />
    </>
  ),
  play: <path d="m8 4 12 8-12 8Z" />,
  pause: (
    <>
      <path d="M8 5v14M16 5v14" />
    </>
  ),
  wifi: (
    <>
      <path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-10 4a5 5 0 0 1 6 0m-3 4h.01" />
    </>
  ),
  window: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 8h18M7 6h.01M10 6h.01" />
    </>
  ),
  cup: (
    <>
      <path d="M5 4h12v11a5 5 0 0 1-10 0V4m12 2h2a3 3 0 1 1 0 6h-2M3 21h18" />
    </>
  ),
  pin: (
    <>
      <path d="m16 3 5 5-4 2-3 6-2-2-7 7m7-7-4-4 6-3Z" />
    </>
  ),
  moon: <path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z" />,
  sparkle: (
    <>
      <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z" />
    </>
  ),
  terminal: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m6 9 3 3-3 3m6 0h5" />
    </>
  ),
};
export function Icon({
  name,
  size = 18,
  className = "",
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {paths[name] || paths.compass}
    </svg>
  );
}
