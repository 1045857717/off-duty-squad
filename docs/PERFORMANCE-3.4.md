# 3.4 性能与动作验收

2026-10-22，Windows / NVIDIA RTX4060Laptop / Chromium / Electron。本机短时6–8秒样本，非所有硬件的最低帧率保证。

| 场景 | FPS | 结果 |
|---|---:|---|
| 普通144档 | 144.04 | DPR2，57/57实际渲染采样有移动，128种腿部姿态 |
| 默认浏览器场景 | 143.39 | P95 7.3ms，0长任务，隐藏后0帧 |
| 实际Windows便携小窗 | 143.33 | 860帧/6秒，660px画布，原生整窗透明度0.43 |
| 4人/150怪/DPR2/每人16模块 | 79.45 | P95 17.7ms，小窗78.20FPS，未达到144 |
| 4人/150怪/DPR2/每人4模块 | 79.26 | P95 17.4ms，小窗91.78FPS，未达到144 |
| Document PiP后台 | 126 | 相同玩家、主画布销毁，小窗可见 |

16模块为超正式4模块上限的压力夹具；4模块同样满级，150个目标持续存活并能攻击。渲染吞吐解除显示同步，普通页面受显示合成器限制。不能把普通144档当成高密度场景也达标。

原144门槛仍保留在tests/stress.ts，实际失败记录见3.4-stress-target-failed.txt和3.4-flat-stress-target-failed.txt。最后的记录运行明确设置MIN_FPS=1以保存小窗数字；JSON标注recordOnlyRun=true、meets144=false。这不是降低目标后宣称通过。

## 动作与开销处理

- 上斜后视角改为真实新素材，14部位父子关节，而不是把正背面左右挪动。
- 动作时间线避免高攻速重置，起手与收招用连续曲线融入行走，敌人前摇在快照间插值。
- 所有基础身体和职业/敌人道具打入单一GPU图集，静态部件复用。
- 关节矩阵展开为平铺图像，减少多层容器遍历；剔除屏外敌人的关节更新。
- 保留上一版伤害数字字体图集、特效池、屏外剔除和普通命中预算。

完整关节的密集场景仍有性能开销。不同测试运行时段、主机负载和场景状态不同，不据此宣称固定百分比加速，也不沿用3.2历史194FPS作为当前结果。

## 复测

```powershell
npm run check
npm run test:feedback
npm run test:quality
npm run test:performance
$env:FULL_ARSENAL='1'
$env:ENEMY_COUNT='150'
$env:BENCHMARK_UNCAPPED='1'
npm run test:stress
# 正式模块数：另设 STRESS_MODULES=4
```

先启动服务（默认localhost3000，可用GAME_BASE_URL指定）。PLAYWRIGHT_BROWSER可指定已有Chromium。重型测试应串行运行。原始JSON包含3.4-quality/performance/native-verification/stress-16modules/stress-4modules，以及16攻击、28职业和7敌人的逐项检查记录。
