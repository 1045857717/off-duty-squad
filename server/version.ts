import { readFileSync } from "node:fs";

/** Shared with release tooling through the root application manifest. */
export const APP_VERSION: string = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;
