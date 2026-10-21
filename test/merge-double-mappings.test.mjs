// mergeDoubleMappings is what turns the two OpenStreetMap elements of a Double
// mapping into one record. The rule the owner set on 13 October 2026: the kept
// element must come out of a merge carrying every field either side had, so merging
// never costs a phone number, an address, opening hours or a dispensing flag. The
// kept element's own value wins wherever both state one, and a disagreement is
// reported rather than resolved or concatenated.
//
// The fixtures below are the real `amenity=pharmacy` tags of the twelve double
// mappings this merges dataset-wide, read from the committed Overpass pull, so a
// regression here is a regression against observed upstream data rather than
// against an invented example.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeDoubleMappings } from "../scripts/lib/merge-double-mappings.mjs";
import { looseKey } from "../packages/normalize/index.js";

// The generator's own ignored-word list, which it owns because which words say
// only "pharmacy" is a fact about this dataset and not about the shared fold
// (scripts/lib/name-script.mjs). Declared here the same way RANK/FILL are, and
// checked against the generator's source by the parity test in
// test/pharmacies-name-script.test.mjs, so the copy cannot drift.
const PHARMACY_WORDS = new Set(
  ["pharmacie", "pharmacy", "pharmacia", "officine", "صيدلية", "الصيدلية", "ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ"].map(looseKey),
);


// The pharmacies generator's own two lists: `RANK` decides which element of a pair
// is kept, `FILL` is everything the kept element absorbs when it lacks it, declared
// as a superset of RANK the same way the generator declares it.
const RANK = ["name", "name_ar", "name_fr", "phone", "opening_hours", "address"];
const FILL = [...RANK, "operator", "dispensing"];

const row = (osm_id, lat, lng, fields) => ({
  osm_id,
  lat,
  lng,
  name: null,
  name_fr: null,
  name_ar: null,
  operator: null,
  phone: null,
  opening_hours: null,
  dispensing: null,
  address: null,
  ...fields,
});

const merge = (rows, isPublished = () => false) =>
  mergeDoubleMappings(rows, { ignoredWords: PHARMACY_WORDS, rankFields: RANK, fillFields: FILL, isPublished });

// Each entry: the double mapping as tagged, and the OSM id that must be kept. The
// tags and the coordinates are both read off the committed Overpass pull, rounded
// the way the generator rounds them, so each pair's own real distance is under test
// too: 1.3 m (Bouzitoune) to 38.1 m (Mehania), the widest one still inside 40 m.
const PAIRS = [
  {
    label: "02 Fettah",
    keep: "node/4310053290",
    rows: [
      row("node/4310053290", 36.182934, 1.534051, { name: "Pharmacie Fettah", name_fr: "Pharmacie Fettah", opening_hours: "24/7", address: "02003" }),
      row("node/4310071589", 36.182997, 1.53415, { name: "Fettah", name_fr: "Fettah", address: "02003" }),
    ],
  },
  {
    label: "07 Zobiri, dispensing only on the dropped side",
    keep: "node/3449612819",
    rows: [
      row("node/3449612819", 34.856974, 5.712292, { name: "ZOBIRI", name_fr: "ZOBIRI" }),
      row("way/1025833581", 34.857002, 5.712289, { name: "pharmacie ZOBIRI", name_fr: "pharmacie ZOBIRI", dispensing: true }),
    ],
  },
  {
    label: "10 Saoudi",
    keep: "node/4354050798",
    rows: [
      row("node/4354050798", 36.358667, 4.32082, { name: "arraw lahram", name_fr: "saoudi", name_ar: "سعودي لونيس و اخونه" }),
      row("node/4366704493", 36.358716, 4.320911, { name: "saoudi", name_fr: "saoudi" }),
    ],
  },
  {
    label: "14 Hadj Said, every field on both sides",
    keep: "node/4842288624",
    rows: [
      row("node/4842288624", 35.181953, 1.490138, { name: "HADJ SAID", name_fr: "HADJ SAID", phone: "046285179", opening_hours: "Mo-Su 08:00-22:00", address: "Route de Tousnina" }),
      row("node/4842421621", 35.181933, 1.490107, { name: "pharmacie hadj said", name_fr: "pharmacie hadj said", phone: "046285179", opening_hours: "Mo-Su 08:00-22:00", address: "Route de Tousnina" }),
    ],
  },
  {
    label: "16 Bouhassane, dispensing only on the dropped side",
    keep: "node/2952897872",
    rows: [
      row("node/2952897872", 36.752089, 3.062804, { name: "H. Bouhassane بوحسان", name_fr: "H. Bouhassane", name_ar: "بوحسان", phone: "021651241", address: "2 Boulevard des Frères Merrakchi" }),
      row("node/4722427389", 36.752116, 3.062946, { name: "Pharmacie Bouhacene صيدلية بوحسان", name_fr: "Pharmacie Bouhacene", name_ar: "صيدلية بوحسان", dispensing: true }),
    ],
  },
  {
    label: "19 Yalaoui",
    keep: "node/4828614724",
    rows: [
      row("node/4828614724", 36.329811, 5.058575, { name: "yalaoui", name_fr: "yalaoui" }),
      row("node/4850703921", 36.329824, 5.058489, { name: "pharmacie yalaoui", name_fr: "pharmacie yalaoui" }),
    ],
  },
  {
    label: "23 Bouzitoune, the richer record survives",
    keep: "node/6468796085",
    rows: [
      row("node/6259508786", 36.893394, 7.731465, { name: "Bouzitoune hocine", name_fr: "Bouzitoune hocine" }),
      row("node/6468796085", 36.893387, 7.731476, { name: "صيدلية بوزيتون حسين", name_fr: "Pharmacie bouzitoune hocine", name_ar: "صيدلية بوزيتون حسين" }),
    ],
  },
  {
    label: "39 Khatra",
    keep: "node/4420614389",
    rows: [
      row("node/4420614389", 33.493487, 6.793576, { name: "صيدلية خطرة أم الخير", name_fr: "Pharmacie Khatra", name_ar: "صيدلية خطرة أم الخير", phone: "032202738", opening_hours: "Mo-Su 07:30-23:00" }),
      row("node/4421596289", 33.493497, 6.793586, { name: "صيدلية خطرة", name_fr: "Pharmacie Khatra", name_ar: "صيدلية خطرة" }),
    ],
  },
  {
    label: "43 Keziou",
    keep: "node/4588887389",
    rows: [
      row("node/4588887389", 36.391588, 6.129738, { name: "صيدلية كزيو", name_fr: "Pharmacie Keziou Slimane", name_ar: "صيدلية كزيو" }),
      row("node/4620337791", 36.391621, 6.130007, { name: "كازيو", name_fr: "Pharmacie Keziou Slimane", name_ar: "كازيو" }),
    ],
  },
  {
    label: "43 Oued Endja Bouchekouf",
    keep: "node/2418479678",
    rows: [
      row("node/2418479678", 36.429376, 6.11988, { name: "Pharmacie bouchekouf صيدلية بوشقوف", name_fr: "Pharmacie Bouchekouf", name_ar: "صيدلية بوشقوف" }),
      row("node/5971620189", 36.429361, 6.119809, { name: "صيدلية بوشقوف", name_fr: "Pharmacie Bouchekouf", name_ar: "صيدلية بوشقوف" }),
    ],
  },
  {
    label: "51 Djeghader Reda, dispensing only on the dropped side and two real conflicts",
    keep: "node/8406143532",
    rows: [
      row("node/8406143532", 34.604171, 5.107223, { name: "صيدلية جغادر رضا", name_fr: "Pharmacie DJEGHADER REDA", name_ar: "صيدلية جغادر رضا", operator: "جغادر رضا", phone: "0553271244", opening_hours: "24/7", address: "06 BIS شارع سعودي عبد القادر, الدوسن 07007" }),
      row("way/905180545", 34.604136, 5.107231, { name: "DJEGHADER REDA", name_fr: "DJEGHADER REDA", dispensing: true, opening_hours: "08:00-22:00", address: "06 BIS SAOUDI ABDELKADER, الدوسن" }),
    ],
  },
  {
    label: "55 Mehania Azzi, the record with opening hours survives",
    keep: "node/6175270286",
    rows: [
      row("node/6157205085", 33.110593, 6.071, { name: "صيدلية عزي شمس الدين", name_fr: "Pharmacie Mehania - Azzi Chams Eddine", name_ar: "صيدلية عزي شمس الدين", address: "تقرت" }),
      row("node/6175270286", 33.11093, 6.071071, { name: "صيدلية مهنية - عزي شمس الدين", name_fr: "Pharmacie Mehania - Azzi Chams Eddine", name_ar: "صيدلية مهنية - عزي شمس الدين", address: "تقرت", opening_hours: "Sa-Th 07:00-23:00; Fr 17:00-23:00" }),
    ],
  },
];

test("each of the twelve double mappings merges to the element the keep rule names", () => {
  for (const pair of PAIRS) {
    const { rows, merged } = merge(pair.rows);
    assert.equal(rows.length, 1, pair.label);
    assert.equal(rows[0].osm_id, pair.keep, pair.label);
    assert.equal(merged.length, 1, pair.label);
    assert.deepEqual(
      merged[0],
      { dropped: pair.rows.find((r) => r.osm_id !== pair.keep).osm_id, kept: pair.keep },
      pair.label,
    );
  }
});

// The rule itself: a merge may not cost a field.
test("a merged double mapping loses no non-null field the retired element had", () => {
  for (const pair of PAIRS) {
    const before = pair.rows.map((r) => ({ ...r }));
    const { rows } = merge(pair.rows);
    const kept = rows[0];
    for (const field of FILL) {
      const stated = before.filter((r) => r[field] != null);
      if (!stated.length) continue;
      assert.notEqual(
        kept[field],
        null,
        `${pair.label}: ${field} was stated by ${stated.map((r) => r.osm_id).join(" and ")} and the kept element has none`,
      );
    }
  }
});

test("the three dispensing flags that only the merged-away element carried are kept", () => {
  for (const label of [
    "07 Zobiri, dispensing only on the dropped side",
    "16 Bouhassane, dispensing only on the dropped side",
    "51 Djeghader Reda, dispensing only on the dropped side and two real conflicts",
  ]) {
    const pair = PAIRS.find((p) => p.label === label);
    const { rows } = merge(pair.rows.map((r) => ({ ...r })));
    assert.equal(rows[0].dispensing, true, label);
  }
});

test("the kept element's own value wins a conflict, and the conflict is reported", () => {
  const pair = PAIRS.find((p) => p.label.startsWith("51 Djeghader"));
  const { rows, conflicts } = merge(pair.rows.map((r) => ({ ...r })));
  const kept = rows[0];
  // Nothing is resolved, averaged or concatenated: the kept record's value stands.
  assert.equal(kept.opening_hours, "24/7");
  assert.equal(kept.address, "06 BIS شارع سعودي عبد القادر, الدوسن 07007");
  assert.ok(!kept.address.includes("SAOUDI ABDELKADER"));
  const reported = conflicts.filter((c) => c.kept === "node/8406143532").map((c) => c.field);
  assert.ok(reported.includes("opening_hours"), `expected an opening_hours conflict, got ${reported}`);
  assert.ok(reported.includes("address"), `expected an address conflict, got ${reported}`);
});

test("an already-published element is kept even when the other carries more", () => {
  const rows = [
    row("node/1", 36.75, 3.06, { name: "Pharmacie Amel", name_fr: "Pharmacie Amel" }),
    row("node/2", 36.750045, 3.06, { name: "Amel", name_fr: "Amel", name_ar: "الأمل", phone: "021000000", address: "Rue X" }),
  ];
  const { rows: out } = merge(rows, (id) => id === "node/1");
  assert.equal(out.length, 1);
  assert.equal(out[0].osm_id, "node/1");
  // It is kept, and still ends up with everything the richer element had.
  assert.equal(out[0].name_ar, "الأمل");
  assert.equal(out[0].phone, "021000000");
  assert.equal(out[0].address, "Rue X");
});

test("a record whose name only says 'pharmacy' merges nothing", () => {
  const rows = [
    row("node/1", 36.75, 3.06, { name: "Pharmacie", name_fr: "Pharmacie" }),
    row("node/2", 36.750045, 3.06, { name: "صيدلية", name_ar: "صيدلية" }),
  ];
  assert.equal(merge(rows).rows.length, 2);
});

test("records further apart than the radius are two pharmacies", () => {
  const rows = [
    row("node/1", 36.75, 3.06, { name: "Fettah", name_fr: "Fettah" }),
    row("node/2", 36.7509, 3.06, { name: "Fettah", name_fr: "Fettah" }), // ~100 m
  ];
  assert.equal(merge(rows).rows.length, 2);
});

test("the outcome does not depend on the order upstream answered in", () => {
  for (const pair of PAIRS) {
    const forward = merge(pair.rows.map((r) => ({ ...r })));
    const reversed = merge([...pair.rows].reverse().map((r) => ({ ...r })));
    assert.equal(forward.rows[0].osm_id, reversed.rows[0].osm_id, pair.label);
    assert.deepEqual(
      FILL.map((field) => forward.rows[0][field]),
      FILL.map((field) => reversed.rows[0][field]),
      pair.label,
    );
    assert.deepEqual(forward.merged, reversed.merged, pair.label);
  }
});

test("a forward is re-pointed rather than chained when a third element displaces the kept one", () => {
  // node/3 is published and arrives last in id order, so it takes over a pair that
  // has already merged once. Both retired ids must forward straight to it.
  const rows = [
    row("node/1", 36.75, 3.06, { name: "Fettah", name_fr: "Fettah", phone: "021000001" }),
    row("node/2", 36.750045, 3.06, { name: "Pharmacie Fettah", name_fr: "Pharmacie Fettah", address: "Rue X" }),
    row("node/3", 36.750089, 3.06, { name: "Fettah", name_fr: "Fettah", opening_hours: "24/7" }),
  ];
  const { rows: out, merged } = merge(rows, (id) => id === "node/3");
  assert.equal(out.length, 1);
  assert.equal(out[0].osm_id, "node/3");
  assert.deepEqual([...new Set(merged.map((c) => c.kept))], ["node/3"]);
  // And it carries what both of them said.
  assert.equal(out[0].phone, "021000001");
  assert.equal(out[0].address, "Rue X");
  assert.equal(out[0].opening_hours, "24/7");
});

// absorb() fills the kept element's gaps, so it must write to copies: a caller that
// still holds the array it passed has every right to find it as it passed it (the
// rule sante's mergeRepeatPosts keeps).
test("the caller's rows are never mutated", () => {
  const pair = PAIRS.find((p) => p.label.startsWith("07 Zobiri"));
  const rows = pair.rows.map((r) => ({ ...r }));
  const before = structuredClone(rows);
  const { rows: out } = merge(rows);
  assert.deepEqual(rows, before, "the input array's objects changed");
  // The merge really did happen, and on a different object.
  assert.equal(out.length, 1);
  assert.equal(out[0].dispensing, true);
  assert.equal(rows.find((r) => r.osm_id === "node/3449612819").dispensing, null);
  assert.ok(out[0] !== rows[0] && out[0] !== rows[1]);
});
