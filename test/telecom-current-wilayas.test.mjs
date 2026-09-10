import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { reconcileCurrentWilayaByCommune } from "../scripts/lib/current-wilaya-by-commune.mjs";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const published = read("../packages/telecom/data/5g-mobilis.json");
const raw = read("../sources/telecom/mobilis-5g.json");
const manifest = read("../sources/telecom/manifest.json");

test("Mobilis current-wilaya linkage is the reviewed exact set", () => {
  const reconciled = published.filter((row) => row.source_wilaya_code);
  const digest = createHash("sha256")
    .update(reconciled.map((row) => row.id).sort().join("\n"))
    .digest("hex");

  assert.equal(reconciled.length, 31);
  assert.equal(digest, "07a0c4deca725c7004cbd569ff2cb16ac7221b24f9d449082a1b5d71b70e8110");
  assert.deepEqual(
    Object.fromEntries(
      [...new Set(reconciled.map((row) => row.wilaya_code))]
        .sort()
        .map((code) => [code, reconciled.filter((row) => row.wilaya_code === code).length]),
    ),
    { "59": 11, "63": 1, "64": 6, "65": 3, "66": 1, "67": 2, "68": 3, "69": 4 },
  );
  assert.equal(
    manifest["mobilis-5g"].sha256,
    "9bf5b1eba9e2ea78754828d3134fb33a69fd7d52e259e57be62db5550292a8f2",
  );

  for (const row of reconciled) {
    const sourceMatches = raw.filter((source) => {
      const [lat, lng] = String(source.coordonnes).split(",").map(Number);
      return source.commune === row.commune && lat === row.lat && lng === row.lng;
    });
    assert.ok(sourceMatches.length >= 1, `${row.id} must match the captured operator point`);
    assert.ok(sourceMatches.every((source) => String(source.wilaya_id).padStart(2, "0") === row.source_wilaya_code));
    assert.deepEqual(reconcileCurrentWilayaByCommune(row), {
      wilaya_code: row.wilaya_code,
      source_wilaya_code: row.source_wilaya_code,
      commune_code: row.commune_code,
    });
  }
});
