#!/usr/bin/env node
/**
 * Extract the GitHub Release title + body for one package version from its
 * CHANGELOG.md, following RELEASE_TEMPLATE.md. Replaces the inline awk/grep/sed
 * in release.yml so the logic is readable and testable.
 *
 * A CHANGELOG section is everything between `## <version>` and the next `## `.
 * Two shapes are supported, both detected automatically:
 *
 *   Preferred (jeunesse style) — a descriptive title line, then keep-a-changelog
 *   sections. The prose line is the Release TITLE; the `###` sections are the body:
 *       ## 2.0.0
 *       Algeria's youth establishments — 2,334 from the Ministère de la Jeunesse GIS…
 *       ### Added
 *       - …
 *
 *   Changesets fallback — `### Major/Minor Changes` + bullets. The first bullet is
 *   the TITLE (hash/marker/bold stripped); the whole section is the body.
 *
 * Usage: node scripts/release-notes.mjs <changelog> <version> <tag> <title|body|is-patch>
 */

import { readFileSync } from "node:fs";

const [, , changelogPath, version, tag, mode] = process.argv;
if (!changelogPath || !version || !tag || !mode) {
  console.error("usage: release-notes.mjs <changelog> <version> <tag> <title|body|is-patch>");
  process.exit(2);
}

const lines = readFileSync(changelogPath, "utf8").split("\n");

// Collect this version's section (between its `## ` heading and the next), and the
// list of every `## x.y.z` version in file order (for patch detection).
const esc = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const verRe = new RegExp(`(^|[^0-9.])${esc}([^0-9.]|$)`);
const section = [];
const versions = [];
let grab = false;
for (const line of lines) {
  if (/^##\s/.test(line)) {
    const m = line.match(/(\d+\.\d+\.\d+)/);
    if (m) versions.push(m[1]);
    if (grab) grab = false; // next heading ends our section
    if (verRe.test(line)) { grab = true; continue; }
  }
  if (grab) section.push(line);
}

// --- is-patch: version-based, so it works for both note formats ----------------
function isPatch() {
  const i = versions.indexOf(version);
  const prev = i >= 0 && i + 1 < versions.length ? versions[i + 1] : null;
  if (!prev) return false; // first release of this package is never a patch
  const a = prev.split(".").map(Number);
  const b = version.split(".").map(Number);
  return b[0] === a[0] && b[1] === a[1] && b[2] !== a[2];
}

// --- title ---------------------------------------------------------------------
const isHeading = (l) => /^#{1,6}\s/.test(l);
const isBullet = (l) => /^\s*[-*]\s+/.test(l);
const cleanBullet = (l) =>
  l.replace(/^\s*[-*]\s+/, "").replace(/^[0-9a-f]{7,}:\s*/i, "").replace(/\*\*/g, "").trim();

function title() {
  for (const l of section) {
    if (!l.trim()) continue;
    if (isHeading(l)) continue;
    if (isBullet(l)) break; // hit the bullets before any prose → use the bullet path
    return l.trim().replace(/\*\*/g, ""); // prose title line (jeunesse style)
  }
  const bullet = section.find(isBullet);
  return bullet ? cleanBullet(bullet) : tag;
}

// --- body ----------------------------------------------------------------------
function body() {
  // If a prose title line precedes the sections, the body is the `###` sections
  // (the title isn't repeated in the body). Otherwise the whole section is the body.
  let hasProseTitle = false;
  for (const l of section) {
    if (!l.trim()) continue;
    if (isHeading(l)) break;
    if (isBullet(l)) break;
    hasProseTitle = true;
    break;
  }
  let out = section;
  if (hasProseTitle) {
    const firstHeading = section.findIndex(isHeading);
    if (firstHeading >= 0) out = section.slice(firstHeading);
  }
  return out.join("\n").trim() + "\n";
}

if (mode === "title") process.stdout.write(title() + "\n");
else if (mode === "body") process.stdout.write(body());
else if (mode === "is-patch") process.stdout.write(isPatch() ? "yes\n" : "no\n");
else { console.error(`unknown mode: ${mode}`); process.exit(2); }
