// Guards scripts/migrate-to-v2.mjs against drifting away from the data it produced.
//
// The bug this exists for: the id prefixes that make mobilis.all() and
// tourisme.all() collision-free (`ag-`, `pdv-`, `attraction-`, `historic-`,
// `lodging-`, `park-`, `thermal-spring-`) were applied to the committed JSON by
// hand. The transform that its own header calls "the source-of-truth transform
// for packages whose upstream source is dead or blocked" kept emitting the old
// colliding ids, and nothing noticed, because the transform is never re-run
// against v1 input — the double-run guard skips any package that already looks
// v2, so replaying it in place is a no-op that always passes.
//
// The check: keep a sample of each package's real v1 input and replay the map
// over it. Every produced record must deep-equal the record that ships under
// that id today. A dropped prefix makes the id unfindable; any other field drift
// fails the deep-equal.
//
// What this asserts: the per-record transform, for all 24 configured packages
// and all 35 of their data files, over the fixture sample (429 records — 12
// evenly spaced per file plus the first ungeocoded one).
// What it does NOT assert: the file-level behaviour of the runner — id sort
// order, the CSV/GeoJSON emit, or metadata.json. Those are checked by replaying
// the full v1 tree out of git history, which cannot run here: CI checks out at
// depth 1, and the full v1 inputs are ~24 MB.
//
// To refresh the fixture after adding a package to MIGRATIONS, take the same
// sample from `git show <cutover>^:packages/<pkg>/data/<file>` and record the
// cutover sha alongside it; the fixture's own `_readme` carries the recipe.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { MIGRATIONS } from "../scripts/migrate-to-v2.mjs";
import { sharedPoints } from "../packages/schema/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf-8"));
const FIXTURE = read("test/fixtures/migrate-v2-v1-sample.json");

/** [pkg, file, map] for every file the migration writes. */
const SPECS = Object.entries(MIGRATIONS).flatMap(([pkg, cfg]) =>
  (cfg.files || [{ file: cfg.file, map: cfg.map }]).map((s) => [pkg, s.file, s.map]),
);

test("migrate-to-v2 replay: the fixture covers every configured package and file", () => {
  const want = SPECS.map(([p, f]) => `${p}/${f}`).sort();
  const have = Object.entries(FIXTURE.packages)
    .flatMap(([p, e]) => Object.keys(e.files).map((f) => `${p}/${f}`))
    .sort();
  assert.deepEqual(have, want, "fixture and MIGRATIONS disagree on which files exist");
});

// A package whose generator gained a second upstream can no longer be replayed
// from frozen v1 input: aviation's committed records now carry an OurAirports
// `iata`, which no v1 row can produce, so its sample had to become generator
// input instead. That trade quietly costs the guarantee this file exists for.
// A v1 fixture is frozen in git history and cannot move; a generator-input
// fixture is derived from the very code path it checks, so changing the id rule
// in the generator and regenerating the fixture keeps the test green, which is
// exactly the class of drift the header describes.
//
// `_anacFrozen` restores the anchor: the upstream-owned fields of the same rows
// as they stood at `<cutover>^`, copied in once. `iata` and `source` are
// excluded because both legitimately changed. It is read from the fixture rather
// than from git so it still works on CI's depth-1 checkout.
for (const [pkg, entry] of Object.entries(FIXTURE.packages)) {
  if (!entry._anacFrozen) continue;
  test(`migrate-v2 fixture: ${pkg}'s sample still matches its frozen upstream rows`, () => {
    const file = Object.keys(entry.files)[0];
    const sample = new Map(entry.files[file].map((r) => [r.id, r]));
    for (const frozen of entry._anacFrozen) {
      const row = sample.get(frozen.id);
      assert.ok(
        row,
        `${pkg}: frozen upstream row ${JSON.stringify(frozen.id)} is missing from the sample. ` +
          `the id rule drifted, or the fixture was regenerated against changed upstream data`,
      );
      for (const [k, want] of Object.entries(frozen))
        assert.deepEqual(
          row[k],
          want,
          `${pkg}/${frozen.id}: ${k} is ${JSON.stringify(row[k])} in the sample but ` +
            `${JSON.stringify(want)} in the frozen pre-cutover row. The generator-input ` +
            `fixture has drifted from the upstream data it is supposed to represent`,
        );
    }
  });
}

// Post-migration corrections: fields the CURRENT pipeline legitimately fixes
// relative to the migration-era input, each verified by hand and carried by a
// pipeline seed (so a regeneration reproduces it). The replay applies them to
// its own output before comparing, so the guard keeps watching every OTHER
// field of the same record instead of being silenced record-wide.
const CORRECTIONS = {
  djezzy: {
    // Djezzy now publishes a later closing time for its Adrar boutique. Keep
    // the frozen migration input frozen and apply this one observed source
    // change explicitly, so every other field on the row remains guarded.
    "01-001": { hours: "08H00 - 19H30" },
    "47-001": { hours: "08H00 - 19H30" },
    "55-001": { hours: "08H00 -14H00 & 16H00-20H00" },
    "59-001": { hours: "08H00 - 19H00" },
  },
  "gares-routieres": {
    // NAAMA is one of six stations SOGRAL ships with a corrupted longitude. The
    // migration-era input carries the bad point, and because wilaya and commune
    // are derived from the point, it also carries the wilaya and commune that
    // point fell in, and therefore an id in the wrong wilaya. The current
    // pipeline corrects the coordinate in fetch.mjs (OSM way 304431817, the
    // source's own latitude with the longitude's sign restored), so everything
    // downstream of it moves with it. This is the correction, not id-rule
    // drift: 69-02 is retired in retired-ids.json and can never be reissued.
    "69-02": {
      id: "45-03",
      wilaya_code: "45",
      commune_code: "4501",
      commune: "Naama",
      lat: 33.2814,
      lng: -0.3072,
    },
    // GHERDAIA's coordinate was always right: the new gare at Bouhraoua, the
    // northern entrance of Ghardaïa (OSM's admin boundary contains the point,
    // and the source's own address says "Bouheraoua commune de ghardaia").
    // The nearest-centroid join had labelled it Dhayet Bendhahoua, whose
    // centre is 110 m closer than Ghardaïa's. Corrected in fetch.mjs
    // COMMUNE_FIX; reader report on r/algeria, 2026-08-13.
    "47-01": { commune_code: "4701", commune: "Ghardaia" },
  },
  "enseignement-superieur": {
    // ESI's campus sits in Oued Smar (its own address: BP 68M, 16270); the
    // nearest-centroid join had labelled it Bab Ezzouar. Corrected via
    // scripts/seeds/commune-labels.json, user report 2026-08-06.
    "00065": { commune: "Oued Smar" },
  },
};

// Post-migration enrichments: whole-file fields the CURRENT pipeline joins
// from a committed seed the migration-era input predates. The replay copies
// the shipped value onto its own output before comparing, so the guard keeps
// watching every other field of the same record.
const ENRICHMENTS = {
  buses: (produced, shipped) => {
    // The frozen v1 fixture predates the reviewed OSM shape join. The package
    // generator now attaches these fields from sources/buses; buses-v3.test.mjs
    // independently guards the exact-ref selection and every relation id.
    if (!shipped) return;
    produced.source = shipped.source;
    produced.source_refs = shipped.source_refs;
    produced.shape_id = shipped.shape_id;
    produced.osm_relation_ids = shipped.osm_relation_ids;
  },
  "gares-routieres": (produced, shipped) => {
    // refs.mahatati_agency joins from research/gares-routieres/
    // mahatati-agency-ids.json (staged 2026-08-13 from the public MAHATATI
    // departure-station list); the migration-era input has no such field.
    if (shipped?.refs?.mahatati_agency)
      produced.refs = { ...produced.refs, mahatati_agency: shipped.refs.mahatati_agency };
  },
  "formation-professionnelle": (produced, shipped) => {
    // The frozen v1 sample carries the source's pre-reform directorate code.
    // The package generator now derives the current wilaya from exact point
    // containment or its resolved commune, a file-level spatial operation the
    // per-record v2 map cannot reproduce. Dedicated formation-current-wilayas
    // tests guard that join; replay continues to guard every other field here.
    if (shipped) produced.wilaya_code = shipped.wilaya_code;
  },
  "protection-civile": (produced, shipped) => {
    // Commune is assigned by the package generator from the current Arabic
    // name/centroid index. The frozen v1 row can carry an older nearest-commune
    // label even after its ONS code has been reconciled, so replay the generated
    // label here while the dedicated repository-wide FK tests guard the join.
    if (shipped) produced.commune = shipped.commune;
  },
};

// The ONS 2021 repair is a file-level administrative join: its source-aware
// reconciliation and repository-wide FK tests guard the mapping, while this
// replay remains responsible for every other field produced from frozen v1
// input. The original provider code is likewise copied only for Poste rows
// where normalization had to preserve it separately.
const COMMUNE_CODE_ENRICHED = new Set([
  "agriculture",
  "cliniques",
  "culture",
  "djezzy",
  "ecoles",
  "ferroviaire",
  "gares-routieres",
  "industrie-pharmaceutique",
  "mosquees",
  "ooredoo",
  "pharmacies",
  "poste",
  "protection-civile",
  "sante",
]);

for (const [pkg, file, map] of SPECS) {
  test(`migrate-to-v2 replay: ${pkg}/${file} reproduces the committed records`, () => {
    const sample = FIXTURE.packages[pkg].files[file];
    assert.ok(sample.length > 0, `${pkg}/${file}: empty fixture sample`);

    const rows = read(`packages/${pkg}/data/${file}`);
    const committed = new Map(rows.map((r) => [r.id, r]));
    let retired = new Set();
    try {
      retired = new Set(read(`packages/${pkg}/data/retired-ids.json`).ids);
    } catch {
      // Packages without removals do not need a ledger.
    }
    // The runner's demoteSharedPoints() pass is file-level — a per-record map
    // cannot see that another record carries the same point — so replay it here.
    // The transform never moves a coordinate, so the clusters in the committed
    // file are exactly the clusters the runner saw.
    const shared = new Set([...sharedPoints(rows)].map((i) => `${rows[i].lat},${rows[i].lng}`));

    for (const v1 of sample) {
      const produced = map(v1);
      if (produced.geo_precision === "exact" && shared.has(`${produced.lat},${produced.lng}`))
        produced.geo_precision = "approximate";
      const fix = CORRECTIONS[pkg]?.[produced.id];
      if (fix) Object.assign(produced, fix);
      const shipped = committed.get(produced.id);
      // A refreshed source may remove a row sampled at the v2 cutover. Its
      // transformed id must remain permanently reserved; that still guards the
      // prefix/id rule while acknowledging that no live row remains to compare.
      if (!shipped && retired.has(produced.id)) continue;
      assert.ok(
        shipped,
        `${pkg}/${file}: the transform produced id ${JSON.stringify(produced.id)}, which is not ` +
          `in the committed data — the id rule drifted (v1 id was ${JSON.stringify(v1.id)})`,
      );
      ENRICHMENTS[pkg]?.(produced, shipped);
      if (COMMUNE_CODE_ENRICHED.has(pkg)) {
        produced.commune_code = shipped.commune_code;
        if ("source_commune_code" in shipped)
          produced.source_commune_code = shipped.source_commune_code;
        else delete produced.source_commune_code;
      }
      assert.deepEqual(produced, shipped, `${pkg}/${file}: transform output differs from the committed record ${produced.id}`);
    }
  });
}
