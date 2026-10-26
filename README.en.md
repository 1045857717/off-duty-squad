<div align="center">

# Paid Break Crew · 带薪摸鱼

**The shift belongs to the company. The break belongs to us.**

An AI-implemented 1–4 player online co-op survival game that turns workplace absurdity into a roguelite battlefield. Pick a profession, assemble a build, and survive office zombies, outrageous KPIs, and your next performance review.

**[🎮 Play online · moyu.xiebc.com](https://moyu.xiebc.com)**

Play in your browser without installing anything. Use the same online address in the optional desktop client.

[简体中文](README.md) · [Docker deployment](docs/DEPLOYMENT.en.md) · [Releasing](docs/RELEASING.en.md) · [Controls](docs/CONTROLS.md) · [Changelog](CHANGELOG.md)

[![CI](https://github.com/1045857717/off-duty-squad/actions/workflows/ci.yml/badge.svg)](https://github.com/1045857717/off-duty-squad/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/1045857717/off-duty-squad)](https://github.com/1045857717/off-duty-squad/releases)
[![Published image runtime](https://github.com/1045857717/off-duty-squad/actions/workflows/verify-release.yml/badge.svg)](https://github.com/1045857717/off-duty-squad/actions/workflows/verify-release.yml)
[![Stars](https://img.shields.io/github/stars/1045857717/off-duty-squad?style=flat)](https://github.com/1045857717/off-duty-squad/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-3D6B54.svg)](LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-24_LTS-339933?logo=nodedotjs&logoColor=white)
![Players](https://img.shields.io/badge/Players-1%E2%80%934-E47832)

![Public lobby](docs/images/lobby-4.1.1.png)

</div>

## Built by AI, directed by people

From the first prototype through the current release, an AI coding agent implemented the code, gameplay, UI, procedural animation, networking, tests, documentation and release tooling. The author sets the product direction, playtests and provides feedback, authorizes releases and supplies the optional coffee QR image. The project builds on existing open-source engines and libraries.

[AI development process](docs/AI-DEVELOPMENT.en.md) · [Actual prompt evolution and reusable templates](docs/PROMPT-HISTORY.en.md) · [Buy the author a coffee](docs/SUPPORT.md)

## Features

- **Two co-op modes:** six mission-based expedition chapters with objectives and extraction, or an endless procedural campus with escalating waves and a boss every five waves.
- **28 workplace professions:** recognizable office roles and deliberately absurd careers, each with an innate ordinary attack and a permanent Q. Choose the first random module inside the map; combat starts after everyone has chosen.
- **Builds that grow:** 16 attack modules, prerequisite-aware upgrades, and level 4 / level 8 evolutions. Upgrade offers follow your available growth branches.
- **Public chat:** cross-room conversations for lobby users, squads, players and spectators, with separate public/squad channels, unread indicators, preserved drafts and return to controls after sending.
- **Actual multiplayer:** host-controlled departure, player readiness, a cancellable three-second countdown, mid-run joining, 0–3 AI teammates, spectators, chat, rescue calls and revives.
- **Readable combat:** high-contrast numeric health/shields, recent-damage trails, coherent six-view articulated people, profession-specific tools and continuous attacks; enemy wind-ups and articulated attacks, persistent area effects, critical-hit and shield feedback, damage sources, a global boss bar and live damage rankings.
- **Codex and leaderboards:** enemies, professions and skills; daily, weekly, monthly, yearly and all-time squad rankings, separated by mode and difficulty.
- **Browser and optional Windows client:** independent browser windows; a portable Electron client adds frameless transparency, always-on-top, hiding and global restore.
- **Nine work-style views:** tasks, board, documents, spreadsheet, Excel-style sheet, mail, VS Code-style editor, IDEA-style editor and metrics. Editors are local interactive simulations.

| Expedition                                            | Endless survival                                             |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| Six chapters, objectives, interactions and extraction | Procedural large map, random disasters, rising wave pressure |
| Chapter progression and a defined finish              | Continuous builds and survival records                       |

![Gameplay and mission brief](docs/images/gameplay.webp)

Actual UI capture: one player plus three server bots, without fake-health injection. [Readiness](docs/images/ready-41.webp) · [Eight-direction swings](docs/images/directions-40.webp) · [Enemy motions](docs/images/enemies-40.webp).

## Quick start

### Run locally

Install Node.js **24 LTS** (minimum 22.12) and npm.

```bash
git clone https://github.com/1045857717/off-duty-squad.git
cd off-duty-squad
npm ci
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000). For development, run `npm run dev` and use the Vite URL printed in your terminal. Download the Windows portable client from [Releases](https://github.com/1045857717/off-duty-squad/releases), extract all files and enter the same server origin used by your browser.

### Deploy with Docker

The server needs Docker Engine and Compose v2. Put [compose.prod.yaml](compose.prod.yaml) and [.env.example](.env.example) in a permanent deployment directory, then copy the environment example to `.env`.

```bash
cp .env.example .env
# Edit GAME_VERSION, PUBLIC_URL and the host port.
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d --wait
curl -fsS http://127.0.0.1:3000/api/health
```

Released image: `ghcr.io/1045857717/off-duty-squad:<version>`, for Linux amd64 and arm64. Images become available after a successful release workflow. Repository and package visibility are separate settings. Use an HTTPS reverse proxy that preserves WebSocket upgrades for public access.

To update, back up the score data, set `GAME_VERSION` to a new release and repeat `pull` and `up -d --wait`. To roll back, restore the previous version setting and repeat. **Updating ends in-memory matches; scores remain in the named volume.** Do not run `down -v`. See the [deployment guide](docs/DEPLOYMENT.en.md) for backup and recovery.

## Controls

| Key                 | Action                                 | Key              | Action                           |
| ------------------- | -------------------------------------- | ---------------- | -------------------------------- |
| WASD / arrows       | Move                                   | Mouse            | Aim / left-click attack          |
| Space / right mouse | Dash; optional Shift setting           | Q                | Profession signature             |
| E                   | Hold to interact / revive              | T                | Toggle auto attack               |
| 1 / 2 / 3           | Select upgrade                         | H                | Call for help while downed       |
| Enter               | Chat; return to controls after sending | U                | Show upgrade choices             |
| F2                  | Settings                               | F7               | Damage board                     |
| F8                  | Work view                              | F9               | Compact window                   |
| F10                 | Hide / restore                         | Ctrl + Shift + B | Global restore in desktop client |

See [all controls and platform limits](docs/CONTROLS.md). Browser opacity changes page content; showing the desktop through the window and hiding the native window require the optional desktop client.

## Development

```bash
npm run check         # Core tests, TypeScript and production build
npm run format:check  # Formatting
npm run browser:install
# Start the service before running browser scenarios:
npm run test:feedback
```

Built with **React 19, TypeScript, Phaser 3 / WebGL, Express and Socket.IO**. An authoritative Node server runs the simulation; clients interpolate snapshots for rendering. One service serves the website, HTTP API and WebSocket connections. Electron provides the optional Windows shell.

| Directory            | Responsibility                                         |
| -------------------- | ------------------------------------------------------ |
| `src/`               | Lobby, HUD, Phaser scene and rendering                 |
| `server/`            | Rooms, authoritative simulation, networking and scores |
| `shared/`            | Types, professions, growth branches and balance data   |
| `public/art/`        | Runtime artwork and generated sources                  |
| `electron/`          | Desktop shell and portable client                      |
| `tests/`             | Simulation, network, render and browser regressions    |
| `.github/workflows/` | CI, desktop artifacts and image publishing             |

![Enemy codex](docs/images/codex.webp)

![Public and squad channels](docs/images/community.webp)

<details>
<summary>View results and work-style interface</summary>

**4.0 health, shield and build acceptance scene**

![4.0 health and build HUD](docs/images/vitals-40.webp)

**F9 quiet view (four-player, 100-enemy stress fixture)**

![520×350 quiet view](docs/images/quiet-40.webp)

![Run results](docs/images/results.webp)

![VS Code-style work interface](docs/images/work-mode.webp)

</details>

## Status and limitations

Current version: **4.1.3**. Fixes discarded latency probes and blocked WebSocket startup; F2 now separates browser callback cadence, actual drawing and state-stream health, with an empty-load reference page. See [frame and network diagnosis](docs/PERFORMANCE-4.1.3.md). Previously, Adds an in-game FPS/RTT meter, early offscreen entity culling, bounded remote interpolation and a dense-combat 20Hz snapshot budget while simulation remains at 60Hz. See [measurements and limits](docs/PERFORMANCE-4.1.2.md). Previously, WebSocket compression and wire-only visual precision reduce late-match state traffic. Lobby chat and profession details have readable layouts, the GitHub entry is labelled, and a four-browser high-refresh diagnostic tool is included. See [transport measurements and limits](docs/PERFORMANCE-4.1.1.md) and [lobby readability](docs/LOBBY-4.1.1.md). Mode selection comes before squad assembly in an illustrated game lobby. Endless mode opens with killable common enemies and introduces enemy combinations and elites gradually. E interactions explain actual benefits, costs and durations; F8 work surfaces retain their own palettes. See [4.1 gameplay and fixes](docs/PLAYABILITY-4.1.en.md) and the [opening damage audit](docs/balance-4.1.json). Historical [4.0 art](docs/ART-4.0.md), [profession audit](docs/COMBAT-4.0.md), [published verification](docs/PUBLISHED-4.0.en.md) and [protected-main policy](docs/BRANCH-PROTECTION.md) remain available.

- The room server is a single-instance service. Replicas do not share rooms or presence; scaling requires room routing and shared storage design.
- A 144 FPS target setting is available. Hardware, resolution and enemy density determine actual performance; **144FPS is not guaranteed for every scene**. See historical [4.0 measurements](docs/PERFORMANCE-4.0.md); earlier measurements remain historical evidence.
- Browser window support varies. The Windows portable client is unsigned; no macOS or Linux desktop package is currently provided.
- Existing networking checks use multiple local clients and simulated latency. Cross-machine public-network soak testing remains outstanding.
- Ranking periods use Asia/Shanghai time and retain the most recent 50,000 results. Chat and live rooms are not persisted.
- The game UI is currently Simplified Chinese. This repository's documentation is bilingual.

## Contributing and support

Please read [CONTRIBUTING](CONTRIBUTING.md) before opening an issue or pull request. Report vulnerabilities through the [security policy](SECURITY.md).

Sponsor placements appear in the lobby rather than combat. Advertising contact: **QQ 1045857717**. The default AI gateway sponsor link is [api.xiebc.cc](https://api.xiebc.cc).

<details>
<summary>Buy the author a coffee · WeChat</summary>

Optional support; all gameplay remains available. This is the original author-provided payment image. Click it to view full size.

<a href="docs/support/wechat-coffee.png"><img src="docs/support/wechat-coffee.png" alt="Author-provided WeChat coffee support QR" width="360" /></a>

[Support details](docs/SUPPORT.md)

</details>

Released under the [MIT License](LICENSE). Third-party dependencies retain their own licenses; see [third-party notices](THIRD_PARTY_NOTICES.md). Project artwork provenance is documented in [ART-4.0](docs/ART-4.0.md).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=1045857717/off-duty-squad&type=Date)](https://www.star-history.com/#1045857717/off-duty-squad&Date)

This chart is provided by the external Star History service using public repository data. It is not a built-in GitHub chart and may be unavailable while a new repository has no data.
