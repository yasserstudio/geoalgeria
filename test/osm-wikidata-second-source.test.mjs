// A second source for the published `osm_relation_id` and `wikidata` links.
//
// WHY A SECOND SOURCE. test/osm-wikidata-links.test.mjs holds the published values
// against the harvest the generator itself reads, so it proves the records were not
// hand-edited and nothing else: if the harvest named the wrong relation, both sides
// would carry the wrong relation and agree. ADR 0001 is explicit that one source is
// never enough and that a source our value was copied from proves nothing. So the guard
// here is a committed snapshot of what *Wikidata* says, taken from a different
// endpoint and a different database:
//
//   - P402, Wikidata's own "OpenStreetMap relation ID" for the item. Where Wikidata has
//     one it is an independent statement about the same pairing, so it must name the
//     relation published here.
//   - P31, "instance of". A commune item must be a commune of Algeria and a wilaya item
//     a province of Algeria. This is the check that catches a relation tagged with the
//     item of some other place, which a relation-id check cannot see.
//
// WHAT AN EXCEPTION IS. Every disagreement the snapshot holds is listed below by its
// code or its Q-id with the reason it is not a defect in the link, and the snapshot is
// rich enough for the assertions to re-derive that reason. Nothing is skipped in bulk:
// a new disagreement fails this file, which is the point of having it.
//
// Refresh the snapshot with `node scripts/osm-links-wikidata.mjs --fetch` and review the
// diff; no test queries live.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const read = (...parts) => JSON.parse(readFileSync(join(...parts), "utf8"));

const COMMUNE_FILES = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"];
const communes = COMMUNE_FILES.flatMap((file) => read(DATA, file));
const wilayas = read(DATA, "wilayas.json").wilayas;

const snapshot = read(ROOT, "research", "_osm-links", "wikidata-link-reference.json");
const relations = read(ROOT, "research", "_osm-links", "relations.json");
const byRelation = new Map(relations.relations.map((r) => [r.id, r]));

/** Every published record that carries a Wikidata item, in the snapshot's own shape. */
const published = [
  ...communes
    .filter((c) => c.wikidata !== null)
    .map((c) => ({ kind: "commune", code: c.code_commune, name_fr: c.name_fr, wikidata: c.wikidata, relation: c.osm_relation_id })),
  ...wilayas
    .filter((w) => w.wikidata !== null)
    .map((w) => ({ kind: "wilaya", code: w.code, name_fr: w.name_fr, wikidata: w.wikidata, relation: w.osm_relation_id })),
];

const snapshotByQ = new Map(snapshot.items.map((i) => [i.wikidata, i]));

// --- the exceptions ------------------------------------------------------------------

// Wikidata's P402 names a different relation because OpenStreetMap holds two
// administrative relations for the same commune. The one published here is the one
// carrying the commune's `ref:ONS` code, which is the join this repository uses; the one
// Wikidata points at carries no ONS code and its own, different Wikidata item, so
// neither record nor id is ambiguous. The duplicate is an OpenStreetMap cleanup owed
// upstream, not a reason to republish the link against our own join rule. The assertions
// below re-derive all of that from the committed relation capture.
//   code_commune -> the relation Wikidata names instead
const WIKIDATA_NAMES_A_DUPLICATE = new Map([
  [1347, 2758654], // Bouhlou
  [2240, 2887283], // Sidi Yacoub
  [3818, 2806124], // Sidi Abed
]);

// Five items Wikidata does not type as the administrative unit itself. `wikidata` is the
// item the OpenStreetMap relation carries, read as published and never resolved from a
// name, so these rows are what the second source says about five upstream tags.
//   Q-id -> [the record it is published on, why it is listed rather than failing]
const OFF_CLASS = new Map([
  [
    "Q251181",
    [
      "commune 101",
      "the item is Adrar the chef-lieu city, typed city rather than commune of Algeria. Its own P402 names " +
        "relation 4171602, exactly the relation published here, so the second source confirms the pairing and " +
        "disagrees only about the item's class. A separate commune item, Q131624555, exists upstream.",
    ],
  ],
  [
    "Q1982137",
    [
      "commune 2601",
      "the item is Medea the city, typed city rather than commune of Algeria, and carries no P402. The relation's " +
        "tag is read as published; resolving a commune item from the name is the join this dataset refuses.",
    ],
  ],
  [
    "Q770518",
    [
      "commune 3501",
      "the item is Boumerdes the city, typed city rather than commune of Algeria, and carries no P402, the same " +
        "chef-lieu-for-commune shape as Adrar and Medea.",
    ],
  ],
  [
    "Q3517130",
    [
      "commune 3424",
      "KNOWN UPSTREAM DEFECT, not a benign difference: the item is Achabou, a village inside the commune, not the " +
        "commune. Wikidata's commune item for this record is Q7674990. The OpenStreetMap relation's wikidata tag " +
        "is wrong and an edit is owed upstream; until it lands the published field stays what the relation carries, " +
        "because this dataset publishes the tag and never substitutes an item of its own choosing.",
    ],
  ],
  [
    "Q139936248",
    [
      "wilaya 63",
      "the item is El Aricha Province, typed with the generic province class Q34876 rather than province of Algeria. " +
        "The wilaya was created by the 2026 reform, so its item is new and not yet fully classified.",
    ],
  ],
]);

// --- the snapshot itself -------------------------------------------------------------

test("the snapshot covers every published Wikidata item and nothing else", () => {
  assert.equal(snapshot.items.length, snapshot.count, "the snapshot's own count disagrees with its rows");
  assert.equal(snapshot.requested, published.length, `the snapshot asked about ${snapshot.requested} items, ${published.length} are published`);
  assert.equal(snapshot.count, published.length, "an item the snapshot could not read is a gap in the guard, not a pass");
  for (const row of published) {
    const hit = snapshotByQ.get(row.wikidata);
    assert.ok(hit, `${row.kind} ${row.code} (${row.name_fr}): ${row.wikidata} is not in the Wikidata snapshot`);
    assert.equal(hit.kind, row.kind);
    assert.equal(hit.code, row.code);
  }
  assert.equal(snapshotByQ.size, snapshot.items.length, "the snapshot repeats a Q-id");
});

test("the snapshot is a Wikidata read, licensed CC0, and names the classes it checks", () => {
  assert.match(snapshot.endpoint, /wikidata\.org/);
  assert.match(snapshot.licence, /CC0/);
  assert.match(snapshot.query_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(snapshot.classes, { commune: "Q2989398", wilaya: "Q240601" });
});

// --- P402: an independent statement about the same pairing ---------------------------

test("where Wikidata carries P402 it names the relation published here", () => {
  let checked = 0;
  for (const row of published) {
    const p402 = snapshotByQ.get(row.wikidata).p402;
    if (p402.length === 0) continue; // Wikidata simply has no statement; silence is not a negative.
    const expected = WIKIDATA_NAMES_A_DUPLICATE.get(row.code) ?? row.relation;
    assert.ok(
      p402.includes(expected),
      `${row.kind} ${row.code} (${row.name_fr}): published relation ${row.relation}, Wikidata P402 says ${p402.join(" / ")}`,
    );
    checked++;
  }
  assert.ok(checked > 600, `only ${checked} links had a second statement to check against; the snapshot looks truncated`);
});

test("every duplicate exception is a real duplicate, checked against the relation capture", () => {
  const publishedRelations = new Set(published.map((r) => r.relation));
  const publishedItems = new Set(published.map((r) => r.wikidata));
  for (const [code, duplicate] of WIKIDATA_NAMES_A_DUPLICATE) {
    const ours = communes.find((c) => c.code_commune === code);
    assert.ok(ours, `the duplicate exception names commune ${code}, which is not published`);
    const mine = byRelation.get(ours.osm_relation_id);
    const theirs = byRelation.get(duplicate);
    assert.ok(mine, `relation ${ours.osm_relation_id} is not in research/_osm-links/relations.json`);
    assert.ok(theirs, `relation ${duplicate} is not in research/_osm-links/relations.json`);
    // Both are administrative communes in OpenStreetMap: a duplicate, not a different kind of place.
    for (const [label, rel] of [["ours", mine], ["Wikidata's", theirs]]) {
      assert.equal(rel.tags.boundary, "administrative", `commune ${code}: ${label} relation ${rel.id} is not an administrative boundary`);
      assert.equal(rel.tags.admin_level, "8", `commune ${code}: ${label} relation ${rel.id} is not admin_level=8`);
    }
    // Ours is the one carrying the ONS code, which is why the harvest chose it.
    assert.equal(Number(mine.tags["ref:ONS"]), code, `commune ${code}: the published relation does not carry this ONS code`);
    assert.equal(
      theirs.tags["ref:ONS"],
      undefined,
      `commune ${code}: relation ${duplicate} now carries an ONS code too, so this is an ambiguity to resolve, not a benign duplicate`,
    );
    // And it is not a relation or an item this dataset publishes anywhere.
    assert.ok(!publishedRelations.has(duplicate), `relation ${duplicate} is published on a record, so this is not a spare duplicate`);
    assert.ok(
      !publishedItems.has(theirs.tags.wikidata),
      `commune ${code}: the duplicate relation's item ${theirs.tags.wikidata} is also published, so the two overlap`,
    );
  }
});

test("no Wikidata P402 points at a relation published on a different record", () => {
  const holderOf = new Map(published.map((r) => [r.relation, r]));
  for (const row of published)
    for (const relation of snapshotByQ.get(row.wikidata).p402) {
      const holder = holderOf.get(relation);
      if (!holder) continue; // a relation this dataset does not publish says nothing about our joins
      assert.equal(
        holder.wikidata,
        row.wikidata,
        `${row.kind} ${row.code} (${row.name_fr}) item ${row.wikidata} names relation ${relation}, which is published on ` +
          `${holder.kind} ${holder.code} (${holder.name_fr}); two records would answer one Wikidata item`,
      );
    }
});

// --- P31: the item is the administrative unit, not some other place ------------------

test("every published item is a commune of Algeria or a province of Algeria", () => {
  const unused = new Set(OFF_CLASS.keys());
  for (const row of published) {
    const item = snapshotByQ.get(row.wikidata);
    const want = snapshot.classes[row.kind === "commune" ? "commune" : "wilaya"];
    if (item.p31.includes(want)) {
      assert.ok(
        !OFF_CLASS.has(row.wikidata),
        `${row.wikidata} is listed as off-class but Wikidata now types it ${want}; drop the exception`,
      );
      continue;
    }
    unused.delete(row.wikidata);
    const listed = OFF_CLASS.get(row.wikidata);
    assert.ok(
      listed,
      `${row.kind} ${row.code} (${row.name_fr}): item ${row.wikidata} is typed ${item.p31.join(", ")}, not ${want}. ` +
        `The relation is tagged with an item that is not this administrative unit; check it upstream before listing it.`,
    );
    assert.equal(listed[0], `${row.kind} ${row.code}`, `${row.wikidata}: the exception names a different record`);
  }
  assert.deepEqual([...unused], [], "an off-class exception no longer applies; remove it rather than leaving a stale claim");
});

test("every off-class exception states a reason", () => {
  for (const [qid, [label, reason]] of OFF_CLASS) {
    assert.ok(snapshotByQ.has(qid), `${qid} is listed as off-class but is not published`);
    assert.ok(label.length > 0 && reason.length > 80, `${qid} (${label}): the reason is too thin to audit`);
  }
});
