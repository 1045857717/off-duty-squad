# Security policy / 安全策略

## Supported versions / 支持版本

Security fixes target the latest stable release. Development commits and historical milestones are not separately maintained. This is a young project; no audit or response-time guarantee is implied.

安全修复以最新稳定版本为目标，开发分支与历史版本不单独维护。项目尚处早期阶段，不承诺已通过安全审计或固定响应时限。

## Reporting / 报告漏洞

Please do not disclose exploitable details in a public issue. Prefer [GitHub private vulnerability reporting](https://github.com/1045857717/off-duty-squad/security/advisories/new) when enabled. If unavailable, contact the maintainer privately at **QQ 1045857717** to agree on a private reporting channel. Include affected version, reproduction, impact and a suggested mitigation. Do not include live credentials or third-party personal information.

请勿在公开 issue 中直接披露可利用细节。优先通过 GitHub 的私密漏洞报告入口；未启用时，先通过 **QQ：1045857717** 联系维护者确认私密通道。提供版本、重现步骤、影响和建议修复，不发送有效密钥或其他人的个人信息。

## Deployment / 部署

Use a supported Docker host, HTTPS reverse proxy and an explicitly pinned release image. Keep the score volume backed up and limit public network access to necessary ports. Repository secrets, environment files, client session tokens and local score data must remain outside source control.

使用受支持的 Docker 宿主机、HTTPS 入口和固定版本镜像；备份排行榜数据卷，仅开放必要端口。仓库令牌、环境文件、客户端会话令牌和本地成绩数据不要进入 Git。
