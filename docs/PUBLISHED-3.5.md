# v3.5.0 已发布 / Published

> 历史验收记录：旧Release对象已按维护者要求移除，原附件链接可能不再可用；Git标签与版本镜像保留。当前正式版见[3.9发行验收](PUBLISHED-3.9.md)。 Archived verification: old Release objects/assets were removed; source tags and versioned images remain.

发布时间 / Published: **2026-10-22 02:48:56 Asia/Shanghai**。

| 项目 / Item                   | 结果 / Result                                                                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 仓库 / Repository             | [1045857717/off-duty-squad](https://github.com/1045857717/off-duty-squad), Public, MIT                                                                                      |
| 正式版本 / Release            | [v3.5.0](https://github.com/1045857717/off-duty-squad/releases/tag/v3.5.0), published, stable                                                                               |
| 源码提交 / Source             | 466406aa24a50a93e5f2969490fb46d79d19d259                                                                                                                                    |
| CI                            | [Passed](https://github.com/1045857717/off-duty-squad/actions/runs/39654453080)                                                                                             |
| 发行工作流 / Release workflow | [All jobs passed](https://github.com/1045857717/off-duty-squad/actions/runs/39654842924)                                                                                    |
| Docker                        | ghcr.io/1045857717/off-duty-squad:3.5.0; latest also published                                                                                                              |
| 架构运行验收 / Runtime matrix | [Both passed](https://github.com/1045857717/off-duty-squad/actions/runs/39658237307), including explicit Node architecture checks; ARM64 uses QEMU on a GitHub Linux runner |
| 平台 / Platforms              | Linux amd64 / arm64                                                                                                                                                         |
| 匿名拉取 / Anonymous pull     | Verified with an isolated Docker config containing no registry credentials                                                                                                  |
| 已发布镜像 / Published image  | Real startup, health/version, HTML, 2 WebSocket clients, chat, countdown, shared draft and persisted scores passed                                                          |
| 容器更新 / Recreation         | Production Compose force-recreated the container; score data remained in the named volume                                                                                   |
| 桌面包 / Desktop asset        | 142,929,386 bytes; Release manifest, GitHub asset digest and bundled image ZIP match                                                                                        |

## Immutable image

```text
ghcr.io/1045857717/off-duty-squad@sha256:4a75f56036f400290a18f26f7a74210c63d6093f6a87d7afb1d591b033d262e4
```

Windows ZIP SHA-256:

```text
733777044b3be67f1f56301d0978a3902747c0d4dd461c7f7111b5edaa6ddc3a
```

本地生成包与 CI 生成包可因文件时间等产生不同压缩包摘要；正式下载应使用此 Release 随附的清单。Windows 包未代码签名。This checksum belongs to the published CI artifact; a local rebuild can have a different archive checksum. The portable client is unsigned.

## Scope

本轮本地通过 103 项游戏核心检查、5 项发布检查和 32 组浏览器功能回归，覆盖 16 种攻击、28 个职业 Q、7 类敌人及联机恢复。性能样本与限制见 [版本记录](RELEASE-3.5.md)。

Cross-machine public-server soak testing remains a deployment acceptance step. No public game host was provisioned as part of this repository publication. Follow [中文部署指南](DEPLOYMENT.md) / [English deployment guide](DEPLOYMENT.en.md) on your server.

## Recheck a published version

The dedicated workflow pulls the existing image and starts it on both architectures without rebuilding or replacing artifacts:

```bash
gh workflow run verify-release.yml --ref main --field version=3.5.0
```

本机 Docker Desktop 未配置 ARM 模拟，额外的本地 ARM 启动尝试因此在执行入口前返回架构错误；正式 ARM64 运行验收随后在 GitHub Linux + QEMU 环境完成并通过。未为测试修改用户 Docker VM 的模拟器注册。
