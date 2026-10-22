// The evidence-backed pair table: the FR/AR halves of one establishment that the
// automatic twin rule cannot reach, each pair asserted by hand and each citing a
// source that is not the registry.
//
// WHY A TABLE AT ALL. The Ministry of Health registry publishes every
// establishment twice, once in French and once in Arabic, under two post ids.
// `pairTwinPosts` in fetch.mjs recovers the pair from post adjacency plus a
// consonant-skeleton name check, and it allows a gap of at most two post ids
// (TWIN_MAX_GAP), because adjacency is the only thing it has: only 42.9% of
// French posts have an Arabic post at id+1, so a wider window pairs the wrong
// facilities far more often than the right ones. Four cities entered their two
// halves five to fourteen ids apart, and in each of them the two halves name
// nothing but the city, so no automatic rule can separate one hospital's halves
// from the next hospital's (private tracker #287, from #216).
//
// WHY NOT A WIDER GAP. Skikda and Ouargla each publish an "Etablissement
// Hospitalier" and an "Etablissement Public Hospitalier" of the same city, and
// Oran a CHU and an EHU. Widening the gap would put four candidates in reach of
// each other whose only discriminating word is the registry's own class
// vocabulary, which is exactly the signal `twinTokens` drops as generic because
// every establishment in the registry carries it. The gap rule would then pair
// on the city name, which is shared, and the merge would be a coin toss.
//
// WHAT A ROW HAS TO CARRY. A hand-written pair retires a public id, so a row is
// only as good as the reading behind it:
//
//  - `expect_fr` / `expect_ar` are the registry titles the row was written
//    about, verbatim. `assertPairTable` fails the build when a title no longer
//    reads that way, because a renamed post is no longer the facility the
//    evidence was gathered for. This is the same guard `WIKIDATA_PINS` uses.
//  - `evidence` is at least one SECOND source: an OpenStreetMap element, a
//    Wikidata item, a ministry or Journal Officiel page, or the establishment's
//    own site. Never the registry, which is the single source the gap rule
//    already refused to trust, and never Google, which is a flag and not a
//    source (ADR 0001 rule 6). Each entry carries the reading that makes it
//    evidence, not just a link.
//
// Cases checked for #287 and deliberately left UNPAIRED are listed in
// `UNPAIRED_CANDIDATES` below with the reason, so a silence is a recorded
// decision rather than an omission.

/** @typedef {{source: string, url: string, checked_at: string, note: string}} PairEvidence */

/**
 * One asserted FR/AR pair. `facility` is the establishment the row is about, in
 * the project's own words, so a reader of the table knows which hospital each
 * row names before resolving any id.
 *
 * @type {{wilaya_code: string, type: string, msp_fr: string, msp_ar: string,
 *         expect_fr: string, expect_ar: string, facility: string,
 *         evidence: PairEvidence[]}[]}
 */
export const TWIN_PAIR_TABLE = [
  {
    wilaya_code: "01",
    type: "eph",
    msp_fr: "2359",
    msp_ar: "3643",
    expect_fr: "Etablissement Public Hospitalier Adrar",
    expect_ar: "المؤسسة العمومية الإستشفائية بادرار",
    facility: "EPH Ibn Sina, Adrar",
    evidence: [
      {
        source: "openstreetmap",
        url: "https://www.openstreetmap.org/way/393042095",
        checked_at: "2026-10-22",
        note:
          "amenity=hospital, name 'Hopital Ibn Sina', official_name 'Etablissement Public Hospitalier Ibn Sina Adrar', " +
          "wikidata Q18785599. A public hospital establishment of Adrar city in its own right, which is what post 2359 " +
          "names, and a different building from the Nouveau Hopital of post 3584 that already ships bilingual as 01-eph-03.",
      },
      {
        source: "wikidata",
        url: "https://www.wikidata.org/wiki/Q18785599",
        checked_at: "2026-10-22",
        note:
          "P31 Q16917 hospital, P131 Q251181 Adrar, fr label 'hopital d'Adrar'. The item carries NO Arabic label, so it " +
          "testifies to the French half only; the Arabic half is fixed by elimination, as the single remaining Arabic EPH " +
          "post of wilaya 01 once Aoulef, the Nouveau Hopital and Reggane are each paired, and its own text reads " +
          "'at Adrar'. That is the same reading the generator's own one-left rule makes for a place-named type.",
      },
    ],
  },
  {
    wilaya_code: "14",
    type: "eph",
    msp_fr: "4582",
    msp_ar: "4586",
    expect_fr: "Etablissement Public Hospitalier SOUGUEUR TIARET",
    expect_ar: "المؤسسة العمومية الإستشفائية سوقر تيارت",
    facility: "EPH Ghermit Naceur, Sougueur",
    evidence: [
      {
        source: "openstreetmap",
        url: "https://www.openstreetmap.org/node/5477990321",
        checked_at: "2026-10-22",
        note:
          "amenity=hospital at 35.18651, 1.49134, name:fr 'eph sougueur guermit Nasseur' and name:ar " +
          "'مستشفى سوقر قرميط ناصر'. One element naming the public hospital of Sougueur in both scripts, which is the two " +
          "halves of posts 4582 and 4586 stated together by a source that is not the registry.",
      },
      {
        source: "openstreetmap",
        url: "https://www.openstreetmap.org/node/2947184170",
        checked_at: "2026-10-22",
        note:
          "A second, independently mapped element 160 m away: name 'EPH Sougueur', name:fr 'hopital ghermit naseur', " +
          "name:ar 'مستشفى قرميط ناصر'. Both elements sit in the commune of Sougueur, not in Tiaret, which is also why the " +
          "merged record takes the French half's commune: the Arabic half matched Tiaret on the wilaya name in its title.",
      },
    ],
  },
  {
    wilaya_code: "31",
    type: "chu",
    msp_fr: "5139",
    msp_ar: "5129",
    expect_fr: "Centre Hospitalo Universitaire Oran",
    expect_ar: "المركز الإستشفائي الجامعي لوهران",
    facility: "CHU Oran",
    evidence: [
      {
        source: "openstreetmap",
        url: "https://www.openstreetmap.org/relation/5484301",
        checked_at: "2026-10-22",
        note:
          "amenity=hospital, name:fr 'Centre Hospitalier Universitaire d'Oran', name:ar 'المركز الاستشفائي الجامعي وهران', " +
          "short_name 'CHU Oran'. The two halves of posts 5139 and 5129 on one element, in central Oran.",
      },
      {
        source: "wikidata",
        url: "https://www.wikidata.org/wiki/Q7894776",
        checked_at: "2026-10-22",
        note:
          "P31 Q16917 hospital and Q3918 university, P131 Q131818 Oran, fr label 'centre hospitalier universitaire d'Oran', " +
          "ar label 'المركز الإستشفائي الجامعي وهران'. An independent second reading of the same two names, and the item " +
          "this record is already pinned to.",
      },
    ],
  },
  {
    wilaya_code: "31",
    type: "chu",
    msp_fr: "5158",
    msp_ar: "5144",
    expect_fr: "Etablissement Hospitalier Universitaire Oran",
    expect_ar: "المؤسسة الاستشفائية الجامعية وهران",
    facility: "EHU 1er Novembre 1954, Oran (USTO)",
    evidence: [
      {
        source: "openstreetmap",
        url: "https://www.openstreetmap.org/way/71816173",
        checked_at: "2026-10-22",
        note:
          "amenity=hospital, name:fr 'EHU USTO - 1 Novembre', operator:wikidata Q17639127 (the Ministry of Health), at USTO " +
          "in Bir El Djir. A ministry-run university hospital establishment distinct from the CHU relation in central Oran, " +
          "which is what post 5158 names. Its name:ar reads 'المؤسسة العمومية الإستشفائية أول نوفمبر', which says public " +
          "hospital establishment and not university hospital establishment; that tag is mistagged upstream and is NOT " +
          "cited here as evidence for the Arabic half.",
      },
      {
        source: "wikidata",
        url: "https://www.wikidata.org/wiki/Q7894776",
        checked_at: "2026-10-22",
        note:
          "What fixes the Arabic half is the CHU pair above: this group holds exactly two French and two Arabic posts, and " +
          "two independent sources give the CHU's Arabic name as post 5129's, so the only pairing left for post 5158 is " +
          "post 5144, whose own text reads 'university hospital establishment of Oran'. The swap is excluded by evidence " +
          "rather than assumed.",
      },
    ],
  },
];

/**
 * Cases #287 asked about that this table does NOT pair, each with what is
 * missing. A case leaves this list only when a second source is found for it.
 *
 * @type {{wilaya_code: string, type: string, msp_fr: string, msp_ar: string,
 *         facility: string, why: string}[]}
 */
export const UNPAIRED_CANDIDATES = [
  {
    wilaya_code: "21",
    type: "eph",
    msp_fr: "4804",
    msp_ar: "4809",
    facility: "Skikda, the establishment the registry calls public",
    why:
      "Skikda city publishes an 'Etablissement hospitalier' and an 'Etablissement Public Hospitalier', and both carry the " +
      "city name and nothing else. Separating them needs a source that says which Skikda hospital is the public " +
      "establishment and which is not, in both languages. OpenStreetMap has two hospital buildings in the city, way/253913494 " +
      "'Nouvel Hopital Abderezzak Bouhara' with no Arabic name at all and way/253914659 'Hopital de Skikda' / 'مستشفى سكيكدة', " +
      "which is a toponym carrying neither legal class. Checked 2026-10-22: no ministry page, Journal Officiel text, Wikidata " +
      "item or OpenStreetMap element names either establishment by its class in both languages, so both halves stay separate " +
      "records.",
  },
  {
    wilaya_code: "21",
    type: "eph",
    msp_fr: "4814",
    msp_ar: "4825",
    facility: "Skikda, the establishment the registry does not call public",
    why: "The other half of the same Skikda question; same reading, same date, same absence of a second source.",
  },
  {
    wilaya_code: "30",
    type: "eph",
    msp_fr: "5117",
    msp_ar: "5109",
    facility: "Ouargla, the establishment the registry calls public",
    why:
      "Ouargla reads like Skikda, one 'Etablissement hospitalier' and one 'Etablissement Public Hospitalier' of the city, but " +
      "with a second doubt on top of the first: checked 2026-10-22, only ONE general hospital of Ouargla city could be found " +
      "in any source, way/303499771 'Hopital Mohamed Boudiaf' (and it carries no Arabic name). The other two hospitals found " +
      "are a different legal class, the ophthalmology hospital way/304632975 and the mother-and-child EHS way/377113766. So it " +
      "is not established that these four posts are two establishments at all: they may be one, entered under an older and a " +
      "newer legal name, which would be a repeat merge of four posts rather than two pairs. Pairing them would decide that " +
      "question by assumption.",
  },
  {
    wilaya_code: "30",
    type: "eph",
    msp_fr: "5112",
    msp_ar: "5104",
    facility: "Ouargla, the establishment the registry does not call public",
    why: "The other half of the same Ouargla question; same reading, same date, same unresolved doubt about how many establishments there are.",
  },
];

/**
 * Fail the build unless every row still describes the registry it was written
 * about: both posts present, in the language, wilaya and type the row names, and
 * carrying the title it recorded.
 *
 * Checked nationally over every post, not per group, so a row whose wilaya or
 * type no longer matches is caught rather than silently skipped by a group that
 * never sees it.
 *
 * @param {object[]} posts  every intermediate registry post of this build
 * @param {object[]} [table]
 */
export function assertPairTable(posts, table = TWIN_PAIR_TABLE) {
  const byId = new Map(posts.map((p) => [String(p.msp_id), p]));
  for (const row of table) {
    for (const [lang, id, expect] of [
      ["fr", row.msp_fr, row.expect_fr],
      ["ar", row.msp_ar, row.expect_ar],
    ]) {
      const post = byId.get(String(id));
      if (!post)
        throw new Error(
          `sante pair table: post ${id} (${row.facility}) is paired by hand but is not in this build`,
        );
      if (post.lang !== lang)
        throw new Error(
          `sante pair table: post ${id} (${row.facility}) is paired as the ${lang} half but reads as ${post.lang}`,
        );
      if (post.title !== expect)
        throw new Error(
          `sante pair table: post ${id} (${row.facility}) now reads ${JSON.stringify(post.title)}, not ` +
            `${JSON.stringify(expect)}; the evidence was gathered for the old title`,
        );
      const wilaya = String(post.wilayaCode).padStart(2, "0");
      if (wilaya !== row.wilaya_code || post.type !== row.type)
        throw new Error(
          `sante pair table: post ${id} (${row.facility}) is paired as ${row.wilaya_code}/${row.type} but ` +
            `this build reads ${wilaya}/${post.type}`,
        );
    }
  }
}

/**
 * The rows that apply to one (wilaya, type) group, as the two posts they name
 * plus the verdict the twin report publishes for them. A row whose posts are not
 * both in this group contributes nothing here; `assertPairTable` is what makes
 * that an impossibility rather than a silent miss.
 *
 * @param {object[]} fr  French posts of the group
 * @param {object[]} ar  Arabic posts of the group
 * @param {object[]} [table]
 */
export function pairTableFor(fr, ar, table = TWIN_PAIR_TABLE) {
  const byFr = new Map(fr.map((p) => [String(p.msp_id), p]));
  const byAr = new Map(ar.map((p) => [String(p.msp_id), p]));
  const out = [];
  for (const row of table) {
    const f = byFr.get(String(row.msp_fr));
    const a = byAr.get(String(row.msp_ar));
    if (!f || !a) continue;
    out.push({
      fr: f,
      ar: a,
      verdict: {
        paired: true,
        decided_by: "pair_table",
        reason: "second_source_evidence",
        wilaya_code: row.wilaya_code,
        type: row.type,
        msp_gap: Math.abs(Number(row.msp_fr) - Number(row.msp_ar)),
        msp_fr: String(row.msp_fr),
        msp_ar: String(row.msp_ar),
        name_fr: f.title,
        name_ar: a.title,
        facility: row.facility,
        evidence: row.evidence,
      },
    });
  }
  return out;
}
