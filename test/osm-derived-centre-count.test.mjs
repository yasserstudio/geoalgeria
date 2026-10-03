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
//
// THE LEDGER LIST IS NOT REPEATED HERE. It is CORRECTION_FILES in
// scripts/lib/commune-corrections.mjs, which is what fix-commune-centres.mjs applies, so a
// new ledger cannot land applied and uncounted. It did once: corrections-2026-10-01b.json,
// the 68 rows of the coordinate review, were applied to the data while this file still
// read a hand-written list of three ledgers, and every count below passed 68 short.
//
// THE WILAYA CAPITAL POINTS ARE THE SAME CLAIM. Since rule 9 of
// docs/adr/0001-coordinate-review-by-independent-votes.md a wilaya's latitude/longitude
// IS its capital commune's centre, so it carries whatever terms that centre carries.
// NOTICE claimed the opposite, that none of the 69 is OpenStreetMap-derived, which
// stopped being true the moment wilaya 16 took Alger Centre's ODbL value. That count is
// derived here as well, from the same ledgers and the published `capital_commune_code`,
// and the files that make the claim have to state the derived number.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { publishedMetadataPaths } from "../scripts/lib/licence-terms.mjs";
import { CORRECTION_FILES } from "../scripts/lib/commune-corrections.mjs";
import { WINNER_LICENCE } from "../scripts/review/layers/index.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PKG = join(ROOT, "packages", "dataset");
const read = (...p) => readFileSync(join(...p), "utf-8");
const json = (...p) => JSON.parse(read(...p));

// The complement, the centres no OpenStreetMap source accounts for. It is the same
// claim read from the other end, and it drifted with the carve-out every time.
const COMPLEMENT_SHAPES = [/remaining\s+([\d,]+)/g, /other\s+([\d,]+)\s+commune\s+coordinates/g];

const countsIn = (shapes, text) =>
  shapes.flatMap((re) => [...text.matchAll(re)].map((m) => Number(m[1].replace(/,/g, ""))));

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
// El Euch (3427) was one of them until 2026-10-01, when the coordinate review moved it
// 9.7 km off that centroid onto its own `admin_centre` node on three independent Votes. Its
// value is no longer the centroid, so it is counted with the node corrections instead and
// NOTICE says so. The JORA repair that put it on the centroid is not deleted: it stays in
// scripts/lib/jo-2026-corrections.mjs and scripts/fix-jo-corrections.mjs reads the
// correction ledgers so it leaves a coordinate a later ledger has moved alone.
const RELATION_CENTROID_COMMUNES = [2242, 2616, 2627, 2653, 2915];

// Every number a file puts on the carve-out has to be the derived one: a stale count
// reads as a different claim over the same data, which is the defect this file guards.
// These are the shapes the prose actually uses across the carriers; the denominator in
// "N of the 1,541" is the second number and is checked separately.
const CLAIM_SHAPES = [
  /(?<![\d,])([\d,]+)\s+(?:OpenStreetMap-derived\s+)?commune\s+centre\s+coordinates/g,
  /(?<![\d,])([\d,]+)\s+OpenStreetMap-derived\s+commune\s+centres\b/g,
  // "N of the 69" counts wilaya points, not commune centres.
  /(?<![\d,])([\d,]+)\s+of\s+the\s+(?!69\b)[\d,]+\s+(?:commune|points)\b/g,
  /(?:these|those)\s+([\d,]+)\s+(?:coordinates|values)/g,
  /Those\s+([\d,]+)\s+points\b/g,
  /(?<![\d,])([\d,]+)\s+of\s+the\s+[\d,]+\s+values\b/g,
];

/** The carve-out counts one text claims, in whatever shape it claims them. */
function claimsIn(text) {
  return countsIn(CLAIM_SHAPES, text);
}

function derive() {
  const communes = [
    ...json(PKG, "data", "communes_w1_w23.json"),
    ...json(PKG, "data", "communes_w24_w48.json"),
    ...json(PKG, "data", "communes_w49_w69.json"),
  ];
  const byCode = new Map(communes.map((c) => [c.code_commune, c]));

  const ledgers = CORRECTION_FILES.map((file) => json(ROOT, "research", "_commune-centres", file));

  // A ledger row only counts if its value is the one the package ships: a correction
  // that was reverted, or never applied, carries no ODbL claim.
  //
  // AND ONLY IF ITS VALUE CAME FROM OPENSTREETMAP. Every published coordinate does
  // today, which is the Owner's rule of 2026-10-01: a reading taken off a proprietary
  // map may only CONFIRM an open source, within 500 m, and the open coordinate is what
  // ships (Beni-Abbes 5201 is the first row to carry such a confirmation, and its
  // published value is its `admin_centre` node like every other row). The counting
  // still turns on the row's own `decided_by` rather than on that rule holding, because
  // a row that one day ships a non-open value must drop out of the carve-out instead of
  // being counted by default. A row with no `decided_by` is an older ledger, where every
  // row is a node correction by construction, which is asserted here rather than
  // assumed.
  const fromAdminCentreNode = new Set();
  const ownerVerified = new Set();
  /** Candidate source -> the communes a consensus fix took its value from, where that
   *  source is not the OpenStreetMap seat and so not in the ODbL carve-out. */
  const byConsensusWinner = new Map();
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
      const decidedBy = row.decided_by ?? "osm_admin_centre_node";
      assert.ok(
        ["osm_admin_centre_node", "owner_verified", "consensus"].includes(decidedBy),
        `commune ${row.code_commune}: decided_by ${JSON.stringify(decidedBy)} is no deciding source, so its licence cannot be settled`,
      );
      // A CONSENSUS ROW CARRIES ITS OWN LICENCE, because the Candidate that won says where
      // the value came from: the OpenStreetMap seat is the `admin_centre` node and counts in
      // the carve-out exactly like a node correction, a Wikidata winner is CC0, and a
      // record-median winner carries the terms of the packages its records come from. Those
      // strings are the layers' own (WINNER_LICENCE derives them), so the row has to state
      // the licence its winner implies and no paraphrase of it, or the carve-out would rest
      // on this test rather than on the ledger.
      if (decidedBy === "consensus") {
        const winner = row.consensus?.winning_candidate;
        assert.ok(WINNER_LICENCE[winner], `commune ${row.code_commune}: ${JSON.stringify(winner)} is no Candidate a fix can be written from`);
        assert.equal(
          row.licence,
          WINNER_LICENCE[winner],
          `commune ${row.code_commune}: a consensus row's licence must be the one its winning Candidate carries`,
        );
        if (winner === "osm_seat") fromAdminCentreNode.add(row.code_commune);
        else byConsensusWinner.set(winner, (byConsensusWinner.get(winner) ?? new Set()).add(row.code_commune));
        continue;
      }
      if (decidedBy === "owner_verified") {
        // No row ships one today. If one ever does, it has to state its own licence,
        // or "not ODbL" would rest on this test alone.
        assert.ok(
          row.owner_verified?.licence,
          `commune ${row.code_commune}: an owner_verified row must state its own licence, because it is the exception to the carve-out`,
        );
        ownerVerified.add(row.code_commune);
        continue;
      }
      // A confirmation is not a provenance: a row may record a reading taken off a
      // proprietary map, but only as the check on an open value it agrees with, so the
      // row still counts and the confirmation must say what it confirms.
      if (row.owner_confirmation)
        assert.equal(
          row.owner_confirmation.confirms,
          "osm_admin_centre_node",
          `commune ${row.code_commune}: a confirmation must name the open source it confirms, or its terms are unsettled`,
        );
      fromAdminCentreNode.add(row.code_commune);
    }
  }
  for (const code of ownerVerified)
    assert.ok(
      !fromAdminCentreNode.has(code),
      `commune ${code} is counted both as an admin_centre node correction and as an owner-verified point`,
    );

  for (const code of RELATION_CENTROID_COMMUNES) {
    assert.ok(byCode.has(code), `relation-centroid commune ${code} is not a commune this package ships`);
    assert.ok(
      !fromAdminCentreNode.has(code),
      `commune ${code} is counted both as a relation centroid and as an admin_centre node correction`,
    );
  }

  const osmDerived = new Set([...fromAdminCentreNode, ...RELATION_CENTROID_COMMUNES]);

  // A wilaya point inherits its capital commune centre's terms only because it IS that
  // value. Equality is asserted here rather than assumed, so a wilaya point that drifts
  // off its commune drops the licence claim instead of carrying a wrong one; the field
  // and the equality have their own guard in test/wilaya-capital-commune.test.mjs.
  const capitals = json(PKG, "data", "algeria.json").map((w) => ({
    wilaya_code: Number(w.code),
    code_commune: w.capital_commune_code,
    point: [w.longitude, w.latitude],
  }));
  assert.equal(capitals.length, 69, `read ${capitals.length} wilayas`);
  const osmCapitals = [];
  for (const cap of capitals) {
    const commune = byCode.get(cap.code_commune);
    assert.ok(commune, `wilaya ${cap.wilaya_code}: capital ${cap.code_commune} is not a commune`);
    assert.deepEqual(
      cap.point,
      [commune.longitude, commune.latitude],
      `wilaya ${cap.wilaya_code}: its point is not its capital commune's centre, so its licence does not follow from it`,
    );
    if (osmDerived.has(cap.code_commune)) osmCapitals.push(cap.wilaya_code);
  }

  return {
    total: communes.length,
    consensusWinners: Object.fromEntries([...byConsensusWinner].map(([k, v]) => [k, v.size])),
    osmCapitals: osmCapitals.sort((a, b) => a - b),
    restCapitals: capitals.length - osmCapitals.length,
    fromAdminCentreNode: fromAdminCentreNode.size,
    fromRelationCentroid: RELATION_CENTROID_COMMUNES.length,
    ownerVerified: ownerVerified.size,
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
    { generated: "2026-10-01", count: 5 },
    // The coordinate review of the same day, which is why two ledgers share a date and the
    // prose has to state both counts against it.
    { generated: "2026-10-01", count: 68 },
  ]);
  assert.equal(counts.fromAdminCentreNode, 318);
  assert.equal(counts.fromRelationCentroid, 5);
  // Every one of the 68 consensus fixes was won by the OpenStreetMap seat, so all 68 are
  // the `admin_centre` node and none of them brings a second licence into the package. A
  // Wikidata or record-median winner would appear here and would need its own statement.
  assert.deepEqual(counts.consensusWinners, {});
  // No published coordinate is a reading off a proprietary map. Beni-Abbes (5201) is the
  // one row that carries such a reading, and it carries it as a confirmation of its
  // `admin_centre` node, which is the value that ships; so all 318 ledger rows are in
  // the carve-out and none is an owner-verified exception.
  assert.equal(counts.ownerVerified, 0);
  assert.equal(counts.osmDerived, 323);
  assert.equal(counts.rest, 1218);
  // Wilayas 7 (Biskra 701), 16 (Alger Centre 1601), 25 (Constantine 2501), 32 (El Bayadh
  // 3201), 52 (Beni-Abbes 5201) and 61 (El Kantara 717): the six whose capital commune is
  // one of the 323, so their own point is ODbL as well. The coordinate review of
  // 2026-10-01 corrected no capital commune, so the set is unchanged by its 68 rows.
  assert.deepEqual(counts.osmCapitals, [7, 16, 25, 32, 52, 61]);
  assert.equal(counts.restCapitals, 63);
});

test("LICENSE, NOTICE and dataset-metadata.json state the derived count and no other", () => {
  const { osmDerived, fromAdminCentreNode, fromRelationCentroid, perLedger, rest, total } = derive();
  const metadata = json(PKG, "dataset-metadata.json");
  const stated = {
    "LICENSE": read(PKG, "LICENSE"),
    "NOTICE": read(PKG, "NOTICE"),
    "dataset-metadata.json conditionsOfAccess": metadata.conditionsOfAccess,
    "dataset-metadata.json usageInfo": metadata.usageInfo,
    // data/README.md shipped "Six more were replaced in version 2.1.0 ... El Euch (3427)"
    // and "the 250 commune centres corrected on" past this guard on 2026-10-01, because it
    // was only read by the OTHER_CARRIERS test below, which checks the total and not the
    // split behind it. It states both, so it is held to both.
    "packages/dataset/data/README.md": read(PKG, "data", "README.md"),
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
  for (const where of ["LICENSE", "dataset-metadata.json usageInfo", "packages/dataset/data/README.md"])
    assert.ok(
      stated[where].includes(`${fromAdminCentreNode} from`),
      `${where}: does not state the ${fromAdminCentreNode} taken from an admin_centre node`,
    );
  for (const where of ["LICENSE", "NOTICE", "dataset-metadata.json usageInfo", "packages/dataset/data/README.md"]) {
    // The count has to be read against its own date, not found anywhere in the file:
    // LICENSE shipped "4 on 2026-10-01" for a 5-row ledger and passed, because every
    // file that states 256 contains a "5".
    for (const { generated, count } of perLedger)
      assert.match(
        stated[where],
        new RegExp(`(?:^|[^\\d,])${count} (?:corrected )?on ${generated}`),
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

// Every file that carries the wilaya-capital claim. NOTICE used to say the 69 wilaya
// capital coordinates are not OpenStreetMap-derived, which was already false, so each of
// these has to state the derived count, its complement, and every wilaya it covers.
const CAPITAL_CARRIERS = [
  ["LICENSE", () => read(PKG, "LICENSE")],
  ["NOTICE", () => read(PKG, "NOTICE")],
  ["dataset-metadata.json usageInfo", () => json(PKG, "dataset-metadata.json").usageInfo],
  ["packages/dataset/llms.txt", () => read(PKG, "llms.txt")],
  ["packages/dataset/data/README.md", () => read(PKG, "data", "README.md")],
  ["packages/dataset/README.md", () => read(PKG, "README.md")],
];

/** The two locale READMEs carry the same claim in their own words, so the English shapes
 *  above cannot read them. What is checkable across locales is the arithmetic and the
 *  wilayas it covers, inside the ODbL bullet list, which is what drifts. */
const CAPITAL_LOCALES = [
  ["packages/dataset/README.fr.md", () => read(PKG, "README.fr.md")],
  ["packages/dataset/README.ar.md", () => read(PKG, "README.ar.md")],
];

test("every file that states which wilaya capital points are OpenStreetMap-derived states the derived set", () => {
  const { osmCapitals, restCapitals } = derive();
  for (const [where, load] of CAPITAL_CARRIERS) {
    const text = load().replace(/\s+/g, " ");
    const claims = [...text.matchAll(/(?<![\d,])([\d,]+) of the 69 wilaya capital points/g)].map((m) =>
      Number(m[1].replace(/,/g, "")),
    );
    assert.ok(claims.length > 0, `${where}: states no wilaya capital count at all`);
    for (const claim of claims)
      assert.equal(
        claim,
        osmCapitals.length,
        `${where}: states ${claim} of the 69 wilaya capital points are OpenStreetMap-derived, the data gives ${osmCapitals.length}`,
      );

    const complement = [...text.matchAll(/(?:other|remaining) ([\d,]+) wilaya\b/g)].map((m) =>
      Number(m[1].replace(/,/g, "")),
    );
    assert.ok(complement.length > 0, `${where}: does not state how many wilaya capital points are not covered`);
    for (const claim of complement)
      assert.equal(
        claim,
        restCapitals,
        `${where}: states a different complement than the ${restCapitals} wilaya capital points that are not OpenStreetMap-derived`,
      );

    // And it names them, because a count nobody can check is not a licence statement.
    for (const code of osmCapitals)
      assert.match(
        text,
        new RegExp(`(?:^|[^\\d,])${code}[ ,()]`),
        `${where}: does not name wilaya ${code} among the OpenStreetMap-derived capital points`,
      );
  }
});

test("the FR and AR READMEs state the same wilaya capital arithmetic as the English one", () => {
  const { osmCapitals, restCapitals } = derive();
  for (const [where, load] of CAPITAL_LOCALES) {
    const text = load().replace(/\s+/g, " ");
    // The ODbL bullet list only, so a number from elsewhere in the README cannot stand in
    // for the claim. It runs from the licence heading to the attribution sentence after it.
    const start = text.indexOf("ODbL 1.0");
    const bullets = text.slice(start, text.indexOf("data/poste/", start));
    assert.ok(bullets.length > 0, `${where}: no ODbL section to read`);
    assert.match(
      bullets,
      new RegExp(`(?:^|[^\\d,])${osmCapitals.length} [^.;]*?(?:^|[^\\d,])69`),
      `${where}: does not state that ${osmCapitals.length} of the 69 wilaya capital points are OpenStreetMap-derived`,
    );
    assert.match(
      bullets,
      new RegExp(`(?:^|[^\\d,])${restCapitals}(?![\\d])`),
      `${where}: does not state the ${restCapitals} wilaya capital points that are not OpenStreetMap-derived`,
    );
    for (const code of osmCapitals)
      assert.match(
        bullets,
        new RegExp(`(?:^|[^\\d,])${code}(?![\\d])`),
        `${where}: does not name wilaya ${code} among the OpenStreetMap-derived capital points`,
      );
  }
});

// The count is stated in more than the three files above, and every one of those is a
// licence claim a consumer reads. `llms.txt` and `wilaya-boundaries.metadata.json` both
// shipped 251 past this guard on 2026-10-01, because it only ever read LICENSE, NOTICE
// and dataset-metadata.json. Each file is listed with the claim shape it uses, so a
// carrier that stops stating the count fails here rather than going quiet.
const OTHER_CARRIERS = [
  ["packages/dataset/llms.txt", () => read(PKG, "llms.txt")],
  ["packages/dataset/data/README.md", () => read(PKG, "data", "README.md")],
  ["data/geojson/communes.metadata.json", () => JSON.stringify(json(PKG, "data", "geojson", "communes.metadata.json"))],
  [
    "data/geojson/wilaya-boundaries.metadata.json",
    () => JSON.stringify(json(PKG, "data", "geojson", "wilaya-boundaries.metadata.json")),
  ],
  ["index.json", () => JSON.stringify(json(ROOT, "index.json"))],
];

test("every other file that states the OpenStreetMap-derived count states the derived one", () => {
  const { osmDerived, rest } = derive();
  for (const [where, load] of OTHER_CARRIERS) {
    const text = load().replace(/\s+/g, " ");
    const claims = claimsIn(text);
    assert.ok(claims.length > 0, `${where}: states no commune centre count at all`);
    for (const claim of claims)
      assert.equal(claim, osmDerived, `${where}: states ${claim} OpenStreetMap-derived commune centres, the data gives ${osmDerived}`);
    // The complement, only where the file gives it. A file naming one of the two
    // numbers and not the other is still a complete claim.
    const complement = [...text.matchAll(/(?:other|remaining)\s+([\d,]+)\s+commune\b|(?:other|remaining)\s+([\d,]+)\s+carry/g)];
    for (const m of complement)
      assert.equal(
        Number((m[1] ?? m[2]).replace(/,/g, "")),
        rest,
        `${where}: states a different complement than the ${rest} commune coordinates that are not OpenStreetMap-derived`,
      );
  }
});
