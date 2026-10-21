import { Modal, Key } from "./components";
import { Icon } from "./icons";
import { useState } from "react";
export function FieldGuide({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState("start");
  return (
    <Modal
      title="工友行动手册"
      eyebrow="FIELD MANUAL / 会走位，比会汇报重要"
      onClose={onClose}
      wide
    >
      <section className="field-guide">
        <nav role="tablist" aria-label="指南章节">
          {[
            ["start", "开局与联机", "users"],
            ["combat", "战斗与反馈", "target"],
            ["growth", "技能与成长", "sparkle"],
            ["keys", "快捷键", "terminal"],
          ].map(([id, label, icon]) => (
            <button
              role="tab"
              aria-selected={tab === id}
              key={id}
              onClick={() => setTab(id)}
            >
              <Icon name={icon} size={16} />
              {label}
            </button>
          ))}
        </nav>
        {tab === "start" ? (
          <>
            <header>
              <small>01 / 先把同事叫齐</small>
              <h3>同一个网址，同一个小队。</h3>
              <p>
                打开服务器公网网址，创建房间并分享邀请链接。房主不用准备，其他真人准备后由房主发起3秒倒计时；期间可以取消。
              </p>
            </header>
            <div className="guide-steps">
              {[
                [
                  "01",
                  "进入地图再选攻击",
                  "全员选完初始攻击，才会开始刷怪。提前在大厅刷卡没有用。",
                  "book",
                ],
                [
                  "02",
                  "选一种快乐",
                  "园区发癫局是无尽波次；夺回下班权是六章任务和撤离。",
                  "compass",
                ],
                [
                  "03",
                  "队员和观众都能聊",
                  "大厅茶水间与对局边缘消息分开；观众可发言，中途也能加入未满小队。",
                  "users",
                ],
              ].map(([n, title, desc, icon]) => (
                <article key={n}>
                  <span>{n}</span>
                  <Icon name={icon} size={22} />
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
            <aside className="guide-callout">
              <Icon name="bolt" size={21} />
              <p>
                邀请链接始终使用当前访问的服务器地址；部署后使用同一个HTTPS域名即可，不要求处于同一局域网。
              </p>
            </aside>
          </>
        ) : tab === "combat" ? (
          <>
            <header>
              <small>02 / 看懂对手，少吃闷棍</small>
              <h3>抬手是前摇，纸团是弹幕。</h3>
              <p>
                敌人先抬臂、蓄力或压低重心，出手后会有挥击、闪光和弹丸轨迹。只有自爆咖啡桶显示地面红圈。
              </p>
            </header>
            <div className="guide-feedback-grid">
              {[
                [
                  "shield",
                  "先看动作，再交冲刺",
                  "轮滑怪压低重心后会直冲；重装怪举高文件柜时离开原位。",
                ],
                [
                  "heart",
                  "挨打知道是谁",
                  "边缘闪光、来袭方向和伤害来源会一起出现；护盾受击使用蓝色反馈。",
                ],
                [
                  "tool",
                  "E失败会说明原因",
                  "距离不足、零件不够都有短促抖动和提示。按住E看到进度推进才算正在操作。",
                ],
                [
                  "users",
                  "倒了也能继续帮忙",
                  "倒地按H呼救，队友靠近按住E拉你起来。全员倒地直接进入结算。",
                ],
              ].map(([icon, title, desc]) => (
                <article key={title}>
                  <Icon name={icon} size={24} />
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
          </>
        ) : tab === "growth" ? (
          <>
            <header>
              <small>03 / 今天不升职，今天升级</small>
              <h3>职业Q固定，攻击自由搭。</h3>
              <p>
                升级提供适合当前构筑的随机三选一，按1/2/3选择；移动和冲刺照常。投射物强化只会在有对应攻击时出现。
              </p>
            </header>
            <div className="guide-steps">
              {[
                [
                  "Lv.1",
                  "拿一件趁手工具",
                  "枪械、拖把、扳手、咖啡都能打。最多同时带4个攻击模块。",
                ],
                [
                  "Lv.3",
                  "打开成长树",
                  "已有主干Lv.3且小队Lv.4后，才会开放关联技能。",
                ],
                [
                  "Lv.4 / 8",
                  "技能会变得更夸张",
                  "升级保留原有技能并提高强度，关键等级让范围、数量和特效一起进化。",
                ],
              ].map(([n, title, desc]) => (
                <article key={title}>
                  <span>{n}</span>
                  <Icon name="sparkle" size={21} />
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
            <aside className="guide-callout">
              <Icon name="book" size={22} />
              <p>
                左侧“图鉴”可查看7类敌人、16种攻击和28个职业的详细参数、躲法与关联成长分支。
              </p>
            </aside>
          </>
        ) : (
          <>
            <header>
              <small>04 / 少点菜单，多点走位</small>
              <h3>按键写清楚，操作不猜谜。</h3>
            </header>
            <div className="guide-keys">
              {[
                ["W / A / S / D", "移动，支持方向键"],
                ["空格 / 右键", "冲刺；Shift可在设置中额外开启"],
                ["鼠标左键", "手动攻击并朝鼠标瞄准"],
                ["T", "切换自动开火"],
                ["Q", "职业独有技能"],
                ["E", "按住交互或救援"],
                ["1 / 2 / 3", "选择强化卡"],
                ["U", "收起或展开强化卡"],
                ["H", "倒地呼救"],
                ["Enter", "聊天，发送后恢复操作"],
                ["F2 / F3", "设置 / 桌面端下载"],
                ["F6 / F9", "独立小窗 / 迷你模式"],
                ["F7", "伤害排名"],
                ["F8", "工作模式"],
                ["F10", "隐藏；网页主页面可恢复"],
                ["Ctrl+Shift+B", "桌面客户端全局恢复"],
              ].map(([key, desc]) => (
                <div key={key}>
                  <Key>{key}</Key>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <footer>
          <Icon name="cup" size={16} />
          <span>不是执行力差，是技能还在冷却。</span>
          <button onClick={onClose}>
            明白，去整活
            <Icon name="arrow" size={14} />
          </button>
        </footer>
      </section>
    </Modal>
  );
}
