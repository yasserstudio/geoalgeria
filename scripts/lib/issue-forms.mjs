// A reader for GitHub issue forms, and the rules a form has to satisfy.
//
// The repo has no YAML dependency and the test runner is bare `node --test`, so
// this parses the subset the forms under `.github/ISSUE_TEMPLATE/` actually use:
// block mappings, indented block sequences, flow sequences of scalars, `|`
// block scalars, and quoted or plain scalars. Anything else throws rather than
// guessing, so a form that grows a construct this cannot read fails loudly
// instead of being waved through unchecked.

const KEY_RE = /^([A-Za-z0-9_.-]+):(?:[ \t]+(.*))?$/;

function indentOf(line) {
  return line.length - line.trimStart().length;
}

function isBlank(line) {
  const t = line.trim();
  return t === "" || t.startsWith("#");
}

function nextContent(lines, i) {
  let j = i;
  while (j < lines.length && isBlank(lines[j])) j += 1;
  return j;
}

function parseScalar(raw) {
  const text = raw.trim();
  if (text.startsWith("[")) {
    if (!text.endsWith("]")) throw new Error(`unterminated flow sequence: ${text}`);
    const inner = text.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((part) => parseScalar(part));
  }
  if (
    (text.startsWith('"') && text.endsWith('"') && text.length > 1) ||
    (text.startsWith("'") && text.endsWith("'") && text.length > 1)
  ) {
    return text.slice(1, -1);
  }
  if (text === "true") return true;
  if (text === "false") return false;
  if (text === "null" || text === "~") return null;
  return text;
}

// `|` keeps the trailing newline, `|-` strips it. The folding styles (`>`,
// `>-`) are refused: a folded scalar reads the same in the file and differently
// on GitHub, which is exactly the kind of drift this reader must not hide.
function parseBlockScalar(lines, i, style) {
  const start = nextContent(lines, i);
  if (start >= lines.length) return ["", start];
  const base = indentOf(lines[start]);
  const body = [];
  let j = start;
  for (; j < lines.length; j += 1) {
    if (lines[j].trim() === "") {
      body.push("");
      continue;
    }
    if (indentOf(lines[j]) < base) break;
    body.push(lines[j].slice(base));
  }
  while (body.length > 0 && body[body.length - 1] === "") body.pop();
  const text = body.join("\n");
  return [style === "|-" ? text : `${text}\n`, j];
}

function parseMapping(lines, i, indent) {
  const out = {};
  let cursor = i;
  for (;;) {
    cursor = nextContent(lines, cursor);
    if (cursor >= lines.length) break;
    const ind = indentOf(lines[cursor]);
    if (ind < indent) break;
    if (ind > indent) throw new Error(`unexpected indent on line ${cursor + 1}: ${lines[cursor]}`);
    const m = KEY_RE.exec(lines[cursor].trim());
    if (!m) throw new Error(`not a mapping entry on line ${cursor + 1}: ${lines[cursor]}`);
    const [, key, rawValue] = m;
    const inline = rawValue === undefined ? "" : rawValue.trim();
    if (inline === ">" || inline === ">-" || inline === ">+") {
      throw new Error(`folded scalar on line ${cursor + 1}: quote the value instead`);
    }
    if (inline === "|" || inline === "|-") {
      const [text, next] = parseBlockScalar(lines, cursor + 1, inline);
      out[key] = text;
      cursor = next;
      continue;
    }
    if (inline !== "") {
      out[key] = parseScalar(inline);
      cursor += 1;
      continue;
    }
    const child = nextContent(lines, cursor + 1);
    if (child >= lines.length || indentOf(lines[child]) <= indent) {
      out[key] = null;
      cursor = child;
      continue;
    }
    const [value, next] = parseBlock(lines, child, indentOf(lines[child]));
    out[key] = value;
    cursor = next;
  }
  return [out, cursor];
}

function parseSequence(lines, i, indent) {
  const out = [];
  let cursor = i;
  for (;;) {
    cursor = nextContent(lines, cursor);
    if (cursor >= lines.length) break;
    if (indentOf(lines[cursor]) !== indent) break;
    const trimmed = lines[cursor].trim();
    if (!trimmed.startsWith("- ")) break;
    const rest = trimmed.slice(2);
    const asKey = KEY_RE.exec(rest);
    if (asKey && !/^["'[]/.test(rest)) {
      // "- key: value" opens a mapping item whose later keys sit two columns in,
      // which is exactly where `rest` already starts: rewrite the dash away and
      // let parseMapping read the item as an ordinary mapping.
      lines[cursor] = `${" ".repeat(indent + 2)}${rest}`;
      const [value, next] = parseMapping(lines, cursor, indent + 2);
      out.push(value);
      cursor = next;
      continue;
    }
    out.push(parseScalar(rest));
    cursor += 1;
  }
  return [out, cursor];
}

function parseBlock(lines, i, indent) {
  const start = nextContent(lines, i);
  if (start >= lines.length) return [null, start];
  return lines[start].trim().startsWith("- ")
    ? parseSequence(lines, start, indent)
    : parseMapping(lines, start, indent);
}

/** Parse the issue-form subset of YAML. Throws on anything it cannot read. */
export function parseIssueFormYaml(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const start = nextContent(lines, 0);
  if (start >= lines.length) return null;
  const [value] = parseBlock(lines, start, indentOf(lines[start]));
  return value;
}

/** Body element types GitHub's form schema accepts. */
export const ELEMENT_TYPES = new Set([
  "checkboxes",
  "dropdown",
  "input",
  "markdown",
  "textarea",
  "upload",
]);

const REQUIRED_ATTRIBUTES = {
  markdown: ["value"],
  textarea: ["label"],
  input: ["label"],
  dropdown: ["label", "options"],
  checkboxes: ["label", "options"],
  upload: ["label"],
};

/**
 * Check one parsed form against GitHub's form schema: declared type, unique and
 * well-formed ids, the required attributes per type, non-empty distinct
 * dropdown options, and a boolean `validations.required`. Returns the problems
 * it found, so a test can name every one at once.
 */
export function formSchemaErrors(label, form) {
  const errors = [];
  const say = (message) => errors.push(`${label}: ${message}`);
  if (!form || typeof form !== "object" || Array.isArray(form)) {
    say("is not a mapping");
    return errors;
  }
  for (const key of ["name", "description"]) {
    if (typeof form[key] !== "string" || form[key].trim() === "") say(`${key} is missing`);
  }
  if (!Array.isArray(form.body) || form.body.length === 0) {
    say("body is missing or empty");
    return errors;
  }
  const seen = new Set();
  for (const [index, el] of form.body.entries()) {
    const at = `body[${index}]`;
    if (!el || typeof el !== "object") {
      say(`${at} is not a mapping`);
      continue;
    }
    if (!ELEMENT_TYPES.has(el.type)) {
      say(`${at} has an unknown type ${JSON.stringify(el.type)}`);
      continue;
    }
    if (el.id !== undefined) {
      if (el.type === "markdown") say(`${at} is markdown and cannot carry an id`);
      if (!/^[A-Za-z0-9_-]+$/.test(String(el.id))) say(`${at} has an invalid id ${el.id}`);
      if (seen.has(el.id)) say(`${at} repeats the id ${el.id}`);
      seen.add(el.id);
    }
    const attributes = el.attributes ?? {};
    for (const key of REQUIRED_ATTRIBUTES[el.type]) {
      const value = attributes[key];
      const empty = value === undefined || value === null || (typeof value === "string" && value.trim() === "");
      if (empty) say(`${at} (${el.type}) is missing the ${key} attribute`);
    }
    if (el.type === "dropdown" || el.type === "checkboxes") {
      const options = attributes.options;
      if (Array.isArray(options)) {
        if (options.length === 0) say(`${at} has no options`);
        const labels = options.map((o) => (o && typeof o === "object" ? o.label : o));
        if (new Set(labels).size !== labels.length) say(`${at} has duplicate options`);
      }
    }
    const required = el.validations?.required;
    if (required !== undefined && typeof required !== "boolean") {
      say(`${at} has a non-boolean validations.required`);
    }
  }
  return errors;
}

/** The ids a form declares, in body order. */
export function fieldIds(form) {
  return (form.body ?? []).filter((el) => el.id !== undefined).map((el) => String(el.id));
}

/** The ids a form marks required. */
export function requiredIds(form) {
  return (form.body ?? [])
    .filter((el) => el.id !== undefined && el.validations?.required === true)
    .map((el) => String(el.id));
}

/**
 * Packages that publish no records, so a data correction can never name one:
 * the two code packages and the two umbrellas that only re-export others.
 * Everything else in `packages/` must appear in the correction form's dataset
 * dropdown, by the slug its published name carries.
 */
export const NON_DATASET_PACKAGES = new Set(["normalize", "schema", "pharma", "transport"]);

/** Dataset slug for a package: its published name without the scope. */
export function datasetSlug(packageName) {
  return packageName.replace(/^@geoalgeria\//, "");
}
