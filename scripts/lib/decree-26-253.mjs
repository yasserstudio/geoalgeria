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

/** The 91-306 membership this dataset held for every daira the annex unseats,
 *  by the name the table gave it. The rows are gone from the table once the
 *  annex is applied, so the evidence the three judgements below rest on is
 *  recorded here rather than read back out of history. */
export const DAIRA_MEMBERS_BEFORE = {
  "59|Hadj Mechri": { id: 524, communes: [315, 317] },
  "60|Azil Abdelkader": { id: 525, communes: [515, 556] },
  "60|Tilatou": { id: 528, communes: [518] },
  "64|Rechaiga": { id: 537, communes: [1430, 1435] },
  "64|Zmalet El Emir Abdelkader": { id: 538, communes: [1440] },
  "65|Bouira Lahdab": { id: 541, communes: [1709, 1720] },
  "66|Amourah": { id: 543, communes: [1734] },
  "66|Sed Rahal": { id: 545, communes: [1706, 1707] },
  "66|Selmana": { id: 546, communes: [1722, 1724] },
  "67|Boghar": { id: 549, communes: [2622, 2625, 2658] },
};

/** Seats the annex moves: the same body of communes under another commune's
 *  name, so it keeps its id and only its name and membership change. A published
 *  id is retired only when the daira itself is gone, never because its seat or
 *  its name moved (owner rule, yasserstudio/geoalgeria.com#171 and #211). Which
 *  seats these are is not a free choice: `idTravel` derives it from the
 *  membership above, and the apply script refuses a table that disagrees. */
export const DAIRA_RESEATS = [
  { wilaya_code: 60, id: 525, from: "Azil Abdelkader", to: "Djezzar" },
  { wilaya_code: 64, id: 537, from: "Rechaiga", to: "Hamadia" },
  { wilaya_code: 65, id: 541, from: "Bouira Lahdab", to: "Had Sahary" },
  { wilaya_code: 67, id: 549, from: "Boghar", to: "Ouled Antar" },
];

/** Seats the annex creates: a grouping no unseated daira is the majority of.
 *  Ids continue the table rather than filling a gap. */
export const DAIRA_ROWS_ADDED = [
  { wilaya_code: 59, name_fr: "Oued Morra", id: 565 },
  { wilaya_code: 66, name_fr: "Faïdh El Botma", id: 566 },
];

/** Seats the annex drops for good: no annex daira inherits them. Their communes
 *  go to the dairas the annex names; the ids are reserved in
 *  packages/dataset/data/retired-ids.json and never reused. */
export const DAIRA_ROWS_RETIRED = [
  { wilaya_code: 59, id: 524, name_fr: "Hadj Mechri", note: "its two communes join Brida" },
  { wilaya_code: 60, id: 528, name_fr: "Tilatou", note: "Tilatou joins Seggana" },
  { wilaya_code: 64, id: 538, name_fr: "Zmalet El Emir Abdelkader", note: "Bougara, the one commune it held, joins Hamadia; the annex leaves the seat commune under Ksar Chellala, where this dataset already held it" },
  { wilaya_code: 66, id: 543, name_fr: "Amourah", note: "Amourah joins the new Faïdh El Botma, one of its three communes" },
  { wilaya_code: 66, id: 545, name_fr: "Sed Rahal", note: "Sed Rahal joins Messaad, Faïdh El Botma seats its own daira" },
  { wilaya_code: 66, id: 546, name_fr: "Selmana", note: "Selmana joins Messaad, Oum Laadham joins Faïdh El Botma" },
];

/**
 * Where a daira id travels when the annex reseats a daira, and when it stops.
 *
 * An annex daira the table does not already name inherits the id of an unseated
 * daira when that daira supplies a majority of its communes and is the only
 * unseated daira of the wilaya that does: the same body of communes carries on
 * under another seat, which is a reseat and not a new daira. A grouping no
 * unseated daira is the majority of is genuinely new and takes a fresh id, and
 * an unseated daira nothing inherits is retired. Majority is counted over the
 * annex daira's communes, not the unseated one's: a daira that hands one commune
 * to a three-commune grouping is not that grouping.
 *
 * @param {Map<string, number[]>} members "wilaya|seat" -> code_commune[], from
 *   membershipFromExtract
 * @param {Array<{wilaya_code:number, name_fr:string}>} unnamedSeats the annex
 *   seats no row of the held table names
 * @returns {{inherits: Map<string, number>, mints: string[], retiredIds: number[]}}
 */
export function idTravel(members, unnamedSeats) {
  const unseated = Object.entries(DAIRA_MEMBERS_BEFORE).map(([key, row]) => ({
    key,
    wilaya_code: Number(key.split("|")[0]),
    name_fr: key.split("|")[1],
    ...row,
  }));
  const inherits = new Map();
  const mints = [];
  const claimedBy = new Map();
  for (const seat of unnamedSeats) {
    const key = `${seat.wilaya_code}|${seat.name_fr}`;
    const communes = members.get(key) ?? [];
    if (!communes.length) throw new Error(`idTravel: the annex seat ${key} has no communes`);
    const claims = unseated.filter(
      (row) =>
        row.wilaya_code === seat.wilaya_code &&
        row.communes.filter((code) => communes.includes(code)).length * 2 > communes.length,
    );
    if (claims.length > 1) {
      throw new Error(
        `idTravel: ${key} has more than one majority predecessor (${claims.map((row) => row.id).join(", ")}), which needs a reviewed judgement`,
      );
    }
    if (!claims.length) {
      mints.push(key);
      continue;
    }
    const [claim] = claims;
    if (claimedBy.has(claim.id)) {
      throw new Error(
        `idTravel: daira id ${claim.id} is claimed by both ${claimedBy.get(claim.id)} and ${key}`,
      );
    }
    claimedBy.set(claim.id, key);
    inherits.set(key, claim.id);
  }
  return {
    inherits,
    mints,
    retiredIds: unseated.filter((row) => !claimedBy.has(row.id)).map((row) => row.id),
  };
}

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
