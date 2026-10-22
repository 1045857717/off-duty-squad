import { createServer } from "../server/app";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const directory = await mkdtemp(path.join(tmpdir(), "quality-offduty-")),
  app = createServer({ dataDir: directory });
try {
  await new Promise<void>((resolve) =>
    app.http.listen(0, "127.0.0.1", resolve),
  );
  const base = "http://127.0.0.1:" + (app.http.address() as any).port;
  const { stdout, stderr } = await promisify(execFile)(
    process.execPath,
    ["tests/browser-quality.mjs"],
    {
      env: { ...process.env, GAME_BASE_URL: base },
      timeout: 120000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  process.stdout.write(stdout);
  process.stderr.write(stderr);
} finally {
  await app.close();
  const cleanup = path.resolve(directory);
  if (
    !cleanup.startsWith(path.resolve(tmpdir()) + path.sep) ||
    !path.basename(cleanup).startsWith("quality-offduty-")
  )
    throw new Error("Unexpected temporary cleanup path");
  await rm(cleanup, { recursive: true, force: true });
}
