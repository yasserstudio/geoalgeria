/** The rules behind `packages/dataset/data/phone-code-provenance.json`.
 *
 *  A `phone_code` for a wilaya of the 2026 cohort is taken from an official text
 *  or it is not published at all: never derived from the wilaya it was split from,
 *  never lifted from an encyclopaedia or a directory. The data cannot show that on
 *  its own, because a derived "029" and a decreed "029" are the same three
 *  characters, so the ledger carries the evidence and these rules are the gate.
 *
 *  They live here, apart from the test, for the reason the ticket exists: today
 *  every value is null, so a gate written only against the real ledger asserts
 *  nothing about the branch that matters. The test runs these rules over the real
 *  ledger AND over synthetic entries that break each one, so the gate is known to
 *  bite before the first real code ever lands. */

/** Hosts an official numbering source lives on: the gazette, the regulator, the
 *  incumbent operator, and the government domain. A new one is a deliberate edit
 *  here, which is the point: `evidence_type` is self-declared, so the host is what
 *  actually separates a decision from an encyclopaedia article. */
export const OFFICIAL_HOSTS = new Set([
  "joradp.dz",
  "www.joradp.dz",
  "arpce.dz",
  "www.arpce.dz",
  "algerietelecom.dz",
  "www.algerietelecom.dz",
]);

/** `https://` on an allowlisted host, or on a `.gov.dz` ministry. */
export function isOfficialSourceUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return OFFICIAL_HOSTS.has(parsed.hostname) || parsed.hostname.endsWith(".gov.dz");
}

/** A citation points INTO the document, never merely at it: an article, an item, a
 *  page, an annex, a numbered decision, a table or a named section. "see JORA" is
 *  not a citation. */
export const ARTICLE_REFERENCE =
  /\b(?:art|p)\.|\b(?:article|item|annexe|annex|page|d[eé]cision|decision|section|table|tableau)s?\b/i;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const AREA_CODE = /^0\d{2}$/;
/** An implementer justifying a code by the wilaya it was split from, in words. */
const DERIVATION_PROSE = /\b(mother|parent|m[eè]re)\b|wilaya d'origine/i;

const filled = (value) => typeof value === "string" && value.trim().length > 0;

/** One citation: which declared document, where in it, and what it said. */
function citationErrors(citation, { at, keys }) {
  const errors = [];
  const where = `${at}: ${citation?.source_key ?? "no source_key"}`;
  if (!keys.has(citation?.source_key))
    errors.push(`${at}: unknown source key ${JSON.stringify(citation?.source_key)}`);
  if (!ARTICLE_REFERENCE.test(citation?.article ?? ""))
    errors.push(`${where} cites no article, item, page, annex, table or section`);
  if (!filled(citation?.finding)) errors.push(`${where} records no finding`);
  return errors;
}

/** Every way the ledger can be wrong, as one flat list of messages. An empty list
 *  is the only pass. `cohort` is the wilaya codes the ledger must cover, in order;
 *  `motherOf` maps a wilaya code to the code of the wilaya it was split from, and
 *  `codeOf` maps a wilaya code to the `phone_code` the dataset publishes for it. */
export function ledgerErrors(ledger, { cohort, motherOf, codeOf }) {
  const errors = [];
  const add = (...messages) => errors.push(...messages);

  const sources = ledger?.metadata?.sources;
  if (!Array.isArray(sources) || sources.length === 0) {
    add("metadata.sources: the ledger declares no source at all");
    return errors;
  }

  const keys = new Set();
  for (const source of sources) {
    const at = `metadata.sources[${source?.key ?? "?"}]`;
    if (!filled(source?.key)) add(`${at}: no key`);
    else if (keys.has(source.key)) add(`${at}: duplicate key`);
    else keys.add(source.key);
    if (!filled(source?.name)) add(`${at}: no document title`);
    if (!isOfficialSourceUrl(source?.url))
      add(
        `${at}: ${JSON.stringify(source?.url)} is not an official source. Only the gazette, the regulator, the incumbent operator and .gov.dz count`,
      );
    if (!ISO_DATE.test(source?.retrieved ?? "")) add(`${at}: no retrieval date`);
    if (source?.document_date === null) {
      if (!filled(source?.date_note))
        add(`${at}: document_date is null with no date_note saying why`);
    } else if (!ISO_DATE.test(source?.document_date ?? "")) {
      add(`${at}: document_date must be an ISO date, or null with a date_note`);
    }
    if (source?.evidence_type !== "official")
      add(
        `${at}: evidence_type ${JSON.stringify(source?.evidence_type)}, only official texts may back a phone_code`,
      );
  }

  const wilayas = Array.isArray(ledger.wilayas) ? ledger.wilayas : [];
  const covered = wilayas.map((wilaya) => wilaya?.code);
  if (JSON.stringify(covered) !== JSON.stringify(cohort))
    add(
      `wilayas: covers ${JSON.stringify(covered)}, expected the 2026 cohort ${JSON.stringify(cohort)} in order`,
    );

  const reasons = ledger.metadata.reasons ?? {};
  for (const [name, reason] of Object.entries(reasons)) {
    const at = `metadata.reasons.${name}`;
    if (!filled(reason?.statement)) add(`${at}: no statement`);
    if (!ISO_DATE.test(reason?.searched_on ?? "")) add(`${at}: no searched_on date`);
    const searched = Array.isArray(reason?.searched) ? reason.searched : [];
    if (searched.length === 0) add(`${at}: records no search`);
    for (const entry of searched) {
      const where = `${at}.searched[${entry?.authority ?? "?"}]`;
      if (!filled(entry?.authority)) add(`${where}: names no authority`);
      if (!filled(entry?.looked_for)) add(`${where}: records no search terms`);
      const citations = Array.isArray(entry?.citations) ? entry.citations : [];
      if (citations.length === 0) add(`${where}: cites no document for what was searched`);
      for (const citation of citations) add(...citationErrors(citation, { at: where, keys }));
    }
  }

  for (const wilaya of wilayas) {
    const at = `wilaya ${wilaya?.code} (${wilaya?.name_fr})`;
    if (!filled(wilaya?.name_fr) || !filled(wilaya?.name_ar)) add(`${at}: name missing`);

    if (wilaya?.phone_code === null) {
      if (!filled(wilaya?.reason)) add(`${at}: null with no reason`);
      else if (!reasons[wilaya.reason])
        add(`${at}: reason ${wilaya.reason} is not declared in metadata.reasons`);
      continue;
    }

    if (!AREA_CODE.test(wilaya?.phone_code ?? ""))
      add(`${at}: phone_code ${JSON.stringify(wilaya?.phone_code)} is not an area code`);

    const citations = Array.isArray(wilaya?.citations) ? wilaya.citations : [];
    if (citations.length === 0)
      add(`${at}: a phone_code with no citation. An official text or null, never a third option`);
    for (const citation of citations) {
      add(...citationErrors(citation, { at, keys }));
      for (const prose of [citation?.article, citation?.finding]) {
        if (DERIVATION_PROSE.test(prose ?? ""))
          add(
            `${at}: citation ${JSON.stringify(prose)} points at the wilaya it was split from, not at an official text`,
          );
      }
    }

    // The derivation this ledger exists to prevent is invisible in the value, so a
    // code that happens to equal the one its origin wilaya carries has to say so
    // out loud. Silence is what a copy-paste looks like.
    const mother = motherOf.get(wilaya.code);
    if (mother != null && codeOf.get(mother) === wilaya.phone_code) {
      if (wilaya.same_as_mother_wilaya !== true)
        add(
          `${at}: its code is the one wilaya ${mother} carries, so it must set same_as_mother_wilaya true and name the official text that allocates it`,
        );
      if (!filled(wilaya.mother_note))
        add(
          `${at}: its code is the one wilaya ${mother} carries with no mother_note explaining why that is not a derivation`,
        );
    } else if (wilaya.same_as_mother_wilaya != null) {
      add(`${at}: same_as_mother_wilaya is set but the code differs from wilaya ${mother}'s`);
    }
  }

  return errors;
}
