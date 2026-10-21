import { ThemedSelect } from "./ThemedSelect";
import { useState } from "react";
import { Icon } from "./icons";
import { Modal, Toggle, Key } from "./components";
import { ROLES, MISSIONS } from "../shared/content";
import type { Settings, Role } from "../shared/types";
import { Avatar } from "./hooks";
export type Records = {
  runs: number;
  wins: number;
  kills: number;
  rescues: number;
  crystals: number;
  bestTime: number;
  highestMission: number;
};
export const EMPTY_RECORDS: Records = {
  runs: 0,
  wins: 0,
  kills: 0,
  rescues: 0,
  crystals: 0,
  bestTime: 0,
  highestMission: 0,
};
export function SettingsPanel({
  settings,
  update,
  onClose,
  notify,
}: {
  settings: Settings;
  update: (p: Partial<Settings>) => void;
  onClose: () => void;
  notify: (s: string) => void;
}) {
  const [pinned, setPinned] = useState(
    document.documentElement.dataset.pinned !== "false",
  );
  return (
    <Modal
      title="把节奏交给自己"
      eyebrow="PREFERENCES / 偏好设置"
      onClose={onClose}
    >
      <div className="settings-group quality-settings">
        <h3>
          <Icon name="sparkle" />
          画质与高刷新率
        </h3>
        <label className="quality-select">
          <span>刷新率模式</span>
          <ThemedSelect
            label="刷新率模式"
            value={String(settings.frameCap)}
            onChange={(v) =>
              update({ frameCap: Number(v) as Settings["frameCap"] })
            }
            options={[
              ["0", "高刷 · 跟随屏幕"],
              ["144", "144 FPS 上限"],
              ["165", "165 FPS 上限"],
              ["240", "240 FPS 上限"],
              ["60", "60 FPS · 节能"],
            ]}
          />
        </label>
        <label className="quality-select">
          <span>画面精细度</span>
          <ThemedSelect
            label="画面精细度"
            value={settings.quality}
            onChange={(v) => update({ quality: v as Settings["quality"] })}
            options={[
              ["high", "精细 · 高清角色 / 高 DPI"],
              ["balanced", "均衡 · 减少像素填充"],
            ]}
          />
        </label>
        <label className="range-row">
          <span>
            整个界面透明度 <b>{Math.round(settings.gameOpacity * 100)}%</b>
          </span>
          <input
            aria-label="游戏整体透明度"
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={settings.gameOpacity}
            onChange={(e) => update({ gameOpacity: Number(e.target.value) })}
          />
          <small className="opacity-help">
            顶栏、大厅、游戏画面、血条、聊天和设置一起变淡。桌面版会同时改变整个原生窗口的透明度；浏览器内仅改变界面显示浓度。
          </small>
        </label>
        <label className="select-row">
          <span>工作模式进入方式</span>
          <ThemedSelect
            label="工作模式进入方式"
            value={settings.workEntry}
            onChange={(v) => update({ workEntry: v as Settings["workEntry"] })}
            options={[
              ["last", "记住上次界面"],
              ["random", "每次随机"],
              ["tasks", "任务管理"],
              ["board", "项目看板"],
              ["docs", "文档编辑"],
              ["sheet", "数据报表"],
              ["excel", "Excel 表格"],
              ["mail", "邮件工作台"],
              ["code", "VS Code"],
              ["idea", "IntelliJ IDEA"],
              ["metrics", "经营分析"],
            ]}
          />
        </label>
        <Toggle
          label="启用 Shift 冲刺"
          desc="默认 空格 / 鼠标右键冲刺，避免反复 Shift 切换输入法；启用后兼容 Shift。"
          checked={settings.shiftDash}
          onChange={(v) => update({ shiftDash: v })}
        />
        <Toggle
          label="伤害数字"
          desc="显示每次命中的实际伤害"
          checked={settings.showDamage}
          onChange={(v) => update({ showDamage: v })}
        />
        <p className="inline-note">
          <Icon name="help" />
          默认解除60帧限制。144Hz以上显示器才能显示相应帧率；右下角显示真实绘制帧率。高分屏较吃GPU时，可选择均衡画质。
        </p>
      </div>
      <div className="settings-group">
        <h3>
          <Icon name="volume" />
          声音与操作
        </h3>
        <Toggle
          label="游戏音效"
          desc="轻量合成音效，默认静音"
          checked={settings.sound}
          onChange={(v) => update({ sound: v })}
        />
        <label className="range-row">
          <span>
            音量 <b>{Math.round(settings.volume * 100)}%</b>
          </span>
          <input
            aria-label="音量"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.volume}
            onChange={(e) => update({ volume: +e.target.value })}
          />
        </label>
        <Toggle
          label="自动开火 · T"
          desc="T 一键切换；输入聊天和设置时不触发"
          checked={settings.autoFire}
          onChange={(v) => update({ autoFire: v })}
        />
        <Toggle
          label="减少动态效果"
          desc="降低环境动画，保留战斗提示"
          checked={settings.lowMotion}
          onChange={(v) => update({ lowMotion: v })}
        />
      </div>
      <div className="settings-group">
        <h3>
          <Icon name="window" />
          独立窗口与隐藏
        </h3>
        <p className="inline-note">
          <Icon name="window" />
          真正无边框：运行 Start-Transparent.cmd。桌面版没有系统标题栏；F4
          可切换工具栏自动收起。浏览器画中画/弹窗保留浏览器的系统外框。
        </p>
        <Toggle
          label="迷你模式"
          desc="隐藏导航与侧栏，适合放在屏幕角落 · F9"
          checked={settings.compact}
          onChange={(v) => update({ compact: v })}
        />
        <label className="range-row">
          <span>
            窗口透明度 <b>{Math.round(settings.opacity * 100)}%</b>
          </span>
          <input
            aria-label="窗口透明度"
            type="range"
            min="0.25"
            max="1"
            step="0.05"
            value={settings.opacity}
            onChange={(e) => {
              const v = +e.target.value;
              update({ opacity: v });
              window.desktop?.setOpacity(v * settings.gameOpacity);
            }}
          />
        </label>
        {window.desktop ? (
          <>
            <Toggle
              label="窗口置顶"
              desc="让游戏停留在其他窗口上方"
              checked={pinned}
              onChange={(v) => {
                document.documentElement.dataset.pinned = String(v);
                setPinned(v);
                window.desktop?.setPinned(v);
                notify(v ? "已置顶" : "已取消置顶");
              }}
            />
            <button
              className="btn btn-secondary full"
              onClick={() => {
                window.desktop?.setPassthrough(true);
                notify("已启用鼠标穿透，Ctrl+Shift+X 恢复操作。");
              }}
            >
              <Icon name="eye" />
              开启鼠标穿透
            </button>
            <p className="fineprint">
              恢复操作：Ctrl + Shift + X；显示 / 隐藏窗口：Ctrl + Shift + B。
            </p>
          </>
        ) : (
          <p className="inline-note">
            <Icon name="help" />
            主界面点“独立小窗”可弹出画中画。小窗的减号或 F10
            可以隐藏，主页面点“展示游戏小窗”恢复。真正的透明度和全局恢复快捷键由桌面启动器提供。
          </p>
        )}
      </div>
      <button className="btn btn-primary full" onClick={onClose}>
        设置好了
        <Icon name="check" />
      </button>
    </Modal>
  );
}
export function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="同事之间，配合一下。"
      eyebrow="FIELD GUIDE / 行动指南"
      onClose={onClose}
      wide
    >
      <div className="guide-intro">
        <span className="guide-number">01—04</span>
        <p>
          创建小队，把房间码或邀请链接发给同事。
          <br />
          远征完成目标后前往出口；防守模式持续清剿敌潮，每5波有首领。
        </p>
      </div>
      <div className="key-grid">
        <div>
          <Key>W</Key>
          <Key>A</Key>
          <Key>S</Key>
          <Key>D</Key>
          <span>移动（也支持方向键）</span>
        </div>
        <div>
          <Key>空格 / 右键</Key>
          <span>冲刺 · 3 秒冷却 · 短暂无敌</span>
        </div>
        <div>
          <Key>Q</Key>
          <span>释放当前角色独有技能；随机攻击模块不会覆盖</span>
        </div>
        <div>
          <Key>E</Key>
          <span>按住操作终端 / 救援倒地队友</span>
        </div>
        <div>
          <Key>Space</Key>
          <span>攻击（默认已开启自动射击）</span>
        </div>
        <div>
          <Key>U</Key>
          <span>展开/收起快捷卡；1 / 2 / 3边移动边选择</span>
        </div>
        <div>
          <Key>H</Key>
          <span>倒地求救，5秒冷却</span>
        </div>
        <div>
          <Key>Enter</Key>
          <span>打开聊天，观战者也可发言</span>
        </div>
        <div>
          <Key>F6</Key>
          <span>独立小窗 / 返回主页面</span>
        </div>
        <div>
          <Key>F7</Key>
          <span>实时伤害排名</span>
        </div>
        <div>
          <Key>F2</Key>
          <span>高刷 / 画质与偏好设置</span>
        </div>
        <div>
          <Key>F4</Key>
          <span>无边框工具栏：自动收起 / 常驻</span>
        </div>
        <div>
          <Key>F8</Key>
          <span>工作面板 · 切换不暂停联机</span>
        </div>
        <div>
          <Key>F10</Key>
          <span>隐藏 / 展示游戏 · 独立小窗可返回主页面恢复</span>
        </div>
        <div>
          <Key>F9</Key>
          <span>迷你窗口模式</span>
        </div>
        <div>
          <Key>M</Key>
          <span>快速静音 / 开启音效</span>
        </div>
      </div>
      <div className="guide-roles">
        {(Object.keys(ROLES) as Role[]).map((role) => (
          <div key={role}>
            <Avatar role={role} size={35} />
            <strong style={{ color: ROLES[role].color }}>
              {ROLES[role].name}
            </strong>
            <small>{ROLES[role].desc} · 主动异能本局随机</small>
          </div>
        ))}
      </div>
      <p className="inline-note">
        <Icon name="heart" />
        倒地按H求救；队友靠近按住E救援，或使用应急修复。全队倒地结束本局。U打开随机强化，Enter打开聊天；战斗和观战均可发言。夺回下班权六章，园区发癫局无限波次。
      </p>
      <button className="btn btn-primary full" onClick={onClose}>
        收到，出发
        <Icon name="arrow" />
      </button>
    </Modal>
  );
}
export function ArchivePanel({
  records,
  onClose,
}: {
  records: Records;
  onClose: () => void;
}) {
  const achievements = [
    {
      name: "第一天外勤",
      desc: "完成第一次行动",
      icon: "compass",
      done: records.runs > 0,
    },
    {
      name: "准点下班",
      desc: "击败暴走总监，完成全部六章",
      icon: "trophy",
      done: records.wins > 0,
    },
    {
      name: "同事的光",
      desc: "成功救援一名队友",
      icon: "heart",
      done: records.rescues > 0,
    },
    {
      name: "通道清障员",
      desc: "累计击败 50 个敌人",
      icon: "leaf",
      done: records.kills >= 50,
    },
    {
      name: "门禁回收员",
      desc: "累计回收 30 张门禁卡",
      icon: "bolt",
      done: records.crystals >= 30,
    },
    {
      name: "深入夜色",
      desc: "抵达地下停车场",
      icon: "moon",
      done: records.highestMission >= 5,
    },
  ];
  return (
    <Modal
      title="每一次出发，都算数。"
      eyebrow="YOUR FIELD NOTES / 个人档案"
      onClose={onClose}
      wide
    >
      <div className="record-grid">
        {[
          [records.runs, "行动次数"],
          [records.wins, "成功下班"],
          [records.kills, "小队击败"],
          [records.rescues, "小队救援"],
        ].map(([n, l]) => (
          <div key={l}>
            <strong>{String(n).padStart(2, "0")}</strong>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <h3 className="section-label">
        行动纪念 <small>{achievements.filter((a) => a.done).length} / 6</small>
      </h3>
      <div className="achievement-grid">
        {achievements.map((a) => (
          <div
            key={a.name}
            className={"achievement " + (a.done ? "unlocked" : "")}
          >
            <span>
              <Icon name={a.icon} size={22} />
            </span>
            <div>
              <strong>{a.name}</strong>
              <small>{a.desc}</small>
            </div>
            {a.done && <Icon name="check" size={14} />}
          </div>
        ))}
      </div>
      <p className="fineprint">
        档案保存在当前浏览器。本局结束时记录小队成绩；清除浏览器数据会重置档案。
      </p>
    </Modal>
  );
}
export function MissionPanel({
  index,
  onClose,
}: {
  index: number;
  onClose: () => void;
}) {
  const m = MISSIONS[index];
  return (
    <Modal
      title={m.title}
      eyebrow={`MISSION ${String(index + 1).padStart(2, "0")} / ${m.area}`}
      onClose={onClose}
    >
      <div
        className="mission-art"
        style={{ "--mission-color": m.color } as React.CSSProperties}
      >
        <Icon
          name={
            m.type === "boss"
              ? "target"
              : m.type === "relay"
                ? "bolt"
                : m.type === "escort"
                  ? "shield"
                  : "leaf"
          }
          size={70}
        />
        <span>{String(index + 1).padStart(2, "0")}</span>
        <small>{m.en}</small>
      </div>
      <p className="mission-quote">{m.subtitle}</p>
      <p className="body-copy">{m.brief}</p>
      <div className="mission-facts">
        <span>
          任务目标<strong>{m.objective}</strong>
        </span>
        <span>
          挑战等级<strong>{m.difficulty}</strong>
        </span>
        <span>
          关卡奖励<strong>强化补给 + 共享零件</strong>
        </span>
      </div>
      <button className="btn btn-primary full" onClick={onClose}>
        了解任务
        <Icon name="check" />
      </button>
    </Modal>
  );
}
