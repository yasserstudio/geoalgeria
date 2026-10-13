// GeoAlgeria writes no em dash (U+2014) in anything it publishes: a source name
// reads "Operator: descriptor", a DCAT citation joins name and licence with a
// comma, and a coverage note takes the colon or semicolon the sentence wants.
// The rule kept coming back through the generators, so the generated metadata is
// gated here instead of re-swept by hand.
//
// A record's own `name` was out of scope at first, as a value rather than prose.
// #281 settled it the other way: the three records that had reached npm with
// one (four name strings in all) were nobody's decision, just a separator typed
// where the records around it use " - " (one hand-curated bank name, in both
// `name` and `name_fr`, and two OpenStreetMap school names passed straight
// through a fetcher). " - " is what those two packages' own names already say,
// not a repo-wide convention: 97 `ecoles` name strings carry it and none an en
// dash, and of the 21 bank names the 10 that take a separator at all now all
// read " - ", CNEP having been the only exception. Repo-wide the picture is
// mixed, 486 name values use an en dash (U+2013), mostly in `culture` and
// `enseignement-superieur`; that is a separate question this rule leaves alone. So `nameEmDashErrors` gates published names too, and a
// generator that reads an upstream name puts it through `withoutEmDash` first.
// Everything other than a name stays out: an address or a note is the source's
// own sentence, and rewriting one would be a data decision.

export const EM_DASH = "—";

/** The separator a published name takes instead of an em dash. */
export const NAME_SEPARATOR = " - ";

// `name`, `name_fr`, `former_names_ar`, `commune_name_fr`, `osm_name`: the
// published name fields are exactly the keys carrying "name" as a whole word.
const NAME_KEY = /(^|_)names?(_|$)/;

// The two rules differ only in which keys they look under, so they share one
// walk. `gated(key)` is that difference; `inScope` carries its verdict down
// through arrays, so a list of names is checked entry by entry while an object
// nested under a name key is judged by its own keys, as a name is never one.
function pointersWhere(value, gated, inScope, pointer = "") {
  if (typeof value === "string")
    return inScope && value.includes(EM_DASH) ? [pointer || "/"] : [];
  if (Array.isArray(value))
    return value.flatMap((v, i) => pointersWhere(v, gated, inScope, `${pointer}/${i}`));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) =>
      pointersWhere(v, gated, gated(k), `${pointer}/${k}`),
    );
  return [];
}

/** One error per pointer `find` returns, prefixed with the document's label. */
function errorsWhere(files, find, remedy) {
  const errors = [];
  for (const { label, json } of files)
    for (const pointer of find(json)) errors.push(`${label}: ${remedy(pointer)}`);
  return errors;
}

/** JSON pointers of every string in `value` that carries an em dash. */
export const emDashPointers = (value) => pointersWhere(value, () => true, true);

/** JSON pointers of every *name* string in `value` that carries an em dash. */
export const nameEmDashPointers = (value) =>
  pointersWhere(value, (key) => NAME_KEY.test(key), false);

/**
 * @param {{ label: string, json: unknown }[]} files parsed metadata documents
 * @returns {string[]} one error per offending string, empty when clean
 */
export const emDashErrors = (files) =>
  errorsWhere(
    files,
    emDashPointers,
    (pointer) => `em dash (U+2014) at ${pointer}, use a colon, comma or semicolon`,
  );

/**
 * @param {{ label: string, json: unknown }[]} files parsed published documents
 * @returns {string[]} one error per offending name, empty when clean
 */
export const nameEmDashErrors = (files) =>
  errorsWhere(
    files,
    nameEmDashPointers,
    (pointer) =>
      `em dash (U+2014) in a published name at ${pointer}, use ` +
      `"${NAME_SEPARATOR}" and put it through withoutEmDash() in the generator`,
  );

/**
 * Rewrite an upstream em dash in a name as the separator this repo publishes.
 * Anything that is not a string, and any other dash, is returned untouched.
 */
export function withoutEmDash(name) {
  if (typeof name !== "string" || !name.includes(EM_DASH)) return name;
  return name.split(EM_DASH).join(NAME_SEPARATOR).replace(/\s+/g, " ").trim();
}
