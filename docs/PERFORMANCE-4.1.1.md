# v4.1.1 · 后期同步卡顿排查 / Late-run transport performance

在线试玩 / Play online: [moyu.xiebc.com](https://moyu.xiebc.com).

## 问题与修复

v4.1.0 在首次世界快照之后，以目标 30Hz 广播动态状态。后期敌人、弹幕和特效增加时，JSON 包会随之增长。原版未启用 WebSocket 帧压缩，普通 HTTP gzip 不适用于这个连接。

v4.1.1 对支持压缩的客户端启用 WebSocket deflate：阈值 1024 字节、压缩级别 1、并发上限 4，并禁用上下文接管以限制跨帧压缩历史。未协商压缩的客户端仍可正常接收 JSON。

另将传输副本中的敌人、弹丸、特效和掉落物坐标收敛到小数点后两位，角度保留四位、速度保留三位。坐标误差不超过 0.00501 个世界像素，角度误差不超过 0.000051 弧度。服务器原始状态、血量、伤害、冷却与攻击计时、碰撞及成长计算不变；模拟仍以 60Hz 为目标，广播仍以 30Hz 为目标，动画质量没有降级。

## 测量方法与证据

运行 `npm run test:transport`。测试启动真实游戏服务器和四个真实 Socket.IO WebSocket 客户端，使用种子固定的 150 个敌人、350 个弹丸快照。三个客户端协商压缩，一个明确关闭压缩。固定快照用来隔离编码与传输量，持续战斗另用下述浏览器压测验证。

握手预热后，读取实际 TCP 连接收取的字节数。记录包含 WebSocket 帧开销，不包含 TLS 开销。该次同机样本为：

| 16 帧 / 16 frames                |    v4.1.0 |    v4.1.1 |
| -------------------------------- | --------: | --------: |
| 解码后的 JSON 字节               | 2,031,952 | 1,704,416 |
| 每个协商压缩客户端的实际传输字节 | 2,032,380 |   319,308 |

实际传输量减少约 **84.3%**。这是指定压力样本的结果，不代表线上每个场景的带宽。回归测试还验证权威状态未被序列化修改、生命与伤害等值保持一致、压缩关闭兼容、延迟探测和房间请求正常。

## 持续战斗压测

使用 `npm run test:stress`，并设置 `FULL_ARSENAL=1`、`STRESS_MODULES=4`、`ENEMY_COUNT=150`、`STRESS_SEED=3900` 和 `STRESS_SECONDS=90`。该夹具使用四个受保护玩家及高生命敌人保持负载稳定，不代表真实玩家生存成绩。

`MIN_FPS` 应匹配实际显示环境。60Hz 无头合成器不能证明 144Hz 显示表现；`BENCHMARK_UNCAPPED=1` 用于吞吐实验，不能作为显示器达到 144Hz 的证据。

本地当前 60Hz 环境的 90 秒样本平均约 58.93 FPS，P95 帧间隔 18.3ms，小窗约 58.61 FPS。该次测量期间有四个玩家、150 个敌人、每人四个模块。结构化记录见 [performance-4.1.1.json](performance-4.1.1.json)。

## 线上诊断边界

压缩能减少传输占用，但不能保证消除所有卡顿。服务器 CPU、内存和出口带宽、玩家网络、客户端渲染都需要分别测量。卡顿时同时记录容器资源与浏览器 FPS、延迟；高 RTT 也可能包含服务器排队时间。

```bash
docker stats --no-stream off-duty-off-duty-1
free -h
uptime
docker logs --since 10m --tail 60 off-duty-off-duty-1
```

以上命令均只读。请在当前对局结束后更新固定 Docker 版本：更新会结束内存中的对局，排行榜继续保存在命名卷中。

## English

The original server sent uncompressed dynamic JSON snapshots. Dense matches therefore required substantially more bandwidth than opening waves. The patch enables negotiated low-cost WebSocket deflate with a bounded concurrency limit and no context takeover, and rounds visual coordinates only in transmitted copies. Authoritative combat values and the simulation/broadcast targets remain unchanged. Clients that opt out of compression remain compatible.

The four-client regression uses fixed, varied-position snapshots to isolate actual wire size. The measured 16-frame sample dropped from 2,032,380 to 319,308 bytes per compressed connection, about 84.3%. These are measured WebSocket bytes after handshake, excluding TLS. This result does not establish the user's exact production bottleneck; CPU load, uplink capacity, client frame time and latency still need to be correlated during the reported stutter.

Use the transport test and sustained browser fixture above to reproduce verification. An update ends active in-memory matches; retain the score volume and update after the current match ends.

## 四个真实浏览器的专项复测

四个独立 Chromium 进程、四份隔离存储、四个真实玩家身份与四个 Phaser 渲染器。全部通过真实界面入房/准备/选技能，并持续使用 WASD、空格冲刺、自动攻击与职业Q。视口1366×768、DPR2，每个阶段采样12秒，原始结果保存在运行目录；公开精简结果见 [multiplayer-4.1.1.json](multiplayer-4.1.1.json)。

| 条件                                           | 四端实际渲染平均帧率范围 | 关键限制                                 |
| ---------------------------------------------- | ------------------------ | ---------------------------------------- |
| 本地4.1.1，解除浏览器限制，6敌人/四人各4模块   | 143.99–144.03 FPS        | 渲染吞吐实验，单机共享GPU                |
| 本地4.1.1，解除浏览器限制，150敌人/四人各4模块 | 127.32–132.75 FPS        | 全世界150敌人，不是同屏150；同机四份画面 |
| 公网4.1.0，解除浏览器限制，自然开局            | 143.41–143.82 FPS        | 此时生产服尚未安装补丁，非后期满构筑     |
| 本地4.1.1，普通浏览器显示节拍                  | 约59.5 FPS               | 实测RAF也约60Hz，不能作为144Hz显示验收   |

公网游戏RTT样本约59–78ms，状态约30Hz到达；四端最差P95同步间隔42.64ms，单端曾出现约200ms间隔。同期HTTP健康接口83次采样无失败，中位76.59ms、P95约86.51ms。这个短时开局样本没有重现持续网络拥塞，不能用它断言后期一定没有带宽、服务器或客户端问题。

本机密集场景的Phaser帧内工作P95约5.0–5.2ms。四个浏览器共享一块GPU会引入额外争用；单渲染器+三个协议同伴的独立对照约239.58FPS，这一项明确不算四浏览器证据。驱动报告240Hz，但当前桌面会话连原生空白浏览器也只有约57–60Hz调度；报告保留该限制，不把解除限帧的提交次数称为物理144Hz显示通过。

因此目前确认并修复的是原始状态同步占用过大的隐患；保留了同机极端渲染压力和实际显示环境的限制。线上4.1.1的效果需要服务器升级后，在真实卡顿时段继续复测。

English: Four independent browser processes and real player identities were tested with actual keyboard movement, attacks and dashes. Display-unconstrained throughput and ordinary browser scheduling are reported separately. The local dense fixture reached127.32–132.75FPS per window on a shared GPU; a single-renderer control reached239.58FPS. The public4.1.0 opening sample averaged143.41–143.82FPS but is neither a patched-production nor late-game result. The current desktop session provides about60Hz RAF even with a driver-reported240Hz panel. No physical144Hz scanout claim is made. Authoritative150-enemy population includes offscreen entities; the fixture is not150 visible enemies. Production stutter still needs correlated during-match evidence after the update.
