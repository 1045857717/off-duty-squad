# 带薪摸鱼 v4.1.0 / Paid Break Crew

本次围绕玩家实际试玩修复：E交互收益不明、无尽第一波过硬、大厅缺少游戏感、F8背景串色。

- **交互有回执**：操作前说明用途，完成后显示实际收益、强化按键与费用。环境机关说明引怪/减速/命中，满额补给保留，按住E只完成一次操作。
- **无尽循序渐进**：普通敌人开局可击杀；第2/3/4/6波加入远程、自爆、重型/精英、幽灵。首波随机事件帮助起步，后期生命、密度与敌人组合继续增长。
- **大厅像集合室**：模式在上，工友在场，聊天在旁。保留真实玩家准备、三秒倒计时、公开房间与职业选择。
- **工作界面独立配色**：文档、表格、任务板、邮件与两个IDE各自使用合理背景、输入框、菜单和选中态。

Docker: `ghcr.io/1045857717/off-duty-squad:4.1.0`。执行 `docker compose --env-file .env -f compose.prod.yaml pull` 后，执行 `docker compose --env-file .env -f compose.prod.yaml up -d`；更新已有服务器时先将 `.env` 的 `GAME_VERSION` 改为 `4.1.0`。

See [English gameplay notes](PLAYABILITY-4.1.en.md) for balance/interaction rules and [opening audit](balance-4.1.json) for 112 controlled damage cases. Docker deployment, Windows downloads and release verification follow the protected-main release workflow. Existing 4.0 art/performance evidence is historical, not a new performance guarantee.
