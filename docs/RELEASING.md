# 维护者发布流程

[English](RELEASING.en.md) · [部署与更新](DEPLOYMENT.md) · [主页](../README.md)

## 一次性设置

1. 使用维护者自己的 GitHub 账号创建仓库，确认公开范围与许可；仓库地址统一为 `1045857717/off-duty-squad`。若改名，需要同时更新 README、package.json、Compose 和发布资料中的地址。
2. 本机使用 `gh auth login` 完成浏览器授权即可。已有登录可用 `gh auth status` 确认；不要把 PAT 发到聊天、写入文件或提交到 Git。
3. 启用 GitHub Actions。工作流使用仓库自动提供的 `GITHUB_TOKEN`：检查任务只读，镜像任务写 packages，Release 任务写 contents，无须配置长期发布密钥。
4. 如需保护 `main`，在仓库设置中配置规则，要求 PR 和 CI。是否可用取决于仓库可见性与账号套餐；不要通过虚假的工作流声明代替实际设置。
5. 首次发布镜像后，确认 GHCR Package 关联了仓库，公开项目的镜像也设为 public。代码仓库公开不会自动保证镜像公开。
6. 在 Security 设置中启用 private vulnerability reporting。Star History 使用外部公开数据，私有仓库不应期待显示增长图。

## 更新源码与发布版本是两步

日常 `git push origin main` 触发 CI，不直接更新服务器，也不会覆盖稳定镜像。正式推送 `vX.Y.Z` 标签才会进入发布流程。

发布时各阶段为：

```text
稳定版本标签 vX.Y.Z
  → 核心测试、格式、类型与生产构建、版本核对
  → Windows x64 便携包、SHA-256 校验
  → 含桌面端的镜像本地启动与双客户端联机检查
  → Linux amd64 / arm64 镜像发布到 GHCR
  → 草稿 Release 上传附件后转为正式版本
```

镜像使用完整版本号 `X.Y.Z` 和便利标签 `latest`。正式服务器固定完整版本号；Release 附件同时给出镜像 digest。

## 准备版本

更新 CHANGELOG 和说明后运行：

```bash
# 以后每次更新时使用；首次发布已有 3.4.0，不需要再 bump 一次。
npm version patch --no-git-tag-version
npm run check
npm run format:check
npm run release:check -- --tag v3.4.1

git add .
git commit -m "chore(release): prepare v3.4.1"
git push origin main
gh run list --workflow ci.yml --limit 5
```

示例版本 3.4.1 按实际修改。确认 main 的对应提交 CI 成功，再建立标签：

```bash
git tag -a v3.4.1 -m "Off Duty Squad v3.4.1"
git push origin v3.4.1
gh run list --workflow release.yml --limit 5
# 使用上条命令返回的 run ID：
gh run watch RUN_ID --exit-status
```

`package.json` 是应用版本唯一来源；锁文件、Git 标签、桌面清单必须一致。服务端健康接口与桌面打包器从该文件读取版本。当前流程只发布规范的稳定三段版本号，预发布标签会被拒绝。

## 发布附件

| 文件                           | 用途                                      |
| ------------------------------ | ----------------------------------------- |
| `offshift-desktop-win-x64.zip` | Windows x64 便携客户端，无需玩家安装 Node |
| `desktop-release.json`         | 版本、大小、SHA-256 与未签名状态          |
| `compose.prod.yaml`            | 当前发布版本的生产 Compose                |
| `env.example`                  | 当前版本环境变量模板，部署时重命名为 .env |
| `image-digest.txt`             | GHCR 完整镜像摘要引用                     |
| `SHA256SUMS.txt`               | 附件完整性校验值                          |

客户端未代码签名，不要在发布说明中声称已经签名。大体积 ZIP 只上传 Release，不进入 Git 历史。GitHub 自动生成的源码压缩包不含 Release 二进制。

## 失败恢复

- 版本 / 测试失败：修复后重新检查。尚未对外发布时，可在确认影响后重新选择标签策略；不要直接覆盖已公开标签。
- Windows / 镜像阶段临时失败：可以重跑失败任务，或通过手动触发 Release 并输入已有稳定标签重建。
- 镜像已推送、Release 上传失败：草稿 Release 可继续上传。工作流不是跨 GHCR 与 GitHub Release 的原子事务，应确认全部任务完成后再让服务器更新。
- 已正式公开的版本：不要用同一个版本替换文件或重建不同内容。工作流会在前置检查中拒绝重发；应递增版本。

不要向 Actions 添加服务器 SSH 密钥来实现自动部署，除非另行设计并明确需要。当前流程将发布与服务器更新分离，服务器按部署指南主动拉取即可。

## GitHub 项目展示

README 提供中英文切换、真实截图、状态徽章和 Star History。CI / Release 徽章只有工作流真实运行后才显示状态。Star History 是第三方服务，可能延迟或在新仓库无数据时暂不可用，不会生成虚假 Star 记录。

## 参考

- [GitHub CLI authentication](https://cli.github.com/manual/gh_auth_login)
- [Automatic token authentication](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication)
- [GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Star History](https://github.com/star-history/star-history)
