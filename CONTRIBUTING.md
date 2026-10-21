# 贡献指南 / Contributing

感谢帮助改进工位发癫局。游戏以轻松荒诞的职场合作体验为方向，优先保证联机正确性、战斗可读性与运行性能。

Thanks for contributing. The project prioritizes reliable co-op play, readable combat and performance while keeping its absurd workplace humor.

## 开始 / Getting started

1. 使用 Node.js 24，运行 `npm ci`。Use Node.js 24 and run `npm ci`.
2. 从 `main` 创建主题分支。Create a focused branch from `main`.
3. 运行 `npm run dev`；提交前运行 `npm run check` 与 `npm run format:check`。Run the development server and both checks before submitting.
4. UI 修改附桌面及窄屏截图；联机修改提供至少两名独立客户端的重现方式。Include desktop / narrow screenshots for UI work and a two-client reproduction for networking changes.

## 问题 / Issues

先搜索已有问题。Bug 报告请提供版本、浏览器 / 系统、模式、人数、实际操作、预期结果与实际结果。性能问题同时给出分辨率、DPR、怪物数量及帧率采样条件。不要上传令牌、完整环境文件、真实聊天内容或个人信息。

Search existing issues first. Include the version, browser / OS, mode, player count, exact steps, expected and actual behavior. Performance reports should include resolution, DPR, enemy count and sampling conditions. Remove tokens, environment files, real chat and personal data.

## 代码与验证 / Code and verification

- 保持改动聚焦，复用现有 TypeScript、React、Phaser 与服务器权威模型。Keep changes focused and use the existing architecture.
- 服务端验证输入与权限；客户端视觉不可决定伤害、掉落或排名。Validate authority on the server; visuals must not determine damage, drops or rankings.
- 给有实际回归风险的逻辑添加测试，避免只重复实现的测试。Test meaningful behavioral risks rather than implementation details.
- 修改游戏平衡时说明对单人、四人、AI、观战和重连的影响。Explain balance impact on solo / four-player / AI play, spectators and reconnects.
- 新增素材需记录作者、来源和使用权限；请勿提交无授权的资源。Document provenance and usage rights for new assets.
- 格式统一使用 Prettier；不提交构建输出、数据卷、密钥或大体积安装包。Use Prettier and exclude generated output, data, secrets and installers.

## Pull requests

标题说明具体改变，正文写明问题、结果、验证与限制。关联相关 issue。提交后 CI 必须通过；涉及服务器状态的改动需要说明数据兼容性。维护者决定是否合入及何时发布。

Use a concrete title and describe the problem, resulting behavior, validation and limitations. Link related issues. CI must pass; server-state changes must explain compatibility. Maintainers decide acceptance and release timing.

参与时请尊重他人，不进行骚扰、泄露个人信息或人身攻击。Be respectful: no harassment, doxxing or personal attacks.

## 许可 / License

本项目采用 [MIT 许可证](LICENSE)。提交贡献表示你有权提交这些内容，并同意按本项目 MIT 许可提供；外部依赖保留原有许可。

The project uses the [MIT License](LICENSE). By contributing, you confirm that you have the right to submit the material and agree to provide it under this license. Third-party dependencies retain their original licenses.
