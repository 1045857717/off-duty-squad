# 4.0正式发行验收 / Publication verification

[English](PUBLISHED-4.0.en.md) · [机器可读证据](publication-4.0.json) · [本地功能数据](validation-4.0.json) · [性能](PERFORMANCE-4.0.md)

验证完成时间（UTC）：2026-10-22T18:40:25.715Z。正式公开Release：https://github.com/1045857717/off-duty-squad/releases/tag/v4.0.0，发布时间（UTC）：2026-10-22T18:00:59Z。这份记录验证了实际公开产物，不是仅通过本地构建。

## 发布源与保护

- PR：https://github.com/1045857717/off-duty-squad/pull/8
- 发布源提交：2d731054063eff9694457d4cb00b865f5f8fa560
- v4.0.0注解标签：570b7dbfe5979441265d24d72810b3305d765b05
- 源PR CI：https://github.com/1045857717/off-duty-squad/actions/runs/39823659846
- main CI：https://github.com/1045857717/off-duty-squad/actions/runs/39824439085
- Release构建：https://github.com/1045857717/off-duty-squad/actions/runs/39826209904
- 双架构实际运行：https://github.com/1045857717/off-duty-squad/actions/runs/39831489687

主分支仍要求PR、严格更新的三项CI、管理员执行、讨论解决，并禁止强推与删除。合并源与本地测试Git树一致；没有临时移除保护。

## 公开附件

| 文件 | 字节 | GitHub SHA-256摘要 |
|---|---:|---|
| compose.prod.yaml | 589 | sha256:6ef60c88b3d475b47d6c3f062b35cb6ced4ae34d64d719cddc3daba6143b9b1c |
| desktop-release.json | 225 | sha256:d4c0fe008b80c23442e957b85c201f1d1b29f5b62607d437d77f04761d5f53f6 |
| env.example | 404 | sha256:8f8d94ec2b80cdfe3cdf86eaf18befd74f7c979f5f2990bd22163c04cb576b15 |
| image-digest.txt | 106 | sha256:f485c41cb26bdc52ae8ee535f453a866a9f1e3ebd4a893339ba55eb4dd4b32e6 |
| offshift-desktop-win-x64.zip | 142930118 | sha256:be0d70d7ae6bc81a9e0cd216bcc9c6f2679bb6458438a23e3962d8af8f6862ef |
| SHA256SUMS.txt | 427 | sha256:893f559dadb88e568d9b0b92848e4840130d9b594e9e7e6d86b6d354edadd6e4 |

正式Windows ZIP：142930118字节，SHA-256：be0d70d7ae6bc81a9e0cd216bcc9c6f2679bb6458438a23e3962d8af8f6862ef。已下载并校验Windows CI产物，且从公开摘要固定的镜像中取出ZIP实测；二者摘要与公开Release资产摘要一致。CRC完整，87个文件，中文启动器、源代码一致性和私有服务器配置缺失检查通过。Windows包未签名。源码桌面IPC/窗口交互测试与公开ZIP完整性测试是两种证据，不宣称额外下载包GUI测试。

本地打包的SHA可能因ZIP时间戳不同而与Windows CI不同；正式下载使用本节公开摘要，不使用validation中的localArchive摘要。

## 实际镜像运行

Image: ghcr.io/1045857717/off-duty-squad:4.0.0

Digest: ghcr.io/1045857717/off-duty-squad@sha256:a531ef97f7adae97d46e3e43d9b15cda0c69ba3295f0f7ada9645fffe84857c4

空凭据配置匿名拉取成功，latest摘要与4.0.0一致。linux/amd64实际Node为x64、linux/arm64为arm64（GitHub Linux上的QEMU）。两种平台均启动真实容器，完成HTTP、2个Socket.IO客户端、私聊/公屏隔离、初始选卡、固有普攻、桌面下载与容器重启后的成绩持久化。公开镜像内的Windows ZIP字节与公开Release一致。

## 保留策略与范围

验收后Release列表仅保留v4.0.0；移除v3.9.0的Release对象，Git标签与历史版本镜像保留。正式公网游戏主机未部署：服务器仍需由使用者配置PUBLIC_URL/HTTPS并执行Compose。

未宣称4台物理电脑、公网长时间压力或全部设备锁144。全部性能样本、显示差异与未达标阶段见性能报告。
