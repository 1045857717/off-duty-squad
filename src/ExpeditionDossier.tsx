import type { GameState, Mode } from "../shared/types";
import { MISSIONS } from "../shared/content";
import { Icon } from "./icons";
import { workerQuote } from "../shared/humor";
export function ExpeditionDossier({
  state,
  mode,
  onOpen,
}: {
  state: GameState | null;
  mode: Mode;
  onOpen: (index: number) => void;
}) {
  const expedition = mode === "expedition",
    running = !!state && state.phase !== "lobby",
    current = expedition && running ? state!.mission : -1;
  return (
    <section className="dossier" aria-label="夺回下班权档案">
      <header>
        <div>
          <span className="dossier-kicker">下班行动指南 / CASE FILE 006</span>
          <h2>
            夺回下班权<span>六站路，捞齐同事再走。</span>
          </h2>
        </div>
        <span className="dossier-badge">
          <Icon name={expedition ? "compass" : "book"} size={16} />
          {expedition ? "当前行动路线" : "六章合作模式档案"}
        </span>
      </header>
      <div className="dossier-route">
        {MISSIONS.map((m, i) => (
          <button
            className={
              "dossier-stop " +
              (i === current
                ? "is-current "
                : i < current
                  ? "is-complete "
                  : "")
            }
            key={m.title}
            onClick={() => onOpen(i)}
            aria-label={`查看第${i + 1}章：${m.title}`}
            aria-current={i === current ? "step" : undefined}
          >
            <div className="dossier-stop-top">
              <span>
                {i < current ? (
                  <Icon name="check" size={15} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <small>
                {i === current
                  ? "正在行动"
                  : i < current
                    ? "已打卡"
                    : m.difficulty}
              </small>
            </div>
            <span className="dossier-room">{m.area}</span>
            <strong>{m.title}</strong>
            <p>{m.objective}</p>
            <footer>
              <Icon
                name={
                  m.type === "collect"
                    ? "leaf"
                    : m.type === "relay"
                      ? "bolt"
                      : m.type === "escort"
                        ? "shield"
                        : "target"
                }
                size={15}
              />
              <span>
                {m.type === "collect"
                  ? `${m.target}份权限`
                  : m.type === "relay"
                    ? `${m.target}处供电`
                    : m.type === "escort"
                      ? "护送至出口"
                      : "首领战"}
              </span>
              <Icon name="arrow" size={14} />
            </footer>
          </button>
        ))}
      </div>
      <footer>
        <span>
          <Icon name="grid" size={14} />
          房间与岔路每局重排 · 点击章节查看任务
        </span>
        <p>{workerQuote(state ? state.seed + state.wave : 0)}</p>
      </footer>
    </section>
  );
}
