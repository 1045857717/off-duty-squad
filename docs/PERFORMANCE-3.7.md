# 3.7 动作与帧率验收

日期：2026-10-22，Asia/Shanghai。[原始结果](validation-3.7.json) · [更新说明](RELEASE-3.7.md)

| 环境                                            | 实际游戏渲染FPS | RAF回调FPS | 说明                                            |
| ----------------------------------------------- | --------------: | ---------: | ----------------------------------------------- |
| Chromium无头默认刷新，DPR2                      |           59.55 |      59.55 | 独立空白页刷新基准约59.88Hz；游戏跟随该环境刷新 |
| 显式解除浏览器帧率/垂直同步限制的实验配置，DPR2 |          143.67 |     598.67 | 游戏设置144目标档位，调度与普通场景渲染预算检查 |

实验配置使用 Chromium 的 disable-frame-rate-limit / disable-gpu-vsync，仅用于本地测试，不改变产品默认配置。原生60Hz测试中渲染与回调一致；实验配置约144FPS。此处不代表所有显示器、设备、分辨率或密集怪潮均能稳定144FPS。

帧率验收先在空白页测独立刷新节奏，再加载游戏比较，避免把游戏自身变慢后的RAF当作更低的通过目标。普通场景实测不能替代密集场景压力测试。

动作验收检查真正的GPU图集/14关节模型：全部28职业在空随机技能栏下有可见普攻、连续手臂变化、贴手工具、正确绘制层级与实际伤害；16随机攻击和28职业Q分别回归；快速转身与走路不冻结。二维码原文件和实际界面预览均能解码。

## 复现

```bash
npm run browser:install
npm run test:clarity
npm run test:feel
npm run test:quality:local
# 可选实验：POSIX shell示例
BENCHMARK_UNCAPPED=1 npm run test:quality:local
```

PowerShell实验配置：

```powershell
$env:BENCHMARK_UNCAPPED='1'
npm run test:quality:local
Remove-Item Env:BENCHMARK_UNCAPPED
```

Published source includes a self-contained quality runner with its own temporary server. The normal headless environment measured approximately60FPS; the explicitly unrestricted Chromium laboratory measured approximately144FPS at DPR2. These results apply to the measured normal scene and are not a guarantee for dense encounters or all hardware.
