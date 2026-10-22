// A commune's published postal code is its own office's, and where Algérie Poste
// has an office named after the commune, that is the office.
//
// WHY THIS FILE EXISTS. Rule 3 of scripts/fix-commune-postal-codes.mjs says the
// canonical code is "the office NAMED like the commune (with or without a trailing
// RP), else the best class, ties to the lowest code". It compared the office name
// to the commune name with one exact fold, so a transliteration difference made the
// name test miss and the tie-break decided instead: Abelsa took SILET because the
// capture spells its commune ABALESSA, Mohamed Belouzdad took ALGER EL ANNASSER
// because the capture spells it BELOUIZDAD, and Sidi M'Hamed (28, not 16) took
// BORDJ BELKHRIF because its office is THAMEUR SIDI MHAMED. Each was another
// locality's office on a commune that has its own.
//
// THE ALLOWED LIST IS RULE 2, NOT AN EXCEPTION. Rule 2 keeps a code the commune's
// own office group already contains, because it is verified-current and stability
// beats churn. The 13 rows below are communes whose published code is one of their
// own offices but not the eponymous one, so rule 3 never runs for them and nothing
// here is evidence that the eponymous code would be better. Changing one of them is
// a data decision with its own source, not a tie-break fix: it belongs in a ledger
// and a review, which is why this file states them rather than repairing them.
//
// The capture is read with this file's own folding, not the script's, so a reader's
// mistake and a writer's mistake cannot cancel out.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const read = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), "utf-8"));

/** Accent-fold, uppercase, drop the separators a transliteration moves around. */
const tight = (s) =>
  (s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

/**
 * Communes whose published code is one of their own offices but not the office
 * named after the commune. Rule 2 keeps a verified-current code, so these are what
 * rule 2 holds in place, listed so that a NEW one is a failure.
 */
const RULE_2_KEEPS = [
  "114 Tamantit: 01021 BOUFADI, not 01029 TAMENTIT",
  "231 Bouzeghaia: 02019 HEUMIS AIN BEIDA, not 02021 BOUZGHAIA",
  "539 Gosbat: 05068 DJERIAT, not 05090 CHAABET EL GOSBAT",
  "604 Taourit Ighil: 06035 TIZI EL KORN, not 06115 TAOURIRT IGHIL",
  "1009 Taghzout: 10055 CHABET BRAHEM, not 10089 BOUIRA TAGHZOUT",
  "1040 Ouled Rached: 10076 OUED EL KHMIS, not 10081 BOUIRA OULED RACHED",
  "1602 Sidi M'hamed: 16007 ALGER 1ER MAI, not 16012 ALGER SIDI M'HAMED",
  "1607 Casbah: 16001 ALGER 1ER NOVEMBRE, not 16022 ALGER HAUTE CASBAH",
  "2406 Oued Ferragha: 24038 BOUKAMOUZA, not 24047 OUED FRAGHA",
  "2732 Hassiane: 27033 BENI YAHI, not 27035 EL HASSIANE",
  "4104 Machroha: 41010 AIN SEYNOUR, not 41017 MECHROHA",
  "5504 Nezla: 55004 AIN SAHRA, not 55010 TOUGGOURT NEZLA",
  "5505 Zaouia El Abidia: 55018 ZAOUIA SIDI LABED, not 55039 05 JUILLET ZAOUIA EL ABIDIA",
];

test("a commune publishes its eponymous office's code wherever it has one", () => {
  const offices = read("packages", "poste", "data", "postoffices.json").filter((o) => o.postal_code);
  const byPostal = new Map();
  for (const office of offices) if (!byPostal.has(office.postal_code)) byPostal.set(office.postal_code, office);

  /** Every office the capture files under the same (wilaya, commune) as this one. */
  const groupOf = (office) =>
    offices.filter((o) => Number(o.wilaya_code) === Number(office.wilaya_code) && tight(o.commune) === tight(office.commune));

  /** Is this office named after the commune, by our spelling or the capture's? */
  const namedAfter = (office, names) => {
    const name = tight(office.name);
    return names.some((n) => n && (name === n || name === `${n}RP` || name.endsWith(n) || name.endsWith(`${n}RP`)));
  };

  const unsourced = [];
  const notEponymous = [];
  for (const wilaya of read("packages", "dataset", "data", "algeria.json")) {
    for (const commune of wilaya.communes) {
      if (!commune.postal_code) continue;
      const published = byPostal.get(commune.postal_code);
      if (!published) {
        unsourced.push(`${commune.code_commune} ${commune.name_fr}: ${commune.postal_code} is no office's code`);
        continue;
      }
      const names = [tight(commune.name_fr), tight(published.commune)];
      if (namedAfter(published, names)) continue;
      const eponymous = groupOf(published).filter((o) => namedAfter(o, names));
      if (!eponymous.length) continue;
      notEponymous.push(
        `${commune.code_commune} ${commune.name_fr}: ${published.postal_code} ${published.name}, not ` +
          eponymous.map((o) => `${o.postal_code} ${o.name}`).join(" / "),
      );
    }
  }

  assert.deepEqual(unsourced, [], "a published postal code is no Algérie Poste office's code");
  assert.deepEqual(notEponymous.sort(), [...RULE_2_KEEPS].sort(), "a commune with its own eponymous office publishes another office's code");
});
