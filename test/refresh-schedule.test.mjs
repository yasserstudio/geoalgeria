// refresh-schedule.json must cover every published package, and its retrieval
// dates must be the ones the packages themselves state.
//
// The freshness survey behind #306 was a one-off read of 31 metadata.json files,
// and the finding was that nothing scheduled a refresh: poste's source had not
// been pulled since 8 June and nothing in the repo said that was late.
// refresh-schedule.json is now that schedule, but a hand-maintained schedule
// rots in exactly two ways: a new published package never gets a row, and a
// refresh bumps a package's metadata.json without bumping the schedule, so the
// file keeps claiming the old date and every next_due computed from it is wrong.
//
// These tests close both. They read the package manifests and metadata.json
// directly rather than importing any helper, so a bug in a generator cannot
// validate itself. cadence, next_due and note stay human judgement: the tests
// check their shape, never their value.

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "..");
const read = (...parts) => JSON.parse(readFileSync(join(ROOT, ...parts), "utf8"));

const schedule = read("refresh-schedule.json");
const rows = schedule.packages;

/** Every package this repo publishes to npm, with its data metadata if it ships any. */
const published = readdirSync(join(ROOT, "packages"))
  .sort()
  .flatMap((dir) => {
    const manifestPath = join(ROOT, "packages", dir, "package.json");
    if (!existsSync(manifestPath)) return [];
    const manifest = read("packages", dir, "package.json");
    if (manifest.private) return [];
    const metaPath = join(ROOT, "packages", dir, "data", "metadata.json");
    return [
      {
        dir,
        name: manifest.name,
        scripts: manifest.scripts ?? {},
        // `dataset` ships no data/metadata.json at all: dataset-metadata.json is a
        // schema.org descriptor and validate-packages.mjs skips it for the same reason.
        sources: existsSync(metaPath) ? (read("packages", dir, "data", "metadata.json").sources ?? []) : null,
      },
    ];
  });
const byName = new Map(published.map((p) => [p.name, p]));
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Cadences that imply a next_due; the rest (manual, blocked, n/a) do not. */
const PERIODIC = new Set(["monthly", "quarterly", "semiannual"]);

test("every published package has exactly one row, and no row is unknown", () => {
  const listed = rows.map((row) => row.package);
  assert.deepEqual(
    [...listed].sort(),
    published.map((p) => p.name).sort(),
    "refresh-schedule.json must list every published package and nothing else",
  );
  assert.equal(new Set(listed).size, listed.length, "a package is listed twice");
});

test("last_retrieved is the oldest retrieval date the package itself states", () => {
  for (const row of rows) {
    const pkg = byName.get(row.package);
    const dates = (pkg.sources ?? []).map((s) => s.retrieved).filter(Boolean);
    if (!dates.length) {
      assert.equal(
        row.last_retrieved,
        null,
        `${row.package}: ships no dated source, so last_retrieved must be null`,
      );
      continue;
    }
    // Oldest, not newest: a package is only as fresh as its stalest source.
    const oldest = dates.slice().sort()[0];
    assert.equal(
      row.last_retrieved,
      oldest,
      `${row.package}: refresh-schedule.json says ${row.last_retrieved}, ` +
        `packages/${pkg.dir}/data/metadata.json says ${oldest}. ` +
        `A refresh updates both.`,
    );
  }
});

test("source mirrors the package's first source, and sources_count its number", () => {
  for (const row of rows) {
    const sources = byName.get(row.package).sources ?? [];
    if (!sources.length) {
      assert.equal(row.source, null, `${row.package}: no sources, so source must be null`);
      assert.ok(!("sources_count" in row), `${row.package}: no sources, so sources_count must be absent`);
      continue;
    }
    assert.deepEqual(
      row.source,
      { name: sources[0].name, url: sources[0].url ?? null },
      `${row.package}: source must mirror sources[0] in its metadata.json`,
    );
    if (sources.length > 1) {
      assert.equal(row.sources_count, sources.length, `${row.package}: sources_count is stale`);
    } else {
      assert.ok(!("sources_count" in row), `${row.package}: single source, so sources_count must be absent`);
    }
  }
});

test("every cadence is one the file documents, and every documented one is used", () => {
  const documented = new Set(Object.keys(schedule.cadences));
  const used = new Set(rows.map((row) => row.cadence));
  for (const cadence of used) assert.ok(documented.has(cadence), `undocumented cadence "${cadence}"`);
  for (const cadence of documented) assert.ok(used.has(cadence), `documented cadence "${cadence}" is unused`);
});

test("a periodic cadence carries a next_due after its last_retrieved, others carry none", () => {
  for (const row of rows) {
    if (row.last_retrieved !== null) assert.match(row.last_retrieved, DATE, `${row.package}: last_retrieved`);
    if (PERIODIC.has(row.cadence) && row.last_retrieved) {
      assert.match(row.next_due ?? "", DATE, `${row.package}: a ${row.cadence} package needs a next_due`);
      assert.ok(
        row.next_due > row.last_retrieved,
        `${row.package}: next_due ${row.next_due} is not after last_retrieved ${row.last_retrieved}`,
      );
    } else {
      assert.equal(
        row.next_due,
        null,
        `${row.package}: cadence ${row.cadence} schedules nothing, so next_due must be null`,
      );
    }
  }
});

test("every refresh path names a script the package actually declares", () => {
  for (const row of rows) {
    if (row.path === null) continue;
    assert.equal(typeof row.path, "string", `${row.package}: path must be a string or null`);
    const steps = [...row.path.matchAll(/pnpm --filter (\S+) (\S+)/g)];
    assert.ok(steps.length, `${row.package}: path "${row.path}" names no pnpm --filter step`);
    for (const [, name, script] of steps) {
      const target = byName.get(name);
      assert.ok(target, `${row.package}: path refers to unknown package ${name}`);
      assert.ok(
        script in target.scripts,
        `${row.package}: path runs "${script}" but ${name} declares no such script`,
      );
    }
  }
});
