# 主分支保护与发布保留 / Main protection and release retention

2026-10-22已通过GitHub REST实际启用 `1045857717/off-duty-squad` 的main分支保护，随后读取配置验证 `protected: true`。配置不是仅供参考的工作流声明。

| Rule            | Setting                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------- |
| Pull requests   | Required; zero self-approval requirement for the solo maintainer                            |
| Required CI     | Tests, types and build; Source-only container smoke test; Browser combat and compact window |
| Updated branch  | Strict / must include latest main                                                           |
| Administrators  | Protection enforced                                                                         |
| Conversations   | Must be resolved                                                                            |
| Force pushes    | Disabled                                                                                    |
| Branch deletion | Disabled                                                                                    |

`.github/main-protection.json` 是可审查的配置快照，维护者可使用 `gh api repos/1045857717/off-duty-squad/branches/main/protection` 读取实际状态。普通更新推送功能分支、创建PR、等待必需检查、合并后再打稳定标签。不得暂时解除保护来直接推main。

Release附件、正式镜像和两个平台的运行都通过验收后，删除旧Release对象及其附件，只保留最新稳定版。Git标签和GHCR历史镜像保留；Docker回滚仍可固定旧版本。删除Release不会修改服务器已有容器或数据卷。历史发布验收文档保留原始数值，但旧附件链接可能被移除。

Existing local GitHub CLI authentication uses the maintainer's system keyring. No token is stored in this repository. Actions publish using their scoped, automatic GITHUB_TOKEN. The checked-in policy does not grant credentials or bypass protection.
