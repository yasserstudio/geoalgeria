// The em-dash gate on published metadata. The sweep that removed them touched
// every package, so what matters here is that a reintroduced one is reported with
// the file and the JSON pointer, wherever in the document it sits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { EM_DASH, emDashPointers, emDashErrors } from "../scripts/lib/no-em-dash.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("emDashPointers finds nothing in clean metadata", () => {
  assert.deepEqual(
    emDashPointers({ title_en: "Algeria schools", sources: [{ name: "OpenStreetMap: schools" }] }),
    [],
  );
});

test("emDashPointers points at a source name, a note and a nested array entry", () => {
  assert.deepEqual(emDashPointers({ coverage_note: `a ${EM_DASH} b` }), ["/coverage_note"]);
  assert.deepEqual(emDashPointers({ sources: [{ name: "x" }, { name: `y ${EM_DASH} z` }] }), [
    "/sources/1/name",
  ]);
  assert.deepEqual(emDashPointers({ citation: ["ok", `a ${EM_DASH} b`] }), ["/citation/1"]);
  assert.deepEqual(emDashPointers(`bare ${EM_DASH} string`), ["/"]);
});

test("emDashPointers ignores non-strings and other dashes", () => {
  assert.deepEqual(emDashPointers({ n: 1, ok: null, yes: true, en: "6–7", hy: "a-b" }), []);
});

test("emDashErrors names the file and the pointer", () => {
  const errors = emDashErrors([
    { label: "ecoles/data/metadata.json", json: { sources: [{ name: `OSM ${EM_DASH} schools` }] } },
    { label: "ecoles/dataset-metadata.json", json: { name: "clean" } },
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^ecoles\/data\/metadata\.json: em dash \(U\+2014\) at \/sources\/0\/name/);
});

test("every published metadata file in the repo is clean", () => {
  const offenders = [];
  for (const pkg of readdirSync(join(ROOT, "packages")).sort()) {
    for (const rel of ["dataset-metadata.json", join("data", "metadata.json")]) {
      const path = join(ROOT, "packages", pkg, rel);
      if (!existsSync(path)) continue;
      offenders.push(
        ...emDashErrors([{ label: `${pkg}/${rel}`, json: JSON.parse(readFileSync(path, "utf-8")) }]),
      );
    }
  }
  assert.deepEqual(offenders, []);
});
