// @geoalgeria/cliniques excludes every OSM element @geoalgeria/sante ships for a
// hospital-tier record, so one hospital is never published twice. OpenStreetMap
// often maps a hospital as its grounds and separately as a building inside them,
// and sante references only one: when its geocoder moves from one to the other,
// the element it let go of comes back here as a "clinic" with the hospital's name.
//
// The case that made this necessary (batch 2026-15 rehearsal): the 2026-10-25
// sante re-pull moved 04-eph-06 (EPH Ibn Sina, Oum El Bouaghi) from the building
// way/624185601 to the grounds relation/12305812, 37 m away, and a cliniques
// rebuild published the building as 04-00001 "Ibn Sina".

import { test } from "node:test";
import assert from "node:assert/strict";
import { readCapture } from "../scripts/lib/source-store.mjs";
import { santeHospitalParts, loadSanteOsmIds } from "../packages/cliniques/scripts/fetch.mjs";

const hospital = (type, id, lat, lon, tags) => ({ type, id, lat, lon, tags: { amenity: "hospital", ...tags } });
const ADDR = { "addr:street": "نهج أول نوفمبر 1954", "addr:city": "Oum El Bouaghi" };

test("a hospital building inside sante's hospital grounds, at its address, is part of it", () => {
  const grounds = hospital("relation", 1, 35.8791593, 7.1090798, ADDR);
  const building = hospital("way", 2, 35.8789831, 7.1087326, { name: "Ibn Sina", ...ADDR });
  assert.deepEqual([...santeHospitalParts([grounds, building], new Set(["relation/1"]))], ["way/2"]);
});

test("a clinic next door with its own address is not", () => {
  const grounds = hospital("relation", 1, 35.8791593, 7.1090798, ADDR);
  const neighbour = hospital("node", 3, 35.8790, 7.1089, { name: "Clinique", "addr:street": "Rue Emir Abdelkader", "addr:city": "Oum El Bouaghi" });
  assert.equal(santeHospitalParts([grounds, neighbour], new Set(["relation/1"])).size, 0);
});

test("the same address too far away is not", () => {
  const grounds = hospital("relation", 1, 35.8791593, 7.1090798, ADDR);
  const far = hospital("way", 4, 35.8800, 7.1100, ADDR); // about 130 m
  assert.equal(santeHospitalParts([grounds, far], new Set(["relation/1"])).size, 0);
});

test("the committed capture: Ibn Sina's building is a part of the hospital sante ships", () => {
  const parts = santeHospitalParts(readCapture("cliniques", "osm").elements, loadSanteOsmIds());
  assert.ok(parts.has("way/624185601"), "way/624185601 is no longer recognised as part of 04-eph-06");
});
