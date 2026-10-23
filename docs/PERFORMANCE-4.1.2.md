# 4.1.2：视口剔除、联机平滑与性能指示

本次根据代码审计和四个独立 Chromium 玩家的对照测试进行优化。测试玩家通过实际界面创建、入房、准备、选技能，持续移动、冲刺和攻击。固定视口 1366×768，DPR 2，保留游戏 144 帧上限与高画质。每阶段测量 10 秒，预热 2 秒。

## 确认的问题

4.1.1 已经有敌人骨骼的部分屏幕外剔除、30Hz 压缩状态广播与位置平滑。原实现仍会给屏幕外敌人创建两套朝向骨骼并逐帧预测位置；弹丸和掉落物也没有完整的提前剔除。

旧测试的 150 敌人分布在整张地图里，同屏通常只有约 50。本轮增加 `BENCH_CLUSTER=1`，在同样随机种子下把敌人集中到玩家周围，原始记录确认首端采样中有 147–150 个敌人中心位于视口内。敌人被固定为高生命、零移动速度，每个玩家配四个八级模块，以保持负载；这属于合成渲染测试，不能作为生存成绩或普通开局表现。

## 实现

- 在创建敌人骨骼、计算位置之前检查带安全边距的视口；弹丸在创建、更新外观之前剔除；掉落物按视口创建。权威模拟、伤害和全局敌人状态继续完整运行，观战与全局 BOSS 血条不受影响。
- 远端角色保存最多六个位置样本，以约 50ms 缓冲进行插值；自己的移动、冲刺仍即时预测。缓冲耗尽后停留于最后确认的位置，避免外推穿墙和晚到包造成的回拉。插值经过新障碍时使用权威位置；传送、重开和切图清理历史。
- 正常场景目标仍为 30Hz；对局中达到 100 敌人、200 弹丸或 150 特效任一阈值时，将视觉状态广播预算设为 20Hz，并保留约三秒恢复滞后，避免频率反复切换。战斗模拟仍为 60Hz；加入、恢复身份、完整地图更新与可靠操作回复独立发送。后续快照继续使用 volatile 发送，避免可靠队列积压。
- 游戏画面直接显示实际 FPS 与 RTT，RTT 来自客户端到游戏服务的往返探测。每三秒一次探测，HUD 每秒刷新；未测得、超时、过期与断线显示 `—` 和文字状态，不保留旧的绿色数值。低帧率与延迟的颜色之外都有文字，手机与小窗均验证可读。

## 四端复测结果

| 条件 | 四端实际渲染 FPS 范围 | 最差 P95 帧间隔 | 四端合计实际 TCP 发送 |
| --- | --- | --- | --- |
| 4.1.1，150 敌人密集同屏 | 93.08–96.57 | 18.0ms | 3.225 MB/s |
| 仅剔除与插值，仍为 30Hz | 95.48–97.75 | 17.8ms | 3.220 MB/s |
| 4.1.2，增加重负载广播预算 | 105.45–109.74 | 16.9ms | 2.172 MB/s |
| 4.1.2，6 敌人及四人满模块 | 143.94–144.05 | 10.1ms | 0.833 MB/s |

每行来自一个有界测试阶段，不能当作统计置信区间；中间版本只有小幅差异。完整改动的重负载样本相对基线观测到约 13–14% 的帧率提升，实际 TCP 流量减少约 32.6%。这仍未让四份共享 GPU 的极端同屏画面达到 144 FPS。帧内渲染与可见骨骼提交仍有成本；本轮没有通过降低分辨率、简化模型或减少动画帧来制造结果。

重负载快照实际到达约 19.5–19.6Hz（目标 20Hz），最差 P95 到达间隔约 71.8ms；比基线 30Hz 的间隔更长，是减小同步开销的明确取舍。50ms 远端缓冲覆盖常规间隔，晚到时保持最后已确认的位置；丢包或长停顿仍可能出现短暂停留。自己的移动、冲刺不经过远端缓冲。

结构化结果、四端各自帧时间、可见实体数与清理结果见 [multiplayer-4.1.2.json](multiplayer-4.1.2.json)。

## 复现

```bash
npm ci
npm run check
npm run test:viewport
npm run test:network-hud
BENCH_CLUSTER=1 npm run test:multiplayer -- --seconds 10 --warmup-seconds 2
```

PowerShell 使用 `$env:BENCH_CLUSTER='1'` 后再执行相同 npm 命令。`PLAYWRIGHT_BROWSER` 可指定已有 Chromium。省略 `BENCH_CLUSTER` 保持原先分散敌人的对照场景。原始输出位于 `test-results/multiplayer411/<run-id>/`；该历史目录名沿用工具名称，不表示当前构建仍为 4.1.1。

默认四浏览器工具解除 Chromium 自身的 vsync/帧率限制，测量经过游戏 FramePacer 后的真实 WebGL 渲染提交吞吐；这不是物理显示器 144Hz 验收。添加 `--display-paced` 可测试普通浏览器调度。四个实例共享本机 CPU、GPU，因此结果包含资源争用。帧内时间测量的是 CPU 侧引擎与 WebGL 提交，并非 GPU 完成或屏幕扫描时间。

## 验证边界与部署

浏览器回归覆盖 150 个屏幕外敌人、弹丸和掉落物不分配绘制对象，进入/离开/再次进入视口、屏幕外死亡、切图与预览动画。网络回归覆盖延迟分级、超时、过期、重连、隐藏与窗口移交、每秒发布和输入法。模拟与同步测试继续验证伤害、联机与分支兼容性。

2026-10-23 检查线上 `https://moyu.xiebc.com/api/health` 仍返回 4.1.0；4.1.1 压缩及本次修改需要服务器更新后生效。线上具体瓶颈仍需要在卡顿时结合 FPS、RTT、容器 CPU 和带宽判断。RTT 包含服务端处理/排队，不能仅凭 RTT 高就认定是玩家网络问题。

更新容器会结束内存中的对局；排行榜继续使用原有命名卷。保留固定版本镜像，避免删除数据卷。

## English

This patch completes conservative client visibility culling, adds a bounded 50ms remote interpolation buffer with hold-on-exhaustion behavior, and retains immediate local movement/dash prediction. Normal snapshot targets remain 30Hz; dense playing states use a 20Hz visual snapshot budget with recovery hysteresis while authoritative combat continues at 60Hz. Reliable actions, joining and full world changes are not delayed by this scheduler.

The in-game meter shows actual rendered FPS alongside measured application RTT, including explicit unknown, stale/no-response and disconnected states. Regressions cover visibility entry/exit/reset, real acknowledgement delays/timeouts/reconnects and responsive HUD layouts.

Four independent browsers are measured at DPR2 with 147–150 enemy centers visible in the clustered fixture. The fixture is synthetic, shares one GPU, and measures unconstrained rendering submissions after the game's frame cap; it does not establish physical 144Hz scanout or ordinary survival performance. Production remained on 4.1.0 at the recorded health check, so deployment is required before judging the online effect.


The clustered four-browser sample improved from 93.08–96.57 to 105.45–109.74 rendered FPS; aggregate measured TCP output fell from 3.225 to 2.172 MB/s (about 32.6%). These are bounded single-run observations, not confidence intervals or a claim of sustained physical 144Hz. The 20Hz budget increases snapshot intervals; local input remains predicted and remote motion uses the bounded buffer described above.
