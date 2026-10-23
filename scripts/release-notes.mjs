import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Use the requested version's real change record. A missing or ambiguous entry
 * must fail a release rather than silently publishing another version's notes. */
export function extractReleaseNotes(changelog, version) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version))
    throw new Error("A canonical stable version is required");
  const text = changelog.replace(/\r\n/g, "\n");
  const escaped = version.replaceAll(".", "\\.");
  const headings = [...text.matchAll(/^##[ \t]+.*$/gm)];
  const wanted = new RegExp(
    `^##[ \\t]+(?:\\[${escaped}\\]|${escaped})(?=\\s|$)`,
  );
  const matches = headings.filter((h) => wanted.test(h[0]));
  if (matches.length !== 1)
    throw new Error(`Expected exactly one CHANGELOG entry for ${version}`);
  const heading = matches[0],
    next = headings.find((h) => h.index > heading.index);
  const section = text.slice(heading.index, next?.index ?? text.length).trim();
  if (!section.slice(heading[0].length).trim())
    throw new Error(`Empty CHANGELOG entry for ${version}`);
  return section;
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const index = process.argv.indexOf("--version");
  const version =
    index < 0
      ? JSON.parse(
          readFileSync(new URL("../package.json", import.meta.url), "utf8"),
        ).version
      : process.argv[index + 1];
  const changelog = readFileSync(
    new URL("../CHANGELOG.md", import.meta.url),
    "utf8",
  );
  process.stdout.write(extractReleaseNotes(changelog, version) + "\n\n");
}
