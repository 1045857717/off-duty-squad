import test from "node:test";
import assert from "node:assert/strict";
import {
  validateVersions,
  validateDesktopManifest,
} from "../scripts/verify-release.mjs";

const versions = {
  version: "3.4.0",
  lockVersion: "3.4.0",
  lockRootVersion: "3.4.0",
  tag: "v3.4.0",
};
test("release accepts an exact stable version and matching tag", () => {
  assert.equal(validateVersions(versions), "3.4.0");
});
test("release rejects a tag pointing to the wrong application version", () => {
  assert.throws(() => validateVersions({ ...versions, tag: "v3.5.0" }), /tag/i);
});
test("release rejects either stale lockfile version", () => {
  assert.throws(
    () => validateVersions({ ...versions, lockVersion: "3.3.0" }),
    /lock/i,
  );
  assert.throws(
    () => validateVersions({ ...versions, lockRootVersion: "3.3.0" }),
    /lock/i,
  );
});
test("release rejects noncanonical and prerelease stable tags", () => {
  for (const version of ["03.4.0", "3.4", "3.4.0-beta.1", "3.4.0/evil"]) {
    assert.throws(() => validateVersions({ ...versions, version }), /stable/i);
  }
});
test("desktop manifest validates version, filename, platform, bytes and digest", () => {
  const digest = "a".repeat(64);
  const manifest = {
    version: "3.4.0",
    file: "offshift-desktop-win-x64.zip",
    platform: "Windows x64",
    bytes: 100,
    sha256: digest,
    signed: false,
  };
  assert.doesNotThrow(() =>
    validateDesktopManifest(manifest, {
      version: "3.4.0",
      bytes: 100,
      sha256: digest,
    }),
  );
  for (const patch of [
    { version: "3.3.0" },
    { file: "../../secret" },
    { platform: "Linux" },
    { bytes: 99 },
    { sha256: "b".repeat(64) },
    { signed: true },
  ]) {
    assert.throws(
      () =>
        validateDesktopManifest(
          { ...manifest, ...patch },
          { version: "3.4.0", bytes: 100, sha256: digest },
        ),
      /desktop/i,
    );
  }
});
