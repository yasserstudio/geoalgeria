// Every file in packages/dataset that carries a commune point, and how to read it.
//
// Shared because a guard that checks one carrier and not the others is the drift it
// exists to prevent: the nearest-centroid joins in ecoles, mosquees, culture,
// pharmacies, sante, djezzy and ooredoo read algeria.json, while external consumers
// install the csv/sql/geojson mirrors. Two tests hold these same seven files to two
// different standards (wilaya containment, commune containment) and must not
// disagree about what the seven files are.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const readText = (...p) => readFileSync(join(DATA, ...p), "utf-8");
const readJson = (...p) => JSON.parse(readText(...p));

export const COMMUNE_COUNT = 1541;

/** Every file in packages/dataset that carries a commune point.
 *  [label, () => {name, wilaya_code, lat, lng}[]] */
export const COPIES = [
  [
    "data/communes_w*.json",
    () =>
      ["communes_w1_w23", "communes_w24_w48", "communes_w49_w69"]
        .flatMap((f) => readJson(`${f}.json`))
        .map((c) => ({ name: c.name_fr, w: c.wilaya_code, lat: c.latitude, lng: c.longitude })),
  ],
  [
    "data/algeria.json",
    () =>
      readJson("algeria.json").flatMap((wil) =>
        (wil.communes || []).map((c) => ({
          name: c.name_fr,
          w: c.wilaya_code,
          lat: c.latitude,
          lng: c.longitude,
        })),
      ),
  ],
  [
    "data/geojson/communes.geojson",
    () =>
      readJson("geojson", "communes.geojson").features.map((f) => ({
        name: f.properties.name_fr,
        w: f.properties.wilaya_code,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      })),
  ],
  [
    // name_fr,name_ar,wilaya_code,daira,postal_code,latitude,longitude,code_commune
    "data/csv/communes.csv",
    () =>
      readText("csv", "communes.csv")
        .trim()
        .split(/\r?\n/)
        .slice(1)
        .map((line) => line.split(","))
        .filter((c) => c.length === 8)
        .map((c) => ({ name: c[0], w: Number(c[2]), lat: Number(c[5]), lng: Number(c[6]) })),
  ],
  [
    // …, wilaya_code, 'daira', 'postal', latitude, longitude, code_commune)
    // Anchored at the end of the row: commune names carry SQL-escaped apostrophes
    // (M''fatha), so a left-anchored quoted-field pattern drops them silently.
    // postal_code matches NULL as well as a quoted value: five of the 13 communes
    // added in the 1,541 completion have no citable postal code, and a pattern that
    // only accepted '\d+' would drop exactly those rows instead of checking them.
    "data/sql/full.sql",
    () => {
      const re =
        /^ {2}\(\d+, '((?:[^']|'')*)', '(?:[^']|'')*', (\d+), '(?:[^']|'')*', (?:'\d+'|NULL), (-?[\d.]+|NULL), (-?[\d.]+|NULL), (?:\d+|NULL)\)[,;]$/;
      const num = (s) => (s === "NULL" ? NaN : Number(s));
      const out = [];
      for (const line of readText("sql", "full.sql").split("\n")) {
        const m = line.match(re);
        if (m) out.push({ name: m[1].replace(/''/g, "'"), w: Number(m[2]), lat: num(m[3]), lng: num(m[4]) });
      }
      return out;
    },
  ],
];
