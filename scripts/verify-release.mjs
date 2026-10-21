import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function validateVersions({
  version,
  lockVersion,
  lockRootVersion,
  tag,
}) {
  assert.match(
    version,
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/,
    "A canonical stable version is required",
  );
  assert.equal(
    lockVersion,
    version,
    "Lockfile version must match package.json",
  );
  assert.equal(
    lockRootVersion,
    version,
    "Lockfile root version must match package.json",
  );
  if (tag)
    assert.equal(tag, "v" + version, "Release tag must match package.json");
  return version;
}

export function validateDesktopManifest(manifest, expected) {
  assert.equal(manifest.version, expected.version, "Desktop version mismatch");
  assert.equal(
    manifest.file,
    "offshift-desktop-win-x64.zip",
    "Desktop filename mismatch",
  );
  assert.equal(manifest.platform, "Windows x64", "Desktop platform mismatch");
  assert.equal(
    manifest.signed,
    false,
    "Desktop signature claim must match the unsigned packaging process",
  );
  assert.equal(manifest.bytes, expected.bytes, "Desktop byte count mismatch");
  assert.equal(manifest.sha256, expected.sha256, "Desktop SHA-256 mismatch");
}

function main() {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  const lock = JSON.parse(
    readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
  );
  const args = process.argv.slice(2);
  const tagIndex = args.indexOf("--tag");
  if (tagIndex !== -1 && !args[tagIndex + 1])
    throw new Error("--tag requires a tag");
  const tag = tagIndex === -1 ? process.env.RELEASE_TAG : args[tagIndex + 1];
  const version = validateVersions({
    version: pkg.version,
    lockVersion: lock.version,
    lockRootVersion: lock.packages[""].version,
    tag,
  });
  if (args.includes("--desktop")) {
    const manifest = JSON.parse(
      readFileSync(
        new URL("../releases/desktop-release.json", import.meta.url),
        "utf8",
      ),
    );
    const zip = readFileSync(
      new URL("../releases/offshift-desktop-win-x64.zip", import.meta.url),
    );
    assert.equal(
      zip.readUInt32LE(0),
      0x04034b50,
      "Desktop artifact must be a ZIP file",
    );
    validateDesktopManifest(manifest, {
      version,
      bytes: zip.length,
      sha256: createHash("sha256").update(zip).digest("hex"),
    });
  }
  console.log(
    "Release verified: " +
      version +
      (tag ? " (" + tag + ")" : "") +
      (args.includes("--desktop") ? " including desktop artifact" : ""),
  );
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url)
  main();
