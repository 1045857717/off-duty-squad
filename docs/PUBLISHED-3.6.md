# v3.6.0 已发布 / Published

发布时间：**2026-10-22 03:54:00 Asia/Shanghai**。

- [正式 Release](https://github.com/1045857717/off-duty-squad/releases/tag/v3.6.0)：Windows x64 便携包、部署配置、镜像摘要与 SHA256SUMS。
- [对应源码 CI](https://github.com/1045857717/off-duty-squad/actions/runs/39664129504)：通过。
- [发行工作流](https://github.com/1045857717/off-duty-squad/actions/runs/39664495697)：通过。
- [已发布镜像运行验收](https://github.com/1045857717/off-duty-squad/actions/runs/39665683961)：Linux amd64 / arm64 均通过，ARM64 使用 GitHub Linux + QEMU，并断言实际 Node 架构。
- 本机匿名拉取通过；镜像中 Windows 包与 Release 清单、GitHub 文件摘要一致，142,929,388 字节，SHA-256：

```text
3bb96dc851474230611aba374831ef44e54fe4aa56260cc1e54177c2b2905c87
```

镜像版本与 latest 指向同一摘要：

```text
ghcr.io/1045857717/off-duty-squad@sha256:dcaf1cc31ef8b2f21065f250a8b9e61506f4234cb47f1f6825863475e618554d
```

真实双客户端检查覆盖健康接口、页面、桌面包下载入口、公共消息送达及服务端昵称、小队消息不进入公屏、3 秒倒计时、全员选卡和重启后的排行榜持久化。本地测试容器已清理。结构化证据见 [publication-3.6.json](publication-3.6.json)；浏览器与核心测试见 [validation-3.6.json](validation-3.6.json)。

Release and multi-platform image publication, anonymous pull, artifact integrity, real two-client public/private chat, countdown/draft and score persistence all passed. This is publication verification; it does not deploy a server to a public host. Public chat history remains in memory and clears on restart.

## Docker 更新 / Update

按 [部署指南](DEPLOYMENT.md) 先备份排行榜，将服务器现有 .env 的 GAME_VERSION 改为 3.6.0，再执行：

```bash
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d --wait
```

更新结束当前对局；请保持原 Compose 项目与数据卷。Windows 包尚未代码签名。See the [English deployment guide](DEPLOYMENT.en.md) for backup and rollback.
