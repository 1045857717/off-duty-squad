> 当前3.2请查看 [RELEASE-3.2.md](RELEASE-3.2.md)、[DESIGN-3.2.md](DESIGN-3.2.md)、[PERFORMANCE-3.2.md](PERFORMANCE-3.2.md)。以下为历史记录。

# 1.2 高刷新率、画质与窗口实测

日期：2026-10-20（Asia/Shanghai）。硬件环境中系统报告 NVIDIA GeForce RTX4060 Laptop GPU / 240Hz 主屏，以及一个144Hz虚拟显示器。浏览器测试采用 Chromium，桌面测试采用 Electron。所有FPS来自真实WebGL renderer的render调用计数除以实际时间，不以网络tick数或人为计时器计数充当FPS。

| 场景 | 采样 | 实测 FPS | 备注 |
|---|---|---:|---|
| 普通战斗，1440×1000 | 8 秒 | 237.6 | 文字/命中数字按需更新，非每帧重绘，长任务0 |
| 4玩家、20敌人、2倍DPI | 6 秒 | 236.9 | 固定服务器测试夹具，敌人延长存活以保持负载 |
| 同一密集场景，900×600小窗、显示伤害榜 | 3 秒 | 236.0 | 实际画布1800×1200；工具栏收起 |
| 原生透明无边框660×450窗口 | 6 秒 | 238.0 | Electron，系统DPI1.5，画布990像素宽 |
| 144 FPS上限选项 | 3 秒 | 142.6 | 这是可选上限；默认不设置上限 |

帧间隔：密集战斗P95约4.80ms。上述数据是本机短时测试，不保证低配GPU、60Hz显示器、远程桌面或浏览器软件渲染环境达到144FPS。默认高刷模式跟随显示器/浏览器requestAnimationFrame；没有60帧软件锁。

## 流畅度与清晰度

- 本人移动按当前输入立即预测，服务器约60Hz模拟/30Hz广播，按权威位置纠偏。
- 连续移动采样中，60 / 60 帧有位移，消除高FPS下人物仍按快照阶梯跳动的情况。测试不包含走到墙上停止的片段。
- 8方向×24帧图集，实际浏览器验证可观察到多个步态帧和方向切换；武器、枪口、残影、命中、施法、机器人/晶体动画由时间或实际移动距离驱动。
- 高DPI测试中canvas物理宽度/显示宽度为2；均衡模式降到1以减少GPU填充。高分资源保持2x，材质/角色无需每帧重新生成。
- FramePacer保留小数帧预算；单元测试在240Hz时钟驱动下144档10秒约1440次绘制，避免直接清空余数导致降到120。
- 关闭伤害榜背景模糊，避免透明面板引入高成本的背景重绘。

## 实际伤害与动作事件

统一服务器伤害入口只累计敌人实际剩余HP，工程师范围技能逐目标累计。客户端只展示服务器数据。每次命中有全局唯一事件id，用于伤害数字；测试防止重复命中同一敌人时丢失后续数字。技能和冲刺事件在输入限流时保留，快速按Q与移动同包/相邻包也不会丢失。

## 无边框确认

桌面构造使用frame:false、thickFrame:false、roundedCorners:false、hasShadow:false，无菜单/系统标题栏。烟雾测试的外框661×451、内容660×450存在1px DPI舍入，menuVisible=false。顶部自定义工具栏默认自动收起，F4常驻、悬停可拖动；页面游戏区域border-width=0、border-radius=0已在浏览器测试确认。

浏览器画中画/弹窗外框由浏览器管理。真正在桌面上无系统边框，运行Start-Transparent.cmd。网页里没有用伪装边框的方式声称已删除浏览器窗口外框。

## 重现命令

```powershell
npm start
# 另开终端
$env:MIN_FPS='144'
npm run test:performance
npm run test:stress
npm run test:quality
npm run test:browser
npm run test:windows
npm run test:pip
npm run desktop:performance
```

`PLAYWRIGHT_BROWSER`可选择现有Chromium路径，`GAME_BASE_URL`选择目标服务。`test:stress`自行启动独立测试服务器，测试状态只通过进程内引用构造，不向正式服务暴露调试API。`test:pip`需要有图形界面的Chromium。移除MIN_FPS后，普通性能测试会参照实测显示帧率选择适当阈值；60Hz电脑不应被误报为144FPS。
