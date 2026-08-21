import { test } from "node:test";
import assert from "node:assert/strict";
import schools from "../packages/ecoles/data/ecoles.json" with { type: "json" };

test("OSM way-to-relation migrations preserve public school ids and richer fields", () => {
  const byId = new Map(schools.map((row) => [row.id, row]));

  assert.equal(byId.get("16-01241")?.refs.osm, "relation/9109456");

  const firstNovember = byId.get("44-00236");
  assert.equal(firstNovember?.refs.osm, "relation/5553815");
  assert.equal(firstNovember?.name_ar, "المدرسة الإبتدائية 1 نوفمبر 1954");

  const snouci = byId.get("44-00237");
  assert.equal(snouci?.refs.osm, "relation/5553817");
  assert.equal(snouci?.name, "Ecole primaire Snouci Abdelkader");
  assert.equal(snouci?.address, "44000");

  const malekBenNabi = byId.get("44-00246");
  assert.equal(malekBenNabi?.refs.osm, "relation/5548568");
  assert.equal(malekBenNabi?.name_ar, "ثانوية مالك ابن نبي");
  assert.equal(malekBenNabi?.address, "Rue du 24 Fevrier, Aïn Defla 44000");
});
