// collapseDuplicates is what turns two OpenStreetMap records for one pharmacy into
// one record. The rule the owner set on 13 October 2026: the survivor must come out
// of a collapse carrying every field either side had, so de-duplication never costs
// a phone number, an address, opening hours or a dispensing flag. The survivor's own
// value wins wherever both state one, and a disagreement is reported rather than
// merged or concatenated.
//
// The pair fixtures below are the real `amenity=pharmacy` tags of the twelve pairs
// this collapses dataset-wide, read from the committed Overpass pull, so a
// regression here is a regression against observed upstream data rather than
// against an invented example.

import { test } from "node:test";
import assert from "node:assert/strict";
import { collapseDuplicates } from "../scripts/lib/collapse-duplicates.mjs";
import { PHARMACY_WORDS } from "../scripts/lib/name-script.mjs";

// The pharmacies generator's own two lists: `rank` decides which record of a pair
// survives, `fill` is everything the survivor absorbs when it lacks it.
const RANK = ["name", "name_ar", "name_fr", "phone", "opening_hours", "address"];
const FILL = ["name", "name_fr", "name_ar", "operator", "phone", "opening_hours", "dispensing", "address"];

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

const collapse = (rows, isPublished = () => false) =>
  collapseDuplicates(rows, { ignoredWords: PHARMACY_WORDS, rankFields: RANK, fillFields: FILL, isPublished });

// Each entry: the pair as tagged, and the OSM id that must survive it. Coordinates
// are the real ones, so each pair's own distance (1.3 m to 38.1 m) is under test too.
const PAIRS = [
  {
    label: "02 Fettah",
    keep: "node/4310053290",
    rows: [
      row("node/4310053290", 36.144787, 1.272355, { name: "Pharmacie Fettah", name_fr: "Pharmacie Fettah", opening_hours: "24/7", address: "02003" }),
      row("node/4310071589", 36.144701, 1.272288, { name: "Fettah", name_fr: "Fettah", address: "02003" }),
    ],
  },
  {
    label: "07 Zobiri, dispensing only on the dropped side",
    keep: "node/3449612819",
    rows: [
      row("node/3449612819", 34.850806, 5.728274, { name: "ZOBIRI", name_fr: "ZOBIRI" }),
      row("way/1025833581", 34.850782, 5.728276, { name: "pharmacie ZOBIRI", name_fr: "pharmacie ZOBIRI", dispensing: true }),
    ],
  },
  {
    label: "10 Saoudi",
    keep: "node/4354050798",
    rows: [
      row("node/4354050798", 36.374158, 3.900739, { name: "arraw lahram", name_fr: "saoudi", name_ar: "سعودي لونيس و اخونه" }),
      row("node/4366704493", 36.374247, 3.900739, { name: "saoudi", name_fr: "saoudi" }),
    ],
  },
  {
    label: "14 Hadj Said, every field on both sides",
    keep: "node/4842288624",
    rows: [
      row("node/4842288624", 35.371234, 1.316789, { name: "HADJ SAID", name_fr: "HADJ SAID", phone: "046285179", opening_hours: "Mo-Su 08:00-22:00", address: "Route de Tousnina" }),
      row("node/4842421621", 35.371266, 1.316789, { name: "pharmacie hadj said", name_fr: "pharmacie hadj said", phone: "046285179", opening_hours: "Mo-Su 08:00-22:00", address: "Route de Tousnina" }),
    ],
  },
  {
    label: "16 Bouhassane, dispensing only on the dropped side",
    keep: "node/2952897872",
    rows: [
      row("node/2952897872", 36.752345, 3.061234, { name: "H. Bouhassane بوحسان", name_fr: "H. Bouhassane", name_ar: "بوحسان", phone: "021651241", address: "2 Boulevard des Frères Merrakchi" }),
      row("node/4722427389", 36.752462, 3.061234, { name: "Pharmacie Bouhacene صيدلية بوحسان", name_fr: "Pharmacie Bouhacene", name_ar: "صيدلية بوحسان", dispensing: true }),
    ],
  },
  {
    label: "19 Yalaoui",
    keep: "node/4828614724",
    rows: [
      row("node/4828614724", 36.190123, 5.410456, { name: "yalaoui", name_fr: "yalaoui" }),
      row("node/4850703921", 36.190193, 5.410456, { name: "pharmacie yalaoui", name_fr: "pharmacie yalaoui" }),
    ],
  },
  {
    label: "23 Bouzitoune, the richer record survives",
    keep: "node/6468796085",
    rows: [
      row("node/6259508786", 36.900111, 7.760222, { name: "Bouzitoune hocine", name_fr: "Bouzitoune hocine" }),
      row("node/6468796085", 36.900123, 7.760222, { name: "صيدلية بوزيتون حسين", name_fr: "Pharmacie bouzitoune hocine", name_ar: "صيدلية بوزيتون حسين" }),
    ],
  },
  {
    label: "39 Khatra",
    keep: "node/4420614389",
    rows: [
      row("node/4420614389", 33.270111, 6.869222, { name: "صيدلية خطرة أم الخير", name_fr: "Pharmacie Khatra", name_ar: "صيدلية خطرة أم الخير", phone: "032202738", opening_hours: "Mo-Su 07:30-23:00" }),
      row("node/4421596289", 33.270124, 6.869222, { name: "صيدلية خطرة", name_fr: "Pharmacie Khatra", name_ar: "صيدلية خطرة" }),
    ],
  },
  {
    label: "43 Keziou",
    keep: "node/4588887389",
    rows: [
      row("node/4588887389", 36.450111, 6.264222, { name: "صيدلية كزيو", name_fr: "Pharmacie Keziou Slimane", name_ar: "صيدلية كزيو" }),
      row("node/4620337791", 36.450330, 6.264222, { name: "كازيو", name_fr: "Pharmacie Keziou Slimane", name_ar: "كازيو" }),
    ],
  },
  {
    label: "43 Oued Endja Bouchekouf",
    keep: "node/2418479678",
    rows: [
      row("node/2418479678", 36.429376, 6.119880, { name: "Pharmacie bouchekouf صيدلية بوشقوف", name_fr: "Pharmacie Bouchekouf", name_ar: "صيدلية بوشقوف" }),
      row("node/5971620189", 36.429361, 6.119809, { name: "صيدلية بوشقوف", name_fr: "Pharmacie Bouchekouf", name_ar: "صيدلية بوشقوف" }),
    ],
  },
  {
    label: "51 Djeghader Reda, dispensing only on the dropped side and two real conflicts",
    keep: "node/8406143532",
    rows: [
      row("node/8406143532", 34.900111, 5.950222, { name: "صيدلية جغادر رضا", name_fr: "Pharmacie DJEGHADER REDA", name_ar: "صيدلية جغادر رضا", operator: "جغادر رضا", phone: "0553271244", opening_hours: "24/7", address: "06 BIS شارع سعودي عبد القادر, الدوسن 07007" }),
      row("way/905180545", 34.900147, 5.950222, { name: "DJEGHADER REDA", name_fr: "DJEGHADER REDA", dispensing: true, opening_hours: "08:00-22:00", address: "06 BIS SAOUDI ABDELKADER, الدوسن" }),
    ],
  },
  {
    label: "55 Mehania Azzi, the record with opening hours survives",
    keep: "node/6175270286",
    rows: [
      row("node/6157205085", 33.100111, 6.060222, { name: "صيدلية عزي شمس الدين", name_fr: "Pharmacie Mehania - Azzi Chams Eddine", name_ar: "صيدلية عزي شمس الدين", address: "تقرت" }),
      row("node/6175270286", 33.100453, 6.060222, { name: "صيدلية مهنية - عزي شمس الدين", name_fr: "Pharmacie Mehania - Azzi Chams Eddine", name_ar: "صيدلية مهنية - عزي شمس الدين", address: "تقرت", opening_hours: "Sa-Th 07:00-23:00; Fr 17:00-23:00" }),
    ],
  },
];

test("each of the twelve pairs collapses to the record the survivor rule names", () => {
  for (const pair of PAIRS) {
    const { rows, collapsed } = collapse(pair.rows);
    assert.equal(rows.length, 1, pair.label);
    assert.equal(rows[0].osm_id, pair.keep, pair.label);
    assert.equal(collapsed.length, 1, pair.label);
    assert.deepEqual(
      collapsed[0],
      { dropped: pair.rows.find((r) => r.osm_id !== pair.keep).osm_id, kept: pair.keep },
      pair.label,
    );
  }
});

// The rule itself: a collapse may not cost a field.
test("a collapsed pair loses no non-null field the retired record had", () => {
  for (const pair of PAIRS) {
    const before = pair.rows.map((r) => ({ ...r }));
    const { rows } = collapse(pair.rows);
    const survivor = rows[0];
    for (const field of FILL) {
      const stated = before.filter((r) => r[field] != null);
      if (!stated.length) continue;
      assert.notEqual(
        survivor[field],
        null,
        `${pair.label}: ${field} was stated by ${stated.map((r) => r.osm_id).join(" and ")} and the survivor has none`,
      );
    }
  }
});

test("the three dispensing flags that only the retired record carried are kept", () => {
  for (const label of [
    "07 Zobiri, dispensing only on the dropped side",
    "16 Bouhassane, dispensing only on the dropped side",
    "51 Djeghader Reda, dispensing only on the dropped side and two real conflicts",
  ]) {
    const pair = PAIRS.find((p) => p.label === label);
    const { rows } = collapse(pair.rows.map((r) => ({ ...r })));
    assert.equal(rows[0].dispensing, true, label);
  }
});

test("the survivor's own value wins a conflict, and the conflict is reported", () => {
  const pair = PAIRS.find((p) => p.label.startsWith("51 Djeghader"));
  const { rows, conflicts } = collapse(pair.rows.map((r) => ({ ...r })));
  const survivor = rows[0];
  // Nothing is resolved, averaged or concatenated: the kept record's value stands.
  assert.equal(survivor.opening_hours, "24/7");
  assert.equal(survivor.address, "06 BIS شارع سعودي عبد القادر, الدوسن 07007");
  assert.ok(!survivor.address.includes("SAOUDI ABDELKADER"));
  const reported = conflicts.filter((c) => c.kept === "node/8406143532").map((c) => c.field);
  assert.ok(reported.includes("opening_hours"), `expected an opening_hours conflict, got ${reported}`);
  assert.ok(reported.includes("address"), `expected an address conflict, got ${reported}`);
});

test("an already-published record survives a pair even when the other carries more", () => {
  const rows = [
    row("node/1", 36.75, 3.06, { name: "Pharmacie Amel", name_fr: "Pharmacie Amel" }),
    row("node/2", 36.750045, 3.06, { name: "Amel", name_fr: "Amel", name_ar: "الأمل", phone: "021000000", address: "Rue X" }),
  ];
  const { rows: out } = collapse(rows, (id) => id === "node/1");
  assert.equal(out.length, 1);
  assert.equal(out[0].osm_id, "node/1");
  // It survives, and still ends up with everything the richer record had.
  assert.equal(out[0].name_ar, "الأمل");
  assert.equal(out[0].phone, "021000000");
  assert.equal(out[0].address, "Rue X");
});

test("a record whose name only says 'pharmacy' collapses nothing", () => {
  const rows = [
    row("node/1", 36.75, 3.06, { name: "Pharmacie", name_fr: "Pharmacie" }),
    row("node/2", 36.750045, 3.06, { name: "صيدلية", name_ar: "صيدلية" }),
  ];
  assert.equal(collapse(rows).rows.length, 2);
});

test("records further apart than the radius are two pharmacies", () => {
  const rows = [
    row("node/1", 36.75, 3.06, { name: "Fettah", name_fr: "Fettah" }),
    row("node/2", 36.7509, 3.06, { name: "Fettah", name_fr: "Fettah" }), // ~100 m
  ];
  assert.equal(collapse(rows).rows.length, 2);
});

test("the outcome does not depend on the order upstream answered in", () => {
  for (const pair of PAIRS) {
    const forward = collapse(pair.rows.map((r) => ({ ...r })));
    const reversed = collapse([...pair.rows].reverse().map((r) => ({ ...r })));
    assert.equal(forward.rows[0].osm_id, reversed.rows[0].osm_id, pair.label);
    assert.deepEqual(
      FILL.map((field) => forward.rows[0][field]),
      FILL.map((field) => reversed.rows[0][field]),
      pair.label,
    );
    assert.deepEqual(forward.collapsed, reversed.collapsed, pair.label);
  }
});

test("a forward is re-pointed rather than chained when a third record displaces the survivor", () => {
  // node/3 is published and arrives last in id order, so it takes over a pair that
  // has already collapsed once. Both retired ids must forward straight to it.
  const rows = [
    row("node/1", 36.75, 3.06, { name: "Fettah", name_fr: "Fettah", phone: "021000001" }),
    row("node/2", 36.750045, 3.06, { name: "Pharmacie Fettah", name_fr: "Pharmacie Fettah", address: "Rue X" }),
    row("node/3", 36.750089, 3.06, { name: "Fettah", name_fr: "Fettah", opening_hours: "24/7" }),
  ];
  const { rows: out, collapsed } = collapse(rows, (id) => id === "node/3");
  assert.equal(out.length, 1);
  assert.equal(out[0].osm_id, "node/3");
  assert.deepEqual([...new Set(collapsed.map((c) => c.kept))], ["node/3"]);
  // And it carries what both of them said.
  assert.equal(out[0].phone, "021000001");
  assert.equal(out[0].address, "Rue X");
  assert.equal(out[0].opening_hours, "24/7");
});
