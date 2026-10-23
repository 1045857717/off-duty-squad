import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractReleaseNotes } from "../scripts/release-notes.mjs";

const history =
  "# Changelog\n\n## [4.1.2] - 2026-10-23\n\n### Changed / 优化\n\n- 网络延迟与帧率。\n\n## [4.1.1] - 2026-10-23\n\n- Previous update.\n";
test("release notes contain only the exact requested version and preserve UTF-8", () => {
  const notes = extractReleaseNotes(history, "4.1.2");
  assert.match(notes, /^## \[4\.1\.2\]/);
  assert.match(notes, /网络延迟与帧率。/);
  assert.doesNotMatch(notes, /Previous update|4\.1\.1|# Changelog/);
});
test("historical unbracketed headings and CRLF are supported", () => {
  const notes = extractReleaseNotes(
    "## 3.9.0 — 2026-10-22\r\n\r\n- 带薪摸鱼。\r\n\r\n## [3.8.0]\r\n- Older",
    "3.9.0",
  );
  assert.match(notes, /带薪摸鱼。/);
  assert.doesNotMatch(notes, /Older|\r/);
});
test("missing, duplicate and empty entries fail publication instead of producing misleading notes", () => {
  assert.throws(() => extractReleaseNotes(history, "4.1.3"), /exactly one/i);
  assert.throws(
    () => extractReleaseNotes(history + "\n## [4.1.2]\n- duplicate", "4.1.2"),
    /exactly one/i,
  );
  assert.throws(
    () => extractReleaseNotes("## [4.1.2]\n\n## [4.1.1]\n- old", "4.1.2"),
    /empty/i,
  );
});
test("noncanonical versions and injected headings are rejected", () => {
  for (const version of [
    "04.1.2",
    "v4.1.2",
    "4.1",
    "4.1.2-beta.1",
    "4.1.2\n## other",
  ])
    assert.throws(() => extractReleaseNotes(history, version), /version/i);
});
test("all retained stable tags have extractable real project iteration notes", () => {
  const changelog = readFileSync(
    new URL("../CHANGELOG.md", import.meta.url),
    "utf8",
  );
  for (const version of [
    "3.5.0",
    "3.6.0",
    "3.7.0",
    "3.8.0",
    "3.9.0",
    "4.0.0",
    "4.1.0",
    "4.1.1",
    "4.1.2",
  ])
    assert.ok(extractReleaseNotes(changelog, version).length > 150);
});
