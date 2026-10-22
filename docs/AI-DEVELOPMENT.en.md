# A game implemented by AI from the first prototype

[简体中文](AI-DEVELOPMENT.md) · [Project](../README.en.md) · [Prompt history](PROMPT-HISTORY.en.md)

## Contributions and provenance

From the first browser co-op prototype through the current release, the program code, gameplay implementation, UI, procedural animation, networking, tests, documentation, packaging and release work were carried out by an AI coding agent through continuing requests, playtesting and feedback from the author. The author defines the product direction, makes gameplay decisions, reviews the experience, authorizes account/release operations and supplies the optional coffee-support payment image. The implementation builds on existing open-source engines and libraries, including Phaser, React, Socket.IO and Electron. See [art provenance](ART-3.4.md) and [third-party notices](../THIRD_PARTY_NOTICES.md).

This document records observable work and design changes. Early iterations are reconstructed from the author's development conversation. Public Git history starts with the first upload, so it is not a complete log of every earlier local edit. Implementation explanations are retrospective summaries; actual prompt excerpts and reusable prompt templates are identified separately.

## Development progression

| Stage                  | Request                                                        | Implementation and verification focus                                                                                    |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Browser prototype      | A rich co-op game for colleagues                               | Phaser viewport, React lobby, server-authoritative multiplayer rooms                                                     |
| Work and small windows | Picture-in-picture, work view, hide/restore                    | Browser capability detection; optional Windows transparency, borderless window and restore shortcut                      |
| Survival               | More randomness, challenge and endless waves                   | Distinct six-chapter expedition and catastrophe survival; procedural maps, waves, bosses and party scaling               |
| Progression            | Preserve profession skills; exclude unusable upgrades          | Independent profession Q and random modules, prerequisites, levels and four-module limit                                 |
| Multiplayer lifecycle  | Real readiness, cancelable countdown, late join and spectating | Host authority, three-second countdown, shared in-map initial draft, reconnect and AI-room cleanup                       |
| Workplace absurdity    | More jobs, workhorse and capitalist parody careers             | 28 professions, office-tool weapons, workplace zombies, jokes and interactive work views                                 |
| Art and movement       | Stiff characters, incorrect rear diagonals, unclear attacks    | Directional painted parts, shared GPU atlas, 14 joints, blended locomotion/attacks, grips and action timeline            |
| Readability            | Unclear health/damage and obstructive UI                       | Separate health/shields, damage sources, critical hits, collapsible objectives and transparent feeds/rankings            |
| Releases               | Professional bilingual docs and Docker updates                 | MIT, CI, stable tags, portable Windows package, multi-platform GHCR images and artifact checks                           |
| Public chat            | Keep public communication after entering rooms                 | Public/squad tabs, timestamps, unread badges, drafts, Chinese IME, scroll locking and cross-room/spectator checks        |
| 3.7 combat iteration   | Innate attacks, clearer combat, support links                  | Independent profession basics, contact timing/tool geometry, local foot-level vitals, GitHub and optional coffee support |

## 3.8 author-directed branding correction

The author steered the theme toward paid breaks as personally earned income. The game is now Paid Break Crew / 带薪摸鱼, with the slogan “班是公司的，鱼是自己的。” Coffee support was explicitly requested on GitHub, so the in-game coffee panel was removed and the original QR moved into documentation for README/support display.

Publishing used the author’s existing local GitHub CLI login in the system credential store; Actions uses its automatically supplied GITHUB_TOKEN for releases. When local Git TLS failed, the same authorization transferred Git objects through the Git Data API while verifying identical tree, commit and tag SHAs.

## A concrete iteration

1. Turn subjective feedback into something observable. For unclear attacks, inspect the character actually rendered in the game, alongside server damage.
2. Follow the full path: input → server windup → damage release → network snapshot → continuous rig → held tool, trail and hit feedback.
3. Record hypotheses and acceptance criteria, then add failing regressions. Basics must work for every profession without occupying random slots or replacing Q, including restarts and late joins.
4. Change the responsible layer. The server owns combat and identity; shared definitions drive both real statistics and descriptions; the client interpolates joints/effects; React owns the surrounding product UI.
5. Inspect real browser sessions and screenshots. Multiple clients exercise rooms, spectators, readiness, input and reconnects; animation checks sample actual visible limbs and props.
6. Verify published artifacts. After source checks, publish a fixed tag, validate download digests, anonymously pull the published image and run two-client checks on amd64 and arm64.

## Evolving requirements

- An early request specified no starting weapon. The current request adds a default ordinary attack for every profession. The resulting design keeps innate basics, profession Q and the first random module chosen inside the map as separate capabilities.
- Overall opacity and native window transparency have different capability boundaries. The normal webpage adjusts content opacity; native Windows features are provided by the optional desktop client.
- 144 FPS is a selectable target and frame-scheduling goal. Actual results depend on device, resolution and enemy density; selecting 144 does not prove every scene runs at that rate.
- Repeated reports about attack feel require continued diagnosis. Numerical correctness and a readable, convincing animation are different acceptance criteria.

## Example: attack clarity diagnosis

Previously, the server released attacks at approximately 20% of animation duration with a 95ms cap, while visible contact reached the strike phase around 30%. Multiple modules could repeatedly replace the motion marker. A universal grip and tip offset also failed to match different tool artwork, including mugs, mops and wrenches.

This iteration gives innate attacks their own cooldown and source, preserves anticipation/contact/recovery, derives release at 30% from the shared duration, and defines tool-specific grips and tips. Stronger arm/torso movement, recoil and continuous trails make the action easier to read. Random modules retain separate damage, cooldowns and effects; simultaneous triggers preserve the continuity of the primary physical attack.

A separate regression reproduced incorrect render depth after profession changes: the new rig started at depth0 while the unchanged actor position skipped its cached depth update. Replacement rigs now inherit actor depth, with an actual-browser check across all28professions.

## Tools used for specific purposes

- **Phaser / WebGL:** scenes, camera, atlas rendering and bounded particles.
- **React / TypeScript:** lobby, HUD, work views, settings and shared contracts.
- **Express / Socket.IO:** authoritative simulation, rooms, readiness, messages, reconnection and rankings.
- **systematic-debugging:** trace actual input/server/rendering failures.
- **2d-games / game-art:** atlases, joints, action stages and camera/feedback budgets.
- **ui-ux-pro-max:** visual hierarchy, contrast, touch targets, focus and responsive UI.
- **Playwright / Node tests:** real browser interactions, multi-client regressions and simulation/protocol assertions.
- **Docker / GitHub Actions:** portable releases, reproducible images and multi-platform runtime verification.

## Evidence

[Public commits](https://github.com/1045857717/off-duty-squad/commits/main/) · [Changelog](../CHANGELOG.md) · [Workflows](../.github/workflows) · [Tests](../tests) · [3.5 combat work](RELEASE-3.5.md) · [3.6 public chat](RELEASE-3.6.md) · [3.6 browser results](validation-3.6.json) · [3.6 release verification](PUBLISHED-3.6.md) · [Prompt evolution](PROMPT-HISTORY.en.md)

Known boundaries remain explicit: single-instance rooms, memory-only live rooms/chat, an unsigned Windows client, and no claim of exhaustive long-duration load testing across all public networks. Consult the evidence and CI for the particular release.

3.9 adds actual15-joint undead sprites, grounded attacks and corrected overhead wrist trajectories. F9/HUD and real rendered joints are covered by browser regression checks. See [art/motion implementation](ART-3.9.md) and [active branch policy](BRANCH-PROTECTION.md).
