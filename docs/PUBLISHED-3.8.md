# 薪水小偷 3.8.0 已发布 / Published

> 历史验收记录：下文保留发布时的原始数值与验收结果。历史Release说明依据保留的标签与CHANGELOG恢复，不自动重新上传旧策略下已删除的二进制附件，原附件链接可能不可用；Git标签、源码归档与版本镜像保留。[最新稳定版](https://github.com/1045857717/off-duty-squad/releases/latest)。 Archived verification: original values and results are preserved. Historical notes are restored from preserved tags and CHANGELOG entries without automatically re-uploading deleted binary assets; original asset links may be unavailable. Source tags, source archives and versioned images remain. See the [latest stable release](https://github.com/1045857717/off-duty-squad/releases/latest).

发布时间：**2026-10-22 11:27:36 Asia/Shanghai**。

- [正式Release](https://github.com/1045857717/off-duty-squad/releases/tag/v3.8.0)：已发布Windows便携包、部署模板与摘要。
- [源码CI](https://github.com/1045857717/off-duty-squad/actions/runs/39715816597)、[发行工作流](https://github.com/1045857717/off-duty-squad/actions/runs/39716090280)：通过。
- [Linux amd64/arm64运行验收](https://github.com/1045857717/off-duty-squad/actions/runs/39716987040)：通过，实际Node架构分别为x64/arm64，ARM64使用GitHub Linux+QEMU。

本机匿名拉取成功，版本标签和latest摘要一致。镜像中的收款图缺失检查通过；二维码仅保存在GitHub文档。真实双客户端普攻、公共与小队聊天、倒计时/选卡和重启后的排行榜读取通过。测试容器已清理。

Windows包142,929,370字节，镜像内ZIP与GitHub附件/清单摘要一致；已解析实际ZIP目录，启动文件为「薪水小偷.exe」。

```text
ghcr.io/1045857717/off-duty-squad@sha256:73487d13d4da81cfd26430545f378ca37a4f892419b1e0cf13df6ac0d62d77ad
Windows ZIP SHA-256: 5eea26f113a144198c3bc3d420ea7efc9e0c64a9436398544e31b1316916bda6
```

原始记录：[publication-3.8.json](publication-3.8.json)。本地113核心+5发行契约、28组浏览器回归见[validation-3.8.json](validation-3.8.json)。

The renamed client, published image and both architectures were verified. The support QR remains in GitHub documentation and is absent from the game build/image. Tests cover two-client ordinary attacks, chat isolation, countdown/draft and score reload after restart. This does not deploy a public server.

更新服务器时先备份排行榜，将现有.env的GAME_VERSION改为3.8.0，保持同一Compose项目与数据卷，执行：

```bash
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d --wait
```

更新结束当前对局；排行榜在数据卷，实时房间/聊天在内存。Windows包未代码签名。[中文部署](DEPLOYMENT.md)/[English](DEPLOYMENT.en.md)。
