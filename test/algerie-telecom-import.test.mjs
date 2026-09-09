import test from "node:test";
import assert from "node:assert/strict";
import { parseCoordinate, reviewResponse, reviewBatch } from "../research/algerie-telecom/import-agencies.mjs";

const boundaries = new Map([["43", { type: "Polygon", coordinates: [[[6, 36], [7, 36], [7, 37], [6, 37], [6, 36]]] }]]);
const agency = { type: "ACTEL", adresse: "Adresse exemple", latitude: "36,5", longitude: "6,5" };
const input = (content) => ({ retrieved_at: "2026-09-09", source_wilaya: 43, source_commune: "Mila", response: { resultat: "ok", content } });

test("decimal commas preserve operator point precision without claiming verification", () => {
  const original = input([agency]);
  const review = reviewResponse(original, boundaries);
  assert.equal(review.candidates[0].lat, 36.5);
  assert.equal(review.candidates[0].geo_precision, "exact");
  assert.deepEqual(review.candidates[0].reasons, []);
  assert.equal(review.usage, "internal-review-only");
  assert.equal(original.response.content[0].latitude, "36,5");
  for (const value of [null, "", "36,5,1", "36.5junk", true, Infinity]) assert.equal(parseCoordinate(value), null);
});

test("invalid, conflicting and shared points remain separate flagged candidates", () => {
  const review = reviewResponse(input([agency, agency, { ...agency, latitude: "" }, { ...agency, latitude: "0" }]), boundaries);
  assert.equal(review.count, 4);
  assert.equal(new Set(review.candidates.map((row) => row.candidate_id)).size, 4);
  assert.ok(review.candidates[0].reasons.includes("shared_coordinate"));
  assert.equal(review.candidates[2].lat, null);
  assert.ok(review.candidates[3].reasons.includes("outside_all_wilaya_boundaries"));
  assert.ok(reviewResponse({ ...input([agency]), source_wilaya: 25 }, boundaries).candidates[0].reasons.includes("source_wilaya_mismatch"));
});

test("errors and schema drift cannot become successful empty captures", () => {
  assert.throws(() => reviewResponse({ ...input([]), response: { resultat: "error", content: [] } }, boundaries), /successful/);
  assert.throws(() => reviewResponse(input([{}]), boundaries), /contract/);
  assert.throws(() => reviewResponse({ ...input([]), retrieved_at: "2026-02-30" }, boundaries), /retrieval date/);
  assert.equal(reviewResponse(input([]), boundaries).count, 0);
});

test("wilaya-wide responses preserve source IDs and require explicit empty commune scope", () => {
  const envelope = { ...input([{ ...agency, id: "175", code_wilaya: "2" }]), source_wilaya: 2, source_commune: "" };
  assert.throws(() => reviewResponse(envelope, boundaries), /commune/);
  envelope.response.commune = "";
  const result = reviewResponse(envelope, boundaries);
  assert.equal(result.search_scope, "wilaya");
  assert.equal(result.candidates[0].source_id, "175");
  assert.throws(() => reviewResponse({ ...envelope, source_wilaya: 43 }, boundaries), /contradicts/);
  envelope.response.content.push(envelope.response.content[0]);
  assert.throws(() => reviewResponse(envelope, boundaries), /duplicate source id/);
});

test("national batches validate every scope and reject duplicates or errors", () => {
  const envelopes = Array.from({ length: 58 }, (_, index) => ({
    ...input([]), source_wilaya: index + 1, source_commune: "",
    response: { resultat: "ok", content: [], commune: "" },
  }));
  assert.equal(reviewBatch(envelopes, boundaries).length, 58);
  assert.throws(() => reviewBatch([envelopes[0], envelopes[0]], boundaries), /Duplicate search scope/);
  assert.throws(() => reviewBatch([...envelopes, { ...envelopes[0], response: { resultat: "error", commune: "" } }], boundaries), /successful/);
  assert.throws(() => reviewBatch([], boundaries), /No response/);
});
