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

2026-10-23起，Release列表保留每个已发布版本的Release对象、迭代说明和已有附件，同时保留Git标签与GHCR版本镜像；Docker回滚仍可固定旧版本。新版本验收通过后将最新稳定版标记为GitHub Latest，不自动清理旧Release、说明、附件、标签或版本镜像。此规则取代3.9时期只保留最新Release的要求；原话仍保留在[提示词历史](PROMPT-HISTORY.md)。上述严格保护main、PR与三项必需CI的规则继续生效。

历史说明依据保留的标签、原始标题与真实CHANGELOG恢复，为v3.5.0–v4.1.1的八个版本创建历史Release并设置`make_latest: false`；v4.1.2的现有说明正文及Latest标记保留。恢复说明不自动重新上传旧策略下已删除的二进制附件，部分历史Release可能缺少原有附件；源码归档仍可从保留的标签获取。已有附件及未来发布的附件继续保留。历史验收记录、JSON证据与当时的政策快照保留原始数值和表述，旧清理条款仅作为历史记录，不再是当前操作要求。此保留策略仅适用于正式Releases，CI临时artifacts的7天保留期不变。

Existing local GitHub CLI authentication uses the maintainer's system keyring. No token is stored in this repository. Actions publish using their scoped, automatic GITHUB_TOKEN. The checked-in policy does not grant credentials or bypass protection.
