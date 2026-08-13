import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";

export const DEFAULT_STALL_AFTER_MS = 30 * 60 * 1_000;
export const DEFAULT_MATRIX_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

export function assertServiceDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) {
    throw new Error("Use --date YYYY-MM-DD");
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid service date: ${value}`);
  }
  return value;
}

export function positiveLimit(value) {
  if (value == null) return Number.POSITIVE_INFINITY;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error("--limit must be a positive integer");
  }
  return parsed;
}

export function writeJsonAtomic(filename, value) {
  const temporary = `${filename}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, filename);
}

/** Prevent two long-running resumable collectors from replacing the same
 * checkpoint. A dead process's lock is recovered; an active one fails loud. */
export function acquireCollectorLock(filename) {
  const lockFilename = `${filename}.lock`;
  const claim = () => {
    const descriptor = openSync(lockFilename, "wx");
    writeFileSync(descriptor, `${JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() })}\n`);
    closeSync(descriptor);
  };
  try {
    claim();
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    let active = false;
    try {
      const owner = JSON.parse(readFileSync(lockFilename, "utf8"));
      if (Number.isSafeInteger(owner.pid) && owner.pid > 0) {
        try {
          process.kill(owner.pid, 0);
          active = true;
        } catch (processError) {
          if (processError?.code === "EPERM") active = true;
        }
      }
    } catch {
      // A malformed lock has no trustworthy active owner and is recoverable.
    }
    if (active) throw new Error(`Collector already running for ${filename}`);
    unlinkSync(lockFilename);
    claim();
  }

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try {
      unlinkSync(lockFilename);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  };
  process.once("exit", release);
  return release;
}

export function matrixPairs(matrix, {
  now = Date.now(),
  maxAgeMs = DEFAULT_MATRIX_MAX_AGE_MS,
  allowStale = false,
} = {}) {
  if (!matrix || !Array.isArray(matrix.stations) || matrix.stations.length === 0) {
    throw new Error("MAHATATI matrix has no departure stations");
  }
  const retrievedAtMs = Date.parse(matrix.retrieved_at);
  if (!Number.isFinite(retrievedAtMs)) throw new Error("MAHATATI matrix has no valid retrieved_at");
  const ageMs = now - retrievedAtMs;
  if (!allowStale && (ageMs < -5 * 60 * 1_000 || ageMs > maxAgeMs)) {
    throw new Error("MAHATATI destination matrix is stale; refresh it or pass --allow-stale-matrix");
  }

  const pairs = [];
  const keys = new Set();
  for (const station of matrix.stations) {
    if (!Number.isSafeInteger(station.agency_id) || station.agency_id <= 0 || !String(station.name ?? "").trim()) {
      throw new Error("MAHATATI matrix contains an invalid departure station");
    }
    if (!Array.isArray(station.destinations)) {
      throw new Error(`Departure station ${station.agency_id} has no destination matrix`);
    }
    for (const destination of station.destinations) {
      const destinationId = String(destination?.P1 ?? "").trim();
      const destinationName = String(destination?.S1 ?? "").trim();
      if (!destinationId || !destinationName) {
        throw new Error(`Departure station ${station.agency_id} contains an invalid destination`);
      }
      const key = `${station.agency_id}:${destinationId}`;
      if (keys.has(key)) throw new Error(`Duplicate station/destination pair: ${key}`);
      keys.add(key);
      pairs.push({
        agency_id: station.agency_id,
        agency_name: station.name,
        destination_id: destinationId,
        destination_name: destinationName,
      });
    }
  }
  if (pairs.length === 0) throw new Error("MAHATATI matrix contains no station/destination pairs");
  return { pairs, retrievedAt: new Date(retrievedAtMs).toISOString(), ageMs };
}

export function scheduleCheckpointHealth(state, { date, expectedKeys, now = Date.now() }) {
  if (!state || state.date !== date) throw new Error("progress date does not match requested date");
  if (!Array.isArray(state.results) || !Array.isArray(state.failures) || !state.completed || typeof state.completed !== "object") {
    throw new Error("schedule checkpoint has an invalid shape");
  }
  const expected = new Set(expectedKeys);
  const resultKeys = uniqueKnownKeys(state.results.map((item) => item?.key), expected, "schedule result");
  const completedKeys = uniqueKnownKeys(Object.keys(state.completed), expected, "completed pair");
  for (const key of completedKeys) {
    if (!resultKeys.has(key) || state.completed[key] !== "ok") {
      throw new Error(`Completed pair ${key} has no successful result`);
    }
  }
  const unresolvedFailures = state.failures.filter((failure) => !completedKeys.has(failure?.key));
  uniqueKnownKeys(unresolvedFailures.map((failure) => failure?.key), expected, "schedule failure");
  const lastCheckedAt = latestTimestamp([
    ...state.results.map((item) => item?.checked_at),
    ...unresolvedFailures.map((item) => item?.checked_at),
  ]);
  const pendingKeys = [...expected].filter((key) => !completedKeys.has(key));
  const ageMs = lastCheckedAt ? now - Date.parse(lastCheckedAt) : null;
  return {
    complete: expected.size > 0 && pendingKeys.length === 0 && unresolvedFailures.length === 0,
    expected_pairs: expected.size,
    completed_pairs: completedKeys.size,
    pending_pairs: pendingKeys.length,
    unresolved_failures: unresolvedFailures.length,
    last_checked_at: lastCheckedAt,
    checkpoint_age_minutes: ageMs == null ? null : Math.max(0, Math.round(ageMs / 60_000)),
    stalled: pendingKeys.length > 0 && ageMs != null && ageMs > DEFAULT_STALL_AFTER_MS,
    pending_sample: pendingKeys.slice(0, 10),
  };
}

export function itineraryCheckpointHealth(state, { date, expectedKeys, now = Date.now() }) {
  if (!state || state.date !== date) throw new Error("progress date does not match requested date");
  if (!state.routes || typeof state.routes !== "object" || !Array.isArray(state.failures)) {
    throw new Error("itinerary checkpoint has an invalid shape");
  }
  const expected = new Set(expectedKeys);
  const capturedKeys = uniqueKnownKeys(Object.keys(state.routes), expected, "captured route");
  const unresolvedFailures = state.failures.filter((failure) => !capturedKeys.has(failure?.key));
  uniqueKnownKeys(unresolvedFailures.map((failure) => failure?.key), expected, "itinerary failure");
  const lastCheckedAt = latestTimestamp([
    ...Object.values(state.routes).map((item) => item?.checked_at),
    ...unresolvedFailures.map((item) => item?.checked_at),
  ]);
  const pendingKeys = [...expected].filter((key) => !capturedKeys.has(key));
  const ageMs = lastCheckedAt ? now - Date.parse(lastCheckedAt) : null;
  return {
    complete: expected.size > 0 && pendingKeys.length === 0 && unresolvedFailures.length === 0,
    observed_routes: expected.size,
    captured_routes: capturedKeys.size,
    pending_routes: pendingKeys.length,
    unresolved_failures: unresolvedFailures.length,
    last_checked_at: lastCheckedAt,
    checkpoint_age_minutes: ageMs == null ? null : Math.max(0, Math.round(ageMs / 60_000)),
    stalled: pendingKeys.length > 0 && ageMs != null && ageMs > DEFAULT_STALL_AFTER_MS,
    pending_sample: pendingKeys.slice(0, 10),
  };
}

function uniqueKnownKeys(keys, expected, label) {
  const seen = new Set();
  for (const rawKey of keys) {
    const key = String(rawKey ?? "");
    if (!expected.has(key)) throw new Error(`Unknown ${label}: ${key || "(empty)"}`);
    if (seen.has(key)) throw new Error(`Duplicate ${label}: ${key}`);
    seen.add(key);
  }
  return seen;
}

function latestTimestamp(values) {
  let latest = null;
  let latestMs = -Infinity;
  for (const value of values) {
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) throw new Error(`Checkpoint contains an invalid checked_at: ${value}`);
    if (parsed > latestMs) {
      latest = new Date(parsed).toISOString();
      latestMs = parsed;
    }
  }
  return latest;
}

export function readJsonIfPresent(filename) {
  return existsSync(filename) ? JSON.parse(readFileSync(filename, "utf8")) : null;
}
