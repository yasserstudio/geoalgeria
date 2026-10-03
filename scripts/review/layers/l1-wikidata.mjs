// L1 open reference: the P625 coordinate of the Wikidata item the commune's OpenStreetMap
// relation points at.
//
// INDEPENDENT OF L1's SEAT ONLY SOMETIMES. Wikidata imports OpenStreetMap and the reverse
// happens too: 19 of the 1,536 commune items are within a metre of their commune's seat node
// coordinate and 325 within 50 m of it. That is exactly what the copy radius in scripts/review/thresholds.mjs is for,
// so this layer states its Claim and the voting rules decide whether it is independent.
//
// Read from the committed snapshot research/_commune-centres/wikidata-reference.json,
// refreshed by scripts/review/wikidata-reference.mjs --fetch.

export const layer = {
  id: "L1",
  source: "wikidata",
  licence: "CC0 1.0 Universal (Wikidata statements)",
  describe: "property P625 of the Wikidata item the commune relation carries",

  claim({ commune, snapshots }) {
    const row = snapshots.wikidata.byCommune.get(commune.code_commune);
    if (!row?.point) return null;
    return {
      layer: layer.id,
      source: layer.source,
      licence: layer.licence,
      snapshot: snapshots.wikidata.meta.query_date,
      point: row.point,
      verdict: null,
      detail: { item: row.wikidata },
    };
  },
};
