# 4.1.3：为什么高刷仍显示 60，以及怎样区分网络问题

## 核实的情况

2026-10-26 检查正式站点已是 4.1.2。游戏的“高刷”设置没有固定 60 FPS 的代码上限：默认跟随浏览器原生 RAF，另有 60/144/165/240 上限；FramePacer 的回归覆盖 240Hz 回调下保留 144 帧信用。设置上限不能要求浏览器、显示合成器或显示设备提供更多显示机会。

本轮先做了两个独立对照：不加载游戏的五秒原生回调页面，以及真实 Socket.IO 连接上的发送与确认测试。普通有界面 Chromium 的空载参考为约 60 次/秒；这属于当前测试环境，不代表所有人的屏幕能力，也不是物理扫描刷新率认证。在被遮挡、节能或远程环境中，页面即使未报告隐藏也可能出现长调度停顿；参考页会保留真实数值并提示此样本不适合判断稳定刷新节奏。

## 修复了什么

1. **延迟探测误报。** 原探测使用 `volatile`。真实 SDK 在发送通道短暂 busy 时会直接丢弃这种消息，随后确认超时；这不等同于连接断开。回归用同一健康连接连续发送普通输入和探测，原逻辑超时、可靠确认正常。现在使用普通确认消息，保留 2.5 秒超时、三秒周期和单份待确认限制。
2. **连接兼容路径。** 原配置将 WebSocket 放在第一位，后面列出 polling，但没有真正启用首通道失败后尝试全部通道。现在先用 HTTP 建立，再升级 WebSocket，同时允许其他通道；升级被拒绝或悬挂时仍可继续通信。正常网络仍会升级为 WebSocket。额外 HTTP 请求主要发生在连接建立时。
3. **同步与 RTT 分开。** HUD 区分“探测超时”“同步稍慢”“同步停顿”和断线。F2 显示实际状态到达频率、距上份状态时间与间隔抖动。房间重连、从隐藏返回后若迟迟没有第一份状态，也有等待期限；未加入房间的大厅保持未测量。到包抖动是间隔的平均绝对偏差，不是丢包率。
4. **帧数统计更清楚。** 在同一个引擎回调里，分别记录 FramePacer 前的浏览器回调与之后完成的引擎步数，以及 CPU 帧内耗时。每秒发布、每组最多 256 个分位样本；隐藏、暂停和唤醒时重置。没有新建定时器刷假帧，也没有强制关闭垂直同步或修改系统设置。

## 怎么使用

按 F2 展开“帧率与联机诊断”。先看“设置目标”“浏览器回调”和“实际绘制”，然后在大厅或对局结束后运行“空载刷新测试”（联机对局不会暂停）。测试页与游戏应放在同一显示器，前台测量时避免其他高负载页面同时运行。

- 空载和游戏都约 60：检查 Windows 高级显示中的实际输出、Chrome 的节能与图形加速，以及远程/虚拟显示的限制。
- 空载明显较高，游戏较低：优先看游戏 CPU 帧内耗时、GPU 压力和高 DPI 像素填充，必要时使用均衡画质。
- RTT 健康但游戏同步停顿：说明状态流没有及时到达；网络、服务器排队和客户端任务都需要进一步区分。
- RTT 探测超时但状态仍连续到达：不应直接认定整个联机连接中断。

F2 可主动复制数值诊断。内容包含帧率、目标、计时样本、通道和同步统计，不包含角色昵称、房间码、玩家标识或会话令牌；没有自动上传。

## 公网短测与边界

对正式站点进行了 30 次只读应用层往返探测，中位约 **59.3ms**、P95 **93.7ms**、最大 **100.4ms**，无探测失败或断线。该测试处于大厅、没有密集战斗和渲染压力，不能证明用户整个对局都没有网络波动或服务器压力。RTT 也包含服务器处理与客户端排队，不能单独据此归因于运营商。

回归覆盖发送忙碌、WebSocket 不可用、升级悬挂、正常升级、房间首次状态超时、隐藏重置、60/144/240 回调计数、空载页面停止/重测/长停顿提示，以及真实浏览器的 HTTP 兼容通信。测试通过不是物理 144Hz 认证。四个独立浏览器的补充结果记录在下方或相邻 JSON 中。

## English

High-refresh mode is a render target; it cannot manufacture browser callbacks or establish physical panel refresh. The new F2 diagnostics separate actual drawing, browser callback cadence, configured cap, CPU step time, transport and state-stream arrivals. A standalone five-second native RAF page provides an empty-load comparison and flags long scheduling pauses without changing the measured result.

Reliable acknowledged latency probes replace volatile probes that could be discarded during temporary sender backpressure. Connections establish over HTTP and then upgrade to WebSocket, so rejected or hanging upgrades no longer block an otherwise healthy path. RTT timeouts are distinguished from missing game states, including a first-state deadline after room resume or visibility reset.

Thirty read-only public application pings measured median 59.3ms, P95 93.7ms and maximum 100.4ms with no failures. This lobby-only sample does not rule out dense-match network, server or client pressure. No forced uncapping flags or system-setting changes are applied to players.


## 四浏览器显示节奏对照

同一构建、四个独立 Chromium、1366×768 / DPR2、游戏上限144，真实键盘移动/冲刺/攻击，每阶段测量10秒、预热2秒。密集夹具中首端147–150个敌人中心在视口内，四人各四个八级模块，敌人高生命/零移动速度且玩家受保护；它是稳定合成负载，不是生存成绩。

| 浏览器条件 | 6敌人四端实际绘制范围 | 150敌人密集同屏四端范围 |
| --- | --- | --- |
| 普通显示节奏 | 59.267–59.269 FPS | 59.889–59.892 FPS |
| 测试进程解除浏览器vsync/限帧，游戏144上限保留 | 143.958–143.988 FPS | 142.963–144.108 FPS |

正常浏览器在当前测试环境按约60回调节奏运行；测试进程的解除限制仅用于确认引擎没有硬编码60上限，不作为真实显示144Hz验收，也不作为给用户强制打开的选项。四个浏览器共享同一GPU，跨日环境变化会影响结果，因此不将本轮数值相对4.1.2的差异称为性能优化幅度。

结构化数据见[performance-4.1.3.json](performance-4.1.3.json)。新HTTP建立后升级的连接方式也在四个独立玩家中验证，测试通过正常界面离房后清理，没有用伪造RAF或隐藏页面覆盖来计帧。
