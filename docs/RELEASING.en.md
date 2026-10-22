# Maintainer release guide

[简体中文](RELEASING.md) · [Deployment](DEPLOYMENT.en.md) · [Project](../README.en.md)

## One-time setup

1. Create the repository under the maintainer's account and decide visibility and licensing. Documentation currently targets `1045857717/off-duty-squad`; update all references if renamed.
2. Authenticate locally with `gh auth login`; check existing login with `gh auth status`. Never send a PAT in chat or commit it.
3. Enable GitHub Actions. Workflows use the automatically provided `GITHUB_TOKEN`. Verification is read-only; the image job gets package-write permission and the release job gets content-write permission. No long-lived publishing secret is needed.
4. Configure actual branch rules in repository settings if desired and supported by the account / visibility. Prefer PRs and passing CI for `main`.
5. After the first image publication, confirm that the GHCR package is linked to the repository and is public if anonymous pulls are intended. Repository visibility and package visibility are independent.
6. Enable private vulnerability reporting in Security settings. Star History relies on public data and is unsuitable for private-repository growth tracking.

## Source updates versus releases

Pushing `main` triggers CI. It does not redeploy a server or overwrite stable images. Push a stable `vX.Y.Z` tag to release:

```text
Stable version tag vX.Y.Z
  → Core tests, formatting, types, production build and version checks
  → Windows x64 portable client and checksum verification
  → Local release-image health and two-client integration checks
  → Publish Linux amd64 / arm64 images to GHCR
  → Upload assets to a draft Release, then publish it
```

Images receive exact `X.Y.Z` and convenience `latest` tags. Pin the exact version in production; the Release also includes a digest reference.

## Prepare and tag

Update the changelog and relevant docs:

```bash
# package.json is currently 3.8.0; bump when preparing the next patch.
npm version patch --no-git-tag-version
npm run check
npm run format:check
npm run release:check -- --tag v3.8.1

git add .
git commit -m "chore(release): prepare v3.8.1"
git push origin main
gh run list --workflow ci.yml --branch main --commit "$(git rev-parse HEAD)" --limit 5
```

Replace the example version with your intended version. Wait for CI on the exact main commit, then tag:

```bash
git tag -a v3.8.1 -m "Salary Thieves v3.8.1"
git push origin v3.8.1
gh run list --workflow release.yml --limit 5
# Substitute the run ID returned above:
gh run watch RUN_ID --exit-status
```

`package.json` is the application version source. Its lockfile, Git tag and desktop manifest must match. Server health metadata and desktop packaging read it directly. The pipeline currently accepts canonical stable three-part versions, not prereleases.

## Release assets

| Asset                          | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `offshift-desktop-win-x64.zip` | Portable Windows x64 client, no Node installation needed |
| `desktop-release.json`         | Version, bytes, SHA-256 and unsigned status              |
| `compose.prod.yaml`            | Production Compose pinned to this release                |
| `env.example`                  | Release environment template; rename to .env             |
| `image-digest.txt`             | Full GHCR digest reference                               |
| `SHA256SUMS.txt`               | Artifact checksums                                       |

The client is unsigned. Do not describe it as code-signed. Large binary archives belong in Releases, not Git history. Automatically generated source archives exclude these binary assets.

## Recover from failures

- Verification failure: fix and recheck. Never overwrite an already public version tag.
- Temporary Windows / image build failure: rerun failed jobs or manually dispatch Release using the existing stable tag.
- Image pushed but Release upload failed: resume the draft Release. Publication across GHCR and GitHub Releases is not atomic; wait for the complete workflow before deploying.
- Already published release: bump the version rather than replacing assets. A preflight guard rejects publication over an existing public release.

Server deployment deliberately remains a separate pull operation. No server SSH key is needed in Actions for the documented workflow.

## Project presentation

The READMEs include real screenshots, bilingual navigation, status badges and Star History. CI and Release badges reflect actual repository runs. The external Star History service can lag or have no data for a new repository; it does not create star records.

## References

- [GitHub CLI authentication](https://cli.github.com/manual/gh_auth_login)
- [Automatic token authentication](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication)
- [GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Star History](https://github.com/star-history/star-history)

## 已发布镜像复验 / Verify an existing published image

```bash
gh workflow run verify-release.yml --ref main --field version=3.8.0
```

此工作流拉取指定版本并在 Linux amd64 / arm64 上执行真实双客户端检查；ARM64 使用 GitHub Linux 测试环境的 QEMU。它不会重建或覆盖已发布镜像。This checks the existing version on both platforms without rebuilding or replacing it.
