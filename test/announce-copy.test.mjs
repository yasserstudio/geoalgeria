// The announcement copy built from a CHANGELOG section.
//
// The regression this pins: `geoalgeria` 2.1.0 (2026-09-26). A changeset writes
// its brief as one bullet whose body continues in several indented paragraphs.
// The announcer merged every indented line into the lead bullet, so the headline
// became the whole 2,705-character brief and the Announce run died on GitHub's
// "Title is too long (maximum is 256 characters)". The headline must stop at the
// lead paragraph's first sentence, and the later paragraphs must stay in the
// body as their own entries.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GITHUB_MAX_TITLE, clampTitle, headlineFrom, highlights, sectionFor } from "../scripts/lib/release-copy.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// The real 2.1.0 section, read from the committed CHANGELOG (append-only history,
// so this text is stable) rather than a paraphrase of it.
const dataset = readFileSync(join(root, "packages/dataset/CHANGELOG.md"), "utf8");
const section = sectionFor(dataset, "2.1.0");

test("the real geoalgeria 2.1.0 section is found", () => {
  assert.match(section, /^### Minor Changes/);
  assert.match(section, /Correct 2 wilaya and 178 commune names/);
  assert.ok(section.length > 2000, `expected the full multi-paragraph brief, got ${section.length} chars`);
});

test("the 2.1.0 headline stops at the lead paragraph's first sentence", () => {
  const headline = headlineFrom(highlights(section));
  assert.ok(headline.length <= 120, `headline is ${headline.length} chars: ${headline}`);
  assert.ok(headline.length < GITHUB_MAX_TITLE);
  assert.match(headline, /^Correct 2 wilaya and 178 commune names against the Official Journal/);
  // None of the later paragraphs of the brief may leak into the title.
  assert.doesNotMatch(headline, /Reported by/);
  assert.doesNotMatch(headline, /Names\./);
  assert.doesNotMatch(headline, /Coordinates\./);
  assert.doesNotMatch(headline, /name-history\.json/);
});

test("each paragraph of a changeset brief becomes its own entry", () => {
  const bullets = highlights(section);
  assert.ok(bullets.length >= 6, `expected one entry per paragraph, got ${bullets.length}`);
  assert.match(bullets[0], /^Correct 2 wilaya and 178 commune names/);
  assert.doesNotMatch(bullets[0], /Reported by/);
  assert.ok(
    bullets.some((b) => b.startsWith("**Coordinates.**")),
    "the Coordinates paragraph should survive as a body entry",
  );
  // The paragraphs are whole: no entry is a bare wrapped fragment of another.
  for (const b of bullets) assert.doesNotMatch(b, /^[a-z]/);
});

test("a wrapped keep-a-changelog bullet still merges into one entry", () => {
  const raw = ["### Added", "", "- A long bullet that wraps", "  across two source lines", "- Second bullet"].join("\n");
  assert.deepEqual(highlights(raw), ["A long bullet that wraps across two source lines", "Second bullet"]);
});

test("the changeset hash prefix is dropped", () => {
  assert.deepEqual(highlights("- 5fc1b8e: Fix a name"), ["Fix a name"]);
});

test("a short single-sentence headline is kept whole, without its full stop", () => {
  assert.equal(headlineFrom(["Add 572 Ooredoo stores with real coordinates."]), "Add 572 Ooredoo stores with real coordinates");
});

test("headlineFrom falls back to the tag when there is nothing to say", () => {
  assert.equal(headlineFrom([], "geoalgeria@2.1.0"), "geoalgeria@2.1.0");
});

test("clampTitle marks a truncation and never exceeds GitHub's limit", () => {
  const long = "word ".repeat(200).trim();
  const out = clampTitle(long, "tag@1.0.0");
  assert.ok(out.endsWith("..."));
  assert.ok(out.length <= GITHUB_MAX_TITLE);
});

// The dry-run contract announce.yml depends on: `jq -r .dryRun` gates the post
// step, so meta.json must carry the flag and the run must still write the kit.
test("a dry run writes the kit, flags dryRun and posts nothing", () => {
  const out = mkdtempSync(join(tmpdir(), "announce-dry-"));
  const stdout = execFileSync(process.execPath, ["scripts/announce.js"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, GEOALGERIA_TAG: "geoalgeria@2.1.0", GEOALGERIA_OUT: out, GEOALGERIA_DRY_RUN: "1" },
  });
  const meta = JSON.parse(readFileSync(join(out, "meta.json"), "utf8"));
  assert.equal(meta.dryRun, true);
  assert.equal(meta.announceWorthy, true);
  assert.equal(meta.headline, headlineFrom(highlights(section), "geoalgeria@2.1.0"));
  assert.match(stdout, /DRY RUN: nothing is posted/);
  assert.match(readFileSync(join(out, "announcement.md"), "utf8"), /^## 2\.1\.0 - /);
  rmSync(out, { recursive: true, force: true });
});

test("without the flag the kit is not a dry run", () => {
  const out = mkdtempSync(join(tmpdir(), "announce-live-"));
  execFileSync(process.execPath, ["scripts/announce.js"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, GEOALGERIA_TAG: "geoalgeria@2.1.0", GEOALGERIA_OUT: out, GEOALGERIA_DRY_RUN: "" },
  });
  assert.equal(JSON.parse(readFileSync(join(out, "meta.json"), "utf8")).dryRun, false);
  rmSync(out, { recursive: true, force: true });
});
