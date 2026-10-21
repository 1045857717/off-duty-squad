import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { GameState } from "../shared/types";
import { rankDamage } from "../shared/ranking";
import { whole } from "../shared/balance";
import { ROLES } from "../shared/content";
import { ATTACKS } from "../shared/arsenal";
import { careerPortrait } from "../shared/careers";
import { workerQuote } from "../shared/humor";
import { Icon } from "./icons";
export function RunReport({
  state,
  playerId,
  onRestart,
  onLeave,
}: {
  state: GameState;
  playerId: string;
  onRestart: () => void;
  onLeave: () => void;
}) {
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortal(document.querySelector<HTMLElement>(".app"));
    const previous = document.body.style.overflow;
    const background = document.querySelector<HTMLElement>(".app-body"),
      wasInert = background?.inert || false;
    if (background) background.inert = true;
    const timer = setTimeout(
      () => document.querySelector<HTMLElement>(".debrief-sheet")?.focus(),
      0,
    );
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(timer);
      if (background) background.inert = wasInert;
      document.body.style.overflow = previous;
    };
  }, []);
  const rows = rankDamage(state.players),
    [selected, setSelected] = useState(playerId),
    p = state.players.find((p) => p.id === selected) || rows[0]?.player;
  const won = state.phase === "won",
    total = rows.reduce((n, r) => n + r.player.damageDealt, 0),
    time = `${Math.floor(state.elapsed / 60)
      .toString()
      .padStart(2, "0")}:${Math.floor(state.elapsed % 60)
      .toString()
      .padStart(2, "0")}`;
  const score = Math.round(
    (state.mode === "survival"
      ? (state.wave - 1) * 1800
      : state.mission * 2200) +
      (won ? 15000 : 0) +
      state.stats.kills * 23 +
      state.level * 110 +
      state.coins * 0.5,
  );
  const assists = state.players.reduce((n, p) => n + (p.rescues || 0), 0),
    healing = state.players.reduce((n, p) => n + p.healingDone, 0),
    mvp = rows[0]?.player;
  if (!portal) return null;
  return createPortal(
    <div
      className={"debrief-backdrop " + (won ? "debrief-won" : "debrief-lost")}
    >
      <section
        className="debrief-sheet"
        role="region"
        aria-label="本局战斗统计"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const nodes = Array.from(
            e.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          );
          const first = nodes[0],
            last = nodes.at(-1);
          if (
            e.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === e.currentTarget)
          ) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
      >
        <header className="debrief-header">
          <div className="debrief-brand">
            <Icon name="grid" size={22} />
            <span>
              工友互助部<small>下班结算中心 / SHIFT RECEIPT</small>
            </span>
          </div>
          <span className="debrief-run">
            #{state.runId.slice(-8).toUpperCase()}
            <small>
              {state.mode === "survival" ? "园区发癫局" : "夺回下班权"} ·{" "}
              {state.difficulty === "nightmare"
                ? "老板开挂"
                : state.difficulty === "relaxed"
                  ? "带薪散步"
                  : "正常发癫"}
            </small>
          </span>
        </header>
        <div className="debrief-outcome">
          <div>
            <span className="debrief-eyebrow">
              {state.squadName} · {state.teamPeak || state.players.length}{" "}
              人小队
            </span>
            <h2>{won ? "下班成功，谁也别加班。" : "本次班味，已经结清。"}</h2>
            <p>
              {won
                ? "同事一个没少，老板的饼一张没吃。"
                : "工位暂时没守住，快乐没有被没收。重整队伍，下把继续整活。"}
            </p>
          </div>
          <div className="debrief-stamp">
            <Icon name={won ? "check" : "cup"} size={23} />
            <strong>{won ? "准点打卡" : "下把准行"}</strong>
            <small>{won ? "CLOCKED OUT" : "TRY AGAIN"}</small>
          </div>
        </div>
        <div className="debrief-summary">
          <article className="debrief-score">
            <span>本局下班绩效</span>
            <strong>{whole(score)}</strong>
            <small>努力已上传，工资另说。</small>
          </article>
          {[
            [time, "本次在岗"],
            [
              state.mode === "survival"
                ? `第 ${state.wave} 波`
                : `${Math.min(6, state.mission + 1)} / 6 章`,
              "推进记录",
            ],
            [whole(state.stats.kills), "送走加班怪"],
            [`Lv.${state.level}`, "小队成长"],
          ].map(([n, label]) => (
            <article key={label}>
              <strong>{n}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>
        <div className="debrief-content">
          <section className="debrief-contributions">
            <header>
              <div>
                <span className="debrief-eyebrow">没有无用的工友</span>
                <h3>这把，谁在偷偷发力？</h3>
              </div>
              <span>有效伤害 {whole(total)}</span>
            </header>
            <div className="debrief-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>工友 / 岗位</th>
                    <th>有效伤害</th>
                    <th>DPS</th>
                    <th>击败</th>
                    <th>治疗 / 救援</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ player: r, rank, share }) => (
                    <tr
                      key={r.id}
                      className={r.id === selected ? "selected" : ""}
                    >
                      <td>
                        <button
                          onClick={() => setSelected(r.id)}
                          aria-label={`查看${r.name}的结算构筑`}
                          aria-pressed={r.id === selected}
                        >
                          <span className="debrief-rank">
                            {String(rank).padStart(2, "0")}
                          </span>
                          <img src={careerPortrait(r.role)} alt="" />
                          <span>
                            <strong>
                              {r.name}
                              {r.id === playerId && <em>你</em>}
                              {r.bot && <em>AI</em>}
                            </strong>
                            <small>{ROLES[r.role].name}</small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <strong>{whole(r.damageDealt)}</strong>
                        <div className="debrief-share">
                          <i
                            style={{
                              width: `${Math.max(0, Math.min(100, share))}%`,
                            }}
                          />
                        </div>
                        <small>{Math.round(share)}%</small>
                      </td>
                      <td>
                        {whole(r.damageDealt / Math.max(1, state.elapsed))}
                      </td>
                      <td>{whole(r.kills)}</td>
                      <td>
                        {whole(r.healingDone)} <small>/ {r.rescues || 0}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="debrief-team-notes">
              <span>
                <Icon name="heart" size={16} />
                全队治疗 <b>{whole(healing)}</b>
              </span>
              <span>
                <Icon name="users" size={16} />
                互相捞人 <b>{assists} 次</b>
              </span>
              <span>
                <Icon name="bolt" size={16} />
                剩余零件 <b>{whole(state.coins)}</b>
              </span>
            </div>
            <div className="debrief-commendation">
              <Icon name="trophy" size={26} />
              <div>
                <small>本局工友表彰</small>
                <strong>
                  {mvp && mvp.damageDealt > 0
                    ? `${mvp.name} · 饼图里的扛把子`
                    : "全体工友 · 主打一个陪伴"}
                </strong>
                <p>{workerQuote(state.seed + state.wave)}</p>
              </div>
            </div>
          </section>
          {p && (
            <aside className="debrief-build" aria-label="结算构筑详情">
              <header>
                <img src={careerPortrait(p.role)} alt={ROLES[p.role].name} />
                <div>
                  <span>本次构筑档案</span>
                  <h3>{p.name}</h3>
                  <small>{ROLES[p.role].name}</small>
                </div>
              </header>
              <div className="debrief-signature">
                <Icon name="bolt" size={18} />
                <span>
                  {ROLES[p.role].skill}
                  <small>职业技能 · Lv.{p.signatureLevel}</small>
                </span>
              </div>
              <h4>这把带了什么</h4>
              <div className="debrief-modules">
                {Object.entries(p.arsenal).map(([id, level]) => (
                  <article key={id}>
                    <span>{ATTACKS[id as keyof typeof ATTACKS].name}</span>
                    <b>Lv.{level}</b>
                    <div>
                      {Array.from({ length: 8 }, (_, i) => (
                        <i key={i} className={i < level ? "active" : ""} />
                      ))}
                    </div>
                  </article>
                ))}
                {!Object.keys(p.arsenal).length && (
                  <p>还没来得及领装备，下把先选个趁手的。</p>
                )}
              </div>
              <dl>
                <div>
                  <dt>承受伤害</dt>
                  <dd>{whole(p.damageTaken)}</dd>
                </div>
                <div>
                  <dt>暴击命中</dt>
                  <dd>{whole(p.criticalHits)}</dd>
                </div>
                <div>
                  <dt>回收零件</dt>
                  <dd>{whole(p.partsCollected)}</dd>
                </div>
              </dl>
            </aside>
          )}
        </div>
        <footer className="debrief-footer">
          <p>
            <Icon name="check" size={16} />
            {state.elapsed >= 15
              ? "本局成绩已按模式和难度记录。"
              : "短局仍保留本次统计；满 15 秒的对局计入榜单。"}
            <small>
              {state.host === playerId
                ? "重整后全员重新准备，再一起出发。"
                : "等房主重整队伍，再约一把。"}
            </small>
          </p>
          <div className="debrief-actions">
            <button className="debrief-leave" onClick={onLeave}>
              返回大厅
            </button>
            <button
              className="debrief-restart"
              disabled={state.host !== playerId}
              onClick={onRestart}
            >
              {state.host === playerId ? "重整队伍，再来一把" : "等待房主重整"}
              <Icon name="arrow" size={17} />
            </button>
          </div>
        </footer>
      </section>
    </div>,
    portal,
  );
}
