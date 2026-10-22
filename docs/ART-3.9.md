# 3.9丧尸与动作实现 / Undead art and motion

本轮没有新增远程生图或第三方怪物包。丧尸以程序化Canvas绘制解剖部件，启动时烘焙进共享GPU图集，运行时由Phaser关节矩阵驱动。保留之前职业人物的合法素材与来源说明。

七种敌人各有衣着、腐化肤色、肩胯宽度、头部比例、伤口与工牌细节。爬行催办尸降低重心并弯曲髋膝；文件柜暴君和巨饼尸王加宽肩胯；酸吐打印尸张口蓄喉囊；晨会嚎叫尸展开上肢与下颌；咖啡膨胀尸腹囊随蓄力起伏。所有类型均有左右上臂/前臂/手、左右大腿/小腿/脚、躯干、头、下颌15个部件。

每个模型绘制6个实际视角，映射8方向。方向转换保持两层总透明度，75ms混合；动作使用连续相位与单调时钟。死亡先保存当前关节旋转，再按700ms曲线放松肢体和侧倒，不按帧率累乘衰减。图鉴使用同一绘制函数与关节姿势，避免文档、图鉴与对局模型不一致。

玩家攻击中脚底不随枪械后坐移动；肩、肘和躯干吸收发力。重砸的上臂旋转修正为真正抬腕到肩上，再向下收击。工具显示比例固定；Q按动作族与普通攻击权重混合，避免重复叠加抬手。攻击伤害仍由服务端预备/接触时序驱动。

Tests cover all7 types ×6views ×15parts, continuous action envelopes, actual wrist paths, and real browser sprites across8directions. Browser audit samples every visible bone, confirms independent zombie frame names, and checks all seven corpses. These are procedural articulated sprites, not3D skeletal meshes or motion-capture assets. High frame-rate interpolation does not imply new hand-painted frames at every display tick.

性能补充：敌人直接将已计算的15关节矩阵提交给Phaser MultiPipeline的quad批次，避免每个关节先分解成精灵变换再被渲染器重算。Canvas后备路径仍使用普通精灵。圆形特效直接用三角扇，圆弧按半径决定点数，最大弦误差约0.25世界像素；所有角色与敌人的关节仍每帧更新。图集重新打包为3840×3808，避免超过常见4096纹理边长。
