// Guards what the geoalgeria npm package ships (ADR 0004): the per-wilaya Commune
// outline folder is in the tarball, and the package stays under a size cap so the
// next large file is a decision, not a drift. 2.4.1 was 10.6 MB unpacked; 2.5.0
// with the national and per-wilaya Commune outlines is about 19 MB.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATASET = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "dataset");
const MAX_UNPACKED_BYTES = 25 * 1000 * 1000;

const [pack] = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: DATASET, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }),
);
const paths = new Set(pack.files.map((f) => f.path));

test("the geoalgeria package ships the per-wilaya Commune outlines", () => {
  for (let code = 1; code <= 69; code++) {
    assert.ok(paths.has(`data/geojson/commune-boundaries/${code}.geojson`), `missing commune-boundaries/${code}.geojson`);
  }
});

test("the geoalgeria package stays at or under 25 MB unpacked", () => {
  assert.ok(pack.unpackedSize <= MAX_UNPACKED_BYTES, `unpacked ${pack.unpackedSize} bytes`);
});
