# 4.0 美术与攻击呈现

## 风格与参考

办公室奇谭采用有边线的硬边色块、纸张/搪瓷/旧黄铜与有限阴影，角色和敌人的高频细节集中于脸、工具、领口和攻击部位，地面降低噪声。参考《咒语旅团》的轮廓和多人战斗可读性，不复制其素材、角色、地图或商标。

- 官方参考：https://store.steampowered.com/app/2904000?l=schinese
- 开发者访谈：https://80.lv/articles/developing-the-spell-brigade-online-co-op-action-game-about-wizards
- 去模板化UI方法：https://github.com/pbakaus/impeccable ，本地已安装技能，结合game-art/2d-games/ui-ux-pro-max/systematic-debugging。它是设计方法，不是自动滤镜。

## 资产与管线

本轮使用项目原生可编辑Canvas素材代码，运行时一次烘焙进入Phaser纹理。未调用图片模型；本工具面没有内置image_gen，未使用未经用户确认的CLI替代，也不把代码素材宣称为AI生成PNG。

- humanArt40.ts：8人物体型×6视图×14关节=672帧，前/侧/后斜方向分别绘制；头像复用同一素材。
- professionTools40.ts：28职业办公工具与分型投射物；普通攻击/模块拥有不同显示来源，工具始终跟随真实手腕。
- officeEnemies40.ts + zombieRig.ts：7类×6视图×15关节=630帧；纸魔、打印机、柜体、幽灵、咖啡罐与丧尸共存。
- RigAtlas.ts：3840×4032共享图集，保留敌人WebGL关节quad批处理；Canvas后备路径继续支持。
- combatTextures40.ts：各特效按同一+X方向构造，固定图集与粒子池，不按帧生成纹理。持续AoE两张缓存贴图按服务端半径显示。
- environment40.ts + officeMap.ts：程序化分块一次烘焙，固体家具受原碰撞足迹限制，路径与世界数据不变。
- odyssey40.css：替换视觉世界的统一主题；工作模拟保留编辑器语汇。Noto Serif SC标题字子集本地自托管，许可证见public/fonts。

## 方向和动作回归

新回归覆盖八方向的前扇区、蓄力后转身命中一致、接触瞬间工具朝向、真实浏览器握点误差与伤害。普通攻击锁定服务端起手角度，身体、投射物、伤害和特效共用；Q施法身体和工具按同一权重混合，避免上半身一种动作、工具另一种动作。

敌人15关节在移动、蓄力、接触、收势、受击和死亡都更新。新死亡先保留完整形体，再渐隐；测试通过Scene postupdate捕获实际渐隐帧，不用固定sleep误取第一帧。

详见 tests/browser-art40.ts、tests/art40-rig-audit.mjs、tests/browser-clarity.ts、tests/browser-feedback.ts 和 tests/browser-quiet-undead.ts。原始报告在test-results，正式选取结果见validation-4.0.json。

[English](ART-4.0.en.md) · [逐职业数据](COMBAT-4.0.md)


性能实现补充 / Rendering budget: 角色关节、28职业工具、16模块工具及22类弹道共用同一图集；尾迹随弹体一张quad绘制，六类粒子合并到小图集。小血条使用八边斜角和直接三角形，避免每帧对圆角面板进行密集Earcut。未降低DPR、敌人数或压力阈值。


战斗信息：本机完整数字条、健康队友细条、危急/倒地完整信息，以及近处健康名字柔和淡出，避免小队堆叠时挡住人物动作；倒地/救起转动平滑过渡。README主要对局图由真实本地UI流程、1人+3个服务端AI生成，没有注入假血量；材质/护盾等验收夹具另行标注。
