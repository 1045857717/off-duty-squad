# Office Odyssey Implementation Plan

Goal: 整体更换为统一办公室奇谭风格，修复反向特效，保证每个职业动作与机制相符。
Architecture: Phaser共享图集与骨骼、React操作界面、权威服务器保持；战斗几何作为独立纯函数，原生Canvas素材可编辑。
Tech Stack: Phaser3.90, React19, TypeScript, Socket.IO.

- [x] tests/basics.test.ts：新增转向蓄力判定回归，先观察失败，再server/simulation.ts修复捕获角度。
- [x] src/game/combatGeometry.ts 与 combatTextures40.ts：统一+X原始朝向；tests/combat-direction.test.ts测8方向前扇区与范围/护盾语义。
- [x] src/game/humanArt40.ts、RigAtlas.ts：同一分件构造绘制8种职业体型，正侧背6视图、14关节；角色影像与特效不混用旧AI贴图。
- [x] StationScene.ts、joints.ts：攻击朝向锁定/接触恢复，射弹形态与武器相符，合理深度。
- [x] UI助手负责src根目录tsx/css，敌人助手负责zombieRig/ArticulatedActor敌人分支，场景助手负责officeMap/abyssArt。互斥文件范围。
- [x] 集成后npm run check，全部相关浏览器套件，多客户端/观战与小窗，8方向实际效果截图、参考性能。
- [x] docs当前版本、README双语、素材来源与验证报告。受保护PR经CI后常规合并，正式Release和Docker按验证结果发布。
