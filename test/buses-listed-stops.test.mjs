import test from "node:test";
import assert from "node:assert/strict";
import { candidateFromOsm, matchListedStops, networkCommunes, stopKey } from "../research/buses/listed-stops/match-stops.mjs";

test("a stop key folds hamza, alef, taa marbuta, accents, case and punctuation", () => {
  assert.equal(stopKey("إكمالية أبي علي"), stopKey("اكمالية ابي علي"));
  assert.equal(stopKey("المركز التجاري"), stopKey("المركز  التجارى"));
  assert.equal(stopKey("الاخوة عياشي (الفتوي)"), stopKey("الأخوه عياشي - الفتوى"));
  assert.equal(stopKey("Cité Universitaire"), stopKey("cite-universitaire"));
});

test("a stop key drops a leading stop word and splits digits glued to a word", () => {
  assert.equal(stopKey("محطة القطب الجامعي"), stopKey("القطب الجامعي"));
  assert.equal(stopKey("موقف المويلحة"), stopKey("المويلحة"));
  assert.equal(stopKey("Arrêt de bus Bouyala"), stopKey("Bouyala"));
  assert.equal(stopKey("ARRÊT CAFÉ"), stopKey("cafe"));
  assert.equal(stopKey("Station Revolet"), stopKey("Revolet"));
  assert.equal(stopKey("مركز العربي بن مهيدي07"), stopKey("مركز العربي بن مهيدي 7"));
  assert.equal(stopKey("حي 32مسكن"), stopKey("حي 32 مسكن"));
  // A stop word that is the whole name, or not at the start, stays.
  assert.equal(stopKey("Arrêt de bus"), "arret de bus");
  assert.equal(stopKey("مخرج المحطة"), "مخرج المحطه");
});

const node = (id, names, lat, lng, commune_code = 2801) => ({ kind: "osm_node", id, names, lat, lng, commune_code });
const listed = (...names) => names.map((name_ar, i) => ({ position: i + 1, name_ar, name_fr: null }));

test("one candidate with the same key is an exact match to that node or Station", () => {
  const candidates = [
    node(1, ["الكدية", "El Koudia"], 35.7, 4.54),
    { kind: "station", id: "osm-node-9", names: ["السوق المغطاة"], lat: 35.71, lng: 4.55, commune_code: 2801 },
  ];
  const [kudia, souk] = matchListedStops(listed("الكدية", "السوق المغطاة"), candidates, { communeCodes: [2801] });
  assert.deepEqual(kudia, {
    position: 1, name_ar: "الكدية", name_fr: null, outcome: "exact",
    station_id: null, osm_node_id: 1, reason: null, candidates: [],
  });
  assert.equal(souk.outcome, "exact");
  assert.equal(souk.station_id, "osm-node-9");
  assert.equal(souk.osm_node_id, null);
});

test("a candidate outside the Line's communes is never matched, and the miss says so", () => {
  const candidates = [node(1, ["ساحة الشهداء"], 35.7, 4.54, 2801), node(2, ["الكدية"], 36.0, 4.0, 2803)];
  const rows = matchListedStops(listed("ساحة الشهداء", "الكدية", "حي 800 مسكن"), candidates, { communeCodes: [2101] });
  assert.deepEqual(rows.map((r) => [r.outcome, r.reason, r.osm_node_id]), [
    ["unmatched", "name_outside_communes", null],
    ["unmatched", "name_outside_communes", null],
    ["unmatched", "no_candidate", null],
  ]);
  const [inside] = matchListedStops(listed("الكدية"), candidates, { communeCodes: [2801, 2803] });
  assert.equal(inside.osm_node_id, 2);
});

test("several equal candidates stay ambiguous, ranked by distance to the previous exact match", () => {
  const candidates = [
    node(1, ["الكدية"], 35.7, 4.54),
    node(2, ["ساحة الشهداء"], 35.8, 4.54),
    node(3, ["ساحة الشهداء"], 35.701, 4.54),
    node(4, ["السوق"], 35.9, 4.54),
    node(5, ["السوق"], 35.702, 4.54),
  ];
  const [, martyrs, souk] = matchListedStops(listed("الكدية", "ساحة الشهداء", "السوق"), candidates, { communeCodes: [2801] });
  assert.equal(martyrs.outcome, "ambiguous");
  assert.equal(martyrs.reason, "several_candidates");
  assert.equal(martyrs.osm_node_id, null);
  assert.deepEqual(martyrs.candidates, [
    { kind: "osm_node", id: 3, name: "ساحة الشهداء", commune_code: 2801, match: "equal", distance_m: 111 },
    { kind: "osm_node", id: 2, name: "ساحة الشهداء", commune_code: 2801, match: "equal", distance_m: 11119 },
  ]);
  // An ambiguous stop is not an anchor: the next one still measures from stop 1.
  assert.deepEqual(souk.candidates.map((c) => [c.id, c.distance_m]), [[5, 222], [4, 22239]]);
});

test("with no exact match before it, ambiguous candidates carry no distance and keep input order", () => {
  const candidates = [node(2, ["السوق"], 35.8, 4.54), node(1, ["السوق"], 35.7, 4.54)];
  const [souk] = matchListedStops(listed("السوق"), candidates, { communeCodes: [2801] });
  assert.deepEqual(souk.candidates.map((c) => [c.id, c.distance_m]), [[2, null], [1, null]]);
});

test("a fuzzy name (article dropped, or one name inside the other) is ambiguous, never exact", () => {
  const candidates = [
    node(1, ["حي سونلغاز", "Cité Sonalgaz"], 35.7, 4.54),
    node(2, ["بن طبي"], 35.71, 4.54),
    node(3, ["جعافرة"], 35.72, 4.54),
    node(4, ["حي الجعافرة"], 35.73, 4.54),
  ];
  const [sonelgaz, bentabi, djaafra] = matchListedStops(
    listed("حي السونلغاز", "المركز التجاري بن طبي", "حي الجعافرة"),
    candidates,
    { communeCodes: [2801] },
  );
  assert.deepEqual([sonelgaz.outcome, sonelgaz.reason], ["ambiguous", "fuzzy_only"]);
  assert.deepEqual(sonelgaz.candidates.map((c) => [c.id, c.match]), [[1, "fuzzy"]]);
  assert.deepEqual([bentabi.outcome, bentabi.candidates.map((c) => c.id)], ["ambiguous", [2]]);
  // One equal candidate wins over a fuzzy one.
  assert.deepEqual([djaafra.outcome, djaafra.osm_node_id], ["exact", 4]);
});

test("a word shared by chance is not fuzzy: the shorter name must sit whole inside the longer", () => {
  const candidates = [node(1, ["حي 500 مسكن"], 35.7, 4.54)];
  const [stop] = matchListedStops(listed("حي 800 مسكن"), candidates, { communeCodes: [2801] });
  assert.deepEqual([stop.outcome, stop.reason], ["unmatched", "no_candidate"]);
});

test("an OSM node offers every name it carries, split on the OSM ';' list separator", () => {
  const element = {
    type: "node", id: 5683511157, lat: 35.7, lon: 4.54,
    tags: { highway: "bus_stop", name: "El Koudia;الكدية", "name:ar": "الكدية", "name:fr": "Al Kadia" },
  };
  assert.deepEqual(candidateFromOsm(element, 2801), {
    kind: "osm_node", id: 5683511157, names: ["El Koudia", "الكدية", "Al Kadia"], lat: 35.7, lng: 4.54, commune_code: 2801,
  });
});

test("a network's communes are its seat commune plus any commune its Operator names as served", () => {
  const communes = [
    { code_commune: 2101, wilaya_code: 21, name_fr: "Skikda", name_ar: "سكيكدة" },
    { code_commune: 2103, wilaya_code: 21, name_fr: "El Hadaiek", name_ar: "الحدائق" },
    { code_commune: 2137, wilaya_code: 21, name_fr: "Hammadi Krouma", name_ar: "حمادي كرومة" },
    { code_commune: 2801, wilaya_code: 28, name_fr: "M'Sila", name_ar: "المسيلة" },
    { code_commune: 4301, wilaya_code: 43, name_fr: "Skikda", name_ar: "سكيكدة" },
  ];
  assert.deepEqual(networkCommunes(communes, { wilayaCode: "21", network: "Skikda", servedAreas: ["حمادي كرومة", "الزفزاف"] }), [2101, 2137]);
  assert.deepEqual(networkCommunes(communes, { wilayaCode: "28", network: "M'Sila" }), [2801]);
});
