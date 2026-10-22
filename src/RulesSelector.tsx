import type { Mode, Difficulty } from "../shared/types";
import { Icon } from "./icons";
import { ModeIllustration } from "./LobbyScene";
export const MODE_OPTIONS = [
  {
    id: "survival",
    name: "园区发癫局",
    tag: "无限爽刷",
    desc: "随机园区 · 盲盒福利 · 每5波老板",
    icon: "shield",
  },
  {
    id: "expedition",
    name: "夺回下班权",
    tag: "六章合作",
    desc: "收门禁 / 抢电闸 / 推小车 / 揍老板",
    icon: "compass",
  },
] as const;
export const DIFFICULTY_OPTIONS = [
  { id: "relaxed", name: "带薪散步", desc: "想躺也能玩", icon: "cup" },
  { id: "normal", name: "正常发癫", desc: "爽刷也得配合", icon: "bolt" },
  { id: "nightmare", name: "老板开挂", desc: "压力拉满", icon: "target" },
] as const;
export function RulesSelector({
  mode,
  difficulty,
  onMode,
  onDifficulty,
  disabled = false,
  compact = false,
}: {
  mode: Mode;
  difficulty: Difficulty;
  onMode: (v: Mode) => void;
  onDifficulty: (v: Difficulty) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <section
      className={"rules-selector" + (compact ? " compact" : "")}
      aria-label="行动规则选择"
    >
      <fieldset>
        <legend>
          <b className="lobby-step">01</b> 今天怎么玩<span>先选一种离谱</span>
        </legend>
        <div className="mode-cards" role="group" aria-label="行动模式">
          {MODE_OPTIONS.map((o) => (
            <button
              type="button"
              key={o.id}
              className={"mode-panel mode-" + o.id}
              disabled={disabled}
              aria-label={"模式：" + o.name}
              aria-pressed={mode === o.id}
              onClick={() => onMode(o.id)}
            >
              <ModeIllustration mode={o.id} />
              <span className="mode-copy">
                <small>{o.tag}</small>
                <strong>{o.name}</strong>
                <em>{o.desc}</em>
              </span>
              <i className="mode-choice">
                {mode === o.id ? (
                  <>
                    <Icon name="check" size={13} />
                    <span>已选择</span>
                  </>
                ) : (
                  <>
                    <Icon name="plus" size={13} />
                    <span>选择</span>
                  </>
                )}
              </i>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>
          整活强度<span>奖励与榜单按难度分开</span>
        </legend>
        <div className="difficulty-pills" role="group" aria-label="行动难度">
          {DIFFICULTY_OPTIONS.map((o) => (
            <button
              type="button"
              key={o.id}
              disabled={disabled}
              aria-label={"难度：" + o.name}
              aria-pressed={difficulty === o.id}
              onClick={() => onDifficulty(o.id)}
            >
              <Icon name={o.icon} size={16} />
              <strong>{o.name}</strong>
              <small>{o.desc}</small>
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
