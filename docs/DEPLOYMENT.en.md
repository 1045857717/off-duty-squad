# Docker deployment and updates

[简体中文](DEPLOYMENT.md) · [Project](../README.en.md) · [Releasing](RELEASING.en.md)

## Deployment options

| File                | Purpose                            | Update method              |
| ------------------- | ---------------------------------- | -------------------------- |
| `compose.prod.yaml` | Recommended public server          | Pull a released GHCR image |
| `compose.yaml`      | Local verification or source build | Update source and rebuild  |

Image: `ghcr.io/1045857717/off-duty-squad:<version>`, Linux amd64 / arm64. The initial version is 3.6.0; no remote image exists until its release workflow succeeds. Package visibility is independent of repository visibility. Public images allow anonymous pulls. Private images require a local GHCR login on the host; never put credentials in Compose or Git.

The server owns rooms in one process. Do not add replicas behind random load balancing: replicas currently share neither rooms, sessions nor presence.

## First deployment

Install Docker Engine and Compose v2. Put `compose.prod.yaml` and `.env.example` from the repository root in a permanent directory, for example `/opt/off-duty`:

```bash
mkdir -p /opt/off-duty
cd /opt/off-duty
cp .env.example .env
```

Configure `.env`:

```dotenv
IMAGE_REPOSITORY=ghcr.io/1045857717/off-duty-squad
GAME_VERSION=3.6.0
PORT=3000
PUBLIC_URL=https://game.example.com
```

Replace the example domain. With a reverse proxy on the same host, use `PORT=127.0.0.1:3000` and expose only the HTTPS proxy. A containerized proxy needs the correct Docker network upstream; its own loopback address does not refer to the game container.

```bash
docker compose -f compose.prod.yaml config --quiet
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d --wait
docker compose -f compose.prod.yaml ps
curl -fsS http://127.0.0.1:3000/api/health
```

Expect `status: "ok"` and the intended version. The image health check runs approximately every 30 seconds. Use one public HTTPS origin for all players and invitations.

## HTTPS and WebSocket

The [Nginx example](nginx.conf.example) includes the HTTP / WebSocket proxy rules; configure TLS with your proxy or certificate tooling. Preserve `Upgrade`, `Connection`, `Host` and `X-Forwarded-Proto` and avoid caching Socket.IO traffic.

Through the public origin, verify page loading, `/api/health`, two-client room joining, readiness, movement, chat and invitation links. Confirm successful `/socket.io/` WebSocket upgrades and no repeated disconnections during a match.

## Back up scores

The `abyss-scores` named volume stores `/app/data/squad-scores.json`. Its actual Docker name includes the Compose project prefix. Keep the deployment directory or explicit `-p` project name unchanged to reuse the volume. Rooms, chat and active matches are memory-only.

Export the current score snapshot from a running container; the server updates this file by atomic replacement:

```bash
mkdir -p backups
backup="backups/squad-scores-$(date -u +%Y%m%dT%H%M%SZ).json"
docker compose -f compose.prod.yaml exec -T off-duty node -e '
const fs = require("node:fs");
const file = "/app/data/squad-scores.json";
const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "[]";
if (!Array.isArray(JSON.parse(text))) throw new Error("Invalid score backup");
process.stdout.write(text);
' > "$backup"
test -s "$backup"
```

Keep backups in separate storage, outside Git. An empty array is expected before any recorded run.

## Update

Back up scores and schedule a maintenance window. Set `GAME_VERSION` in `.env` to a published version:

```bash
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d --wait
curl -fsS http://127.0.0.1:3000/api/health
docker compose -f compose.prod.yaml logs --tail=80 off-duty
```

Pulling does not interrupt the old container. Container recreation ends current matches; clients must reconnect or create a new room. The named volume is retained. Normal updates do not need `down`; **never use `down -v`** for this procedure.

Pin an exact version in production. `latest` is a convenience tag, not a rollback record; rerunning an older release workflow can move it to that release.

## Rollback and restore

Review the target release's data compatibility first. Set `GAME_VERSION` back to the previous working version, then run the same pull and up commands. This rolls back the application, not the data.

If a backup must be restored, stop the server and confirm the backup path. The following procedure overwrites the current score file:

```bash
docker compose -f compose.prod.yaml stop off-duty
docker compose -f compose.prod.yaml run --rm --no-deps -T --entrypoint node off-duty -e '
const fs = require("node:fs");
let text = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => text += chunk);
process.stdin.on("end", () => {
  if (!Array.isArray(JSON.parse(text))) throw new Error("Invalid score backup");
  fs.writeFileSync("/app/data/squad-scores.json.tmp", text);
  fs.renameSync("/app/data/squad-scores.json.tmp", "/app/data/squad-scores.json");
});
' < backups/your-backup.json
docker compose -f compose.prod.yaml up -d --wait
```

## Build from source

```bash
cp .env.example .env
docker compose -f compose.yaml up -d --build
```

Git source excludes the desktop ZIP, so source-only builds correctly report the download as unavailable. To include it, put `offshift-desktop-win-x64.zip` and `desktop-release.json` from the matching Release in `releases/` before building. The official workflow includes both automatically.

## Troubleshooting

| Symptom                              | Check                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------- |
| GHCR unauthorized / denied           | Package visibility, image name, host login for private packages           |
| Missing image tag                    | Successful release workflow, exact version; image tags omit the leading v |
| Page works but rooms disconnect      | HTTPS, Upgrade headers, proxy timeouts and same-origin routing            |
| Scores disappear after deployment    | Project name, deployment directory and mounted volume                     |
| Desktop download unavailable         | Missing Release ZIP or proxy path restriction                             |
| Matches disappear after redeployment | Expected: rooms are not persistent                                        |

## Official references

- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Compose pull](https://docs.docker.com/reference/cli/docker/compose/pull/)
- [Docker Compose up](https://docs.docker.com/reference/cli/docker/compose/up/)
