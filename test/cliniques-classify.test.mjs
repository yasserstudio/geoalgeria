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

test("the registry abbreviation is caught in every spelling the map carries", () => {
  // Each of these shipped as a `clinique` before: a word-bounded Latin-only
  // \beph\b sees none of them.
  const cases = [
    [{ name: "E.P.H Thenia" }, "hopital"], // dots defeat the word boundary
    [{ name: "EPHP Ain Taya" }, "hopital"], // trailing letter defeats it
    [{ name: "EHU 1er Novembre Oran" }, "hopital"], // university-hospital form
    [{ name: "Hoplital Lakhdaria" }, "hopital"], // live typo in the map
    // the Arabic name of the same establishments. normalizeName NFD-folds
    // الاستشفائية to الاستشفايية, so the stem matched is استشفاي.
    [{ name: "المؤسسة العمومية الاستشفائية هواري بومدين" }, "hopital"],
    [{ name: "المؤسسة الاستشفائية المتخصصة في طب النساء" }, "hopital"],
    // centres anti-cancer are EHS by statute however they name themselves
    [{ name: "Centre Anti Cancer" }, "hopital"],
    [{ name: "Centre anti-cancereux de Batna" }, "hopital"],
    [{ name: "مركز مكافحة السرطان" }, "hopital"],
  ];
  for (const [tags, reason] of cases) {
    assert.deepEqual(classify(tags), { excluded: reason }, `${tags.name} should exclude as ${reason}`);
  }
});

test("an explicitly private establishment is kept, and is never read as an EPH", () => {
  // The cliniques privées are this package's population. Both directions of the
  // abbreviation matter: EHP (hospitalier privé) must not be caught by the EPH
  // pattern, which is why the privacy check runs first.
  const cases = [
    { name: "Etablissement Hospitalier Privé Hasnaoui" },
    { name: "Etablissement hospitalier privé les Amandiers" },
    { name: "Hôpital privé" },
    { name: "المؤسسة الاستشفائية الخاصة (عبير الكوثر)" },
    { name: "EHP Abir El Kaouther" },
  ];
  for (const tags of cases) {
    assert.deepEqual(classify(tags), { type: "clinique" }, `${tags.name} should be kept as a private clinique`);
    assert.equal(classifySector(tags, "clinique"), "private", `${tags.name} should be sector private`);
  }
  // and a public EPH is still excluded
  assert.deepEqual(classify({ name: "EPH Sougueur" }), { excluded: "hopital" });
});

test("the explicit word clinique outranks a colloquial hopital in another tag", () => {
  assert.deepEqual(
    classify({ name: "Clinique obstetrique", "name:ar": "مستشفى" }),
    { type: "clinique" },
  );
  // but maternite still loses to it, so a mother-child hospital stays excluded
  assert.deepEqual(classify({ name: "مستشفى الأمومة والتوليد" }), { excluded: "hopital" });
  // while a clinic that is a maternity keeps the more specific type
  assert.deepEqual(classify({ name: "Clinique maternité Linda" }), { type: "maternite" });
});

test("out-of-scope places are excluded, each in its own class", () => {
  const cases = [
    [{ name: "Pharmacie Cherfi" }, "pharmacie"],
    [{ name: "صيدلية بوجاهم" }, "pharmacie"],
    [{ name: "Institut Pasteur d'Algérie" }, "institut_pasteur"],
    [{ name: "معهد باستور" }, "institut_pasteur"],
    [{ name: "Service de radiologie" }, "hospital_subfeature"],
    [{ name: "bloc opératoire" }, "hospital_subfeature"],
    [{ name: "Entree des Urgence" }, "hospital_subfeature"],
    [{ name: "Urgences" }, "hospital_subfeature"],
    [{ name: "Medecine du travail" }, "hospital_subfeature"],
    [{ name: "الطب المدرسي" }, "hospital_subfeature"],
    // practitioner practices with no "cabinet" in the name
    [{ name: "Dr BEKKOUCHE Dentiste" }, "cabinet"],
    [{ name: "Docteur Nezzar" }, "cabinet"],
    [{ name: "طبيب الأسنان" }, "cabinet"],
    [{ name: "طبيب عام" }, "cabinet"],
  ];
  for (const [tags, reason] of cases) {
    assert.deepEqual(classify(tags), { excluded: reason }, `${tags.name} should exclude as ${reason}`);
  }
  // the guards: a facility word protects the record, and a hospital named after
  // a doctor is a hospital, not a practice
  assert.deepEqual(classify({ name: "Polyclinique Dr Benali dentaire" }), { type: "polyclinique" });
  assert.deepEqual(classify({ name: "Urgences médicales El Achour" }), { type: "centre_sante" });
  assert.deepEqual(classify({ name: "Hôpital Docteur Benzarjeb" }), { excluded: "hopital" });
  // and the literal word cabinet beats the sub-feature patterns
  assert.deepEqual(classify({ name: "Cabinet médical d'urgence" }), { excluded: "cabinet" });
});

test("an emergency service whose name says hospital is bucketed as hopital", () => {
  // Both are excluded either way; what is asserted is that the REASON is true.
  // A hospital's emergency wing is the registry tier, not an anonymous ward.
  assert.deepEqual(classify({ name: "Service Urgences Hôpital Akbou" }), { excluded: "hopital" });
  assert.deepEqual(classify({ name: "Hôpital Bernez - Urgence et maternité" }), { excluded: "hopital" });
  // a ward with no hospital word in its name stays a sub-feature
  assert.deepEqual(classify({ name: "Service de radiologie" }), { excluded: "hospital_subfeature" });
  assert.deepEqual(classify({ name: "Entrée des urgences" }), { excluded: "hospital_subfeature" });
  // and a standalone emergency centre is still a care facility, not either
  assert.deepEqual(classify({ name: "Urgences médicales El Achour" }), { type: "centre_sante" });
});

test("the pre-2007 secteur sanitaire is registry tier", () => {
  assert.deepEqual(classify({ name: "القطاع الصحي سيدي سليمان" }), { excluded: "hopital" });
  assert.deepEqual(classify({ name: "Secteur sanitaire de Ténès" }), { excluded: "hopital" });
});

test("an element sante already ships is excluded by id, whatever it is named", () => {
  const ids = new Set(["way/193228566"]);
  // way/193228566 is sante 05-ehs-01; its OSM name alone reads as a clinique
  assert.deepEqual(
    classify({ name: "Centre de santé" }, "way/193228566", ids),
    { excluded: "sante_overlap" },
  );
  // the same name with an id sante does not carry is kept
  assert.deepEqual(classify({ name: "Centre de santé" }, "way/999", ids), { type: "centre_sante" });
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
  // "الاحتياجات الخاصة" (special needs) carries the ownership word خاص and says
  // nothing about ownership, so the phrase is stripped before the privacy test
  assert.equal(classifySector({ name: "ذوي الاحتياجات الخاصة \"كاسترو\"" }, "clinique"), null);
  // the signal can live in any name tag, not just name/name:fr/name:ar
  assert.equal(
    classifySector({ name: "Hasnaoui", "name:en": "Hasnaoui Private Hospital" }, "clinique"),
    "private",
  );
  // an EHU is a public teaching operator, not a third category
  assert.equal(classifySector({ "operator:type": "university" }, "clinique"), "public");
});

test("the shipped records match the classifier and its labels", () => {
  assert.ok(records.length > 1500, `only ${records.length} records`);
  for (const r of records) {
    assert.ok(TYPE_LABELS[r.type], `unknown type ${r.type} on ${r.id}`);
    assert.equal(r.type_label_fr, TYPE_LABELS[r.type].fr, `label_fr drift on ${r.id}`);
    assert.equal(r.type_label_ar, TYPE_LABELS[r.type].ar, `label_ar drift on ${r.id}`);
  }
});

test("no shipped record is an OSM element a sante HOSPITAL-tier record ships", () => {
  // The contract with the registry tier, checked against the two shipped data
  // files rather than by re-running the classifier: any hospital-tier element
  // appearing here would be the SAME mapped object published twice under two
  // different ids. A name-based check cannot see this (the two packages name the
  // same place differently), which is why the generator excludes on the id set.
  //
  // Hospital tiers only, on purpose. An EPSP's refs.osm is a geocoding anchor on
  // the entity's seat and usually points at one of the polycliniques or salles
  // de soins it runs, which this package is meant to carry: entity in sante,
  // facility here. Widening this assertion back to every sante record would
  // demand the deletion of 15 real proximity facilities.
  const sante = JSON.parse(
    readFileSync(join(ROOT, "packages", "sante", "data", "sante.json"), "utf-8"),
  );
  const hospitalTiers = new Set(["chu", "eph", "ehs", "hopital"]);
  const santeOsm = new Set(
    sante.filter((r) => hospitalTiers.has(r.type)).map((r) => r.refs?.osm).filter(Boolean),
  );
  assert.ok(santeOsm.size > 50, `sante carries only ${santeOsm.size} hospital-tier OSM refs; the guard would be vacuous`);
  const shared = records.filter((r) => santeOsm.has(r.refs.osm));
  assert.deepEqual(
    shared.map((r) => `${r.id} ${r.refs.osm}`),
    [],
    "records shipped by BOTH cliniques and sante for the same OSM element",
  );
});

test("a facility sante's EPSP entities merely anchor on is kept", () => {
  // The other side of the guard's scope: these are elements a sante EPSP record
  // references, and they are real proximity facilities, not the EPSP entity. Two
  // of them do not even share a place name with the EPSP that anchors on them.
  const byOsm = new Map(records.map((r) => [r.refs.osm, r]));
  for (const [osm, type] of [
    ["way/305803295", "polyclinique"], // Polyclinique de Djimla / EPSP Djimla
    ["way/441598555", "polyclinique"], // Polyclinique Hai Chouhadas / EPSP Hai Bouamama
    ["way/1172492225", "salle_de_soins"], // Salle de soins Aftis / EPSP Ziama Mansouriah
    ["node/7707545064", "clinique"], // Clinique Gouafria / EPSP Drean
  ]) {
    assert.equal(byOsm.get(osm)?.type, type, `${osm} should ship as ${type}`);
  }
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
  const metadata = JSON.parse(read("packages/cliniques/data/metadata.json"));
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
  // The root README tables carry the shipped count in the documented row shape.
  // Derived from the emitted metadata, not hardcoded: a hardcoded literal here
  // fails on every refresh for the wrong reason and teaches the next person to
  // edit the test rather than the docs.
  const n = metadata.record_count;
  const groups = { "README.md": ",", "README.ar.md": ",", "README.fr.md": " " };
  for (const [f, sep] of Object.entries(groups)) {
    const count = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    const plain = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    assert.ok(
      read(f).includes(count) || read(f).includes(plain),
      `${f} does not carry the ${count} record count`,
    );
  }
});
