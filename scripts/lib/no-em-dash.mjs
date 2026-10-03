// GeoAlgeria writes no em dash (U+2014) in anything it publishes: a source name
// reads "Operator: descriptor", a DCAT citation joins name and licence with a
// comma, and a coverage note takes the colon or semicolon the sentence wants.
// The rule kept coming back through the generators, so the generated metadata is
// gated here instead of re-swept by hand.
//
// Scope is metadata only. A record's own `name` is a value, not prose: if a
// source publishes an em dash inside one, that is a data decision (fix it
// upstream or in an override), not something a release gate should block.

export const EM_DASH = "—";

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
