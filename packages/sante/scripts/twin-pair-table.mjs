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
export const TWIN_PAIR_TABLE = [];

/**
 * Cases #287 asked about that this table does NOT pair, each with what is
 * missing. A case leaves this list only when a second source is found for it.
 *
 * @type {{wilaya_code: string, type: string, msp_fr: string, msp_ar: string,
 *         facility: string, why: string}[]}
 */
export const UNPAIRED_CANDIDATES = [];

/** The two languages a row names, in the order it names them. Both halves are
 *  always one French post and one Arabic post: a same-language duplicate is a
 *  repeat post, which `mergeRepeatPosts` handles and this table never does. */
export const pairTableSides = (row) => [row.msp_fr ? "fr" : null, row.msp_ar ? "ar" : null].filter(Boolean);

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
