# 3.6.0 — 公屏开麦，精神领先

日期：2026-10-22，Asia/Shanghai。

## 公共聊天室

复用服务端已有的全服广播，修复加入房间后公共入口消失的问题。现在大厅、准备、对局和观战均保留公共/小队频道切换；对局与手机默认收起，不把公屏消息混入战斗提示。

- 公共频道覆盖同一服务器的所有连接，小队频道仅供本队与观众使用。
- 显示昵称、消息时间、观战标识、未读提示与各自的未发送草稿。
- 保留最近 60 条公共消息，阅读旧消息时不强制跳到底部；有新消息时可一键返回。历史在进程内存中，服务器重启后清空，不影响排行榜数据卷。
- 输入法确认候选词不会误发送；成功发送后退出输入，F8/F10 在聊天输入中仍能工作。
- 房间内公屏发言使用服务端会话中的真实昵称，不接受客户端伪造的队员名；大厅匿名昵称仍为玩家自选。公共与队内限流分别计算。

## 标语

主标语：**班没少上，人没正常过。**

副标语：**工资按月到账，怨气按秒结算。**

状态文案：**今日精神状态：已读乱回。**

## Verification / 验证

本地通过 **107 项核心测试 + 5 项发行契约测试**，TypeScript、Vite 生产构建、Prettier 与 actionlint 均通过。

实际浏览器共 **24 组**回归通过、页面错误 0：公共聊天 10 组，准备/对局/工作界面等 11 组，职业与操作 3 组。公共聊天覆盖跨房间、公私频道隔离、观战发言、未读、草稿、中文 IME、60 条容量、发送后继续移动及 390px 窄屏。延迟联机回归为每方向 75ms；此结果不等同公网长时间压力测试。

原始结构化结果见 [validation-3.6.json](validation-3.6.json)。镜像与下载包由发行工作流单独验证，结果以公开工作流为准。

![公共与小队聊天频道](images/community.webp)

Shared public/squad channels now remain accessible after joining a room. Public history is memory-only and bounded to 60 entries; private messages stay within the squad. The new slogan is workplace self-deprecation: “Attendance: perfect. Sanity: pending.”
