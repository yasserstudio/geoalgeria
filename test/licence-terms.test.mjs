// The licence field is three artefacts that have to agree: the manifest `license`,
// the package LICENSE file, and the data terms in dataset-metadata.json. Nothing
// tied them together, so a manifest could keep saying "MIT" over restricted data.
// These tests pin one example per class and the mismatches that used to pass.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MIT_BODY, licenceTermsErrors } from "../scripts/lib/licence-terms.mjs";

// The real header a package LICENSE carries: the MIT title, the copyright line, and
// the grant itself. The grant is what a consumer relies on, so it is part of every
// fixture; a fixture without it is the "gutted MIT" case the tests below pin.
const MIT_TEXT = `MIT License\n\nCopyright (c) 2025-2026 Yasser's Studio\n\n${MIT_BODY}\n`;
const GUTTED_MIT = "MIT License\n\nCopyright (c) 2025-2026 Yasser's Studio\n";

test("a code-only package with no metadata must declare MIT", () => {
  assert.deepEqual(
    licenceTermsErrors({
      name: "schema",
      manifest: { license: "MIT" },
      metadata: null,
      licenceText: MIT_TEXT,
      members: [],
    }),
    [],
  );
});

test("an MIT-URL dataset must declare MIT", () => {
  assert.deepEqual(
    licenceTermsErrors({
      name: "dataset",
      manifest: { license: "MIT" },
      metadata: { license: "https://opensource.org/licenses/MIT" },
      licenceText: MIT_TEXT,
      members: [],
    }),
    [],
  );
});

test("an ODbL dataset must declare MIT AND ODbL-1.0 and carry the URL in the Data section", () => {
  const odbl = {
    name: "cliniques",
    manifest: { license: "MIT AND ODbL-1.0" },
    metadata: { license: "https://opendatacommons.org/licenses/odbl/1-0/" },
    licenceText: `## Code\n\n${MIT_TEXT}\n## Data\n\nODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/\n`,
    members: [],
  };
  assert.deepEqual(licenceTermsErrors(odbl), []);

  const stale = licenceTermsErrors({ ...odbl, manifest: { license: "MIT" } });
  assert.equal(stale.length, 1);
  assert.match(stale[0], /MIT AND ODbL-1\.0/);

  const silent = licenceTermsErrors({ ...odbl, licenceText: `## Code\n\n${MIT_TEXT}\n## Data\n\nOpen data.\n` });
  assert.equal(silent.length, 1);
  assert.match(silent[0], /LICENSE/);
});

// The real shape of the only mixed package: the `## Data` section states the MIT
// bulk, then lists each ODbL carve-out as a `- ` bullet naming the data paths it
// covers, and points at NOTICE for the per-part attribution.
const MIXED_LICENCE =
  `## Code\n\n${MIT_TEXT}\n## Data\n\n` +
  `The compilation is MIT: https://opensource.org/licenses/MIT\n\n` +
  `Two OpenStreetMap-derived parts are ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/\n\n` +
  "- The 69 wilaya boundary polygons in `data/geojson/wilaya-boundaries.geojson`,\n" +
  "  derived from OpenStreetMap `admin_level=4` relations.\n" +
  "- 62 commune centre coordinates, repeated in `data/algeria.json`,\n" +
  "  `data/communes_w*.json` and `data/csv/communes.csv`.\n\n" +
  "Per-part attribution: NOTICE.\n";

const MIXED_NOTICE =
  "geoalgeria data notices\n\n(c) OpenStreetMap contributors\n" +
  "https://opendatacommons.org/licenses/odbl/1-0/\n\n" +
  "1. Wilaya boundary polygons\n\n   data/geojson/wilaya-boundaries.geojson, 69 features.\n\n" +
  "2. Commune centre coordinates\n\n   62 of the 1,541 values, carried by data/algeria.json,\n" +
  "   data/communes_w1_w23.json, data/communes_w24_w48.json, data/communes_w49_w69.json\n" +
  "   and data/csv/communes.csv.\n";

test("a dataset that is MIT except for an ODbL part carries both URLs and names each part", () => {
  const mixed = {
    name: "dataset",
    manifest: { license: "MIT AND ODbL-1.0", files: ["dataset-metadata.json", "NOTICE", "data/**/*.json"] },
    metadata: {
      license: ["https://opensource.org/licenses/MIT", "https://opendatacommons.org/licenses/odbl/1-0/"],
    },
    licenceText: MIXED_LICENCE,
    noticeText: MIXED_NOTICE,
    members: [],
  };
  assert.deepEqual(licenceTermsErrors(mixed), []);

  // The bug the array exists for: an ODbL part under a manifest still saying plain MIT.
  const stale = licenceTermsErrors({ ...mixed, manifest: { ...mixed.manifest, license: "MIT" } });
  assert.equal(stale.length, 1);
  assert.match(stale[0], /MIT AND ODbL-1\.0/);

  // Naming one of the two licences is not the split: a consumer cannot tell what the
  // missing one covers.
  const halfStated = licenceTermsErrors({
    ...mixed,
    licenceText: `## Code\n\n${MIT_TEXT}\n## Data\n\nODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/\n\n- The 69 wilaya boundary polygons in \`data/geojson/wilaya-boundaries.geojson\`.\n`,
  });
  assert.equal(halfStated.length, 1);
  assert.match(halfStated[0], /opensource\.org\/licenses\/MIT/);

  // The array is not a place to list any two licences: only the MIT plus ODbL split
  // the repository ships is known, and another pair is an error, not a silent pass.
  const unknownPair = licenceTermsErrors({
    ...mixed,
    metadata: {
      license: ["https://opensource.org/licenses/MIT", "https://creativecommons.org/licenses/by/4.0/"],
    },
  });
  assert.equal(unknownPair.length, 1);
  assert.match(unknownPair[0], /licence-terms\.mjs/);
});

test("a mixed package with no NOTICE fails: the LICENSE points at nothing", () => {
  const errors = licenceTermsErrors({
    name: "dataset",
    manifest: { license: "MIT AND ODbL-1.0", files: ["NOTICE"] },
    metadata: {
      license: ["https://opensource.org/licenses/MIT", "https://opendatacommons.org/licenses/odbl/1-0/"],
    },
    licenceText: MIXED_LICENCE,
    noticeText: null,
    members: [],
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /NOTICE: missing/);
});

test("a NOTICE outside files[] fails: it ships in git, not in the tarball", () => {
  const errors = licenceTermsErrors({
    name: "dataset",
    manifest: { license: "MIT AND ODbL-1.0", files: ["dataset-metadata.json", "data/**/*.json"] },
    metadata: {
      license: ["https://opensource.org/licenses/MIT", "https://opendatacommons.org/licenses/odbl/1-0/"],
    },
    licenceText: MIXED_LICENCE,
    noticeText: MIXED_NOTICE,
    members: [],
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /files\[\] does not list "NOTICE"/);
});

test("a NOTICE that leaves one carve-out unnamed fails", () => {
  // The fixture the rule exists for: NOTICE attributes the boundaries and says
  // nothing about the commune centres, so that carved-out part ships with no
  // attribution while the LICENSE claims ODbL over it.
  const boundariesOnly =
    "geoalgeria data notices\n\n(c) OpenStreetMap contributors\n" +
    "https://opendatacommons.org/licenses/odbl/1-0/\n\n" +
    "1. Wilaya boundary polygons\n\n   data/geojson/wilaya-boundaries.geojson, 69 features.\n";
  const errors = licenceTermsErrors({
    name: "dataset",
    manifest: { license: "MIT AND ODbL-1.0", files: ["NOTICE"] },
    metadata: {
      license: ["https://opensource.org/licenses/MIT", "https://opendatacommons.org/licenses/odbl/1-0/"],
    },
    licenceText: MIXED_LICENCE,
    noticeText: boundariesOnly,
    members: [],
  });
  assert.equal(errors.length, 3, errors.join("\n"));
  for (const path of ["data/algeria.json", "data/communes_w", "data/csv/communes.csv"])
    assert.ok(
      errors.some((e) => e.includes(`does not name ${path}`)),
      `expected a finding for ${path}, got:\n${errors.join("\n")}`,
    );
});

test("a NOTICE without the ODbL URL fails: attribution with no terms", () => {
  const errors = licenceTermsErrors({
    name: "dataset",
    manifest: { license: "MIT AND ODbL-1.0", files: ["NOTICE"] },
    metadata: {
      license: ["https://opensource.org/licenses/MIT", "https://opendatacommons.org/licenses/odbl/1-0/"],
    },
    licenceText: MIXED_LICENCE,
    noticeText: MIXED_NOTICE.replace("https://opendatacommons.org/licenses/odbl/1-0/\n", ""),
    members: [],
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /does not carry https:\/\/opendatacommons/);
});

test("a mixed LICENSE that enumerates no carve-out fails", () => {
  // Prose alone cannot be checked part by part, so the carve-outs must be listed.
  const errors = licenceTermsErrors({
    name: "dataset",
    manifest: { license: "MIT AND ODbL-1.0", files: ["NOTICE"] },
    metadata: {
      license: ["https://opensource.org/licenses/MIT", "https://opendatacommons.org/licenses/odbl/1-0/"],
    },
    licenceText:
      `## Code\n\n${MIT_TEXT}\n## Data\n\nMostly MIT: https://opensource.org/licenses/MIT\n` +
      `Some of it ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/\n`,
    noticeText: MIXED_NOTICE,
    members: [],
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /lists no "- " carve-out bullet/);
});

test("a carve-out bullet that names no data path fails", () => {
  const errors = licenceTermsErrors({
    name: "dataset",
    manifest: { license: "MIT AND ODbL-1.0", files: ["NOTICE"] },
    metadata: {
      license: ["https://opensource.org/licenses/MIT", "https://opendatacommons.org/licenses/odbl/1-0/"],
    },
    licenceText:
      `## Code\n\n${MIT_TEXT}\n## Data\n\nThe compilation is MIT: https://opensource.org/licenses/MIT\n` +
      `Two parts are ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/\n\n` +
      "- Some of the geometry, from OpenStreetMap.\n",
    noticeText: MIXED_NOTICE,
    members: [],
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /names no `data\/\.\.\.` path/);
});

test("an unknown data licence URL is an error naming the URL", () => {
  const errors = licenceTermsErrors({
    name: "tourisme",
    manifest: { license: "MIT" },
    metadata: { license: "https://creativecommons.org/licenses/by/4.0/" },
    licenceText: MIT_TEXT,
    members: [],
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /creativecommons\.org\/licenses\/by\/4\.0\//);
  assert.match(errors[0], /licence-terms\.mjs/);
});

test("a restricted dataset must declare SEE LICENSE IN LICENSE over a Code + Data file", () => {
  const terms = "Data © Algérie Poste; redistributed for reference";
  const restricted = {
    name: "poste",
    manifest: { license: "SEE LICENSE IN LICENSE" },
    metadata: { conditionsOfAccess: terms },
    licenceText: `## Code\n\n${MIT_TEXT}\n## Data\n\n${terms}\n`,
    members: [],
  };
  assert.deepEqual(licenceTermsErrors(restricted), []);

  // The bug this rule exists for: restricted data under a manifest still saying MIT.
  const stale = licenceTermsErrors({ ...restricted, manifest: { license: "MIT" } });
  assert.equal(stale.length, 1);
  assert.match(stale[0], /SEE LICENSE IN LICENSE/);

  // A paraphrase is not the terms; the LICENSE has to carry them verbatim.
  const paraphrased = licenceTermsErrors({
    ...restricted,
    licenceText: `## Code\n\n${MIT_TEXT}\n## Data\n\nData belongs to Algérie Poste and is reproduced here.\n`,
  });
  assert.equal(paraphrased.length, 1);
  assert.match(paraphrased[0], /verbatim/);

  // A LICENSE with no Code heading leaves the code terms unstated, and with them the
  // MIT grant, so both code checks fire.
  const noCode = licenceTermsErrors({ ...restricted, licenceText: `## Data\n\n${terms}\n` });
  assert.ok(noCode.some((e) => /## Code/.test(e)));
});

test("license and conditionsOfAccess are exclusive, and one of them is required", () => {
  const both = licenceTermsErrors({
    name: "sante",
    manifest: { license: "SEE LICENSE IN LICENSE" },
    metadata: { license: "https://opensource.org/licenses/MIT", conditionsOfAccess: "Official registry" },
    licenceText: `## Code\n\n${MIT_TEXT}\n## Data\n\nOfficial registry\n`,
    members: [],
  });
  assert.ok(both.some((e) => /exclusive/.test(e)));

  const neither = licenceTermsErrors({
    name: "sante",
    manifest: { license: "MIT" },
    metadata: {},
    licenceText: MIT_TEXT,
    members: [],
  });
  assert.deepEqual(neither, [
    "sante/dataset-metadata.json: needs exactly one of license or conditionsOfAccess, it declares neither",
  ]);
});

test("an umbrella must list every member's data terms in the Data section", () => {
  const members = ["@geoalgeria/industrie-pharmaceutique", "@geoalgeria/pharmacies"];
  const umbrella = {
    name: "pharma",
    manifest: { license: "SEE LICENSE IN LICENSE" },
    metadata: null,
    licenceText:
      `## Code\n\n${MIT_TEXT}\n## Data\n\n` +
      `- @geoalgeria/industrie-pharmaceutique: Factual public register (MIP)\n` +
      `- @geoalgeria/pharmacies: ODbL 1.0, © OpenStreetMap contributors\n`,
    members,
  };
  assert.deepEqual(licenceTermsErrors(umbrella), []);

  // A member added to dependencies but not to the LICENSE ships untraceable terms.
  const partial = licenceTermsErrors({
    ...umbrella,
    members: [...members, "@geoalgeria/sante"],
  });
  assert.equal(partial.length, 1);
  assert.match(partial[0], /@geoalgeria\/sante/);

  // An umbrella is never plain MIT, whatever its members say.
  const wrongManifest = licenceTermsErrors({ ...umbrella, manifest: { license: "MIT" } });
  assert.equal(wrongManifest.length, 1);
  assert.match(wrongManifest[0], /SEE LICENSE IN LICENSE/);
});

test("a package with metadata is never treated as an umbrella, whatever it depends on", () => {
  // An umbrella has no metadata of its own. A package that has both used to take the
  // umbrella branch and return early, so its own data terms went unchecked.
  const errors = licenceTermsErrors({
    name: "transport",
    manifest: { license: "SEE LICENSE IN LICENSE" },
    metadata: { conditionsOfAccess: "Official registry (Ministry of Transport)" },
    licenceText: `## Code\n\n${MIT_TEXT}\n## Data\n\n- @geoalgeria/gares-routieres: Factual public register\n`,
    members: ["@geoalgeria/gares-routieres"],
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /verbatim/);
});

test("an umbrella LICENSE must state the code terms too", () => {
  const errors = licenceTermsErrors({
    name: "pharma",
    manifest: { license: "SEE LICENSE IN LICENSE" },
    metadata: null,
    licenceText: `## Data\n\n- @geoalgeria/pharmacies: ODbL 1.0\n`,
    members: ["@geoalgeria/pharmacies"],
  });
  assert.ok(errors.some((e) => /## Code/.test(e)));
});

test("an umbrella may not list a member it does not depend on", () => {
  // A member dropped from dependencies but left in the LICENSE states terms for data
  // the package no longer ships.
  const errors = licenceTermsErrors({
    name: "pharma",
    manifest: { license: "SEE LICENSE IN LICENSE" },
    metadata: null,
    licenceText:
      `## Code\n\n${MIT_TEXT}\n## Data\n\n` +
      `- @geoalgeria/pharmacies: ODbL 1.0, © OpenStreetMap contributors\n` +
      `- @geoalgeria/laboratoires: Factual public register\n`,
    members: ["@geoalgeria/pharmacies"],
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /@geoalgeria\/laboratoires/);
});

test("every class needs the MIT grant itself, not just the heading", () => {
  const codeOnly = licenceTermsErrors({
    name: "schema",
    manifest: { license: "MIT" },
    metadata: null,
    licenceText: GUTTED_MIT,
    members: [],
  });
  assert.equal(codeOnly.length, 1);
  assert.match(codeOnly[0], /LICENSE/);

  const openMit = licenceTermsErrors({
    name: "dataset",
    manifest: { license: "MIT" },
    metadata: { license: "https://opensource.org/licenses/MIT" },
    licenceText: GUTTED_MIT,
    members: [],
  });
  assert.equal(openMit.length, 1);

  const odbl = licenceTermsErrors({
    name: "cliniques",
    manifest: { license: "MIT AND ODbL-1.0" },
    metadata: { license: "https://opendatacommons.org/licenses/odbl/1-0/" },
    licenceText: `## Code\n\n${GUTTED_MIT}\n## Data\n\nODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/\n`,
    members: [],
  });
  assert.equal(odbl.length, 1);

  const terms = "Data © Algérie Poste; redistributed for reference";
  const restricted = licenceTermsErrors({
    name: "poste",
    manifest: { license: "SEE LICENSE IN LICENSE" },
    metadata: { conditionsOfAccess: terms },
    licenceText: `## Code\n\n${GUTTED_MIT}\n## Data\n\n${terms}\n`,
    members: [],
  });
  assert.equal(restricted.length, 1);

  const umbrella = licenceTermsErrors({
    name: "pharma",
    manifest: { license: "SEE LICENSE IN LICENSE" },
    metadata: null,
    licenceText: `## Code\n\n${GUTTED_MIT}\n## Data\n\n- @geoalgeria/pharmacies: ODbL 1.0\n`,
    members: ["@geoalgeria/pharmacies"],
  });
  assert.equal(umbrella.length, 1);

  // The grant sitting after the "## Data" heading is not the code terms.
  const misplaced = licenceTermsErrors({
    name: "poste",
    manifest: { license: "SEE LICENSE IN LICENSE" },
    metadata: { conditionsOfAccess: terms },
    licenceText: `## Code\n\n${GUTTED_MIT}\n## Data\n\n${terms}\n\n${MIT_BODY}\n`,
    members: [],
  });
  assert.equal(misplaced.length, 1);
});

test("every package in the repository satisfies its licence class", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const packagesDir = join(root, "packages");
  const errors = [];
  for (const name of readdirSync(packagesDir).sort()) {
    const dir = join(packagesDir, name);
    const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"));
    const metadataPath = join(dir, "dataset-metadata.json");
    errors.push(
      ...licenceTermsErrors({
        name,
        manifest,
        metadata: existsSync(metadataPath) ? JSON.parse(readFileSync(metadataPath, "utf-8")) : null,
        licenceText: readFileSync(join(dir, "LICENSE"), "utf-8"),
        noticeText: existsSync(join(dir, "NOTICE")) ? readFileSync(join(dir, "NOTICE"), "utf-8") : null,
        members: Object.keys(manifest.dependencies ?? {}).filter((d) => d.startsWith("@geoalgeria/")),
      }),
    );
  }
  assert.deepEqual(errors, []);
});
