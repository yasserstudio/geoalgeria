// Guards scripts/migrate-to-v2.mjs against drifting away from the data it produced.
//
// The bug this exists for: the id prefixes that make mobilis.all() and
// tourisme.all() collision-free (`ag-`, `pdv-`, `attraction-`, `historic-`,
// `lodging-`, `park-`, `thermal-spring-`) were applied to the committed JSON by
// hand. The transform that its own header calls "the source-of-truth transform
// for packages whose upstream source is dead or blocked" kept emitting the old
// colliding ids, and nothing noticed, because the transform is never re-run
// against v1 input: the double-run guard skips any package that already looks
// v2, so replaying it in place is a no-op that always passes.
//
// The check: keep a sample of each package's real v1 input and replay the map
// over it. Every produced record must deep-equal the record that ships under
// that id today. A dropped prefix makes the id unfindable; any other field drift
// fails the deep-equal.
//
// What this asserts: the per-record transform, for all 24 configured packages
// and all 35 of their data files, over the fixture sample (429 records, 12
// evenly spaced per file plus the first ungeocoded one).
// What it does NOT assert: the file-level behaviour of the runner: id sort
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
import { foldNameDashes } from "../scripts/lib/no-em-dash.mjs";

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
  poste: {
    // ATMs BaridiMap lists with no point, placed at their host post office's
    // BaridiMap point since 2026-10-29 (fetch.mjs ATM_HOST_OFFICE). Keyed by
    // file, because post office ids repeat these ATM ids.
    "atms.json/1513": { lat: 36.6668571, lng: 3.0975315, geo_precision: "exact", geo_method: "baridimap_host_office" },
    "atms.json/1772": { lat: 36.4775567, lng: 2.5646019, geo_precision: "exact", geo_method: "baridimap_host_office" },
    "atms.json/2335": { lat: 36.7927607, lng: 3.2909607, geo_precision: "exact", geo_method: "baridimap_host_office" },
    // Offices BaridiMap lists with no point, on their own OSM node (fetch.mjs
    // OFFICE_OSM_POINT, 2026-10-29).
    "postoffices.json/2905": { lat: 36.7692213, lng: 3.0267566, geo_precision: "exact", geo_method: "osm_node" },
    "postoffices.json/3062": { lat: 36.7687292, lng: 2.8848159, geo_precision: "exact", geo_method: "osm_node", commune: "CHERAGA", commune_code: "1650", commune_ar: "الشراقة" },
    "postoffices.json/2458": { lat: 36.700328, lng: 4.0564974, geo_precision: "exact", geo_method: "osm_node" },
  },
  banques: {
    // BEA's locator publishes address-only rows. The reviewed seed enriches
    // them with the locator's embedded map coordinates after the v2 cutover;
    // keep the frozen source row fixed while replaying that enrichment.
    "bea-dga_mostaganem-0-agences-6": {
      lat: 35.8554275,
      lng: -0.3131278,
      geo_precision: "approximate",
      geo_method: "bank_locator",
    },
    // CNEP's name separated the long form from the brand with an em dash, where
    // the other 20 banks use " - ". No published name carries one any more
    // (#281), and this registry is hand-curated, so the correction lives in
    // banks.json itself while the frozen migration row keeps the old separator.
    cnep: {
      name: "Caisse Nationale d'Épargne et de Prévoyance - CNEP-Banque",
      name_fr: "Caisse Nationale d'Épargne et de Prévoyance - CNEP-Banque",
    },
  },
  aviation: {
    // OurAirports now publishes the same Mecheria point with fewer trailing
    // decimal places. Keep the frozen migration row fixed while accepting that
    // source-only precision normalization on the generated supplement.
    daay: { lat: 33.5359, lng: -0.242353 },
    // ANAC's nearest-centroid join placed Annaba's Rabah Bitat airport in
    // El Tarf. The reviewed ledger corrects the wilaya using the airport's
    // official EGSA page and carries the public review receipt with the row.
    dabb: {
      source_wilaya_code: "36",
      wilaya_code: "23",
      review_status: "corrected",
      reviewed_at: "2026-09-09",
      reviewed_by: "geoalgeria-maintainers",
      review_evidence: [
        "https://www.egsa-constantine.dz/index.php/aeroports/aeroport-d-annaba-rabah-bitat",
      ],
    },
  },
  telecom: {
    // Ooredoo corrected these commune spellings without moving the published
    // points. The generator keeps each historical public id while exposing the
    // current label, so the frozen migration rows need the same label-only
    // corrections before replay comparison.
    "ooredoo-0d9443c3d8": { name: "GUE DE CONSTANTINE", commune: "GUE DE CONSTANTINE" },
    "ooredoo-78ab7c5be0": { name: "DRAA BEN KHEDDA", commune: "DRAA BEN KHEDDA" },
    "ooredoo-8a1bf7231f": { name: "LARBAA NATH IRATHEN", commune: "LARBAA NATH IRATHEN" },
    "ooredoo-cdabff807b": { name: "EL M'GHAIR", commune: "EL M'GHAIR" },
    "ooredoo-fbaefa673c": { name: "OUM EL BOUAGHI", commune: "OUM EL BOUAGHI" },
  },
  djezzy: {
    // Djezzy now publishes a later closing time for its Adrar boutique. Keep
    // the frozen migration input frozen and apply this one observed source
    // change explicitly, so every other field on the row remains guarded.
    "01-001": { hours: "08H00 - 19H30" },
    "47-001": { hours: "08H00 - 19H30" },
    "55-001": { hours: "08H00 -14H00 & 16H00-20H00" },
    "59-001": { hours: "08H00 - 19H00" },
    // Commune label and re-join, the two classes documented further down.
    "12-001": { commune: "Tébessa" }, // label
    "16-009": { commune: "El Harrach" }, // re-join: El Harrach's centre moved 51.5 km
    // Both re-joined by containment rather than by distance, and both now agree
    // with the boutique's own address, which the nearest centre did not:
    // "Barika-centre, Barika, Batna" and "Aéroport Mohamed Boudiaf, Constantine".
    "60-001": { commune: "Barika" },
    "25-004": { commune: "Constantine" },
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
    // Two more of the same kind, both now agreeing with SOGRAL's own address field
    // or with the commune outline the station's point is inside, where the nearest
    // centre did not: "Commune El Hadjeb Biskra" for 07-01, and Tizi's outline for
    // Mascara's 29-01, whose cité label names a locality the point is not in.
    "07-01": { commune: "El Hadjeb" },
    "29-01": { commune: "Tizi" },
  },
  "enseignement-superieur": {
    // ESI's campus sits in Oued Smar (its own address: BP 68M, 16270); the
    // nearest-centroid join had labelled it Bab Ezzouar. Corrected via
    // scripts/seeds/commune-labels.json, user report 2026-08-06.
    "00065": { commune: "Oued Smar" },
    // Flagship commune label, corrected against JORA n° 25 / n° 40.
    "00033": { commune: "M'Sila" },
    // 00017 needed a re-join entry while Biskra's moved centre put its campus
    // nearer Chetma's. Biskra's own centre has since moved again, so the join
    // answers Biskra, which is what the frozen v1 row already says: no entry.
    //
    // Borrowed centres, the other class above: these records carry no coordinate
    // of their own (geo_method `wilaya`, or a commune centre), so they move with
    // the flagship centre they borrow, and the frozen v1 row keeps the old one.
    // Alger Centre's centre moved from the sea east of the port to the Grande
    // Poste, as it did for the agriculture rows below.
    "00097": { lat: 36.776335, lng: 3.058211 },
    "00129": { lat: 35.405556, lng: 8.12417 }, // Tébessa
    // Promoted, a third class: the record left its commune centre for its own
    // campus on two independent Votes (docs/adr/0001), OSM way/390654567 agreeing
    // with Wikidata Q16507829's P625 to 58 m; scripts/seeds/second-source.json,
    // PR #310. The frozen v1 row keeps the Koléa centre it borrowed.
    "00081": { lat: 36.6400745, lng: 2.7875844, geo_precision: "exact", geo_method: "campus" },
    // Placed, a fourth class (Owner decision of 2026-10-29): a single open campus
    // lead ships where nothing confirms it, scripts/seeds/second-source.json
    // `single_open_source`, PR #310 (Overture Places for 00113 and 00161, OSM
    // way/375082795 for 00145). The frozen v1 row keeps the centre it borrowed.
    "00113": { lat: 36.655334, lng: 3.1468977, commune: "Les Eucalyptus", geo_precision: "exact", geo_method: "campus" },
    "00145": { lat: 35.3794338, lng: 0.1221791, commune: "Mascara", geo_precision: "exact", geo_method: "campus" },
    "00161": { lat: 36.86473, lng: 6.92202, commune: "Skikda", geo_precision: "exact", geo_method: "campus" },
  },
  // Two classes below, both of them the flagship moving under a derived field,
  // and both caught by gates of their own rather than by this replay:
  //
  //   label   the commune kept its code and changed its spelling (JORA n° 25 and
  //           n° 40). The packages publish the flagship's current label, so the
  //           frozen v1 row carries the old one. Repository-wide FK tests own the
  //           code; the label follows it.
  //   re-join the commune CHANGED, because a commune centre moved in the 2026-09-27
  //           correction of 56 centres or the 2026-09-29 correction of 174, and the
  //           nearest-centroid join answers differently now. The validator section
  //           "commune-centroid coordinates track the flagship commune centres" owns
  //           the borrowed-coordinate half of that class, and
  //           test/commune-centre-in-commune.test.mjs owns the centres themselves.
  //           A re-join keeps its public id: the id is a frozen join key, not a
  //           claim about which wilaya the record is in, so 26-0114 below still
  //           reads 26 while its wilaya_code reads 10.
  //
  // A third class joined them on 2026-09-29: the join itself changed. It decides the
  // commune by CONTAINMENT in the commune's own OpenStreetMap outline, inside the
  // wilaya whose shipped polygon holds the point, and only falls back to distance
  // (scripts/lib/build-utils.mjs resolveCommune). Several of the rows below now agree
  // with the source's own address where the nearest centre never did.
  mosquees: {
    "16-0914": { commune: "Alger Centre" }, // re-join: Alger Centre's centre left the sea
    // Was a label-only fix until 2026-09-29; Sedraïa's own centre moved 33 km, and
    // this mosque is inside Bir Ghbalou's outline, in wilaya 10.
    "26-0114": { wilaya_code: "10", commune: "Bir Ghbalou" }, // re-join, across a wilaya
    "29-0088": { commune: "El Hachem" }, // re-join: Zelamta's centre moved
    "68-0056": { commune: "El Houamed" }, // re-join by containment, out of Bou Saada
    "02-0384": { commune: "Sendjas" }, // re-join by containment, out of Chlef
  },
  culture: {
    "14-bcp-09": { commune: "Chehaïma" }, // label
    "28-bcp-07": { commune: "Ouled Mansour" }, // re-join by containment, out of Hammam Dalaa
    "34-maison-06": { commune: "El Euch" }, // re-join by containment, out of Elhammadia
  },
  ooredoo: {
    "69-002": { commune: "El Abiodh Sidi Cheikh" }, // label
  },
  cliniques: {
    "28-00005": { commune: "M'Sila" }, // label
    "40-00009": { commune: "Taouzianat" }, // re-join: Kais' centre moved
    "31-00107": { commune: "Oran" }, // re-join by containment, out of Es Senia
  },
  ecoles: {
    "16-00039": { commune: "Bir Touta" }, // re-join: Maalma's centre moved
  },
  emploi: {
    // ANEM still files this ALEM under Medea while its own address and coordinate are
    // both in Ain Boucif, which the 2026 reform moved to wilaya 67. The reviewed
    // ledger (quality/overrides/emploi.json, yasserstudio/geoalgeria.com#209) corrects
    // the wilaya and carries the public review receipt with the row, so the frozen v1
    // row needs the same correction before replay comparison.
    "26-08": {
      wilaya_code: "67",
      commune_code: "2604",
      review_status: "corrected",
      reviewed_at: "2026-10-01",
      reviewed_by: "geoalgeria-maintainers",
      review_evidence: [
        "https://www.anem.dz",
        "https://www.joradp.dz/FTP/jo-francais/2026/F2026025.pdf",
        "https://www.joradp.dz/FTP/jo-francais/2026/F2026040.pdf",
      ],
    },
  },
  ferroviaire: {
    // All four re-joined by containment. Boughezoul is a spelling the flagship
    // settled; the other three are the station's point landing inside a different
    // commune's outline than the nearest centre belonged to.
    "09-012": { commune: "Blida" },
    "23-011": { commune: "Annaba" },
    "31-010": { commune: "Sidi Chami" },
    "67-002": { commune: "Boughezoul" },
  },
  sante: {
    // Beni Ourtilane borrows its commune's centre (geo_method `commune_centroid`),
    // and that centre moved: its OSM seat node carries the relation's own wikidata
    // item, which the 2026-09-29 audit's first pass read as a name disagreement.
    "19-epsp-05": { lat: 36.442259, lng: 4.855743 },
  },
  "formation-professionnelle": {
    // Borrows its commune's centre (geo_method `commune`), and Beni Messous moved.
    "00703": { lat: 36.780096, lng: 2.974557 },
    // One of the 32 Oran rows the takwin capture ships with an unsigned longitude.
    // fetch.mjs restores the sign when mirroring the axis carries the point both into
    // the wilaya that published the row and beside the commune it names (private
    // tracker #301), so the frozen v1 input keeps +0.625359 while the record ships the
    // corrected value. This is a coordinate correction, not id-rule drift: the id and
    // every other field hold.
    "01405": { lng: -0.625359 },
  },
  "industrie-pharmaceutique": {
    // Same class: a commune-centroid placement in Algiers whose commune moved.
    "16-pp-08": { lat: 36.70442, lng: 3.168156 },
    // And again on 2026-10-01: Constantine's own centre sat 3 km east of the city,
    // so every record that borrows it moves with it (private tracker #236).
    "25-pp-04": { lat: 36.364164, lng: 6.608428 },
  },
  agriculture: {
    // Both rows are Algiers institutions placed at the wilaya chief town's centre.
    // Alger Centre's centre was in the sea east of the port and now sits by the
    // Grande Poste, so every record that borrows it moves with it.
    "16-chambre_agriculture-01": { lat: 36.776335, lng: 3.058211 },
    "16-institut_recherche-10": { lat: 36.776335, lng: 3.058211 },
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
  sports: (produced, shipped) => {
    // refs.mjs is the SIG's own per-record UUID, published since the 2026-10-27
    // refresh; the frozen v1 row predates it (the generator then overwrote the
    // UUID with the sequence number). test/sports-transition and
    // test/sports-carry-key guard the carry-over that keys on it.
    if (shipped?.refs?.mjs) produced.refs = { ...produced.refs, mjs: shipped.refs.mjs };
  },
  jeunesse: (produced, shipped) => {
    // refs.mjs is the SIG's own per-record UUID, published since the 2026-10-27
    // refresh; the frozen v1 row predates it. test/jeunesse-carry-key guards the
    // carry-over that keys on it.
    if (shipped?.refs?.mjs) produced.refs = { ...produced.refs, mjs: shipped.refs.mjs };
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
    if (!shipped) return;
    produced.wilaya_code = shipped.wilaya_code;
    // The frozen v1 row also predates the 2026-10-25 re-source: takwin.dz was
    // captured live for the first time since the v2 cutover, and it rewrote the
    // attributes below on the records it still lists. They are the source's own
    // text and the source's own coordinate, so a frozen input cannot produce
    // them and the per-record map has nothing to drift from; replaying them here
    // keeps the id rule and every transform-produced field (id, code, type,
    // type_label, source, secteur, commune_code, capacite, surface_m2, internat,
    // capacite_internat, site_web) compared. What guards the refreshed fields
    // instead: formation-carry-key (an id survives a respelt name),
    // formation-current-wilayas (the wilaya join and the placement rule) and
    // validate-packages (schema, coordinate honesty, name script, licence).
    for (const key of [
      // names and the address the portal publishes, respaced across the board
      "name", "name_fr", "abreviation", "adresse", "adresse_fr",
      // contacts it corrected on individual records
      "telephone", "fax", "email", "facebook",
      // the commune label, the capacity it restated, and the vocations list
      "commune", "capacite_reelle", "vocations",
      // placement: the portal now supplies a point where it had left the
      // sentinel zero, and a record it still leaves empty is placed on a
      // flagship centroid, which is a file-level join
      "lat", "lng", "geo_precision", "geo_method",
    ])
      produced[key] = shipped[key];
  },
  sante: (produced, shipped) => {
    // refs.msp_twin is the registry's other-language post for the same
    // establishment, decided by the generator's FR/AR pairing over the whole
    // group. The frozen v1 row carries one post id and the per-record v2 map
    // cannot know which other post it was paired with; test/sante-pairing and
    // test/sante-twin-posts guard the pairing and the ids it retires.
    if (!shipped?.refs?.msp_twin) return;
    produced.refs = { ...produced.refs, msp_twin: shipped.refs.msp_twin };
    // A record the frozen row shipped in one language is bilingual once the
    // twin post is paired to it, and the name it gains comes from that post.
    for (const key of ["name_fr", "name_ar"]) if (produced[key] == null) produced[key] = shipped[key];
    produced.name = produced.name_fr || produced.name_ar;
    // Its geography comes from whichever half matched its commune on more of
    // the name (betterPlaced), and the frozen row is only one half.
    // test/sante-twin-posts guards which half places the record.
    for (const key of ["commune", "lat", "lng", "geo_precision", "geo_method"]) produced[key] = shipped[key];
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
    // The runner's demoteSharedPoints() pass is file-level: a per-record map
    // cannot see that another record carries the same point, so replay it here.
    // The transform never moves a coordinate, so the clusters in the committed
    // file are exactly the clusters the runner saw.
    const shared = new Set([...sharedPoints(rows)].map((i) => `${rows[i].lat},${rows[i].lng}`));

    for (const v1 of sample) {
      // The runner folds the dash separators out of every published name on its
      // way through writePackageV2 (#294), after the per-record transform this
      // replay calls, so replay it here as demoteSharedPoints is replayed below.
      // Per-record CORRECTIONS entries would be the alternative, and the fold
      // touched 486 names.
      const produced = foldNameDashes(map(v1));
      if (produced.geo_precision === "exact" && shared.has(`${produced.lat},${produced.lng}`))
        produced.geo_precision = "approximate";
      // A key may name the file ("atms.json/1513") where ids repeat across files.
      const fix = CORRECTIONS[pkg]?.[`${file}/${produced.id}`] ?? CORRECTIONS[pkg]?.[produced.id];
      if (fix) Object.assign(produced, fix);
      // The runner also resolves telecom's Arabic commune labels from the commune
      // registry on its way through writePackageV2, after the review ledger
      // (scripts/lib/telecom-commune-ar.mjs), so replay that here as the dash fold is
      // replayed above. It runs after CORRECTIONS because a reviewed wilaya is what the
      // commune is resolved against.
      const afterReview = MIGRATIONS[pkg]?.files?.find((spec) => spec.file === file)?.afterReview;
      if (afterReview) Object.assign(produced, afterReview(produced));
      const shipped = committed.get(produced.id);
      // A refreshed source may remove a row sampled at the v2 cutover. Its
      // transformed id must remain permanently reserved; that still guards the
      // prefix/id rule while acknowledging that no live row remains to compare.
      if (!shipped && retired.has(produced.id)) continue;
      assert.ok(
        shipped,
        `${pkg}/${file}: the transform produced id ${JSON.stringify(produced.id)}, which is not ` +
          `in the committed data; the id rule drifted (v1 id was ${JSON.stringify(v1.id)})`,
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
