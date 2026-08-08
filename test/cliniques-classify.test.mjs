// Guards the @geoalgeria/cliniques classifier, the one thing in that package
// that is a judgment rather than a passthrough.
//
// The bug class this exists for: the classifier decides what belongs to the OSM
// community tier and what belongs to the Ministry of Health registry tier that
// @geoalgeria/sante owns. Get it wrong in one direction and the package silently
// duplicates the registry; get it wrong in the other and it drops real
// polycliniques. Neither shows up as a schema error, so validate-packages would
// stay green over a dataset that means something different from what it claims.
//
// Half the decision table is written in Arabic, and Arabic character CLASSES are
// the specific thing that breaks silently: a range typed in visual rather than
// logical order (say [ؐ-ٰ] instead of the harakat-only ranges) still
// parses, still runs, and quietly deletes every Arabic letter from the haystack
// so that every Arabic pattern stops matching and every Arabic-named record
// falls through to the residual bucket. So the folding is asserted directly,
// not only through the patterns that depend on it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  classify,
  classifySector,
  normalizeName,
  TYPE_LABELS,
} from "../packages/cliniques/scripts/fetch.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const records = JSON.parse(
  readFileSync(join(ROOT, "packages", "cliniques", "data", "cliniques.json"), "utf-8"),
);

test("Arabic folding keeps the letters and drops only the marks", () => {
  // hamza carriers fold to their base letter, alef maqsura to ya, marks vanish
  assert.equal(normalizeName("المؤسسة العمومية"), "الموسسة العمومية");
  assert.equal(normalizeName("مستشفى"), "مستشفي");
  assert.equal(normalizeName("الأمومة"), "الامومة");
  // and nothing else is removed: these must survive verbatim
  for (const s of ["عيادة متعددة الخدمات", "قاعة العلاج", "مستوصف", "مركز صحي"]) {
    assert.equal(normalizeName(s), s, `${s} was mangled by normalizeName`);
  }
  // Latin accents fold so \b patterns fire on accented French
  assert.equal(normalizeName("Centre de Santé"), "centre de sante");
});

test("the registry tier is excluded, in French and in Arabic", () => {
  const cases = [
    [{ name: "CHU Ibn Rochd" }, "chu"],
    [{ name: "Centre Hospitalo Universitaire Mustapha" }, "chu"],
    [{ name: "المستشفى الجامعي مصطفى باشا" }, "chu"],
    [{ name: "EPH Sougueur" }, "hopital"],
    [{ name: "EHS Sidi Mabrouk" }, "hopital"],
    [{ name: "Établissement public hospitalier de Hassi Bahbah" }, "hopital"],
    [{ name: "Hôpital Dellys" }, "hopital"],
    [{ name: "مستشفى عين مران" }, "hopital"],
    // a public mother-child hospital is registry tier, not a `maternite`
    [{ name: "مستشفى الأمومة والتوليد" }, "hopital"],
    [{ name: "EPSP Khmissa" }, "epsp_entity"],
    [{ name: "المؤسسة العمومية للصحة الجوارية جيجل" }, "epsp_entity"],
    [{ name: "Cabinet dentaire" }, "cabinet"],
    [{ name: "مدرسة التكوين شبه الطبي" }, "paramedical"],
  ];
  for (const [tags, reason] of cases) {
    assert.deepEqual(classify(tags), { excluded: reason }, `${tags.name} should exclude as ${reason}`);
  }
});

test("an unnamed hospital-tagged record is dropped, an unnamed clinic-tagged one is kept", () => {
  assert.deepEqual(classify({ amenity: "hospital" }), { excluded: "unnamed_hospital" });
  assert.deepEqual(classify({ healthcare: "hospital" }), { excluded: "unnamed_hospital" });
  assert.deepEqual(classify({ amenity: "clinic" }), { type: "clinique" });
});

test("facility types are recognised in French and in Arabic", () => {
  const cases = [
    [{ name: "Polyclinique Verdier" }, "polyclinique"],
    [{ name: "Polyclinque d'Assa" }, "polyclinique"], // known misspelling
    [{ name: "polclinique bouyaghile" }, "polyclinique"],
    [{ name: "عيادة متعددة الخدمات العيون" }, "polyclinique"],
    [{ name: "Salle de soins" }, "salle_de_soins"],
    [{ name: "Dispensaire Ait Hidja" }, "salle_de_soins"],
    [{ name: "قاعة علاج برج القائد" }, "salle_de_soins"],
    [{ name: "مستوصف عين الشيح" }, "salle_de_soins"],
    [{ name: "Centre de Santé Diar Djemaa" }, "centre_sante"],
    [{ name: "مركز صحي" }, "centre_sante"],
    [{ name: "Maternité Benatou Mira" }, "maternite"],
    [{ name: "Clinique d'Accouchement Linda" }, "maternite"],
    [{ name: "Clinique El Hidhab" }, "clinique"],
    [{ name: "عيادة القدس" }, "clinique"],
  ];
  for (const [tags, type] of cases) {
    assert.deepEqual(classify(tags), { type }, `${tags.name} should be ${type}`);
  }
});

test("an explicit facility word beats the colloquial hopital word, but never a registry marker", () => {
  // real records: the name says both. The facility word settles it.
  assert.deepEqual(
    classify({ name: "Polyclinique des consultations spécialisées Boudghène", "name:ar": "مستشفى بودغن" }),
    { type: "polyclinique" },
  );
  assert.deepEqual(
    classify({ name: "المستشفى الجواري متعدد الخدمات", "name:fr": "Polyclinique" }),
    { type: "polyclinique" },
  );
  assert.deepEqual(classify({ name: "hôpital guemar", "name:ar": "مستوصف قمار" }), { type: "salle_de_soins" });
  // but a named registry tier outranks everything
  assert.deepEqual(classify({ name: "EHS Sidi Mabrouk - Maternité" }), { excluded: "hopital" });
  assert.deepEqual(classify({ name: "Polyclinique CHU annexe" }), { excluded: "chu" });
});

test("a facility that only names its parent EPSP keeps its own type", () => {
  assert.deepEqual(classify({ name: "Polyclinique EPSP عيادة متعددة الخدمات" }), { type: "polyclinique" });
  assert.deepEqual(classify({ name: "قاعة العلاج الخلوفي جيلالي (EPSP)" }), { type: "salle_de_soins" });
  // with no facility word it is the administrative entity itself
  assert.deepEqual(classify({ name: "EPSP El Mellah" }), { excluded: "epsp_entity" });
});

test("sector is asserted only on signal, in the documented precedence", () => {
  assert.equal(classifySector({ "operator:type": "private" }, "polyclinique"), "private");
  assert.equal(classifySector({ "operator:type": "government" }, "clinique"), "public");
  assert.equal(classifySector({ name: "Clinique privée" }, "clinique"), "private");
  assert.equal(classifySector({ name: "عيادة خاصة" }, "clinique"), "private");
  // structural: the two public proximity types
  assert.equal(classifySector({ name: "Polyclinique Verdier" }, "polyclinique"), "public");
  assert.equal(classifySector({ name: "Dispensaire" }, "salle_de_soins"), "public");
  // مصحة is the weakest signal, so it loses to the structural public rule and
  // only marks a residual clinique private
  assert.equal(classifySector({ name: "المصحة الجوارية المتعددة الخدمات" }, "polyclinique"), "public");
  assert.equal(classifySector({ name: "مصحة الشفاء" }, "clinique"), "private");
  // nothing to go on
  assert.equal(classifySector({ name: "Clinique El Hidhab" }, "clinique"), null);
});

test("the shipped records match the classifier and its labels", () => {
  assert.ok(records.length > 1500, `only ${records.length} records`);
  for (const r of records) {
    assert.ok(TYPE_LABELS[r.type], `unknown type ${r.type} on ${r.id}`);
    assert.equal(r.type_label_fr, TYPE_LABELS[r.type].fr, `label_fr drift on ${r.id}`);
    assert.equal(r.type_label_ar, TYPE_LABELS[r.type].ar, `label_ar drift on ${r.id}`);
  }
  // no record classified here may read as registry tier: that is the whole
  // contract with @geoalgeria/sante.
  const leaked = records.filter((r) => {
    const v = classify({ name: r.name, "name:fr": r.name_fr, "name:ar": r.name_ar });
    return !!v.excluded;
  });
  assert.deepEqual(leaked.map((r) => r.id), [], "shipped records that the classifier would exclude");
});

test("ids are unique and shaped {wilaya_code}-{seq}", () => {
  const ids = new Set();
  for (const r of records) {
    assert.match(r.id, /^\d{2}-\d{5}$/, `bad id ${r.id}`);
    assert.equal(r.id.slice(0, 2), r.wilaya_code, `id prefix does not match wilaya_code on ${r.id}`);
    assert.ok(!ids.has(r.id), `duplicate id ${r.id}`);
    ids.add(r.id);
  }
});

test("the emitted metadata stats agree with the records", () => {
  const meta = JSON.parse(
    readFileSync(join(ROOT, "packages", "cliniques", "data", "metadata.json"), "utf-8"),
  );
  assert.equal(meta.record_count, records.length);
  assert.equal(meta.named, records.filter((r) => r.name).length);
  assert.equal(meta.with_phone, records.filter((r) => r.phone).length);
  assert.equal(meta.with_address, records.filter((r) => r.address).length);
  const byType = {};
  for (const r of records) byType[r.type] = (byType[r.type] || 0) + 1;
  assert.deepEqual(meta.by_type, byType);
  // estimatedUniverse stays null on purpose: nothing official enumerates this
  // population, so no coverage percentage may be published.
  assert.equal(meta.estimated_universe, null);
  assert.equal(meta.coverage_pct, null);
  // emergency is a claim or nothing, never a denial
  assert.ok(records.every((r) => r.emergency === true || r.emergency === null));
});

test("cliniques is registered everywhere a package must be", () => {
  const read = (p) => readFileSync(join(ROOT, p), "utf-8");
  const mustMention = [
    "README.md",
    "README.fr.md",
    "README.ar.md",
    "AGENTS.md",
    "CONTEXT.md",
    "RELEASING.md",
    "package.json",
    "index.json",
    "scripts/announce.js",
    "scripts/validate-packages.mjs",
    "scripts/lib/v2-transforms.mjs",
    ".github/workflows/ci.yml",
    ".github/workflows/release.yml",
    "packages/dataset/README.md",
    "packages/dataset/README.fr.md",
    "packages/dataset/README.ar.md",
  ];
  for (const f of mustMention) {
    assert.match(read(f), /cliniques/, `${f} does not register @geoalgeria/cliniques`);
  }
  // the root README tables carry the shipped count in the documented row shape
  for (const f of ["README.md", "README.fr.md", "README.ar.md"]) {
    const count = f === "README.fr.md" ? "2 059" : "2,059";
    assert.ok(read(f).includes(count), `${f} does not carry the ${count} record count`);
  }
});
