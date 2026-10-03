// Reading and writing one row of a `data/sql/*.sql` INSERT ... VALUES list.
//
// Shared because a reader and a writer that disagree about '' escaping disagree
// about every commune whose name carries an apostrophe (M''fatha), and this
// repository has both: a fix script patches the rows, a test reads them back.
// Older fix scripts carry their own copies; new code uses this.

/**
 * Split one `(…)` VALUES body into its fields, honouring '' escaping.
 * Fields keep their quotes, so a caller can tell `'4'` from `4`.
 */
export function splitSqlRow(body) {
  const fields = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quoted) {
      if (ch === "'" && body[i + 1] === "'") {
        current += "''";
        i++;
        continue;
      }
      if (ch === "'") {
        quoted = false;
        current += ch;
        continue;
      }
      current += ch;
      continue;
    }
    if (ch === "'") {
      quoted = true;
      current += ch;
      continue;
    }
    if (ch === ",") {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

/** A value as a SQL string literal. */
export const sqlQuote = (value) => `'${String(value).replace(/'/g, "''")}'`;

/** The value inside one SQL string literal, quotes and '' escaping removed. */
export const sqlUnquote = (value) => value.slice(1, -1).replace(/''/g, "'");
