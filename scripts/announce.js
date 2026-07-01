#!/usr/bin/env node
/**
 * Release announcer: turns a published release tag into ready-to-use marketing
 * copy — a GitHub Discussion body plus X (Twitter) and LinkedIn drafts — built
 * from that version's CHANGELOG section.
 *
 * It WRITES files; it never posts anything. The announce.yml workflow decides
 * what to publish (Discussion on minor/major, social drafts attached as release
 * assets for a human to copy-paste). Run locally too:
 *
 *   GEOALGERIA_TAG="geoalgeria@1.2.0" node scripts/announce.js
 *
 * No dependencies — Node built-ins only.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const REPO = "https://github.com/yasserstudio/geoalgeria";

// name (npm) -> package dir + a human label
const PACKAGES = {
  geoalgeria: { dir: "packages/dataset", label: "the GeoAlgeria dataset" },
  "@geoalgeria/poste": { dir: "packages/poste", label: "post offices & ATMs" },
  "@geoalgeria/emploi": { dir: "packages/emploi", label: "employment agencies" },
  "@geoalgeria/mobilis": { dir: "packages/mobilis", label: "Mobilis agencies & points of sale" },
  "@geoalgeria/banques": { dir: "packages/banques", label: "Algeria's licensed banks, institutions & branches" },
  "@geoalgeria/telecom": { dir: "packages/telecom", label: "Algeria's telecom operators' network sites" },
  "@geoalgeria/aviation": { dir: "packages/aviation", label: "Algeria's civil airports" },
  "@geoalgeria/livraison": { dir: "packages/livraison", label: "Algeria's delivery carriers & stop-desks" },
  "@geoalgeria/jeunesse": { dir: "packages/jeunesse", label: "Algeria's youth establishments" },
  "@geoalgeria/enseignement-superieur": { dir: "packages/enseignement-superieur", label: "Algeria's higher-education network" },
  "@geoalgeria/tourisme": { dir: "packages/tourisme", label: "Algeria's tourism infrastructure" },
  "@geoalgeria/formation-professionnelle": { dir: "packages/formation-professionnelle", label: "Algeria's vocational training establishments" },
  "@geoalgeria/sports": { dir: "packages/sports", label: "Algeria's sports infrastructure" },
  "@geoalgeria/djezzy": { dir: "packages/djezzy", label: "Djezzy boutiques" },
  "@geoalgeria/mosquees": { dir: "packages/mosquees", label: "Algeria's mosques" },
  "@geoalgeria/sante": { dir: "packages/sante", label: "Algeria's public health establishments" },
  "@geoalgeria/culture": { dir: "packages/culture", label: "Algeria's cultural atlas" },
  "@geoalgeria/agriculture": { dir: "packages/agriculture", label: "Algeria's agriculture-sector institutions" },
  "@geoalgeria/gares-routieres": { dir: "packages/gares-routieres", label: "Algeria's intercity bus stations (SOGRAL)" },
  "@geoalgeria/ferroviaire": { dir: "packages/ferroviaire", label: "Algeria's rail & urban transit (SNTF/SETRAM/SEMA)" },
  "@geoalgeria/buses": { dir: "packages/buses", label: "Algeria's urban bus networks (ETUSA)" },
  "@geoalgeria/transport": { dir: "packages/transport", label: "Algeria's transport sector (umbrella)" },
};

const tag = process.env.GEOALGERIA_TAG || process.argv[2];
if (!tag) {
  console.error("Usage: GEOALGERIA_TAG='geoalgeria@1.2.0' node scripts/announce.js");
  process.exit(1);
}

// Split on the LAST '@' so scoped names (@geoalgeria/poste@1.0.3) parse correctly.
// `at` must be > 0: no '@' (-1) or a leading scope '@' (0) means a malformed tag.
const at = tag.lastIndexOf("@");
if (at <= 0) {
  console.error(`Malformed tag "${tag}" — expected name@version (e.g. geoalgeria@1.2.0)`);
  process.exit(1);
}
const name = tag.slice(0, at);
const version = tag.slice(at + 1);
const pkg = PACKAGES[name];
if (!pkg) {
  console.error(`Unknown package "${name}" — expected one of: ${Object.keys(PACKAGES).join(", ")}`);
  process.exit(1);
}

// --- Extract this version's CHANGELOG section -------------------------------
function changelogSection(dir, ver) {
  let md;
  try {
    md = readFileSync(join(dir, "CHANGELOG.md"), "utf8");
  } catch {
    return "";
  }
  const lines = md.split("\n");
  const esc = ver.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match the version anywhere on a `## ` heading — handles both changesets
  // (`## 1.1.1`) and keep-a-changelog (`## [1.1.0] - 2026-06-08`) styles. The
  // non-digit/dot boundaries stop 1.1.0 from matching inside 11.1.0 or a date.
  const re = new RegExp(`(^|[^0-9.])${esc}([^0-9.]|$)`);
  let grab = false;
  const out = [];
  for (const line of lines) {
    if (/^##\s/.test(line)) {
      if (grab) break; // next version heading ends the section
      if (re.test(line)) {
        grab = true;
        continue;
      }
    }
    if (grab) out.push(line);
  }
  return out.join("\n").trim();
}

const section = changelogSection(pkg.dir, version);
if (!section) {
  console.warn(`WARN  no CHANGELOG section matched ${tag} — drafts will be minimal.`);
}

// Classify the bump (gates auto-announce: minor/major post, patch stays quiet).
// Changesets writes "### Major/Minor/Patch Changes". keep-a-changelog doesn't, so
// fall back to the SemVer delta against the previous CHANGELOG heading.
function semverDelta(prev, cur) {
  const a = prev.split(".").map(Number);
  const b = cur.split(".").map(Number);
  if (b[0] !== a[0]) return "major";
  if (b[1] !== a[1]) return "minor";
  return "patch";
}
function previousVersion(dir, ver) {
  let md;
  try {
    md = readFileSync(join(dir, "CHANGELOG.md"), "utf8");
  } catch {
    return null;
  }
  const versions = [];
  for (const line of md.split("\n")) {
    if (!/^##\s/.test(line)) continue;
    const m = line.match(/(\d+\.\d+\.\d+)/);
    if (m) versions.push(m[1]);
  }
  const i = versions.indexOf(ver);
  return i >= 0 && i + 1 < versions.length ? versions[i + 1] : null;
}
function classifyBump(sec, dir, ver) {
  if (/###\s+Major Changes/i.test(sec)) return "major";
  if (/###\s+Minor Changes/i.test(sec)) return "minor";
  if (/###\s+Patch Changes/i.test(sec)) return "patch";
  const prev = previousVersion(dir, ver);
  return prev ? semverDelta(prev, ver) : "minor"; // no prior heading = first release
}
const bump = classifyBump(section, pkg.dir, version);

// Pull clean bullets out of a CHANGELOG section: drop the changeset hash, and
// merge wrapped continuation lines back into their bullet (keep-a-changelog
// style wraps long bullets across indented lines).
function highlights(raw) {
  const bullets = [];
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*[-*]\s+(.*)$/);
    if (m) {
      bullets.push(m[1].replace(/^[0-9a-f]{7,}:\s*/i, "").trim());
    } else if (bullets.length && /^\s+\S/.test(line)) {
      // Indented continuation of the previous bullet (keep-a-changelog wraps long
      // bullets). Only indented lines merge — flush-left prose is left alone.
      bullets[bullets.length - 1] += " " + line.trim();
    }
  }
  const cleaned = bullets.map((b) => b.trim()).filter(Boolean);
  return cleaned.length ? cleaned : ["See the full changelog for details."];
}
// Strip markdown emphasis for plain-text contexts (titles, social posts).
const plain = (s) =>
  s
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const bullets = highlights(section);
// The lead bullet is the headline (title + hook). Drop trailing sentence punctuation
// so it reads as a title, not a sentence — the full bullet still carries its period.
const headline = plain(bullets[0]).replace(/[.;,\s]+$/, "");

// --- Best-effort "what's inside" totals (flagship dataset only) -------------
function datasetTotals() {
  try {
    const meta = JSON.parse(readFileSync("packages/dataset/dataset-metadata.json", "utf8"));
    const c = meta.counts || meta;
    const pick = (...keys) => keys.map((k) => c[k]).find((v) => typeof v === "number");
    const wil = pick("wilayas", "wilaya");
    const com = pick("communes", "commune");
    if (wil && com) return `${wil} wilayas · ${com} communes`;
  } catch {
    /* metadata shape varies; skip silently */
  }
  return null;
}
const totals = name === "geoalgeria" ? datasetTotals() : null;

// --- Render -----------------------------------------------------------------
const npmUrl = `https://www.npmjs.com/package/${name}`;
const releaseUrl = `${REPO}/releases/tag/${encodeURIComponent(tag)}`;
const install = name === "geoalgeria" ? `npm install geoalgeria` : `npm install ${name}`;
// Only the flagship dataset ships a SQL dump; the scoped data packages ship CSV + GeoJSON.
const bundles = name === "geoalgeria" ? "CSV / GeoJSON / SQL" : "CSV and GeoJSON";
const allFormats = name === "geoalgeria" ? "JSON/CSV/GeoJSON/SQL/TypeScript" : "JSON/CSV/GeoJSON/TypeScript";
// The headline IS bullets[0] and now leads the body as the `##` title, so don't
// repeat it in the list below (keep it only if it's the sole bullet).
const bulletList = (bullets.length > 1 ? bullets.slice(1) : bullets)
  .map((b) => `- ${b}`)
  .join("\n");

// Title is the headline alone — never the package tag (it's already in the
// release chip + URL). The tag goes on its own "Release" line. See
// .github/RELEASE_TEMPLATE.md.
const discussion = `## ${version} - ${headline}

${name === "geoalgeria" ? "**GeoAlgeria** — the open dataset for Algeria. " : `**${name}** (${pkg.label}). `}Release \`${tag}\` — this ${bump} update:

${bulletList}

${totals ? `Current totals: **${totals}**.\n\n` : ""}Install / update:

\`\`\`bash
${install}@latest
\`\`\`

${bundles} bundles are attached to the [release](${releaseUrl}). Issues and corrections: [open an issue](${REPO}/issues/new/choose).

npm: ${npmUrl} · Release: ${releaseUrl}
`;

const xThread = `# X / Twitter — ${tag} (single post, sober — edit before posting)

${name === "geoalgeria" ? "GeoAlgeria" : name} ${version}: ${headline}.${bullets[1] ? "\n" + plain(bullets[1]) : ""}

${npmUrl}
`;

const linkedin = `# LinkedIn — ${tag} (sober — edit before posting)

Note: put the link in the first comment (LinkedIn suppresses reach on posts with external links); the first line is the hook.

${name === "geoalgeria" ? "GeoAlgeria, the open dataset for Algeria" : name} ${version}: ${headline}.

What changed:
${bullets
  .slice(0, 5)
  .map((b) => `- ${plain(b)}`)
  .join("\n")}

${totals ? `It now covers ${totals}, ` : ""}shipped as ${allFormats} — one \`${install}\`, MIT, validated on every commit. Corrections and use cases welcome.

#OpenData #Algeria

First comment (link):
npm: ${npmUrl} · Release: ${releaseUrl}
`;

const outDir = process.env.GEOALGERIA_OUT || ".release-notes";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "announcement.md"), discussion);
writeFileSync(join(outDir, "x-thread.md"), xThread);
writeFileSync(join(outDir, "linkedin.md"), linkedin);
// Emit machine-readable bits for the workflow (title, bump, whether to announce).
writeFileSync(
  join(outDir, "meta.json"),
  // Never auto-announce when no CHANGELOG section matched (headline would be the
  // "See the full changelog" fallback) — avoids posting an empty/junk Discussion.
  JSON.stringify({ tag, name, version, bump, headline, announceWorthy: bump !== "patch" && section.trim().length > 0 }, null, 2),
);

console.log(`Announce kit for ${tag} (${bump}) written to ${outDir}/`);
console.log(`  headline: ${headline}`);
console.log(`  announceWorthy: ${bump !== "patch"} (Discussion auto-posts on minor/major only)`);
