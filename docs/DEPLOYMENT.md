# Docker 部署与更新

[English](DEPLOYMENT.en.md) · [返回主页](../README.md) · [发布新版本](RELEASING.md)

## 选择部署方式

| 文件                | 场景               | 更新方式             |
| ------------------- | ------------------ | -------------------- |
| `compose.prod.yaml` | 公网服务器，推荐   | 拉取 GHCR 已发布镜像 |
| `compose.yaml`      | 本地验证、源码自建 | 更新源码后重新构建   |

正式镜像为 `ghcr.io/1045857717/off-duty-squad:<版本号>`，支持 Linux amd64 / arm64。初始版本为 3.5.0；发布工作流成功之前，远程镜像尚不可拉取。镜像公开权限独立于代码仓库，首次发布后需确认 Package 可见性。公开镜像可匿名拉取；私有镜像需要服务器自行登录 GHCR，不要把令牌写入 Compose 或提交到 Git。

服务采用单进程权威房间模型。不要直接增加 Compose replicas 或让负载均衡随机分配同一房间请求；多个实例暂不共享在线数、会话或房间。

## 首次部署

安装 Docker Engine 与 Compose v2。在固定目录（例如 `/opt/off-duty`）放置仓库根目录的 `compose.prod.yaml` 与 `.env.example`：

```bash
mkdir -p /opt/off-duty
cd /opt/off-duty
cp .env.example .env
```

编辑 `.env`：

```dotenv
IMAGE_REPOSITORY=ghcr.io/1045857717/off-duty-squad
GAME_VERSION=3.5.0
PORT=3000
PUBLIC_URL=https://game.example.com
```

域名为示例，换成实际域名。若 Nginx 在同一宿主机，推荐 `PORT=127.0.0.1:3000`，只通过反向代理对外暴露；若代理在容器中，请按实际 Docker 网络配置上游，不能使用代理容器自己的 `127.0.0.1`。

```bash
docker compose -f compose.prod.yaml config --quiet
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d --wait
docker compose -f compose.prod.yaml ps
curl -fsS http://127.0.0.1:3000/api/health
```

健康响应应包含 `status: "ok"` 和期望的版本号。默认健康检查约 30 秒一次。正式访问统一使用公网 HTTPS 域名，同事无须使用局域网 IP。

## HTTPS 与 WebSocket

[nginx.conf.example](nginx.conf.example) 提供 HTTP / WebSocket 反向代理核心配置，TLS 证书由你使用的代理、控制面板或证书工具配置。保留 `Upgrade`、`Connection`、`Host` 和 `X-Forwarded-Proto`，避免代理缓存 Socket.IO 实时流量。通过公网入口验证：

- 页面与 `/api/health` 正常返回。
- 两个独立浏览器可进同一房间，准备、开局、移动和聊天同步。
- 开发者工具中 `/socket.io/` WebSocket 成功升级，持续对局后无重复断线。
- 使用页面生成的邀请链接能加入同一公开地址的房间。

## 数据备份

排行榜位于命名卷 `abyss-scores` 的 `/app/data/squad-scores.json`；实际卷名带 Compose 项目前缀。保持部署目录或 `-p` 项目名不变，更新才能复用原卷。游戏房间、聊天和进行中的战斗仅在内存中。

运行中的服务器可导出当前完整排行榜快照，数据文件通过原子替换写入：

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

备份应放在独立存储中保留，不要提交到 Git。若服务器尚无成绩，导出空数组是正常情况。

## 更新版本

先完成备份并通知玩家维护。把 `.env` 中的 `GAME_VERSION` 修改为已发布版本，再执行：

```bash
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d --wait
curl -fsS http://127.0.0.1:3000/api/health
docker compose -f compose.prod.yaml logs --tail=80 off-duty
```

拉取镜像不会中断旧容器；重新创建容器时会结束当前对局，客户端需要重连或新建房间。数据卷保留。常规更新不需要 `down`，**不要使用 `down -v`**。

生产环境推荐固定完整版本号。`latest` 是便利标签，不是回退记录；旧版本工作流重跑也会更新它，因此不要据此判断版本先后。

## 回退与恢复

回退前检查目标版本发布说明的数据兼容性，不能假设所有未来版本均兼容。把 `GAME_VERSION` 改回上一正常版本，再运行上述 `pull` 与 `up -d --wait`。这只回退应用，不回退数据。

如必须还原备份，先停止服务，确认备份路径后执行。以下操作会覆盖当前排行榜文件：

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

## 源码构建

```bash
cp .env.example .env
docker compose -f compose.yaml up -d --build
```

源码克隆不含桌面端 ZIP，网页会准确显示暂不可下载。需要带桌面端时，从同版本 Release 将 `offshift-desktop-win-x64.zip` 和 `desktop-release.json` 放入 `releases/` 后再构建。正式发布镜像由工作流自动包含这两项。

## 常见问题

| 现象                            | 排查方向                                                           |
| ------------------------------- | ------------------------------------------------------------------ |
| GHCR 拉取 unauthorized / denied | Package 是否公开，镜像名是否正确，私有镜像是否登录                 |
| 镜像 tag 不存在                 | Release 工作流是否成功，版本号是否遗漏 / 多写 v 前缀；镜像标签无 v |
| 页面可见但无法联机              | HTTPS / WebSocket Upgrade、代理超时、客户端与服务是否同源          |
| 更新后排名为空                  | Compose 项目名、部署目录、挂载卷是否变化；恢复已有卷               |
| 桌面端入口不可下载              | 源码镜像缺少 Release ZIP，或下载路径被反向代理拦截                 |
| 重新部署后对局消失              | 当前架构的预期行为；房间不持久化                                   |

## 官方参考

- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Compose pull](https://docs.docker.com/reference/cli/docker/compose/pull/)
- [Docker Compose up](https://docs.docker.com/reference/cli/docker/compose/up/)
