import { test } from "node:test";
import assert from "node:assert/strict";
import establishments from "../packages/formation-professionnelle/data/establishments.json" with { type: "json" };

test("formation-professionnelle uses the current wilaya for communes moved in 2026", () => {
  const byId = new Map(establishments.map((row) => [row.id, row]));

  assert.equal(byId.get("00053")?.wilaya_code, "59"); // Aflou
  assert.equal(byId.get("00829")?.wilaya_code, "65"); // Ain Oussera
  assert.equal(byId.get("01209")?.wilaya_code, "68"); // Bou Saada
  assert.equal(byId.get("01223")?.wilaya_code, "68"); // Medjedel
  assert.equal(byId.get("01227")?.wilaya_code, "68"); // Djebel Messaad
  assert.equal(byId.get("01234")?.wilaya_code, "68"); // M'cif
});

test("formation-professionnelle prefers an exact point over a contradictory commune", () => {
  const byId = new Map(establishments.map((row) => [row.id, row]));

  assert.equal(byId.get("00853")?.wilaya_code, "17");
});

test("formation-professionnelle now covers every current wilaya", () => {
  const covered = new Set(establishments.map((row) => row.wilaya_code));

  for (let code = 1; code <= 69; code++) {
    assert.ok(covered.has(String(code).padStart(2, "0")), `missing wilaya ${code}`);
  }
});
