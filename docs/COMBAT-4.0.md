# 职业攻击审查 / Profession combat audit

由共享权威数据生成：npx tsx scripts/audit-combat40.ts。数值是未加随机增益的基础值；UI对伤害取整，实际模拟保留精度。每个职业普攻不占随机模块槽，Q保持独立。

| 职业 | 普攻 | 方式 / 动作 | 基础伤害 | 范围 | 接触时刻 | 固定Q / 动作 / 反馈 |
|---|---|---|---:|---:|---:|---|
| 开发工程师 | 键盘回车拳 | 远程 / shoot | 16.2 | 560 | 90ms | 一键清缓存 / throw / electric |
| 运维维修师 | 物理重启 | 近战 / overhead | 24.2 | 122 | 135ms | 断电重启 / overhead / impact |
| 行政支援员 | 关怀泼水 | 近战 / throw | 13.5 | 148 | 114ms | 关怀不是邮件 / channel / heal |
| 夜班安保 | 下班警棍 | 近战 / slash | 25.3 | 136 | 141ms | 此路已下班 / channel / shield |
| 视觉设计师 | 一刀过稿 | 远程 / throw | 14.5 | 530 | 99ms | 冻结这一版 / sweep / frost |
| 财务会计 | 算你一笔 | 远程 / throw | 18.1 | 550 | 90ms | 当场清账 / channel / electric |
| 人事专员 | 简历直投 | 远程 / throw | 15 | 520 | 99ms | 全员调休 / sweep / orbit |
| 项目经理 | 需求拍板 | 近战 / slash | 20.5 | 134 | 141ms | 会议到此结束 / slash / orbit |
| 销售顾问 | 名片直达 | 远程 / throw | 15.3 | 560 | 90ms | 客户在这边 / summon / summon |
| 仓储配送员 | 快递到脸 | 近战 / overhead | 21 | 132 | 135ms | 加急件到了 / throw / heal |
| 食堂主厨 | 锅铲翻面 | 近战 / overhead | 25.8 | 128 | 135ms | 这锅我来扛 / overhead / impact |
| 保洁专员 | 扫除班味 | 近战 / sweep | 15.7 | 158 | 135ms | 深度消杀 / sweep / mist |
| 培训讲师 | 重点敲黑板 | 近战 / slash | 18 | 144 | 141ms | 现在下课 / overhead / shield |
| 通勤司机 | 扳手超车 | 近战 / overhead | 24.2 | 124 | 135ms | 末班车不等人 / slash / electric |
| 内容创作者 | 切片输出 | 远程 / throw | 15.5 | 540 | 99ms | 补光开到最大 / throw / impact |
| 法务顾问 | 当面举证 | 远程 / throw | 19 | 540 | 90ms | 禁止强制加班 / overhead / shield |
| 牛马 | 牛马甩蹄 | 近战 / slash | 25.3 | 140 | 141ms | 牛马冲锋 / sweep / impact |
| 背锅侠 | 黑锅回旋 | 近战 / overhead | 23.1 | 144 | 150ms | 锅从天上来 / channel / impact |
| 摸鱼大师 | 带薪泼咖啡 | 近战 / throw | 14.1 | 154 | 114ms | 带薪午休 / channel / heal |
| 实习生 | 文件飞送 | 远程 / throw | 15 | 540 | 99ms | 收到收到 / sweep / orbit |
| 小黄鸭调试员 | 鸭力反弹 | 远程 / throw | 16.6 | 530 | 90ms | 嘎嘎调试 / throw / electric |
| DDL战神 | 截止日砸场 | 近战 / overhead | 25.5 | 142 | 150ms | 最后一分钟 / overhead / impact |
| 咖啡师 | 意式提神 | 近战 / throw | 17.5 | 158 | 114ms | 双倍浓缩 / throw / coffee |
| 测试工程师 | 缺陷回传 | 远程 / shoot | 17.6 | 560 | 90ms | 强制回归 / channel / frost |
| 画饼总监 | 大饼拍脸 | 近战 / overhead | 25.8 | 148 | 150ms | 饼从天降 / overhead / impact |
| 天使投资人 | 硬币天使轮 | 远程 / throw | 20.2 | 550 | 90ms | 天使轮暴投 / throw / electric |
| 首席PPT官 | 翻页如飞刀 | 远程 / throw | 17.1 | 540 | 99ms | 一页定乾坤 / sweep / orbit |
| 收租包租婆 | 钥匙催租 | 近战 / overhead | 23.5 | 126 | 135ms | 到点交租 / channel / impact |

八方向前扇区与转向蓄力回归：tests/combat-direction.test.ts、tests/basics.test.ts。真实14关节/手持工具/伤害：tests/browser-clarity.ts。实际八方向身体、握点和命中：tests/browser-art40.ts。敌人骨骼：tests/art40-rig-audit.mjs。
