// Compatibility entry: the2.0 real browser scenario owns an isolated test server.
import { spawn } from "node:child_process";
const child = spawn(
  process.execPath,
  ["node_modules/tsx/dist/cli.mjs", "tests/browser-abyss.ts"],
  { stdio: "inherit", windowsHide: true },
);
child.on("exit", (code) => process.exit(code ?? 1));
