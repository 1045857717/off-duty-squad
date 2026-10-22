# Prompt evolution: from an idea to multiplayer gameplay

[简体中文](PROMPT-HISTORY.md) · [AI development](AI-DEVELOPMENT.en.md) · [Project](../README.en.md)

## Scope

The Chinese companion contains excerpts from the author's actual requests. The table below translates their core meaning; these English lines were not the original prompts. Implementation notes are retrospective summaries rather than a full conversation export. Public history starts with the first v3.4.0 upload on October 22, 2026, and does not contain each earlier local edit. Credentials, private file locations and internal system instructions are excluded.

| Order | Translated request                                                        | Design / acceptance direction                                           |
| ----- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 01    | Build a rich browser co-op game for colleagues, with a transparent window | Browser gameplay, engine, rooms, UI and art                             |
| 02    | Separate the game like picture-in-picture; add hide/show                  | Window capability detection and restore behavior                        |
| 03    | Improve smoothness and art; target at least144FPS                         | Scheduling/interpolation; distinguish settings from measured results    |
| 04    | More randomness and random benefits on leveling                           | Builds, pacing, difficulty and cooperation                              |
| 05    | Add a large-map defense mode with growing hordes and infinite waves       | Distinct expedition and procedural survival                             |
| 06    | Select skills with1/2/3 while continuing to play and see the scene        | Non-blocking level-up choices; separate initial draft                   |
| 07    | Show messages during play, with timestamps                                | Transparent battle feed and return to controls after sending            |
| 08    | Opacity means the entire interface                                        | Content opacity, work mode and native transparency boundaries           |
| 09    | Random skills must not overwrite each character's unique ability          | Fixed profession Q and additive random modules                          |
| 10    | Space is the default dash; keep optional Shift                            | Input-method-safe defaults and configuration                            |
| 11    | The host starts once everyone is ready, with a cancelable3s countdown     | Real readiness, host authority and shared initial choices               |
| 12    | Do not offer upgrades that cannot be used; use a growth tree              | Prerequisites, relevant branches and attribute caps                     |
| 13    | Scale difficulty with player count and add end-game statistics            | Party pressure, scarce resources, integer stats and squad results       |
| 14    | Change the theme to workers and office zombies                            | Workplace world and profession identity                                 |
| 15    | Include absurd professions such as a workhorse                            | Filters, fixed abilities and parody careers                             |
| 16    | All in-game character animation must be continuous                        | Inspect the real gameplay rig, not only lobby portraits                 |
| 17    | Emphasize absurd humor and satisfying random builds                       | Lighter copy, office weapons and random events                          |
| 18    | Add self-deprecating workplace jokes                                      | Contextual optional humor and level atmosphere                          |
| 19    | Simulate IDEA and VS Code using realistic layouts                         | Distinct interactive IDE structures and local edits                     |
| 20    | Check every character/enemy joint and all combat feedback                 | Directional rigs, enemy windup, damage sources and interaction failures |
| 21    | Professional Chinese/English GitHub docs and Docker updates               | MIT, CI, versioned releases and GHCR distribution                       |
| 22    | Health is hard to see; attacks still look wrong                           | v3.5 grips, timelines, numerical life/shields and regression work       |
| 23    | Add public chat                                                           | v3.6 channels, cross-room/spectator messages, unread/drafts/IME         |
| 24    | Every profession needs a default normal attack                            | v3.7 innate basics independent of random modules and Q                  |
| 25    | Explain that AI developed the game throughout; show process and prompts   | This documentation, with excerpts separated from reusable templates     |
| 26    | Put a GitHub icon in the lobby and add a coffee QR code                   | Project link and optional author-supplied support image                 |
| 27    | Replace the title with something funny, absurd and spirited               | 3.7 slogan: 月薪三千，火力三亿。 — tiny paycheck, outrageous firepower  |

## Corrections that changed implementation

The early weaponless start evolved into innate profession basics plus an in-map random module draft. Unconstrained randomness evolved into prerequisite-aware growth. A144FPS request became a measurable performance goal with hardware/scene boundaries. Repeated animation feedback showed why gameplay numbers, visible action samples and screenshots must be reviewed together.

## Reusable prompts — reconstructed, not original transcripts

### Starting a project

```text
Build a public-server-ready browser co-op survival game for1–4players.
Use an absurd workplace disaster: professions, office zombies and office-tool weapons.
Use a real game engine and separate DOM UI, client rendering and server simulation.
Provide a six-chapter objective expedition and a distinct procedural endless survival mode.
Display real players and spectators; the host starts a cancelable3s countdown once teammates are ready.
Keep the initial shared module draft inside the map; later choices use1/2/3 without stopping play.
Every profession has an innate basic attack and fixed Q; random modules coexist and respect prerequisites.
Support late join, reconnect, AI, spectating, public and squad messages.
Prioritize readable UI and inspect the actual in-game player/enemy animations.
Implement and verify locally; provide bilingual docs and a Docker release path.
Record tests actually run and known limitations.
```

### Reporting a feel issue

```text
The attack deals damage, but the player cannot clearly see the action and contact.
Trace input→server motion→damage release→snapshots→visible rig and tool.
Find timing and geometry causes before changing effects.
Verify every profession's innate attack deals real damage independently of random modules.
Preserve anticipation/contact/recovery, locomotion, attached grips, profession Q, initial drafting,
four-module builds, restarting and late joining.
Provide actual multi-client results, visible motion samples and screenshots.
```

### Publishing

```text
Complete types, production build, formatting and regressions before committing.
Use existing account authorization; never put credentials in chat, source, images or documentation.
Push main and await CI for that exact commit, then publish a new stable version tag.
Build a Windows portable archive and Linux amd64/arm64 images with checksum files.
Anonymously pull the published image and verify real two-client chat, startup and score persistence.
Keep server updates based on the existing Compose project and preserve the score volume.
Clearly distinguish verified results and remaining boundaries.
```

## Practical lessons

Convert “make it better” into an observable problem: which element obstructs the scene, which state is unreadable, or where the animation and damage disagree. Split publishing into source, CI, fixed tag, assets, image and actual runtime checks. Carry earlier constraints forward explicitly to reduce regressions across repeated iterations.

## Latest correction: paid breaks and project support

28. The title should follow “摸到鱼才是自己挣到的”: the shift is the company’s, the break is ours.
29. Replace 工位发癫局 with a funnier, more absurd game name: Salary Thieves / 薪水小偷.
30. “我说的二维码放在github上”: keep the original QR in GitHub README/support documents, and remove the in-game coffee panel.
31. “你是怎么连通我的github的？”: explain the existing local gh login, system keyring, same-account API transfer and Actions publication without exposing credentials.
