# 打包与分发 / Packaging and distribution

当前推荐通过 [版本发布流程](RELEASING.md) / [release workflow](RELEASING.en.md) 生成正式产物。

| 产物 / Artifact         | 分发 / Distribution                                        |
| ----------------------- | ---------------------------------------------------------- |
| 游戏源码 / Source       | GitHub repository and automatic source archives            |
| Linux 服务端 / Server   | GHCR multi-platform Docker image                           |
| Windows 客户端 / Client | Portable ZIP attached to GitHub Releases                   |
| 部署配置 / Deployment   | compose.prod.yaml and env.example attached to each Release |

## 本地桌面打包 / Local Windows package

需要 Windows x64、Node.js 24、Python 3.12+，并正常安装 Electron 二进制：

```bash
npm ci
npm run desktop:package
npm run release:check -- --desktop
```

输出位于 `releases/`。版本读取 `package.json`；清单包含真实 SHA-256 和大小。本地客户端连接你配置的游戏服务器，不内置联机服务器。无需在玩家电脑安装 Node。

Run these commands on Windows x64 with Node.js 24 and Python 3.12+. The installed Electron binary is required. Outputs are written to `releases/` and read their version from `package.json`. The portable client connects to your server and does not bundle the multiplayer service. Players do not need Node.js.

客户端未代码签名。发布前请通过实际 Windows 环境测试首次连接、窗口、隐藏与恢复。Do not claim code signing; verify first connection and window controls on an actual Windows machine.

## 服务器 / Server

生产服务器使用 [Docker 部署指南](DEPLOYMENT.md) / [deployment guide](DEPLOYMENT.en.md)。不需要在服务器安装 Electron、Python 或桌面运行环境。

历史离线源码包与服务器包是本地交付产物，不提交 Git，不作为新的版本分发规范。正式发布统一使用 Git 标签、Release 附件、镜像标签和校验清单。
