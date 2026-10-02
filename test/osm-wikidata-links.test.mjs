// `osm_relation_id` and `wikidata` on every commune and wilaya record.
//
// The two fields are a link, not a measurement: each one is read off the OpenStreetMap
// administrative relation the commune-centre audit already joined to this record, and
// the audit's join is the only thing that may decide which relation that is. So the
// guard here is identity with the harvest, not plausibility: a value that is not the
// one research/_commune-centres/osm-seat-reference.json carries for that code is a
// defect even when it is a real relation of a real commune, because nothing in this
// repository would then say where it came from.
//
// The second half is uniqueness. One OpenStreetMap relation is one place, so two
// records sharing a relation id (or a Wikidata item) is an upstream or linkage bug to
// report, never a value to publish twice: it would make a consumer's join to OSM
// return two Algerian communes for one boundary.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const read = (...parts) => JSON.parse(readFileSync(join(...parts), "utf8"));

const COMMUNE_FILES = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"];
const COMMUNE_COUNT = 1541;
const WILAYA_COUNT = 69;

/** The harvest: the audit's own linkage, which is where both fields come from. */
const reference = read(ROOT, "research", "_commune-centres", "osm-seat-reference.json");
const referenceCommunes = new Map(reference.communes.map((c) => [c.code_commune, c]));
const referenceWilayas = new Map(reference.wilayas.map((w) => [w.wilaya_code, w]));

const communes = COMMUNE_FILES.flatMap((file) => read(DATA, file));
const wilayas = read(DATA, "wilayas.json").wilayas;
const unified = read(DATA, "algeria.json");
const unifiedCommunes = unified.flatMap((w) => w.communes ?? []);
const sidecar = read(DATA, "osm-links.metadata.json");

const Q = /^Q[1-9][0-9]*$/;

// The second tier, decided by the Owner on 2026-10-02. Three communes OpenStreetMap does
// hold and the 2026-09-29 capture could not see, because that capture asks Overpass for
// `boundary=administrative` AND `admin_level=8` and each of these relations fails one half
// of the filter while carrying the commune's own `ref:ONS` code. They are linked from their
// own committed capture, not from the harvest, and the tests below hold that each one is
// still mis-tagged (a relation that becomes standard belongs in the first tier) and still
// carries the right ONS code.
const SECOND_TIER = new Map([
  [630, 4069543],
  [1634, 540555],
  [2110, 6407308],
]);
// Only a daira relation carries ONS code 4703, so that commune keeps a null link.
const DAIRA_ONLY = new Map([[4703, 6823963]]);
const secondTierCapture = read(ROOT, "research", "_osm-links", "relations.json");
const capturedRelations = new Map(secondTierCapture.relations.map((r) => [r.id, r]));

/** Every record that carries the two fields, labelled for a failure message. */
const records = [
  ...communes.map((c) => ({ label: `commune ${c.code_commune} (${c.name_fr})`, row: c })),
  ...wilayas.map((w) => ({ label: `wilaya ${w.code} (${w.name_fr})`, row: w })),
];

test("the two fields are present on all 1,541 communes and all 69 wilayas", () => {
  assert.equal(communes.length, COMMUNE_COUNT);
  assert.equal(wilayas.length, WILAYA_COUNT);
  assert.equal(unifiedCommunes.length, COMMUNE_COUNT);
  assert.equal(unified.length, WILAYA_COUNT);
  for (const { label, row } of records)
    for (const field of ["osm_relation_id", "wikidata"])
      assert.ok(field in row, `${label}: ${field} is absent, and an optional field is null, never missing`);
});

test("a relation id is a positive integer and a Wikidata item is Q followed by digits", () => {
  for (const { label, row } of records) {
    const id = row.osm_relation_id;
    if (id !== null)
      assert.ok(
        Number.isSafeInteger(id) && id > 0,
        `${label}: osm_relation_id ${JSON.stringify(id)} is not a positive integer`,
      );
    const item = row.wikidata;
    if (item !== null) assert.match(item, Q, `${label}: wikidata ${JSON.stringify(item)} is not a Q item`);
  }
});

test("a Wikidata item never appears without the relation it was read from", () => {
  for (const { label, row } of records)
    if (row.wikidata !== null)
      assert.notEqual(
        row.osm_relation_id,
        null,
        `${label}: carries a Wikidata item with no relation, so nothing says where the item came from`,
      );
});

test("no relation id and no Wikidata item is repeated across records", () => {
  for (const field of ["osm_relation_id", "wikidata"]) {
    const seen = new Map();
    for (const { label, row } of records) {
      const value = row[field];
      if (value === null) continue;
      const first = seen.get(value);
      assert.equal(
        first,
        undefined,
        `${field} ${value} is on both ${first} and ${label}; one relation is one place, so this is a linkage bug to report`,
      );
      seen.set(value, label);
    }
  }
});

test("every value is the one the audit's linkage carries for that record", () => {
  for (const commune of communes) {
    if (SECOND_TIER.has(commune.code_commune)) continue; // the harvest has no row; the second-tier capture does
    const hit = referenceCommunes.get(commune.code_commune);
    assert.equal(
      commune.osm_relation_id,
      hit?.osm_relation_id ?? null,
      `commune ${commune.code_commune} (${commune.name_fr}): osm_relation_id is not the audit's`,
    );
    assert.equal(
      commune.wikidata,
      hit?.wikidata ?? null,
      `commune ${commune.code_commune} (${commune.name_fr}): wikidata is not the audit's`,
    );
  }
  for (const wilaya of wilayas) {
    const hit = referenceWilayas.get(wilaya.code);
    assert.equal(wilaya.osm_relation_id, hit?.osm_relation_id ?? null, `wilaya ${wilaya.code}: osm_relation_id`);
    assert.equal(wilaya.wikidata, hit?.wikidata ?? null, `wilaya ${wilaya.code}: wikidata`);
  }
});

test("the audit decided every first-tier linkage on an ONS code or a reviewed pin, never on a name alone", () => {
  const audit = read(ROOT, "research", "_commune-centres", "audit-2026-09-29.json");
  const byCode = new Map(audit.all.map((row) => [row.code_commune, row]));
  for (const commune of communes) {
    if (commune.osm_relation_id === null) continue;
    if (SECOND_TIER.has(commune.code_commune)) continue; // checked by its own test below
    const row = byCode.get(commune.code_commune);
    assert.ok(row, `commune ${commune.code_commune} carries a relation the audit does not report`);
    assert.equal(
      row.osm.relation,
      commune.osm_relation_id,
      `commune ${commune.code_commune}: relation differs from the audit's`,
    );
    assert.ok(
      row.matched_by === "ref:ONS" ||
        row.matched_by.startsWith("pre-reform ref:ONS") ||
        row.matched_by.startsWith("pinned:"),
      `commune ${commune.code_commune}: matched_by "${row.matched_by}" is not an ONS join or a reviewed pin`,
    );
  }
});

test("the one record with no link is the one OpenStreetMap holds no commune relation for", () => {
  const unlinked = communes.filter((c) => c.osm_relation_id === null).map((c) => c.code_commune);
  assert.deepEqual(unlinked.sort((a, b) => a - b), [4703]);
  const noItem = communes.filter((c) => c.osm_relation_id !== null && c.wikidata === null);
  assert.deepEqual(
    noItem.map((c) => c.code_commune),
    [4401],
    "only Ain-Defla's relation carries no wikidata tag; a relation with none stays null",
  );
  assert.equal(wilayas.filter((w) => w.osm_relation_id === null || w.wikidata === null).length, 0);
});

test("the coverage counts are the ones the sidecar and the changelog state", () => {
  const counts = {
    communes_with_relation: communes.filter((c) => c.osm_relation_id !== null).length,
    communes_with_wikidata: communes.filter((c) => c.wikidata !== null).length,
    wilayas_with_relation: wilayas.filter((w) => w.osm_relation_id !== null).length,
    wilayas_with_wikidata: wilayas.filter((w) => w.wikidata !== null).length,
  };
  assert.deepEqual(counts, {
    communes_with_relation: 1540,
    communes_with_wikidata: 1539,
    wilayas_with_relation: 69,
    wilayas_with_wikidata: 69,
  });
  assert.deepEqual(sidecar.coverage, counts);
});

test("the sidecar pins the Overpass snapshot the ids were harvested from", () => {
  assert.equal(sidecar.timestamp_osm_base, reference.timestamp_osm_base);
  assert.equal(sidecar.timestamp_osm_base, "2026-09-29T12:54:47Z");
  assert.match(sidecar.licence, /ODbL/);
  assert.equal(sidecar.total_communes, COMMUNE_COUNT);
  assert.equal(sidecar.total_wilayas, WILAYA_COUNT);
  assert.deepEqual(
    sidecar.communes_without_relation.map((c) => c.code_commune),
    [4703],
  );
});

test("algeria.json carries the same two values as the flagship records", () => {
  const byCode = new Map(communes.map((c) => [c.code_commune, c]));
  for (const commune of unifiedCommunes) {
    const flagship = byCode.get(commune.code_commune);
    assert.ok(flagship, `algeria.json commune ${commune.code_commune} is not in communes_w*.json`);
    assert.equal(
      commune.osm_relation_id,
      flagship.osm_relation_id,
      `algeria.json commune ${commune.code_commune}: osm_relation_id drifted`,
    );
    assert.equal(
      commune.wikidata,
      flagship.wikidata,
      `algeria.json commune ${commune.code_commune}: wikidata drifted`,
    );
  }
  const byWilaya = new Map(wilayas.map((w) => [w.code, w]));
  for (const wilaya of unified) {
    const flagship = byWilaya.get(wilaya.code);
    assert.ok(flagship, `algeria.json wilaya ${wilaya.code} is not in wilayas.json`);
    assert.equal(wilaya.osm_relation_id, flagship.osm_relation_id, `algeria.json wilaya ${wilaya.code}: relation`);
    assert.equal(wilaya.wikidata, flagship.wikidata, `algeria.json wilaya ${wilaya.code}: wikidata`);
  }
});

test("a wilaya's link is its own admin_level=4 relation, not its capital commune's", () => {
  // The capital point IS the commune's point (#228), so a reader may expect the link to
  // be shared too. It is not: the wilaya links to the province relation and the commune
  // to its own, which is why no id repeats across the two sets.
  const byCode = new Map(communes.map((c) => [c.code_commune, c]));
  for (const wilaya of wilayas) {
    const capital = byCode.get(wilaya.capital_commune_code);
    assert.ok(capital, `wilaya ${wilaya.code}: capital_commune_code does not join a commune`);
    assert.notEqual(
      wilaya.osm_relation_id,
      capital.osm_relation_id,
      `wilaya ${wilaya.code} and its capital commune share relation ${wilaya.osm_relation_id}`,
    );
  }
});

test("the generator agrees with what is committed, sidecar included", () => {
  // The same check the other ledger-backed fields use: the script that wrote these
  // values re-derives them from the harvest and fails if a record or the sidecar has
  // drifted, so a hand edit cannot quietly replace a harvested id.
  assert.doesNotThrow(() =>
    execFileSync(process.execPath, [join(ROOT, "scripts", "add-osm-links.mjs"), "--check"], { stdio: "pipe" }),
  );
});

// --- the second tier -----------------------------------------------------------------

test("the second tier's three communes carry the relation and item their own capture holds", () => {
  const byCode = new Map(communes.map((c) => [c.code_commune, c]));
  for (const [code, relationId] of SECOND_TIER) {
    const commune = byCode.get(code);
    assert.ok(commune, `the second tier names commune ${code}, which is not published`);
    const relation = capturedRelations.get(relationId);
    assert.ok(relation, `relation ${relationId} is not in research/_osm-links/relations.json`);
    assert.equal(commune.osm_relation_id, relationId, `commune ${code} (${commune.name_fr}): relation is not the captured one`);
    assert.equal(
      commune.wikidata,
      relation.tags.wikidata ?? null,
      `commune ${code} (${commune.name_fr}): the item is not the one relation ${relationId} carries`,
    );
    assert.ok(!referenceCommunes.get(code)?.osm_relation_id, `commune ${code} is in the first-tier harvest too; the tiers overlap`);
  }
});

test("every second-tier relation carries this commune's ONS code, which is why it is linked at all", () => {
  for (const [code, relationId] of SECOND_TIER) {
    const tags = capturedRelations.get(relationId).tags;
    assert.equal(
      Number(tags["ref:ONS"]),
      code,
      `relation ${relationId} carries ref:ONS ${JSON.stringify(tags["ref:ONS"])}, not commune ${code}; an ONS match is the whole basis of the pin`,
    );
  }
});

test("every second-tier relation is still mis-tagged, and the sidecar names the defect", () => {
  const listed = new Map(sidecar.second_tier.map((row) => [row.code_commune, row]));
  assert.deepEqual([...listed.keys()], [...SECOND_TIER.keys()].sort((a, b) => a - b));
  for (const [code, relationId] of SECOND_TIER) {
    const tags = capturedRelations.get(relationId).tags;
    const defects = [];
    if (tags.boundary !== "administrative") defects.push(tags.boundary ? `boundary=${tags.boundary}` : "no boundary tag");
    if (tags.admin_level !== "8") defects.push(tags.admin_level ? `admin_level=${tags.admin_level}` : "no admin_level tag");
    assert.ok(
      defects.length > 0,
      `relation ${relationId} is now boundary=administrative and admin_level=8, so commune ${code} belongs in the first tier; refresh the capture and move it`,
    );
    const row = listed.get(code);
    assert.equal(row.osm_relation_id, relationId);
    assert.deepEqual(row.tag_defect, defects, `the sidecar's defect for commune ${code} is not the one the capture shows`);
    assert.match(row.reason, /ref:ONS/, `the sidecar's reason for commune ${code} does not say the match was on the ONS code`);
  }
});

test("the commune with no link has a reason naming the daira relation that does carry its code", () => {
  const [row] = sidecar.communes_without_relation;
  assert.equal(row.code_commune, 4703);
  const relationId = DAIRA_ONLY.get(4703);
  const relation = capturedRelations.get(relationId);
  assert.ok(relation, `relation ${relationId} is not in the capture, so the reason cites evidence that is not committed`);
  assert.equal(Number(relation.tags["ref:ONS"]), 4703);
  assert.equal(relation.tags.admin_level, "6", `relation ${relationId} is no longer a daira; recheck whether a commune relation now exists`);
  assert.match(row.reason, new RegExp(String(relationId)), "the reason does not name the daira relation");
  assert.match(row.reason, /daira/i, "the reason does not say the only relation with this code is a daira");
  assert.ok(
    !/OpenStreetMap has no|has no relation/i.test(row.reason),
    "the reason still claims OpenStreetMap has no relation carrying this code, which is not true",
  );
});

test("the capture pins the Overpass snapshot the second tier was read from", () => {
  assert.match(secondTierCapture.timestamp_osm_base, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(secondTierCapture.licence, /ODbL/);
  assert.equal(sidecar.second_tier_capture, "research/_osm-links/relations.json");
  assert.equal(sidecar.second_tier_timestamp_osm_base, secondTierCapture.timestamp_osm_base);
});
