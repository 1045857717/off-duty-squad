# GitHub 首次发布核对 / First publication checklist

这份清单区分本地准备和远程实际结果。Prepared configuration is not evidence that remote CI, images or Releases already exist.

## 本地准备 / Local preparation

- [x] Chinese and English READMEs, curated screenshots, controls, deployment and release guides.
- [x] Issue and PR templates, dependency updates and security reporting policy.
- [x] SHA-pinned official Actions, least-permission jobs and stable-tag validation.
- [x] Image-only production Compose, source-build Compose, backup and rollback procedures.
- [x] Server and desktop packager use package.json for the application version.
- [x] Credentials, runtime data, local screenshots and desktop binaries excluded from Git.

## 发布前由维护者决定 / Maintainer decisions

- [x] Repository name confirmed: `1045857717/off-duty-squad`.
- [x] Public visibility confirmed by the maintainer on 2026-10-22.
- [x] MIT license approved by the maintainer; LICENSE and notices updated.

## 远程验收 / Remote acceptance

- [x] Created public repository and pushed reviewed source.
- [ ] CI passes on the actual main commit.
- [x] Configured repository topics, standard issue labels and private vulnerability reporting; branch rules remain optional.
- [ ] Push the first stable tag and complete all Release jobs.
- [ ] Verify Windows assets, SHA256SUMS and image digest.
- [ ] Confirm GHCR package visibility separately from repository visibility.
- [ ] Pull the published image without local build dependencies.
- [ ] Verify the public server with two independent machines, including WebSocket, chat and reconnect.
- [ ] Confirm Star History when public data becomes available; no star data is fabricated.

The maintainer approved public publication and the MIT license on 2026-10-22. Remote checks below are updated as publication proceeds.
