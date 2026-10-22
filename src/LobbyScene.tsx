import type { Mode, Role } from "../shared/types";
import { Avatar } from "./hooks";

/** Small, editable destination illustrations; all workers use the game's native portraits. */
export function ModeIllustration({ mode }: { mode: Mode }) {
  return (
    <svg
      className="mode-illustration"
      viewBox="0 0 240 140"
      fill="none"
      aria-hidden="true"
    >
      {mode === "survival" ? (
        <>
          <path
            d="M10 112 225 100M25 130l202-13M154 13l-8 20m45-12-18 19M203 53l-22 4"
            stroke="currentColor"
            strokeWidth="3"
            opacity=".35"
          />
          <path
            d="m55 111-17-26 14-8 21 28m92 0 18-26 14 9-14 24"
            fill="#1b3637"
            stroke="#142e30"
            strokeWidth="3"
          />
          <path
            d="m59 45 92-10 24 63-99 16z"
            fill="#f3f0d8"
            stroke="#142e30"
            strokeWidth="4"
          />
          <path
            d="m59 45 14-19 77-7 1 16m-78-8 12 18 66-8"
            fill="#8baaa0"
            stroke="#142e30"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path d="m78 75 78-8 7 19-79 9z" fill="#142e30" />
          <path d="m92 79 15-2m24-2 14-2" stroke="#d7fa70" strokeWidth="5" />
          <path
            d="m91 111-2-17 54-6 7 16-20-5-13 12z"
            fill="#fffcef"
            stroke="#142e30"
            strokeWidth="3"
          />
          <path
            d="m27 44 13 7-2 13-12-6zm164 44 18-11 7 12-17 12z"
            fill="#fffcef"
            stroke="#142e30"
            strokeWidth="2"
          />
          <path
            d="m21 27 16 1m-6-8-3 15m169-18 12 6m-3-10-5 17"
            stroke="#fffcef"
            strokeWidth="3"
          />
          <path
            d="m48 108 15 12m118-15 12 7"
            stroke="#142e30"
            strokeWidth="5"
          />
        </>
      ) : (
        <>
          <path d="m37 119 177-7 24 18-208 8z" fill="#1b3637" opacity=".2" />
          <path
            d="M82 119V25l88-12 19 104"
            fill="#183d3d"
            stroke="#142e30"
            strokeWidth="4"
          />
          <path
            d="m99 114-1-75 56-8 10 80"
            fill="#d7fa70"
            stroke="#142e30"
            strokeWidth="3"
          />
          <path d="m99 114 30-15-2-64 27-4 10 80" fill="#a9cc59" />
          <path
            d="m108 14-2-12 43-5 3 15z"
            fill="#d7fa70"
            stroke="#142e30"
            strokeWidth="3"
            transform="translate(0 8)"
          />
          <path
            d="m114 18 28-3m-9-5 9 5-7 8"
            stroke="#142e30"
            strokeWidth="3"
          />
          <path
            d="m36 77 34-6 7 33-34 6z"
            fill="#fffcef"
            stroke="#142e30"
            strokeWidth="3"
          />
          <path d="m48 84 14-2m-11 10 8-2" stroke="#e77c65" strokeWidth="4" />
          <path
            d="m177 43 29 6-5 39-27-6z"
            fill="#e77c65"
            stroke="#142e30"
            strokeWidth="3"
          />
          <path d="m180 59 22 5" stroke="#fffcef" strokeWidth="3" />
          <path
            d="m12 102 60-8m-51 19 42-6m125-78 25-10m-20 19 24-3"
            stroke="currentColor"
            strokeWidth="3"
            opacity=".5"
          />
          <path
            d="m157 116 56-10m-11-4 11 4-8 8"
            stroke="#fffcef"
            strokeWidth="3"
          />
        </>
      )}
    </svg>
  );
}

export function OfficeBackdrop() {
  return (
    <svg
      className="office-backdrop"
      viewBox="0 0 900 250"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
      aria-hidden="true"
    >
      <path d="M0 200h900v50H0z" fill="#283f3c" />
      <path
        d="M0 201h900M70 250l90-49m130 49 40-49m210 49-40-49m210 49-90-49"
        stroke="#557268"
        strokeWidth="2"
      />
      <path
        d="M26 35h150v112H26zM727 35h150v112H727z"
        fill="#385c53"
        stroke="#708d74"
        strokeWidth="3"
      />
      <path
        d="M101 35v112m-75-55h150m626-57v112m-75-55h150"
        stroke="#708d74"
        strokeWidth="3"
      />
      <path
        d="m54 80 20-21 25 22 27-34 26 30m598 2 19-20 25 22 27-34 26 30"
        stroke="#9ab48b"
        strokeWidth="2"
      />
      <path
        d="M332 32h237v86H332z"
        fill="#243b37"
        stroke="#708d74"
        strokeWidth="3"
      />
      <path
        d="M368 62h165m-165 20h104"
        stroke="#8ca57c"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M27 202v-42h34v42m788 0v-43h32v43" fill="#c7b292" />
      <path
        d="M44 164c-29-14-34-37-13-25-13-37 15-36 15-6 14-35 34-14 2 26m817 5c-29-14-34-37-13-25-13-37 15-36 15-6 14-35 34-14 2 26"
        fill="#8baf76"
      />
    </svg>
  );
}

export function LobbyScene({ role }: { role: Role }) {
  const coworkers: Role[] = [
    role === "engineer" ? "guardian" : "engineer",
    role,
    role === "medic" ? "scout" : "medic",
  ];
  return (
    <div className="lobby-scene" aria-label="摸鱼工友集合室">
      <OfficeBackdrop />
      <div className="scene-copy">
        <span>带薪摸鱼 · 1–4 人合作</span>
        <h2>
          班是公司的，
          <br />
          <em>鱼是自己的。</em>
        </h2>
        <p>摸到的鱼，才算自己挣到的。</p>
      </div>
      <div className="scene-coworkers">
        {coworkers.map((worker, i) => (
          <div
            key={i}
            className={i === 1 ? "scene-worker featured" : "scene-worker"}
          >
            <Avatar role={worker} size={110} />
            <span>
              {i === 1 ? "你的位置" : i === 0 ? "拒绝内卷" : "队友互捞"}
            </span>
          </div>
        ))}
      </div>
      <span className="scene-sticker">
        工资照领
        <br />
        快乐自取
      </span>
    </div>
  );
}
