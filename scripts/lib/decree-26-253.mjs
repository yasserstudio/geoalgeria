// The reviewed reading of decret executif n 26-253 of 15 July 2026 (JORA n 52
// of 21 July 2026), whose annex fixes the communes each chef de daira
// administers in wilayas 3, 5, 7, 12, 13, 14, 17, 26, 28, 32 and 59 to 69 and
// leaves the other 48 wilayas under decret executif n 91-306 of 24 August 1991.
//
// The membership itself is not restated here: it is read from the extract at
// research/_dairas/decree-26-253.json, which is the annex as printed. This file
// holds only the judgements the printed text does not make for us, so each one
// is reviewable on its own and an unreviewed change fails the apply script
// instead of landing.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const EXTRACT_PATH = join(ROOT, "research", "_dairas", "decree-26-253.json");

export const CITATION =
  "Decret executif n 26-253 du 15 juillet 2026 (JORA n 52 du 21 juillet 2026), annexe";

/** Wilayas the annex tabulates. Every other wilaya keeps its 91-306 list. */
export const ANNEXED_WILAYAS = [3, 5, 7, 12, 13, 14, 17, 26, 28, 32, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69];

/** Fold a name to compare spellings: apostrophes, accents, case, punctuation. */
export function fold(name) {
  return (name ?? "")
    .replace(/’/g, "'")
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Printed commune names that do not fold onto this dataset's spelling.
 *  "wilaya|printed name" -> our name_fr. Fifteen further printed names differ
 *  from ours only by accents, which the fold absorbs; none of the eighteen is
 *  applied as a commune rename. The decree fixes daira membership, not the
 *  commune register, and all three of these are spellings law 26-06 (JORA n 25,
 *  April 2026) already replaced: see scripts/lib/jo-2026-corrections.mjs, which
 *  carries each one with the article and item that corrected it. */
export const COMMUNE_NAME_ALIASES = {
  "17|Béni Yaagoub": "Ben Yaagoub", // commune 1727, art. 21 item 15
  "26|El Azizia": "Al Azizia", // commune 2636, art. 30 item 24
  "32|Bougtoub": "Bougtob", // commune 3210, art. 36 item 7
};

/** The annex settles which commune seats each daira; how that commune's name is
 *  written is the commune register's business, and law 26-06 already settled it.
 *  So a daira takes its seat commune's name_fr, except where the row we hold
 *  folds onto that name, in which case our spelling stands: the annex drops
 *  accents in a seat cell its own commune column keeps ("Ain Touta" heading
 *  "Aïn Touta", "Ain Tallout" heading "Aïn Tallout"). Three rows disagree
 *  beyond folding and are renamed rather than retired, so their ids survive. */
export const DAIRA_RENAMES = [
  { wilaya_code: 12, from: "El Ma Labiodh", to: "El Ma Labiod" },
  { wilaya_code: 67, from: "Chellalet El Adhaoura", to: "Chelalet El Adhaoura" },
  { wilaya_code: 68, from: "Aïn El Melh", to: "Aïn El Meleh" },
];

/** Seats the annex creates. Ids continue the table rather than filling a gap. */
export const DAIRA_ROWS_ADDED = [
  { wilaya_code: 59, name_fr: "Oued Morra", id: 565 },
  { wilaya_code: 60, name_fr: "Djezzar", id: 566 },
  { wilaya_code: 64, name_fr: "Hamadia", id: 567 },
  { wilaya_code: 65, name_fr: "Had Sahary", id: 568 },
  { wilaya_code: 66, name_fr: "Faïdh El Botma", id: 569 },
  { wilaya_code: 67, name_fr: "Ouled Antar", id: 570 },
];

/** Seats the annex drops. Their communes go to the daira the annex names; the
 *  ids are reserved in packages/dataset/data/retired-ids.json and never reused. */
export const DAIRA_ROWS_RETIRED = [
  { wilaya_code: 59, id: 524, name_fr: "Hadj Mechri", note: "its two communes join Brida" },
  { wilaya_code: 60, id: 525, name_fr: "Azil Abdelkader", note: "its two communes join the new Djezzar" },
  { wilaya_code: 60, id: 528, name_fr: "Tilatou", note: "Tilatou joins Seggana" },
  { wilaya_code: 64, id: 537, name_fr: "Rechaiga", note: "its two communes join the new Hamadia" },
  { wilaya_code: 64, id: 538, name_fr: "Zmalet El Emir Abdelkader", note: "Bougara joins the new Hamadia, the seat commune joins Ksar Chellala" },
  { wilaya_code: 65, id: 541, name_fr: "Bouira Lahdab", note: "its two communes join the new Had Sahary" },
  { wilaya_code: 66, id: 543, name_fr: "Amourah", note: "Amourah joins the new Faïdh El Botma" },
  { wilaya_code: 66, id: 545, name_fr: "Sed Rahal", note: "Sed Rahal joins Messaad, Faïdh El Botma seats its own daira" },
  { wilaya_code: 66, id: 546, name_fr: "Selmana", note: "Selmana joins Messaad, Oum Laadham joins Faïdh El Botma" },
  { wilaya_code: 67, id: 549, name_fr: "Boghar", note: "its three communes keep company under the new seat Ouled Antar" },
];

/** The annex as printed, plus the wilaya ranges it leaves unchanged. */
export function readExtract() {
  return JSON.parse(readFileSync(EXTRACT_PATH, "utf8"));
}

/**
 * The daira each commune of an annexed wilaya belongs to under the annex.
 * Returns `Map<code_commune, seat name as this dataset spells it>` plus the
 * per-wilaya seat order, so the daira table can be rebuilt from it.
 *
 * @param {Array<{wilaya_code:number, name_fr:string, code_commune:number}>} communes
 * @param {Array<{wilaya_code:number, name_fr:string}>} dairas the table as held,
 *   with DAIRA_RENAMES already applied; a seat commune whose name folds onto one
 *   of its rows is written the way that row spells it.
 */
export function membershipFromExtract(extract, communes, dairas) {
  const byWilaya = new Map();
  for (const commune of communes) {
    if (!byWilaya.has(commune.wilaya_code)) byWilaya.set(commune.wilaya_code, new Map());
    byWilaya.get(commune.wilaya_code).set(fold(commune.name_fr), commune);
  }
  const heldNames = new Map();
  for (const daira of dairas) {
    heldNames.set(`${daira.wilaya_code}|${fold(daira.name_fr)}`, daira.name_fr);
  }
  const seatOf = new Map(); // code_commune -> daira name
  const seats = new Map(); // wilaya_code -> [daira name, ...] in printed order
  const members = new Map(); // "wilaya|daira" -> [code_commune, ...] in printed order
  const unmatched = [];
  for (const wilaya of extract.wilayas) {
    const known = byWilaya.get(wilaya.wilaya_code) ?? new Map();
    const resolve = (printed) => {
      const aliased = COMMUNE_NAME_ALIASES[`${wilaya.wilaya_code}|${printed}`] ?? printed;
      const commune = known.get(fold(aliased));
      if (!commune) unmatched.push(`w${wilaya.wilaya_code} "${printed}"`);
      return commune;
    };
    const order = [];
    for (const daira of wilaya.dairas) {
      const seat = resolve(daira.seat);
      if (!seat) continue;
      const name = heldNames.get(`${wilaya.wilaya_code}|${fold(seat.name_fr)}`) ?? seat.name_fr;
      order.push(name);
      const codes = [];
      for (const printed of daira.communes) {
        const commune = resolve(printed);
        if (!commune) continue;
        seatOf.set(commune.code_commune, name);
        codes.push(commune.code_commune);
      }
      members.set(`${wilaya.wilaya_code}|${name}`, codes);
    }
    seats.set(wilaya.wilaya_code, order);
  }
  if (unmatched.length) {
    throw new Error(
      `decree-26-253: ${unmatched.length} printed commune name(s) match no record: ${unmatched.join(", ")}`,
    );
  }
  return { seatOf, seats, members };
}
