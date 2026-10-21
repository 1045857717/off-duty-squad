# Changelog / 更新日志

Changes follow [Semantic Versioning](https://semver.org/) and the categories used by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates use Asia/Shanghai. Release tags are the source of truth for published versions.

## [3.5.0] - 2026-10-22

### Changed / 调整

- Direction-specific painted body-part masks and shoulder/elbow/wrist anchors replace transparent outer-edge arm crops.
- Continuous anticipation, contact and recovery for player and enemy attacks; held weapons follow the currently rendered attack.
- Numeric overhead health, separate shield bars, recent-damage trails and clearer compact HUD.
- Bounded weapon-tip ribbons, shield-break cues and stale-attack / stale-Q replay prevention.

### Added / 新增

- Combat-feel browser acceptance for all 16 attacks, real hand alignment, multiplayer draft and compact health readability.
- Focused regressions for phase boundaries, geometry, source timing and vitality display.

## [3.4.0] - 2026-10-22

### Publication / 首次公开发布

- Public GitHub repository and MIT license.

### Added / 新增

- Bilingual GitHub documentation, curated screenshots and Star History integration.
- Continuous integration and tagged Windows / GHCR release workflow.
- Image-only production Compose deployment with backup and rollback instructions.

- Enemy, equipment and profession codex; interactive mission brief and redesigned guide.
- Site-wide presence and daily, weekly, monthly, yearly and all-time rankings.
- Enemy attack cues, damage-source indicators and interaction failure feedback.
- Eight-direction rear-quarter artwork and continuous articulated character / enemy motion.

### Changed / 调整

- Desktop and server metadata read the application version from package.json.
- Local data, secrets, verification output and desktop binaries are excluded from Git.

### Fixed / 修复

- Upper diagonal facing, attack animation resets at high attack speed and mission-panel layering.
- Interaction completion feedback preventing the next facility interaction.
- Public invitation links retaining window-specific parameters.

### Validation / 验证

- Local acceptance: 92 core checks and 74 browser scenarios; see [release notes](docs/RELEASE-3.4.md).
- Dense four-player performance remains below the 144 FPS target; see [measurements](docs/PERFORMANCE-3.4.md).

## Earlier versions / 早期版本

Historical development notes: [3.3](docs/RELEASE-3.3.md), [3.2](docs/RELEASE-3.2.md), [3.0](docs/RELEASE-3.0.md). These notes describe local development milestones, not previously published GitHub releases.
