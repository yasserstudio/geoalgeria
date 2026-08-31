// Human-reviewed corrections are data, not one-off script edits. This module is
// deliberately domain-neutral: a package supplies a flat record collection and
// a versioned ledger; the package's normal schema validator still decides
// whether the corrected result is valid for that domain.

export const REVIEW_STATUSES = [
  "verified",
  "corrected",
  "duplicate",
  "not-found",
  "field-check",
];

export const REVIEW_PUBLISH_ACTIONS = ["keep", "patch", "exclude"];

const ALLOWED_NEW_FIELDS = new Set([
  "name",
  "name_fr",
  "name_ar",
  "wilaya_code",
  "commune_code",
  "commune",
  "commune_ar",
  "lat",
  "lng",
  "geo_precision",
  "geo_method",
  "lifecycle",
]);

const FORBIDDEN_PATCH_FIELDS = new Set(["id", "source", "refs"]);

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const calendarDateIsValid = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};

const isDate = (value) => {
  if (typeof value !== "string") return false;
  if (calendarDateIsValid(value)) return true;
  const timestamp = value.match(
    /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/,
  );
  return Boolean(
    timestamp &&
      calendarDateIsValid(timestamp[1]) &&
      !Number.isNaN(Date.parse(value)),
  );
};

const isEvidenceUrl = (value) => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    if (!new Set(["http:", "https:"]).has(url.protocol)) return false;
    if (url.username || url.password) return false;
    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "::" ||
      hostname === "::1" ||
      hostname.startsWith("::ffff:") ||
      /^f[cd][0-9a-f]{2}:/i.test(hostname) ||
      /^fe[89ab][0-9a-f]:/i.test(hostname)
    ) {
      return false;
    }
    const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const [, aText, bText, cText, dText] = ipv4;
      const octets = [aText, bText, cText, dText].map(Number);
      if (octets.some((octet) => octet > 255)) return false;
      const [a, b] = octets;
      if (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
};

function deepEqual(actual, expected) {
  if (Object.is(actual, expected)) return true;
  if (Array.isArray(actual) || Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      Array.isArray(expected) &&
      actual.length === expected.length &&
      actual.every((value, index) => deepEqual(value, expected[index]))
    );
  }
  if (!isObject(actual) || !isObject(expected)) return false;
  const actualKeys = Object.keys(actual);
  const expectedKeys = Object.keys(expected);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(actual, key) &&
        deepEqual(actual[key], expected[key]),
    )
  );
}

function matchesExpected(record, expected) {
  return Object.entries(expected).every(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(record, key)) return false;
    return deepEqual(record[key], value);
  });
}

function validateEvidence(evidence, path, errors) {
  if (!Array.isArray(evidence)) {
    errors.push(`${path} must be an array`);
    return;
  }
  evidence.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isObject(item)) {
      errors.push(`${itemPath} must be an object`);
      return;
    }
    if (!isEvidenceUrl(item.url)) {
      errors.push(`${itemPath}.url must be a public http(s) URL`);
    }
    if (!isDate(item.checked_at)) {
      errors.push(`${itemPath}.checked_at must be an ISO date or timestamp`);
    }
    if (item.note != null && typeof item.note !== "string") {
      errors.push(`${itemPath}.note must be a string when present`);
    }
  });
}

/** Validate the versioned, project-wide human review ledger contract. */
export function validateReviewLedger(ledger) {
  const errors = [];
  const warnings = [];
  if (!isObject(ledger)) {
    return { errors: ["review ledger must be an object"], warnings };
  }
  if (ledger.schema_version !== 1) {
    errors.push("schema_version must be 1");
  }
  if (
    typeof ledger.dataset !== "string" ||
    !/^[a-z0-9][a-z0-9-]*$/.test(ledger.dataset)
  ) {
    errors.push("dataset must be a lowercase kebab-case identifier");
  }
  if (typeof ledger.reviewer !== "string" || !ledger.reviewer.trim()) {
    errors.push("reviewer must be a non-empty string");
  }
  if (!isDate(ledger.reviewed_at)) {
    errors.push("reviewed_at must be an ISO date or timestamp");
  }
  if (!Array.isArray(ledger.decisions)) {
    errors.push("decisions must be an array");
    return { errors, warnings };
  }

  const keys = new Set();
  ledger.decisions.forEach((decision, index) => {
    const path = `decisions[${index}]`;
    if (!isObject(decision)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (
      typeof decision.file !== "string" ||
      !/^[A-Za-z0-9._-]+$/.test(decision.file)
    ) {
      errors.push(`${path}.file must be a plain file name`);
    }
    if (typeof decision.record_id !== "string" || !decision.record_id.trim()) {
      errors.push(`${path}.record_id must be a non-empty string`);
    }
    const key = `${decision.file}:${decision.record_id}`;
    if (keys.has(key)) errors.push(`${path} duplicates ${key}`);
    keys.add(key);

    if (!REVIEW_STATUSES.includes(decision.status)) {
      errors.push(`${path}.status must be one of ${REVIEW_STATUSES.join(", ")}`);
    }
    if (!REVIEW_PUBLISH_ACTIONS.includes(decision.publish_action)) {
      errors.push(
        `${path}.publish_action must be one of ${REVIEW_PUBLISH_ACTIONS.join(", ")}`,
      );
    }
    if (!isObject(decision.expect) || Object.keys(decision.expect).length === 0) {
      errors.push(`${path}.expect must be a non-empty object`);
    }
    if (
      decision.reviewer != null &&
      (typeof decision.reviewer !== "string" || !decision.reviewer.trim())
    ) {
      errors.push(`${path}.reviewer must be a non-empty string when present`);
    }
    if (decision.reviewed_at != null && !isDate(decision.reviewed_at)) {
      errors.push(`${path}.reviewed_at must be an ISO date or timestamp when present`);
    }
    if (decision.notes != null && typeof decision.notes !== "string") {
      errors.push(`${path}.notes must be a string when present`);
    }
    const expectAbsent = decision.expect_absent;
    const expectedAbsentFields = Array.isArray(expectAbsent) ? expectAbsent : [];
    if (expectAbsent != null) {
      if (decision.publish_action !== "patch") {
        errors.push(`${path}.expect_absent is only allowed for patch actions`);
      }
      if (
        !Array.isArray(expectAbsent) ||
        expectAbsent.length === 0 ||
        expectAbsent.some((field) => typeof field !== "string" || !field)
      ) {
        errors.push(`${path}.expect_absent must be a non-empty string array`);
      } else {
        if (new Set(expectAbsent).size !== expectAbsent.length) {
          errors.push(`${path}.expect_absent must not contain duplicates`);
        }
        for (const field of expectAbsent) {
          if (Object.prototype.hasOwnProperty.call(decision.expect, field)) {
            errors.push(`${path}.${field} cannot be both expected and absent`);
          }
        }
      }
    }

    if (decision.publish_action === "patch") {
      if (decision.status !== "corrected") {
        errors.push(`${path}: patch requires status "corrected"`);
      }
      if (!isObject(decision.patch) || Object.keys(decision.patch).length === 0) {
        errors.push(`${path}.patch must be a non-empty object for patch actions`);
      } else {
        for (const [field, value] of Object.entries(decision.patch)) {
          if (FORBIDDEN_PATCH_FIELDS.has(field)) {
            errors.push(`${path}.patch.${field} cannot be changed by a review ledger`);
          }
          if (
            !Object.prototype.hasOwnProperty.call(decision.expect, field) &&
            !expectedAbsentFields.includes(field)
          ) {
            errors.push(`${path}.expect.${field} is required for a patched field`);
          }
          if (value !== null && typeof value === "object") {
            errors.push(`${path}.patch.${field} must be a scalar or null`);
          }
        }
        for (const field of expectedAbsentFields) {
          if (!Object.prototype.hasOwnProperty.call(decision.patch, field)) {
            errors.push(`${path}.expect_absent.${field} is not patched`);
          }
        }
      }
    } else if (decision.patch != null) {
      errors.push(`${path}.patch is only allowed for patch actions`);
    }

    if (
      decision.publish_action === "exclude" &&
      !new Set(["duplicate", "not-found"]).has(decision.status)
    ) {
      errors.push(`${path}: exclude requires status "duplicate" or "not-found"`);
    }
    if (
      decision.publish_action === "keep" &&
      decision.status === "corrected"
    ) {
      errors.push(`${path}: corrected records must use the patch action`);
    }

    if (decision.evidence != null) {
      validateEvidence(decision.evidence, `${path}.evidence`, errors);
    }
    if (
      new Set(["patch", "exclude"]).has(decision.publish_action) &&
      (!Array.isArray(decision.evidence) || decision.evidence.length === 0)
    ) {
      errors.push(`${path}.evidence is required for patch and exclude actions`);
    }
  });
  return { errors, warnings };
}

/**
 * Apply the decisions for one file. Expected old values are checked first, so a
 * correction created against an older upstream snapshot cannot drift onto a new
 * record. The input records are not mutated.
 */
export function applyReviewedOverrides(records, ledger, { file } = {}) {
  const validation = validateReviewLedger(ledger);
  if (validation.errors.length) {
    throw new Error(
      `review ledger is invalid:\n  ${validation.errors.join("\n  ")}`,
    );
  }
  if (typeof file !== "string" || !file) {
    throw new Error("review override application requires a file name");
  }
  if (!Array.isArray(records)) {
    throw new Error(`review overrides [${file}]: records must be an array`);
  }

  const byId = new Map();
  records.forEach((record, index) => {
    if (byId.has(record.id)) {
      throw new Error(`review overrides [${file}]: duplicate record id ${record.id}`);
    }
    byId.set(record.id, { record, index });
  });

  const output = records.map((record) => ({ ...record }));
  const excluded = new Set();
  const decisions = ledger.decisions.filter((decision) => decision.file === file);
  let patched = 0;
  let kept = 0;

  for (const decision of decisions) {
    const match = byId.get(decision.record_id);
    if (!match) {
      throw new Error(
        `review overrides [${file}]: unknown record ${decision.record_id}`,
      );
    }
    for (const field of Object.keys(decision.patch ?? {})) {
      if (
        !Object.prototype.hasOwnProperty.call(match.record, field) &&
        !(
          decision.expect_absent?.includes(field) &&
          ALLOWED_NEW_FIELDS.has(field)
        )
      ) {
        throw new Error(
          `review overrides [${file}/${decision.record_id}]: patch field ${field} ` +
            "does not exist on the baseline record or the shared optional-field vocabulary",
        );
      }
    }
    const unexpectedlyPresent = (decision.expect_absent ?? []).filter((field) =>
      Object.prototype.hasOwnProperty.call(match.record, field),
    );
    if (unexpectedlyPresent.length) {
      throw new Error(
        `review overrides [${file}/${decision.record_id}]: stale decision; ` +
          `expected absent field(s) are now present: ${unexpectedlyPresent.join(", ")}`,
      );
    }
    if (!matchesExpected(match.record, decision.expect)) {
      const actual = Object.fromEntries(
        Object.keys(decision.expect).map((field) => [field, match.record[field]]),
      );
      throw new Error(
        `review overrides [${file}/${decision.record_id}]: stale decision; ` +
          `the current record no longer matches expect=${JSON.stringify(decision.expect)}; ` +
          `actual=${JSON.stringify(actual)}`,
      );
    }
    if (decision.publish_action === "exclude") {
      const missingExpected = Object.keys(match.record).filter(
        (field) => !Object.prototype.hasOwnProperty.call(decision.expect, field),
      );
      if (missingExpected.length) {
        throw new Error(
          `review overrides [${file}/${decision.record_id}]: exclusion expect must ` +
            `cover the full record; missing ${missingExpected.join(", ")}`,
        );
      }
      excluded.add(match.index);
      continue;
    }
    if (decision.publish_action === "keep") {
      kept += 1;
      continue;
    }
    for (const [field, value] of Object.entries(decision.patch)) {
      output[match.index][field] = value;
    }
    output[match.index].review_status = "corrected";
    output[match.index].reviewed_at = decision.reviewed_at ?? ledger.reviewed_at;
    output[match.index].reviewed_by = decision.reviewer ?? ledger.reviewer;
    output[match.index].review_evidence = decision.evidence.map(
      (item) => item.url,
    );
    patched += 1;
  }

  return {
    records: output.filter((_, index) => !excluded.has(index)),
    stats: {
      reviewed: decisions.length,
      patched,
      excluded: excluded.size,
      kept,
    },
  };
}
