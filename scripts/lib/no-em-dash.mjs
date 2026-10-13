// GeoAlgeria writes no em dash (U+2014) in anything it publishes: a source name
// reads "Operator: descriptor", a DCAT citation joins name and licence with a
// comma, and a coverage note takes the colon or semicolon the sentence wants.
// The rule kept coming back through the generators, so the generated metadata is
// gated here instead of re-swept by hand.
//
// A record's own `name` was out of scope at first, as a value rather than prose.
// #281 settled it the other way: the four that had reached npm were nobody's
// decision, just a separator typed where every neighbouring record uses " - "
// (one hand-curated bank name, two OpenStreetMap school names passed straight
// through a fetcher). So `nameEmDashErrors` gates published names too, and a
// generator that reads an upstream name puts it through `withoutEmDash` first.
// Everything other than a name stays out: an address or a note is the source's
// own sentence, and rewriting one would be a data decision.

export const EM_DASH = "—";

/** The separator a published name takes instead of an em dash. */
export const NAME_SEPARATOR = " - ";

// `name`, `name_fr`, `former_names_ar`, `commune_name_fr`, `osm_name`: the
// published name fields are exactly the keys carrying "name" as a whole word.
const NAME_KEY = /(^|_)names?(_|$)/;

/** JSON pointers of every string in `value` that carries an em dash. */
export function emDashPointers(value, pointer = "") {
  if (typeof value === "string") return value.includes(EM_DASH) ? [pointer || "/"] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => emDashPointers(v, `${pointer}/${i}`));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => emDashPointers(v, `${pointer}/${k}`));
  return [];
}

/**
 * @param {{ label: string, json: unknown }[]} files parsed metadata documents
 * @returns {string[]} one error per offending string, empty when clean
 */
export function emDashErrors(files) {
  const errors = [];
  for (const { label, json } of files)
    for (const pointer of emDashPointers(json))
      errors.push(`${label}: em dash (U+2014) at ${pointer}, use a colon, comma or semicolon`);
  return errors;
}

/**
 * Rewrite an upstream em dash in a name as the separator this repo publishes.
 * Anything that is not a string, and any other dash, is returned untouched.
 */
export function withoutEmDash(name) {
  if (typeof name !== "string" || !name.includes(EM_DASH)) return name;
  return name.split(EM_DASH).join(NAME_SEPARATOR).replace(/\s+/g, " ").trim();
}

/** JSON pointers of every *name* string in `value` that carries an em dash. */
export function nameEmDashPointers(value, pointer = "", isName = false) {
  if (typeof value === "string") return isName && value.includes(EM_DASH) ? [pointer || "/"] : [];
  if (Array.isArray(value))
    return value.flatMap((v, i) => nameEmDashPointers(v, `${pointer}/${i}`, isName));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) =>
      nameEmDashPointers(v, `${pointer}/${k}`, NAME_KEY.test(k)),
    );
  return [];
}

/**
 * @param {{ label: string, json: unknown }[]} files parsed published documents
 * @returns {string[]} one error per offending name, empty when clean
 */
export function nameEmDashErrors(files) {
  const errors = [];
  for (const { label, json } of files)
    for (const pointer of nameEmDashPointers(json))
      errors.push(
        `${label}: em dash (U+2014) in a published name at ${pointer}, use ` +
          `"${NAME_SEPARATOR}" and put it through withoutEmDash() in the generator`,
      );
  return errors;
}
