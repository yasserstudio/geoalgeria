// L1 open reference: the `admin_centre` node of the commune's OpenStreetMap relation.
//
// This is OpenStreetMap naming the chef-lieu of the commune, which is the most direct
// public statement about where a commune's town is, and it is the source the 250 applied
// corrections already come from. Read from the committed snapshot
// research/_commune-centres/osm-seat-reference.json; nothing here goes to the network.

export const layer = {
  id: "L1",
  source: "osm_seat",
  licence: "ODbL 1.0, (c) OpenStreetMap contributors",
  describe: "the admin_centre node of the commune's admin_level=8 relation",

  claim({ commune, snapshots }) {
    const row = snapshots.seats.byCommune.get(commune.code_commune);
    if (!row?.seat) return null;
    return {
      layer: layer.id,
      source: layer.source,
      licence: layer.licence,
      snapshot: snapshots.seats.meta.timestamp_osm_base,
      point: row.seat,
      verdict: null,
      detail: { relation: row.osm_relation_id, admin_centre_node: row.admin_centre_node },
    };
  },
};
