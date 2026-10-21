// GeoAlgeria writes no em dash (U+2014) in anything it publishes: a source name
// reads "Operator: descriptor", a DCAT citation joins name and licence with a
// comma, and a coverage note takes the colon or semicolon the sentence wants.
// The rule kept coming back through the generators, so the generated metadata is
// gated here instead of re-swept by hand.
//
// A record's own `name` was out of scope at first, as a value rather than prose.
// #281 settled it the other way: three records had reached npm with one, four
// name strings in all (one hand-curated bank name, in both `name` and
// `name_fr`, and two OpenStreetMap school names passed straight through a
// fetcher). So `nameEmDashErrors` gates published names too, and a generator
// that reads an upstream name puts it through `withoutEmDash` first.
//
// The substitution is deliberately dull: the dash becomes a spaced hyphen, which
// keeps the fact that the source separated the two halves of the name without
// keeping the character. Nothing else about the name changes.
//
// #294 extended the name half of the rule to the en dash (U+2013), which 486
// published name values carried, in the same dull way and for the same reason:
// a separator typed as a dash is a typographic accident of the upstream page,
// not a fact about the place, and a reader keying or searching the name has no
// way to type it. The one shape the fold leaves alone is a dash between two
// digits, which is a range rather than a separator (three sports facilities name
// an eponym's years, "(1924 - 2008)"); rewriting one would be a data decision.
// The metadata half is unchanged and still about the em dash alone: there the
// remedy is a colon, comma or semicolon in prose, which an en dash range in a
// coverage note does not want.
//
// Everything other than a name stays out: an address or a note is the source's
// own sentence, and rewriting one would be a data decision.

export const EM_DASH = "—";
export const EN_DASH = "–";

/** The separator a published name takes instead of a dash. */
export const NAME_SEPARATOR = " - ";

// The dash and the ASCII blanks touching it, and nothing else. Spelled from the
// two constants so this file still declares each character exactly once.
// Deliberately not \s: that class matches U+00A0, and a sweep over the whole
// string turned the non-breaking space French copy puts before a colon into a
// plain one.
const NAME_DASH_RUN = new RegExp(`[ \t]*[${EM_DASH}${EN_DASH}][ \t]*`, "g");

// `name`, `name_fr`, `former_names_ar`, `commune_name_fr`, `osm_name`: the
// published name fields are exactly the keys carrying "name" as a whole word.
const NAME_KEY = /(^|_)names?(_|$)/;

/**
 * Is the dash run matched at `offset` a range rather than a separator? True only
 * for an en dash with a digit on each side, blanks aside: "Aichaoui Kaddour
 * (1924 - 2008)". An em dash is never exempted, because the gate has reported it
 * in a name since #281 and no published name uses one as a range.
 */
// The run swallows every blank touching the dash, and the match is the leftmost
// one, so the characters on either side of it are the name's own.
const isRange = (whole, offset, run) =>
  run.includes(EN_DASH) &&
  /\d$/.test(whole.slice(0, offset)) &&
  /^\d/.test(whole.slice(offset + run.length));

/**
 * The dash a published name carries that the fold would rewrite, or null. Used
 * by the gate so that what it reports and what `withoutEmDash` changes are the
 * same set of characters by construction.
 */
function foldableDash(value) {
  for (const match of value.matchAll(NAME_DASH_RUN))
    if (!isRange(value, match.index, match[0]))
      return match[0].includes(EM_DASH) ? EM_DASH : EN_DASH;
  return null;
}

// The two rules differ in which keys they look under and in which characters
// they object to, so they share one walk. `gated(key)` and `offends(string)` are
// those differences, and `inScope` carries the key verdict all the way down:
// once a key puts its subtree in scope, every string under it is checked,
// through arrays and through nested objects alike. Inheriting through arrays
// only would have left `{ name: { fr: "a <en dash> b" } }` uninspected, which no
// published file happens to contain today and which a gate should not depend on.
function hitsWhere(value, gated, offends, inScope, pointer = "") {
  if (typeof value === "string") {
    const found = inScope ? offends(value) : null;
    return found ? [[pointer || "/", found]] : [];
  }
  if (Array.isArray(value))
    return value.flatMap((v, i) => hitsWhere(v, gated, offends, inScope, `${pointer}/${i}`));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) =>
      hitsWhere(v, gated, offends, inScope || gated(k), `${pointer}/${k}`),
    );
  return [];
}

/** One error per hit `find` returns, prefixed with the document's label. */
function errorsWhere(files, find, remedy) {
  const errors = [];
  for (const { label, json } of files)
    for (const [pointer, found] of find(json)) errors.push(`${label}: ${remedy(pointer, found)}`);
  return errors;
}

const emDashHits = (value) =>
  hitsWhere(value, () => true, (s) => (s.includes(EM_DASH) ? EM_DASH : null), true);

const nameDashHits = (value) =>
  hitsWhere(value, (key) => NAME_KEY.test(key), foldableDash, false);

/** JSON pointers of every string in `value` that carries an em dash. */
export const emDashPointers = (value) => emDashHits(value).map(([pointer]) => pointer);

/**
 * JSON pointers of every *name* string in `value` carrying a dash the fold would
 * rewrite: an em dash anywhere, or an en dash that is not a range.
 */
export const nameEmDashPointers = (value) => nameDashHits(value).map(([pointer]) => pointer);

/** "em dash (U+2014)" / "en dash (U+2013)", for a message that names what it found. */
const dashName = (dash) => (dash === EM_DASH ? "em dash (U+2014)" : "en dash (U+2013)");

/**
 * @param {{ label: string, json: unknown }[]} files parsed metadata documents
 * @returns {string[]} one error per offending string, empty when clean
 */
export const emDashErrors = (files) =>
  errorsWhere(
    files,
    emDashHits,
    (pointer) => `em dash (U+2014) at ${pointer}, use a colon, comma or semicolon`,
  );

/**
 * @param {{ label: string, json: unknown }[]} files parsed published documents
 * @returns {string[]} one error per offending name, empty when clean
 */
export const nameEmDashErrors = (files) =>
  errorsWhere(
    files,
    nameDashHits,
    (pointer, found) =>
      `${dashName(found)} in a published name at ${pointer}, use ` +
      `"${NAME_SEPARATOR}" and put it through withoutEmDash() in the generator`,
  );

// A separator the fold left at one end of the name, which separates it from
// nothing. A blank on the inner side is what makes it one: a hyphen glued to the
// word next to it is part of that word, as in the French "-yellel" an upstream
// typed or the trailing one in "درايعية أحمد-", and neither is the fold's
// business. Applied after the trim, so the hyphen is at the end by then.
const EDGE_SEPARATOR = /^-[ \t]+|[ \t]+-$/g;

/**
 * Rewrite an upstream em dash or en dash in a name as the spaced hyphen this
 * repo publishes, together with the ASCII spaces or tabs immediately around it
 * so the result is not doubly spaced. A dash between two digits is a range and
 * is left as it stands. Every other character is left exactly as the source
 * wrote it: other dashes, a non-breaking space, an interior tab.
 *
 * Leading and trailing whitespace is trimmed, and so is a separator left at
 * either end: a name cannot open or close on one, because there is nothing on
 * the other side of it to separate. One upstream name ends on a dash (a
 * Relizane psychiatric hospital), and folding it alone would have published a
 * name ending " -". Anything that is not a string comes back untouched.
 */
export function withoutEmDash(name) {
  if (typeof name !== "string") return name;
  if (!name.includes(EM_DASH) && !name.includes(EN_DASH)) return name;
  return name
    .replace(NAME_DASH_RUN, (run, offset, whole) =>
      isRange(whole, offset, run) ? run : NAME_SEPARATOR,
    )
    .trim()
    .replace(EDGE_SEPARATOR, "")
    .trim();
}

/**
 * `withoutEmDash` over every name-keyed string of a record, by the same key rule
 * the gate walks, returning a new value and leaving the input untouched.
 *
 * This is what `writePackageV2` calls on the rows it is about to emit, so the
 * fold reaches every generator at once instead of being retyped into each of
 * them. #294 needed it in ten packages, four of which (aviation, poste, sante,
 * sports) have no offline generator to re-run: folding at the shared writer is
 * what lets `scripts/apply-overrides.mjs` re-emit those from the records they
 * already ship. A fetcher that cleans an upstream name still calls
 * `withoutEmDash` itself, as ecoles, cliniques and pharmacies do, so a name is
 * folded before anything else keys or dedupes on it.
 */
export function foldNameDashes(value) {
  return mapNames(value, false);
}

function mapNames(value, inScope) {
  if (typeof value === "string") return inScope ? withoutEmDash(value) : value;
  if (Array.isArray(value)) return value.map((v) => mapNames(v, inScope));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = mapNames(v, inScope || NAME_KEY.test(k));
    return out;
  }
  return value;
}
