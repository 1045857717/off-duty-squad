import "./interaction41.css";
import { useState, useEffect } from "react";
import type { GameState, Player } from "../shared/types";
import { Modal, Key } from "./components";
import { Icon } from "./icons";
import { MISSIONS } from "../shared/content";
export function MissionBrief({
  state,
  mode,
  onClose,
}: {
  state: GameState | null;
  mode: "survival" | "expedition";
  onClose: () => void;
}) {
  const survival = (state?.mode || mode) === "survival",
    mission = MISSIONS[(state?.mission || 0) % 6];
  return (
    <Modal
      title={
        survival ? "今天的团建：集体带薪摸鱼" : "本章任务 · " + mission.title
      }
      eyebrow="LIVE BRIEF / 当前行动简报"
      onClose={onClose}
      wide
    >
      <section className="brief-v34" aria-label="当前任务简报">
        <header>
          <span>
            <Icon name={survival ? "shield" : "flag"} size={25} />
          </span>
          <div>
            <small>
              {survival
                ? "园区发癫局 · 无限波次"
                : `${mission.area} / 第${(state?.mission || 0) + 1}章`}
            </small>
            <h3>
              {survival
                ? `撑过第${state?.wave || 1}波，别让工友落单。`
                : mission.objective}
            </h3>
            <p>
              {survival
                ? "保持移动、分散仇恨、互相救援。波次结束后会短暂补给，每5波出现首领。"
                : mission.brief}
            </p>
          </div>
        </header>
        <div className="brief-stats">
          <article>
            <small>{survival ? "本波击败" : "任务进度"}</small>
            <b>
              {survival
                ? `${state?.waveKills || 0} / ${state?.waveTarget || "—"}`
                : `${state?.objective.progress || 0} / ${state?.objective.target || mission.target}`}
            </b>
          </article>
          <article>
            <small>小队等级</small>
            <b>Lv.{state?.level || 1}</b>
          </article>
          <article>
            <small>可用零件</small>
            <b>{state?.coins || 0}</b>
          </article>
        </div>
        <div className="brief-tips">
          <h4>这局怎么配合</h4>
          <p>
            <Key>E</Key>靠近设施按住交互；失败会显示原因和短促抖动。
          </p>
          <p>
            <Key>Q</Key>职业技能独立保留；<Key>1 / 2 / 3</Key>边移动边选择强化。
          </p>
          <p>
            <Key>空格 / 右键</Key>预留冲刺躲过抬臂、亮起的打印口和自爆红圈。
          </p>
        </div>
        <button className="btn btn-primary full" onClick={onClose}>
          返回行动现场
          <Icon name="arrow" size={15} />
        </button>
      </section>
    </Modal>
  );
}
export function CombatFeedback({
  state,
  me,
  reduced,
}: {
  state: GameState;
  me?: Player;
  reduced: boolean;
}) {
  const [now, setNow] = useState(performance.now()),
    [failed, setFailed] = useState<{
      seq: number;
      message: string;
      born: number;
      status: "failed" | "complete";
      label?: string;
    } | null>(null),
    [hit, setHit] = useState<{
      seq: number;
      text: string;
      angle: number;
      shield: boolean;
      born: number;
    } | null>(null);
  useEffect(() => {
    if (!me?.lastHit || state.elapsed - me.lastHit.at > 2) return;
    const h = me.lastHit;
    setHit({
      seq: me.hitSeq,
      text: `${h.sourceName} · ${h.shieldAbsorbed >= h.amount ? "护盾吸收" : "受到伤害"} ${h.amount}`,
      angle: (Math.atan2(h.y - me.y, h.x - me.x) * 180) / Math.PI,
      shield: h.shieldAbsorbed > 0,
      born: performance.now(),
    });
  }, [me?.hitSeq]);
  useEffect(() => {
    const f = me?.interactionFeedback;
    if (!f || state.elapsed - f.at > (f.status === "complete" ? 4.8 : 1.6))
      return;
    setFailed({
      seq: f.seq,
      message: f.message,
      status: f.status,
      label: f.label,
      born: performance.now(),
    });
    if (f.status === "failed" && !reduced && navigator.vibrate)
      navigator.vibrate([16, 25, 16]);
  }, [me?.interactionFeedback?.seq]);
  useEffect(() => {
    if (!hit && !failed) return;
    const t = setInterval(() => setNow(performance.now()), 80);
    return () => clearInterval(t);
  }, [!!hit, !!failed]);
  useEffect(() => {
    if (!hit) return;
    const timer = setTimeout(() => setHit(null), 1950);
    return () => clearTimeout(timer);
  }, [hit?.born]);
  useEffect(() => {
    if (!failed) return;
    const timer = setTimeout(
      () => setFailed(null),
      failed.status === "complete" ? 4900 : 1650,
    );
    return () => clearTimeout(timer);
  }, [failed?.born]);
  return (
    <>
      <div
        className={
          "hit-screen-feedback " +
          (hit?.shield ? "shield-hit " : "") +
          (reduced ? "reduced" : "")
        }
        data-active={!!hit && now - hit.born < 380}
        key={hit?.seq}
      />
      {hit && now - hit.born < 1900 && (
        <div className="hit-source" role="status" aria-label="本次受击来源">
          <span style={{ transform: `rotate(${hit.angle}deg)` }}>➤</span>
          {hit.text}
        </div>
      )}
      {failed &&
        now - failed.born < (failed.status === "complete" ? 4800 : 1600) && (
          <div
            key={failed.seq}
            className={
              (failed.status === "complete"
                ? "interaction-receipt "
                : "interaction-failed ") + (reduced ? "reduced" : "")
            }
            role={failed.status === "complete" ? "status" : "alert"}
            aria-label={
              failed.status === "complete" ? "交互效果反馈" : "交互失败反馈"
            }
          >
            <Key>E</Key>
            <Icon
              name={failed.status === "complete" ? "check" : "close"}
              size={16}
            />
            <span>
              {failed.label && <strong>{failed.label}</strong>}
              {failed.message}
            </span>
          </div>
        )}
    </>
  );
}
