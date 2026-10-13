// The commune postal codes the mirror carriers published before 2026-10-13, which
// scripts/fix-commune-postal-codes.mjs replaces once and then refuses to see again.
//
// WHY THIS FILE EXISTS. That script rebuilt every commune postal code from Algerie
// Poste's own locator on 2026-08-07 and wrote only the four JSON tables. The
// GeoJSON, the two CSVs, the two SQL dumps and the ecommerce JSON kept what they
// had, so 187 communes read a different postal code depending on the format a
// consumer installed (private tracker #246). 108 of those 187 are rows the same
// derivation produces today, so they need nothing recorded: the mirror already
// holds the value the repair writes. These 79 are the rest, and every one of them
// is a value the repair cannot derive and must not be allowed to invent.
//
// WHAT A ROW SAYS. `superseded` is what all six mirrors published for that commune,
// and `note` is what the Algerie Poste capture says that code actually is: almost
// every one is another commune's office code, which is how the drift reads as an
// error rather than as a second opinion. The script accepts `superseded` in place
// of the table's own value and writes the derived code over it; any OTHER value in
// any carrier aborts the run, which is the from/to contract of
// scripts/fix-commune-centres.mjs applied to a mapping that has no hand ledger of
// its own. Once this repair has landed, every carrier holds the derived code and
// nothing here matches anything again; the rows stay as the record of what was
// replaced, and as the reason a NEW third value is a defect and not a precedent.
//
// THE ONE ROW THE OTHER WAY. Ain Kerma (3125) published no code at all while the
// table had one; it is here for the same reason, as a value the repair replaces.
//
// NOT A SOURCE. Nothing here is evidence for a postal code. The source of truth is
// packages/poste/data/postoffices.json, as the fix script's header states.

/** @type {{code_commune:number,wilaya_code:number,name_fr:string,superseded:string|null,note:string}[]} */
export const SUPERSEDED_CARRIER_CODES = [
  { code_commune: 316, wilaya_code: 59, name_fr: "Sebgag", superseded: "03003", note: "the code of KSAR EL HIRANE (R2), the office of KSAR EL HIRANE in wilaya 03" },
  { code_commune: 324, wilaya_code: 59, name_fr: "Sidi Bouzid", superseded: "03007", note: "the code of TADJEMOUT (R3), the office of TADJEMOUT in wilaya 03" },
  { code_commune: 405, wilaya_code: 4, name_fr: "El Amiria", superseded: "04004", note: "the code of MESKIANA (R1), the office of MESKIANA in wilaya 04" },
  { code_commune: 561, wilaya_code: 5, name_fr: "Larbaa", superseded: "38022", note: "the code of LARBAA (R4), the office of LARBAA in wilaya 38" },
  { code_commune: 719, wilaya_code: 61, name_fr: "El Outaya", superseded: "07026", note: "the code of EL FEIDH (R3), the office of EL FEIDH in wilaya 07" },
  { code_commune: 928, wilaya_code: 9, name_fr: "Ain Romana", superseded: "09028", note: "the code of DJEBABRA (R4), the office of DJEBABRA in wilaya 09" },
  { code_commune: 929, wilaya_code: 9, name_fr: "Djebabra", superseded: "09023", note: "the code of AIN ROUMANA (R4), the office of AIN ROMANA in wilaya 09" },
  { code_commune: 1029, wilaya_code: 10, name_fr: "Ain Turk", superseded: "10120", note: "no office in the Algerie Poste capture carries this code" },
  { code_commune: 1439, wilaya_code: 64, name_fr: "Serguine", superseded: "14051", note: "the code of FRITISSA (R4), the office of SERGHINE in wilaya 64" },
  { code_commune: 1634, wilaya_code: 16, name_fr: "Bir Touta", superseded: "16118", note: "the code of OULED CHEBEL (R4), the office of OULED CHEBEL in wilaya 16" },
  { code_commune: 1635, wilaya_code: 16, name_fr: "Tessala El Merdja", superseded: "16045", note: "the code of BIRTOUTA (R1), the office of BIRTOUTA in wilaya 16" },
  { code_commune: 1636, wilaya_code: 16, name_fr: "Ouled Chebel", superseded: "16099", note: "the code of TESSALA EL MERDJA (R1), the office of TESSALA EL MERDJA in wilaya 16" },
  { code_commune: 1638, wilaya_code: 16, name_fr: "Ain Taya", superseded: "16116", note: "the code of HERAOUA (R2), the office of HARAOUA in wilaya 16" },
  { code_commune: 1639, wilaya_code: 16, name_fr: "Bordj El Bahri", superseded: "16017", note: "the code of ROUIBA RP (CE), the office of ROUIBA in wilaya 16" },
  { code_commune: 1640, wilaya_code: 16, name_fr: "El Marsa", superseded: "16036", note: "the code of REGHAIA (HC), the office of REGHAIA in wilaya 16" },
  { code_commune: 1641, wilaya_code: 16, name_fr: "Herraoua", superseded: "16046", note: "the code of BORDJ EL BAHRI (R1), the office of BORDJ EL BAHRI in wilaya 16" },
  { code_commune: 1642, wilaya_code: 16, name_fr: "Rouiba", superseded: "16019", note: "the code of AIN TAYA (R1), the office of AIN TAYA in wilaya 16" },
  { code_commune: 1643, wilaya_code: 16, name_fr: "Reghaia", superseded: "16115", note: "the code of ALGER EST EL MARSA (R3), the office of EL MARSA in wilaya 16" },
  { code_commune: 1644, wilaya_code: 16, name_fr: "Ain Benian", superseded: "16095", note: "the code of SAOULA (R2), the office of SAOULA in wilaya 16" },
  { code_commune: 1650, wilaya_code: 16, name_fr: "Cheraga", superseded: "16104", note: "the code of EL ACHOUR (R3), the office of EL ACHOUR in wilaya 16" },
  { code_commune: 1652, wilaya_code: 16, name_fr: "El Achour", superseded: "16049", note: "the code of DOUERA (R1), the office of DOUERA in wilaya 16" },
  { code_commune: 1653, wilaya_code: 16, name_fr: "Draria", superseded: "16097", note: "the code of SOUIDANIA (R2), the office of SOUIDANIA in wilaya 16" },
  { code_commune: 1654, wilaya_code: 16, name_fr: "Douira", superseded: "16121", note: "the code of RAHMANIA (R4), the office of RAHMANIA in wilaya 16" },
  { code_commune: 1655, wilaya_code: 16, name_fr: "Baba Hassen", superseded: "16093", note: "the code of MAHELMA (R2), the office of MAHELMA in wilaya 16" },
  { code_commune: 1657, wilaya_code: 16, name_fr: "Sehaoula", superseded: "16062", note: "the code of STAOUELI (R1), the office of STAOUELI in wilaya 16" },
  { code_commune: 1729, wilaya_code: 66, name_fr: "Deldoul", superseded: "17415", note: "no office in the Algerie Poste capture carries this code" },
  { code_commune: 2014, wilaya_code: 20, name_fr: "Ouled Brahim", superseded: "26036", note: "the code of OULED BRAHIM (R3), the office of OULED BRAHIM in wilaya 26" },
  { code_commune: 2503, wilaya_code: 25, name_fr: "Ben Badis", superseded: "25102", note: "no office in the Algerie Poste capture carries this code" },
  { code_commune: 2653, wilaya_code: 26, name_fr: "Deux Bassins", superseded: "26060", note: "the code of EL HAMDANIA (R4), the office of EL HAMDANIA in wilaya 26" },
  { code_commune: 2839, wilaya_code: 68, name_fr: "Menaâ", superseded: "28016", note: "the code of MEDJEDEL (R3), the office of MEDJEDEL in wilaya 68" },
  { code_commune: 2846, wilaya_code: 68, name_fr: "Oultem", superseded: "28054", note: "the code of EL ALLIG (R4), the office of OULTENE in wilaya 68" },
  { code_commune: 3125, wilaya_code: 31, name_fr: "Ain Kerma", superseded: null, note: "published with no postal code" },
  { code_commune: 3427, wilaya_code: 34, name_fr: "El Euch", superseded: "34006", note: "the code of EL ACHIR (R2), the office of EL ACHIR in wilaya 34" },
  { code_commune: 4107, wilaya_code: 41, name_fr: "Zaarouria", superseded: "41010", note: "the code of AIN SEYNOUR (R3), the office of MECHROHA in wilaya 41" },
  { code_commune: 4120, wilaya_code: 41, name_fr: "Sidi Fredj", superseded: "41026", note: "the code of AIN SOLTANE (R4), the office of AIN SOLTANE in wilaya 41" },
  { code_commune: 4124, wilaya_code: 41, name_fr: "Oued Kebrit", superseded: "41026", note: "the code of AIN SOLTANE (R4), the office of AIN SOLTANE in wilaya 41" },
  { code_commune: 4210, wilaya_code: 42, name_fr: "Aghbal", superseded: "42007", note: "the code of GOURAYA (R2), the office of GOURAYA in wilaya 42" },
  { code_commune: 4212, wilaya_code: 42, name_fr: "Hadjout", superseded: "42012", note: "the code of CHAIBA (R3), the office of CHAIBA in wilaya 42" },
  { code_commune: 4213, wilaya_code: 42, name_fr: "Sidi-Amar", superseded: "42023", note: "the code of AIN TAGGOURAIT (R3), the office of AIN TAGOURAIT in wilaya 42" },
  { code_commune: 4214, wilaya_code: 42, name_fr: "Gouraya", superseded: "42018", note: "the code of MENACEUR (R2), the office of MENACEUR in wilaya 42" },
  { code_commune: 4215, wilaya_code: 42, name_fr: "Nador", superseded: "42014", note: "the code of DAMOUS (R3), the office of DAMOUS in wilaya 42" },
  { code_commune: 4216, wilaya_code: 42, name_fr: "Chaiba", superseded: "42019", note: "the code of MERAD (R3), the office of MERAD in wilaya 42" },
  { code_commune: 4217, wilaya_code: 42, name_fr: "Ain Tagourait", superseded: "42006", note: "the code of FOUKA VILLE (R2), the office of FOUKA in wilaya 42" },
  { code_commune: 4222, wilaya_code: 42, name_fr: "Cherchell", superseded: "42036", note: "the code of MESSELMOUN (R4), the office of MESSELMOUN in wilaya 42" },
  { code_commune: 4223, wilaya_code: 42, name_fr: "Damous", superseded: "42040", note: "the code of SIDI RACHED (R3), the office of SIDI RACHED in wilaya 42" },
  { code_commune: 4224, wilaya_code: 42, name_fr: "Merad", superseded: "42003", note: "the code of KOLEA (HC), the office of KOLEA in wilaya 42" },
  { code_commune: 4225, wilaya_code: 42, name_fr: "Fouka", superseded: "42008", note: "the code of ATTATBA (R3), the office of ATTATBA in wilaya 42" },
  { code_commune: 4226, wilaya_code: 42, name_fr: "Bou Ismail", superseded: "42041", note: "the code of SIDI SEMIANE (R4), the office of SIDI SEMIANE in wilaya 42" },
  { code_commune: 4227, wilaya_code: 42, name_fr: "Ahmer El Ain", superseded: "42024", note: "the code of BOUYAMINE (R4), the office of BENI MILLEUK in wilaya 42" },
  { code_commune: 4230, wilaya_code: 42, name_fr: "Bou Haroun", superseded: "42020", note: "the code of SIDI AMAR (R3), the office of SIDI AMAR in wilaya 42" },
  { code_commune: 4316, wilaya_code: 43, name_fr: "Tassala Lematai", superseded: "43007", note: "the code of TADJENANET (R2), the office of TADJENANET in wilaya 43" },
  { code_commune: 4329, wilaya_code: 43, name_fr: "El Ayadi Barbes", superseded: "43009", note: "the code of ROUACHED (R2), the office of ROUACHED in wilaya 43" },
  { code_commune: 4330, wilaya_code: 43, name_fr: "Ain Beida Harriche", superseded: "43033", note: "the code of TASSADANE (R3), the office of TASSADANE HADDADA in wilaya 43" },
  { code_commune: 4331, wilaya_code: 43, name_fr: "Yahia Beniguecha", superseded: "43015", note: "the code of AIN MELOUK (R3), the office of AIN MELLOUK in wilaya 43" },
  { code_commune: 4412, wilaya_code: 44, name_fr: "Djendel", superseded: "44023", note: "the code of HAMMAM RIGHA (R3), the office of HAMMAM RIGHA in wilaya 44" },
  { code_commune: 4419, wilaya_code: 44, name_fr: "Bir-Ould-Khelifa", superseded: "44002", note: "the code of EL ATTAF (HC), the office of EL ATTAF in wilaya 44" },
  { code_commune: 4434, wilaya_code: 44, name_fr: "El-Maine", superseded: "44020", note: "the code of AIN TORKI (R4), the office of AIN TORKI in wilaya 44" },
  { code_commune: 4505, wilaya_code: 45, name_fr: "Sfissifa", superseded: "45001", note: "the code of AIN SEFRA (R1), the office of AIN SEFRA in wilaya 45" },
  { code_commune: 4507, wilaya_code: 45, name_fr: "Asla", superseded: "45030", note: "the code of TIOUT (R4), the office of TIOUT in wilaya 45" },
  { code_commune: 4508, wilaya_code: 45, name_fr: "Djenienne Bourezg", superseded: "45030", note: "the code of TIOUT (R4), the office of TIOUT in wilaya 45" },
  { code_commune: 4602, wilaya_code: 46, name_fr: "Chaabat El Ham", superseded: "46033", note: "the code of BOUZEDJAR (R4), the office of BOUZEDJAR in wilaya 46" },
  { code_commune: 4603, wilaya_code: 46, name_fr: "Ain Kihal", superseded: "46045", note: "the code of OULED KIHAL (R4), the office of OULED KIHAL in wilaya 46" },
  { code_commune: 4614, wilaya_code: 46, name_fr: "El Maleh", superseded: "46016", note: "the code of AGHLAL (R4), the office of AGHLAL in wilaya 46" },
  { code_commune: 4619, wilaya_code: 46, name_fr: "El Amria", superseded: "46022", note: "the code of OUED BERKECHE (R4), the office of OUED BERKECHE in wilaya 46" },
  { code_commune: 4626, wilaya_code: 46, name_fr: "Sidi Ouriache", superseded: "46033", note: "the code of BOUZEDJAR (R4), the office of BOUZEDJAR in wilaya 46" },
  { code_commune: 4703, wilaya_code: 47, name_fr: "Dhayet Bendhahoua", superseded: "47012", note: "the code of EL ATTEUF (R3), the office of EL ATTEUF in wilaya 47" },
  { code_commune: 4706, wilaya_code: 47, name_fr: "El Guerrara", superseded: "58001", note: "the code of EL MENIAA (HC), the office of EL MENIA in wilaya 58" },
  { code_commune: 4707, wilaya_code: 47, name_fr: "El Atteuf", superseded: "58006", note: "the code of HASSI EL GARA (R2), the office of HASSI EL GARA in wilaya 58" },
  { code_commune: 4805, wilaya_code: 48, name_fr: "Ouled Aiche", superseded: "48039", note: "the code of BENI DERGOUN (R4), the office of BENI DERGOUN in wilaya 48" },
  { code_commune: 4809, wilaya_code: 48, name_fr: "Mediouna", superseded: "48015", note: "the code of AIN TARIK (R3), the office of AIN TAREK in wilaya 48" },
  { code_commune: 4815, wilaya_code: 48, name_fr: "El-Guettar", superseded: "48051", note: "the code of HAMRI (R4), the office of EL HAMRI in wilaya 48" },
  { code_commune: 4818, wilaya_code: 48, name_fr: "Sidi M'hamed Benaouda", superseded: "48033", note: "the code of AIN RAHMA (R4), the office of AIN RAHMA in wilaya 48" },
  { code_commune: 4819, wilaya_code: 48, name_fr: "Ain-Tarek", superseded: "48016", note: "the code of EL GUETTAR (R3), the office of EL GUETTAR in wilaya 48" },
  { code_commune: 4833, wilaya_code: 48, name_fr: "El Hassi", superseded: "48067", note: "the code of SIDI SAADA (R4), the office of SIDI SAADA in wilaya 48" },
  { code_commune: 4834, wilaya_code: 48, name_fr: "Had Echkalla", superseded: "48003", note: "the code of SIDI MHAMED BEN ALI (R1), the office of SIDI M'HAMED BEN ALI in wilaya 48" },
  { code_commune: 5102, wilaya_code: 51, name_fr: "Ras El Miad", superseded: "05087", note: "the code of OULED DERRADJI (R4), the office of AZIL ABDELKADER (METKOUAK) in wilaya 60" },
  { code_commune: 5506, wilaya_code: 55, name_fr: "Sidi Slimane", superseded: "55008", note: "no office in the Algerie Poste capture carries this code" },
];

/** code_commune -> the superseded published value, one row per commune. */
export function supersededByCode() {
  const out = new Map();
  for (const row of SUPERSEDED_CARRIER_CODES) {
    if (out.has(row.code_commune)) throw new Error(`two rows for code_commune ${row.code_commune}`);
    out.set(row.code_commune, row.superseded);
  }
  return out;
}

/**
 * The communes this release gives a postal code for the FIRST time: every commune
 * whose `postal_code` was null in the four JSON tables before this branch and is a
 * derived office code after it.
 *
 * WHY THE SCRIPT NEEDS THEM NAMED. The from/to contract accepts a row holding the
 * value `data/algeria.json` carries or the value the run derives. Once the table is
 * repaired those two are the same value, so null stops being either of them, and a
 * carrier that has not had this release yet is refused rather than repaired: a
 * `--write --target` run against the web app's own copy of the table reported 135
 * problems and wrote nothing, which is the whole point of `--target`. Null is
 * therefore accepted as a `from` for exactly these 135 communes, which is a
 * statement about a release and not a general licence to overwrite a blank: a
 * commune that is not here and holds null still aborts the run.
 *
 * NOT THE SAME CLAIM AS SUPERSEDED_CARRIER_CODES. A row there says the mirrors
 * published a value and it was wrong. A code here says there was no value to
 * publish. Ain Kerma (3125) is in the ledger with `superseded: null` because the
 * mirrors published nothing while the table had 31059; it is not here, because the
 * table was not blank. 21 of these 135 are in the ledger as well, with the code a
 * mirror published, and both readings have to pass: a mirror holding that code, and
 * a fork holding nothing.
 *
 * @type {readonly number[]}
 */
export const FILLED_FROM_NULL = [
  310, 311, 312, 313, 314, 315, 316, 317, 319, 321, 322, 324,
  514, 515, 518, 527, 529, 542, 543, 555, 556, 703, 717, 718,
  719, 720, 1102, 1202, 1209, 1215, 1228, 1310, 1332, 1341, 1343, 1409,
  1429, 1430, 1435, 1439, 1440, 1604, 1641, 1654, 1657, 1706, 1707, 1708,
  1709, 1711, 1717, 1718, 1719, 1720, 1721, 1722, 1724, 1729, 1731, 1732,
  1733, 1734, 1735, 1802, 2304, 2603, 2604, 2608, 2610, 2617, 2618, 2622,
  2623, 2625, 2631, 2632, 2635, 2638, 2640, 2641, 2642, 2649, 2651, 2653,
  2657, 2658, 2664, 2807, 2808, 2820, 2821, 2822, 2823, 2824, 2825, 2826,
  2827, 2833, 2834, 2835, 2836, 2837, 2838, 2839, 2841, 2842, 2843, 2844,
  2846, 2847, 3207, 3208, 3209, 3213, 3214, 3216, 3219, 3427, 4124, 4241,
  4316, 4419, 4508, 4602, 4614, 4626, 4627, 4703, 4834, 5106, 5206, 5502,
  5602, 5801, 5803,
];

/** The communes a null is a valid `from` for, as a set. */
export function filledFromNull() {
  const out = new Set(FILLED_FROM_NULL);
  if (out.size !== FILLED_FROM_NULL.length) throw new Error("a code_commune is listed twice");
  return out;
}
