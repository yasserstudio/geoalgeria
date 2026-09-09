import { test } from "node:test";
import assert from "node:assert/strict";

import offices from "../packages/poste/data/postoffices.json" with { type: "json" };
import { normPostOffice } from "../packages/poste/scripts/fetch.mjs";
import { canonicalCommuneForCode } from "../scripts/lib/commune-index.mjs";
import { MIGRATIONS } from "../scripts/lib/v2-transforms.mjs";

test("live post-office normalization emits padded current and source wilaya codes", () => {
  const office = normPostOffice({
    id: 1000,
    nom: "CHENIGUEL",
    intitule_ar: "شنيقل",
    commune: {
      code: 2640,
      name_fr: "CHENIGUEL",
      name_ar: "شنيقل",
      wilaya: { id: 26, name_fr: "MEDEA", name_ar: "المدية" },
    },
    gps: { lat: 35.9231469, lng: 3.5681351 },
  });

  assert.equal(office.wilaya_code, "67");
  assert.equal(office.source_wilaya_code, "26");
  assert.equal(office.commune_code, "2640");
  const publish = MIGRATIONS.poste.files.find(
    (entry) => entry.file === "postoffices.json",
  ).map;
  assert.equal(publish(office).wilaya_code, "67");
  assert.equal(publish(office).source_wilaya_code, "26");

  const adrar = normPostOffice({
    id: 1,
    nom: "ADRAR RP",
    intitule_ar: "أدرار م ر",
    commune: {
      code: 101,
      name_fr: "ADRAR",
      name_ar: "أدرار",
      wilaya: { id: 1, name_fr: "ADRAR", name_ar: "أدرار" },
    },
    gps: { lat: 27.8708439, lng: -0.2871417 },
  });
  assert.equal(adrar.wilaya_code, "01");
  assert.equal(adrar.source_wilaya_code, undefined);
});

test("post offices use the current wilaya of their canonical commune", () => {
  for (const office of offices) {
    const commune = canonicalCommuneForCode(office.commune_code);
    assert.ok(commune, `${office.id} has an unknown commune ${office.commune_code}`);
    assert.equal(
      office.wilaya_code,
      String(commune.wilaya_code).padStart(2, "0"),
      `${office.id} disagrees with commune ${office.commune_code}`,
    );
  }
});

test("post offices cover every new wilaya and preserve BaridiMap's source code", () => {
  const reconciled = offices.filter((office) => office.source_wilaya_code);
  assert.equal(reconciled.length, 194);
  assert.deepEqual(
    [...new Set(reconciled.map((office) => office.wilaya_code))].sort(),
    Array.from({ length: 11 }, (_, index) => String(index + 59)),
  );
  assert.ok(
    reconciled.every((office) => office.source_wilaya_code !== office.wilaya_code),
  );
});
