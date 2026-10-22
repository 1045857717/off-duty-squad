# 带薪摸鱼 / Paid Break Crew 3.9.0

当前名称按作者指定使用「带薪摸鱼」。标题延续「班是公司的，鱼是自己的。」；公共聊天欢迎语换为「工资照领，摸鱼搭子先到位。」咖啡二维码仍只在 GitHub 文档。

## 操作与战斗

- F9：网页内520×350低调视图；Windows原生无边框窗同尺寸。工具栏自动收起、静音、窗口标题「状态面板」，F9恢复。F6继续显式打开画中画/独立浏览器窗口，使用同一玩家会话。网页无法移除浏览器或系统强制显示的边框，也无法让背后的其他应用透过普通网页。
- 世界生命条本机76px、队友64px；下方生命栏126px，小窗102px。血量、护盾、损血拖尾保留。构筑模块和战斗状态由同一容器排版，详情向上展开。
- 普攻发力不再拖动整个人和脚底；后坐由肩肘吸收，工具显示比例固定；职业Q与普攻姿势按权重混合，避免双重抬臂叠加。
- 七种敌人全部使用独立丧尸部件，包含下颌在内15关节；不再把职业人物图换个道具当敌人。爬行尸、快跑尸、重装尸、酸液喷吐尸、嚎叫尸、膨胀自爆尸与巨饼尸王各有轮廓、配色和步幅。移动、蓄力、攻击、收招、受击及死亡按连续曲线驱动；仅自爆保留地面红圈。图鉴共用实际模型。
- 删除7套不再显示的旧敌人整图序列帧及其逐帧开销；所有关节仍共用一个3840×3808GPU图集。敌人使用Phaser直接顶点批次，圆形/圆弧特效减少重复三角剖分，提示层减少布局读写；保留完整逐帧关节插值。攻击特效区分挥爪、重砸、酸液喷吐和嚎叫。

## Repository and release policy

Main requires a PR, up-to-date required CI and resolved conversations; administrators follow the same policy. Force pushes and branch deletion are blocked. No self-approval is required for this solo-maintainer repository. CI includes source/build checks, a source-only container smoke test and the actual browser combat/quiet-window regression.

After this release is verified, the GitHub Releases list retains this version only. Historical Git tags and versioned Docker images remain available. Source history and persistent game data are not pruned.

## 验证 / Validation

Validation evidence is recorded after running the actual build, tests, browser/multiplayer checks, native desktop smoke and published-image verification. Performance figures must distinguish the machine/display-bound test from an explicitly uncapped laboratory run; no universal144FPS guarantee is implied.

已知性能边界：固定种子3900、四人四高等级模块、100敌人、DPR2的主界面样本约138–153FPS，同局低调视图样本约123–186FPS，仍存在未过严格144门槛的样本（均为显式解除浏览器同步限制的实验配置）。详见[性能报告](PERFORMANCE-3.9.md)。
