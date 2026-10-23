# Changelog / 更新日志

## [4.1.1] - 2026-10-23

### Performance / 性能

- Compress WebSocket state traffic with low-cost deflate, bounded zlib concurrency and no retained compression history. Clients without compression remain supported.
- Remove meaningless floating-point tails from transmitted enemy, projectile, effect and pickup positions. Keep the authoritative simulation, damage, health, cooldowns, 60Hz simulation and 30Hz broadcast target unchanged.
- Add four-client real-wire regression coverage for dense late-game snapshots, compression opt-out, subpixel error bounds and acknowledged-action responsiveness.

### Interface / 界面

- Replace the cramped profession micro-scrollbox with visible basic/Q summaries and full-flow expandable mechanics; make profession selection an explicit28-career disclosure.
- Widen lobby chat, separate author/time from full-width message text, retain drafts/unread/follow behaviour, and keep lobby messages open on narrow screens.
- Make the in-lobby GitHub link a labelled44px control and preserve the readiness/launch viewport. Native Enter activation no longer opens chat when a button, link or disclosure has focus.

### Documentation / 文档

- Add the public browser play address, https://moyu.xiebc.com, prominently to both READMEs and the GitHub project homepage.
- Document measured transport savings, reproduction conditions and how to distinguish server/resource pressure from client rendering or a slow connection. See [performance investigation](docs/PERFORMANCE-4.1.1.md).

## [4.1.0] - 2026-10-23

### Gameplay / 玩法

- Give endless mode a gradual opening: killable common enemies, sublinear party health, staged ranged/bomber/heavy/ghost introductions and later elites; keep growing late-wave pressure and five-wave bosses. First-wave events now help establish a build.
- Unify HUD/server E target selection and show personal authoritative benefit receipts, exact shared-parts cost, upgrade keys, actual healing/shields, environmental-tool duration and hit results.
- Preserve unneeded medical supplies and require E release before another completed interaction; success no longer triggers failure shake.

### Interface / 界面

- Put mode selection above squad assembly and replace report-like lobby cards with illustrated mode destinations, an office gathering scene, visible squad staging and adjacent chat.
- Isolate all nine F8 work palettes from the game theme, including authentic light document/sheet surfaces and dark editor menus/inputs.

See [中文设计与规则](docs/PLAYABILITY-4.1.md), [English design](docs/PLAYABILITY-4.1.en.md) and the reproducible [opening damage audit](docs/balance-4.1.json). Historical 4.0 art and performance reports remain available.

## [4.0.0] - 2026-10-23

### Changed / 调整

- Replace the mixed painted/AI-poster visual world with original night-office oddities: cel materials, authored six-view articulated people, role-specific tools, restrained brass/verdigris/coral UI and a live lobby scene.
- Redesign lobby/readiness/professions/codex/guide/settings/results/combat HUD with shared typography and materials; self-host an OFL Chinese heading subset.
- Add office-themed paper/printer/cabinet/meeting/coffee enemies alongside undead crawlers and the executive boss, each with separate silhouette, joint motion, windup, contact and collapse.
- Match ordinary-attack effects, held tools and projectile shapes to melee, ranged and profession mechanics. Keep Q and the four growth-tree slots independent.

### Fixed / 修复

- Correct the old slash texture’s intrinsic left-facing orientation and stop radial signatures from using a default directional slash.
- Capture an ordinary attack’s authoritative facing at windup; use it for body presentation, projectile direction, hit sector and feedback.
- Rework weapon contact curves to point into the actual hit sector, preserve particle initial angles, blend Q tool motion with the same body pose, and place weapons behind the body when appropriate.
- Move local world health below the shoes, retain shield/break/loss information, and eliminate unused per-profession full-body compatibility atlases.

### Verification / 验证

- Add eight-direction real-game attack captures, 672 human joint-frame coverage and reproducible 630 enemy-frame/WebGL rig audits. Commands and measured results are recorded in docs/ART-4.0.md and docs/validation-4.0.json.

## 3.9.0 — 2026-10-22

- Name: 带薪摸鱼 / Paid Break Crew; friendly public-chat copy, GitHub-only support QR.
- Coherent520×350F9 quiet view, neutral title, auto-hiding toolbar, same live player; F6 remains explicit PiP/pop-up.
- Compact, flow-aligned vitals and build modules; world bars76/64px, separate armor and loss trail.
- Grounded attacks, constant tool scale and blended profession casts; distinct undead attacks and15-joint anatomy for all seven enemy types.
- Dedicated zombie faces, ragged uniforms, crawler/brute/exploder silhouettes, jaws, fingers and joint death recovery; actual art reused in codex. Removed seven unused legacy enemy atlases.
- Main protection applied on GitHub with PR/required CI, administrator enforcement and blocked force push/deletion. New browser combat/quiet-window CI. Keep latest verified Release only; historical Git tags/images remain.

Changes follow [Semantic Versioning](https://semver.org/) and the categories used by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates use Asia/Shanghai. Release tags are the source of truth for published versions.

## [3.8.0] - 2026-10-22

### Changed / 调整

- Rename the display brand to 薪水小偷 / Salary Thieves across web, native client and current documentation.
- Hero: “班是公司的，鱼是自己的。” Supporting: “摸到的鱼，才算自己挣到的。”
- Move the author-provided coffee QR into GitHub documentation; remove the in-game coffee panel and public game asset.
- Preserve the existing combat implementation and neutral work/hidden view titles.
- Extend bilingual prompt/development history with the author’s branding and support-location correction.

## [3.7.0] - 2026-10-22

### Added / 新增

- Independent innate attacks for all 28 professions, with no random-module slot cost or Q replacement.
- Lobby GitHub link and optional coffee panel using the author-provided original QR image.
- Bilingual AI development history, actual request excerpts and explicitly reconstructed prompt templates.

### Changed / 调整

- Align server contact timing with continuous physical attacks; refine actual tool grips, tips, scale, recoil and bounded trails.
- Foot-level health/shield display and stronger HUD hierarchy, damage trail and shield-break state.
- Hero copy: “月薪三千，火力三亿。” Supporting line: “老板画饼，我来清屏。”

## [3.6.0] - 2026-10-22

### Added / 新增

- Persistent public / squad chat tabs, cross-room and spectator conversations, unread indicators and per-channel drafts.
- Bounded 60-message public history with scroll-follow and a new-message jump control.

### Changed / 调整

- Hero copy: “班没少上，人没正常过。” Supporting line: “工资按月到账，怨气按秒结算。”
- Public author identity comes from the room session; public and private flood quotas are independent.
- Chat inputs preserve Chinese IME composition and work/hide shortcuts; successful sends return to controls.

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
