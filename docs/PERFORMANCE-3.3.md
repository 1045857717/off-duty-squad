# 3.3 性能与动作验收

2026-10-21，本机Windows / RTX4060Laptop / Chromium / Electron。每个场景短时采样约6–8秒。未模拟公网压力，不保证所有设备的最低帧率。

| 场景 | FPS | 帧间隔P95 / 结果 |
|---|---:|---|
| 144档普通场景 | 143.70 | 59/59实际渲染采样均在移动，127种腿部姿态 |
| 默认浏览器场景 | 143.16 | 7.4ms；0长任务；隐藏后0帧 |
| 实际打包Electron小窗 | 143.55 | 862帧/6秒；660×440画布 |
| 4人/150怪/DPR2/每人16模块 | 93.69 | 16.6ms；未达到144；小窗110.01FPS |
| 4人/150怪/DPR2/每人4模块 | 93.27 | 15.6ms；未达到144；小窗109.86FPS |

16模块是超出正式4模块限制的渲染夹具；4模块同样使用满级、150个持续存活且能攻击的敌人。数值来自解除显示同步的短时吞吐采样。144档与默认浏览器是普通局，不能和密集场景混为同一条件。

原默认144门槛仍保留在tests/stress.ts，真实失败日志3.3-stress-failed-target.txt已附。为获取完整场景与小窗数据，最终记录运行显式设置MIN_FPS=1，结果JSON明确标注meets144=false及recordOnlyRun=true。这不是把144性能验收改成通过。

## 根因调查与改动

1. 真实浏览器首先复现近怪/手动模式下朝向不变，修复输入分支；三个动作单元测试检查八向区分、攻击不冻结腿部、起停与帧率无关。
2. 从每次普通攻击替换整身图集，改为持续6关节动作，上半身后坐力/施法和腿部周期分别计算。约109个移动采样中108种腿部角度，含持续开火采样。
3. 性能剖析发现频繁伤害文本Canvas重绘及texImage2D上传。改用一次生成的共享BitmapText字体图集；保留整数伤害、金色暴击、字号差异和负伤害标记。普通场景采样textUpdates为0。
4. 剔除屏外伤害效果；特效超过65个时对普通命中闪光设置预算，保留暴击、玩家受击和自爆提示，不改变伤害结算。移除首次普通攻击生成整张施法图集的峰值。
5. 同时段恢复3.2代码并使用相同夹具复测也未达到144（61.18FPS）。这说明主机运行条件影响很大；不是严格隔离的A/B试验，不能据此断言速度提升百分比或全部下降均来自新动作。保留比较失败日志，避免使用历史时段数据替代当前验收。

## 复测

```powershell
npm run check
npm run test:polish
npm run test:turn
npm run test:quality
npm run test:performance
$env:FULL_ARSENAL='1'
$env:ENEMY_COUNT='150'
$env:BENCHMARK_UNCAPPED='1'
npm run test:stress
# 正式4模块压力：额外设置 STRESS_MODULES=4
```

浏览器复测需要先启动服务器，默认localhost3000，也可使用GAME_BASE_URL。指定PLAYWRIGHT_BROWSER可复用已有Chromium。重型测试应串行运行。原始数据见3.3-quality.json、3.3-performance.json、3.3-motion.json、3.3-native-verification.json、3.3-stress-16modules.json、3.3-stress-4modules.json。
