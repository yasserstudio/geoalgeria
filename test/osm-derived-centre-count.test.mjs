// The count of OpenStreetMap-derived commune centres is a licence claim, and it was
// stated in six places by hand. PR #236 wrote the licence prose off a pre-#237 base
// and shipped 62 next to #237's 251 in the same file. Nothing tied the number to the
// data, so the two could disagree and both pass.
//
// This test derives the number from the correction ledgers and the data itself, then
// requires LICENSE, NOTICE and dataset-metadata.json to state that number, and no
// other published metadata file to state a different one. Those three were the only
// places checked at first, so `data/geojson/communes.metadata.json` restated the
// count in its own prose with nothing reading it: it carried 64, then 62, then 236,
// then 251, hand-edited each time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { publishedMetadataPaths } from "../scripts/lib/licence-terms.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = join(ROOT, "packages", "dataset");
const read = (...p) => readFileSync(join(...p), "utf-8");
const json = (...p) => JSON.parse(read(...p));

// Every number the licence prose puts on the carve-out has to be the derived one. A
// stale count reads as a different claim over the same data, which is the defect this
// guards. The three shapes the prose uses; the denominator in "N of the 1,541" is the
// second number and is checked separately.
const CLAIM_SHAPES = [
  /(?<![\d,])([\d,]+)\s+(?:OpenStreetMap-derived\s+)?commune\s+centre\s+coordinates/g,
  /(?<![\d,])([\d,]+)\s+of\s+the\s+[\d,]+\s+(?:commune|point|value)/g,
  /these\s+([\d,]+)\s+coordinates/g,
  /those\s+([\d,]+)\s+values/g,
];

// The complement, the centres no OpenStreetMap source accounts for. It is the same
// claim read from the other end, and it drifted with the carve-out every time.
const COMPLEMENT_SHAPES = [/remaining\s+([\d,]+)/g, /other\s+([\d,]+)\s+commune\s+coordinates/g];

const countsIn = (shapes, text) =>
  shapes.flatMap((re) => [...text.matchAll(re)].map((m) => Number(m[1].replace(/,/g, ""))));

/** The commune-centre counts `text` claims, from the shapes above. */
const claimsIn = (text) => countsIn(CLAIM_SHAPES, text);

/** Every string in a parsed metadata document, so a claim is found wherever it sits. */
function strings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

// The 6 centres version 2.1.0 replaced with their relation's centroid. They predate
// the ledgers, so the codes are pinned here and checked against NOTICE below: the
// test fails if either side is edited alone. Si Mahdjoub (2644) and El Achir (3407)
// are deliberately NOT in this set; each kept its pre-2.1.0 placeholder, so no
// OpenStreetMap value was ever written to them. See CHANGELOG.md, 2.1.0.
const RELATION_CENTROID_COMMUNES = [2242, 2616, 2627, 2653, 2915, 3427];

function derive() {
  const communes = [
    ...json(PKG, "data", "communes_w1_w23.json"),
    ...json(PKG, "data", "communes_w24_w48.json"),
    ...json(PKG, "data", "communes_w49_w69.json"),
  ];
  const byCode = new Map(communes.map((c) => [c.code_commune, c]));

  const ledgers = [
    json(ROOT, "research", "_commune-centres", "corrections-2026-09-27.json"),
    json(ROOT, "research", "_commune-centres", "corrections-2026-09-29.json"),
  ];

  // A ledger row only counts if its value is the one the package ships: a correction
  // that was reverted, or never applied, carries no ODbL claim.
  const fromAdminCentreNode = new Set();
  const perLedger = [];
  for (const ledger of ledgers) {
    perLedger.push({ generated: ledger.generated, count: ledger.corrections.length });
    for (const row of ledger.corrections) {
      const commune = byCode.get(row.code_commune);
      assert.ok(commune, `ledger row ${row.code_commune} is not a commune this package ships`);
      const to = row.to ?? row.osm.point;
      assert.ok(
        Math.abs(commune.longitude - to[0]) < 1e-6 && Math.abs(commune.latitude - to[1]) < 1e-6,
        `commune ${row.code_commune}: shipped [${commune.longitude}, ${commune.latitude}] is not the ledger's [${to}], so the correction is not applied`,
      );
      fromAdminCentreNode.add(row.code_commune);
    }
  }

  for (const code of RELATION_CENTROID_COMMUNES) {
    assert.ok(byCode.has(code), `relation-centroid commune ${code} is not a commune this package ships`);
    assert.ok(
      !fromAdminCentreNode.has(code),
      `commune ${code} is counted both as a relation centroid and as an admin_centre node correction`,
    );
  }

  const osmDerived = new Set([...fromAdminCentreNode, ...RELATION_CENTROID_COMMUNES]);
  return {
    total: communes.length,
    fromAdminCentreNode: fromAdminCentreNode.size,
    fromRelationCentroid: RELATION_CENTROID_COMMUNES.length,
    osmDerived: osmDerived.size,
    rest: communes.length - osmDerived.size,
    perLedger,
  };
}

test("the OpenStreetMap-derived commune centres are the applied ledger rows plus the 2.1.0 centroids", () => {
  const counts = derive();
  assert.equal(counts.total, 1541);
  assert.deepEqual(counts.perLedger, [
    { generated: "2026-09-27", count: 56 },
    { generated: "2026-09-29", count: 189 },
  ]);
  assert.equal(counts.fromAdminCentreNode, 245);
  assert.equal(counts.fromRelationCentroid, 6);
  assert.equal(counts.osmDerived, 251);
  assert.equal(counts.rest, 1290);
});

test("LICENSE, NOTICE and dataset-metadata.json state the derived count and no other", () => {
  const { osmDerived, fromAdminCentreNode, fromRelationCentroid, perLedger, rest, total } = derive();
  const metadata = json(PKG, "dataset-metadata.json");
  const stated = {
    "LICENSE": read(PKG, "LICENSE"),
    "NOTICE": read(PKG, "NOTICE"),
    "dataset-metadata.json conditionsOfAccess": metadata.conditionsOfAccess,
    "dataset-metadata.json usageInfo": metadata.usageInfo,
  };

  // LICENSE and NOTICE hard-wrap, so a claim can straddle a newline: every check
  // below reads the whitespace-collapsed text.
  for (const key of Object.keys(stated)) {
    assert.ok(stated[key], `${key}: missing`);
    stated[key] = stated[key].replace(/\s+/g, " ");
  }

  for (const [where, text] of Object.entries(stated)) {
    const claims = claimsIn(text);
    assert.ok(claims.length > 0, `${where}: states no commune centre count at all`);
    for (const claim of claims)
      assert.equal(claim, osmDerived, `${where}: states ${claim} OpenStreetMap-derived commune centres, the data gives ${osmDerived}`);
  }

  // The split behind the total, and the complement, only in the files that enumerate
  // them. LICENSE and usageInfo give the admin_centre-node subtotal; NOTICE gives one
  // bullet per ledger instead.
  for (const where of ["LICENSE", "dataset-metadata.json usageInfo"])
    assert.ok(
      stated[where].includes(`${fromAdminCentreNode} from`),
      `${where}: does not state the ${fromAdminCentreNode} taken from an admin_centre node`,
    );
  for (const where of ["LICENSE", "NOTICE", "dataset-metadata.json usageInfo"]) {
    for (const { generated, count } of perLedger)
      assert.ok(
        stated[where].includes(String(count)) && stated[where].includes(generated),
        `${where}: does not state the ${count} centres corrected on ${generated}`,
      );
    assert.ok(
      stated[where].includes(`${fromRelationCentroid} from the relation centroid`) ||
        stated[where].includes(`${fromRelationCentroid} corrected in version 2.1.0`),
      `${where}: does not state the ${fromRelationCentroid} taken from a relation centroid`,
    );
  }
  assert.match(
    stated.NOTICE,
    new RegExp(`other ${rest.toLocaleString("en-US")} commune coordinates`),
    `NOTICE: does not state the ${rest} commune coordinates that are not OpenStreetMap-derived`,
  );
  assert.ok(
    stated.NOTICE.includes(`of the ${total.toLocaleString("en-US")} commune`),
    `NOTICE: does not state the ${total} commune total the carve-out is taken out of`,
  );

  // The 6 relation-centroid communes this test counts are the 6 NOTICE names, so the
  // pinned list cannot drift away from the published claim.
  for (const code of RELATION_CENTROID_COMMUNES)
    assert.ok(stated.NOTICE.includes(`(${code})`), `NOTICE: does not name relation-centroid commune ${code}`);
});

// The three artefacts above are the canonical statement of the carve-out, but they
// are not the only published place it appears: every descriptor under `data/` is in
// the npm tarball too, and each one that restates the count is one more claim nobody
// read. Discovered rather than listed, so a descriptor added next to a new data file
// is covered the day it lands. Stating no count is fine; stating a stale one is not.
test("no published metadata file states a commune centre count other than the derived one", () => {
  const { osmDerived, rest } = derive();
  const descriptors = [
    { path: "dataset-metadata.json", json: json(PKG, "dataset-metadata.json") },
    ...publishedMetadataPaths(PKG).map((path) => ({ path, json: json(PKG, path) })),
  ];
  assert.ok(
    descriptors.some((d) => d.path === "data/geojson/communes.metadata.json"),
    "the commune centres' own descriptor is not among the published metadata files",
  );

  for (const { path, json: document } of descriptors)
    for (const text of strings(document).map((s) => s.replace(/\s+/g, " "))) {
      for (const claim of claimsIn(text))
        assert.equal(
          claim,
          osmDerived,
          `${path}: states ${claim} OpenStreetMap-derived commune centres, the data gives ${osmDerived}`,
        );
      for (const claim of countsIn(COMPLEMENT_SHAPES, text))
        assert.equal(
          claim,
          rest,
          `${path}: states ${claim} commune centres outside the carve-out, the data gives ${rest}`,
        );
    }
});
