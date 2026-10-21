# Publication preparation validation

Date: **2026-10-22**, Asia/Shanghai. Application version: **3.4.0**.

This record covers local release preparation. It does not imply a remote repository, successful GitHub Actions run, GHCR publication or public-server deployment already exists.

| Check                                 | Local result                                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Game core tests                       | 92 passed, 0 failed                                                                                                                    |
| Release-contract tests                | 5 passed, 0 failed; rejects tag / lock / artifact mismatches                                                                           |
| TypeScript and Vite production build  | Passed                                                                                                                                 |
| Code and new documentation formatting | Passed                                                                                                                                 |
| GitHub workflow syntax                | Passed actionlint 1.7.12; official binary SHA-256 verified                                                                             |
| Source and production Compose         | Both parsed successfully                                                                                                               |
| Windows portable packaging            | Rebuilt successfully; ZIP integrity and manifest verified                                                                              |
| Release-style Docker image            | Built and started successfully                                                                                                         |
| Clean staged-Git-source Docker image  | Built and started successfully without desktop binary                                                                                  |
| Both container variants               | Health / version, HTML, 2 WebSocket clients, host permissions, chat, readiness, countdown, shared initial draft and match start passed |
| Persistence in both variants          | Score data remained readable after container process restart                                                                           |
| Desktop availability                  | true when bundled, false in a source-only image                                                                                        |
| Publication candidate audit           | No common secret patterns, forbidden runtime paths, oversized blobs or missing relative Markdown targets found                         |

The desktop package generated during this verification is 142,926,624 bytes with SHA-256 `c81f3121e534afa256365cb037a5e2e0558f91888077404fd532c287faa5dcd4`. It is generated and ignored, not a Git blob. A future CI rebuild will have its own checksum; published assets must be checked against their own Release manifest.

The first container restart check exposed a test harness assumption: Docker assigned a new ephemeral host port after restart. A separate reproduction confirmed different port mappings before and after restart. The harness now resolves the port again; both complete container scenarios then passed. Production Compose uses an explicitly configured port.

The initial Prettier invocation included a dotenv file, for which no parser is installed; dotenv was removed from the formatting command and the supported source / documentation checks passed.

## Remaining remote acceptance

Actual GitHub CI, the Windows runner, multi-platform amd64 / arm64 publication, GHCR anonymous pull permissions and cross-machine public-network verification still require the repository and release to be published. Local Docker tests used Linux amd64. The Windows package was built on the local Windows machine, not a hosted Actions runner.

See [first publication checklist](PUBLICATION-CHECKLIST.md) for the remaining owner decisions and remote steps.
