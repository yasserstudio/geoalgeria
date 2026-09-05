// The licence field is three artefacts that have to agree: the manifest `license`,
// the package LICENSE file, and the data terms in dataset-metadata.json. Nothing
// tied them together, so a manifest could keep saying "MIT" over restricted data.
// These tests pin one example per class and the mismatches that used to pass.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { licenceTermsErrors } from "../scripts/lib/licence-terms.mjs";

const MIT_TEXT = "MIT License\n\nCopyright (c) 2025-2026 Yasser's Studio\n";

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

  // A LICENSE with no Code heading leaves the code terms unstated.
  const noCode = licenceTermsErrors({ ...restricted, licenceText: `## Data\n\n${terms}\n` });
  assert.equal(noCode.length, 1);
  assert.match(noCode[0], /## Code/);
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
        members: Object.keys(manifest.dependencies ?? {}).filter((d) => d.startsWith("@geoalgeria/")),
      }),
    );
  }
  assert.deepEqual(errors, []);
});
