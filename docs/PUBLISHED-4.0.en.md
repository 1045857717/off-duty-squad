# 4.0 publication verification

[中文](PUBLISHED-4.0.md) · [Machine-readable evidence](publication-4.0.json) · [Local tests](validation-4.0.json)

Verified at 2026-10-22T18:40:25.715Z. Published release: https://github.com/1045857717/off-duty-squad/releases/tag/v4.0.0 (published 2026-10-22T18:00:59Z). Released source: 2d731054063eff9694457d4cb00b865f5f8fa560; annotated tag: 570b7dbfe5979441265d24d72810b3305d765b05.

Source PR https://github.com/1045857717/off-duty-squad/pull/8, exact-source CI https://github.com/1045857717/off-duty-squad/actions/runs/39824439085, release build https://github.com/1045857717/off-duty-squad/actions/runs/39826209904 and platform runtime https://github.com/1045857717/off-duty-squad/actions/runs/39831489687 succeeded. Main still requires PRs, strict required checks and administrator enforcement, with force push/deletion blocked.

The public Windows ZIP is 142930118 bytes, SHA-256 be0d70d7ae6bc81a9e0cd216bcc9c6f2679bb6458438a23e3962d8af8f6862ef. The downloaded Windows CI artifact and digest-pinned image ZIP agree with the GitHub release-asset digest and checksums. CRC,87 files, current Chinese launcher, source consistency and absence of private server configuration pass. The image-embedded ZIP is byte-identical. Windows remains unsigned; GUI/IPC testing used the source wrapper, while public archive testing verifies integrity and source consistency. Local ZIP timestamps can yield a different hash.

Image ghcr.io/1045857717/off-duty-squad:4.0.0, digest ghcr.io/1045857717/off-duty-squad@sha256:a531ef97f7adae97d46e3e43d9b15cda0c69ba3295f0f7ada9645fffe84857c4. Anonymous pull with empty credentials succeeded; latest matches this digest. Actual Node architecture was x64 for linux/amd64 and arm64 for linux/arm64 (QEMU on GitHub Linux). Both ran HTTP, two real Socket.IO clients, chat isolation, countdown/draft, innate attacks, desktop delivery and restart-persistent scores.

After verification, only v4.0.0 remains in Releases. The old v3.9.0 Release object was removed; Git tags and historical version images remain. No public game host was deployed. Users still configure HTTPS/PUBLIC_URL and run Compose. Performance samples do not guarantee144FPS on every device or scene.
