// The shape of a VALUES row in packages/dataset/data/sql/full.sql, in one place.
//
// WHY. Both tables print 9 fields since `capital_commune_code` was added, so field
// count no longer tells them apart, and every script that patched the file learned
// that separately. scripts/fix-dairas-26-253.mjs did not: it read wilaya rows as
// communes and overwrote wilaya 3's postal code '03000' with the daira name
// 'Laghouat'. Adding one column forced the same edit in three scripts, so the
// discriminator and the two tuples live here instead.
//
// wilayas:  (code, 'name_fr', 'name_ar', 'phone'|NULL, 'postal'|NULL, lat, lng, 'created', capital)
// communes: (id,   'name_fr', 'name_ar', wilaya,       'daira',       'postal'|NULL, lat, lng, code)
//
// Tests deliberately do not import this: each one reads the shipped file with its own
// expression, so a reader's mistake and a writer's mistake cannot cancel out.

/** The `created` literals a wilaya row can carry, which is what marks it as one. */
export const CREATED_LITERALS = ["original", "2019", "2026"];

const CREATED = `'(?:${CREATED_LITERALS.join("|")})'`;

/** True for a wilaya row, given its fields as splitSqlRow leaves them (quotes kept). */
export const isWilayaSqlRow = (fields) =>
  fields.length === 9 && new RegExp(`^${CREATED}$`).test(fields[7]);

/**
 * One wilaya row, with its point captured: `[, code, head, lat, sep, lng, tail]`.
 * Only the two ordinates are rewritten, so the quoted names, the SQL-escaped
 * apostrophes and the NULL phone codes are carried through untouched.
 */
export const WILAYA_SQL_POINT_ROW = new RegExp(
  `^( {2}\\((\\d+), '(?:[^']|'')*', '(?:[^']|'')*', (?:'[^']*'|NULL), (?:'[^']*'|NULL), )` +
    `(-?[\\d.]+)(, )(-?[\\d.]+)(, ${CREATED}, \\d+\\)[,;])$`,
);
