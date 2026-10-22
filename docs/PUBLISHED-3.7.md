# v3.7.0 已发布 / Published

发布时间：**2026-10-22 10:38:45 Asia/Shanghai**。

- [正式Release](https://github.com/1045857717/off-duty-squad/releases/tag/v3.7.0)：Windows便携包、部署模板、镜像摘要与校验文件。
- [对应源码CI](https://github.com/1045857717/off-duty-squad/actions/runs/39711313260)：通过。
- [发行工作流](https://github.com/1045857717/off-duty-squad/actions/runs/39711654846)：通过。
- [远程镜像运行验收](https://github.com/1045857717/off-duty-squad/actions/runs/39712577599)：Linux amd64/arm64均通过；ARM64在GitHub Linux+QEMU中运行，实际Node架构分别确认为x64/arm64。

## 发行物核对

本机使用空认证配置匿名拉取成功，实际摘要与Release一致，latest同样指向该摘要。Windows包142,929,386字节；GitHub附件摘要、下载清单和实际镜像内的文件一致。

```text
ghcr.io/1045857717/off-duty-squad@sha256:8b0a6e576c73f9829c6a1d64eb293533ab653103c190b52c48223f6678c4d138
Windows ZIP SHA-256: 36617c1ae2401a2e39b1b44d9a38ec099b209f04a5176e100e7ae07bcb21abee
```

真实双客户端验收包含：健康与页面、桌面包下载入口、原始二维码文件摘要、独立普攻动作标记且不覆盖Q/模块、公私消息隔离、3秒倒计时、全员选卡，以及重启后的排行榜数据读取。测试容器已清理。结构化证据见[publication-3.7.json](publication-3.7.json)；本地核心与47组浏览器验收见[validation-3.7.json](validation-3.7.json)。

本地Git HTTPS链路中断时，通过GitHub Git Data API传输源码并核对：源码树、提交、签注标签对象的SHA均与本地一致，保留作者和历史，再继续运行正常的CI/Release。

Published source, release assets and multi-platform images are verified. Anonymous pull, actual x64/arm64 execution, innate attacks, QR integrity, two-client public/private chat, countdown/draft and score reload after restart all passed. This does not deploy a server to a public host.

## 更新 / Update

先按[部署文档](DEPLOYMENT.md)/[English](DEPLOYMENT.en.md)备份排行榜，保持原Compose项目和数据卷，将现有.env中的GAME_VERSION改为3.7.0，再执行：

```bash
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d --wait
```

更新结束当前对局；排行榜保存在数据卷，实时房间和聊天存在内存中。Windows包未代码签名。
