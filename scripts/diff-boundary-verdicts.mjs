#!/usr/bin/env node
// Decide whether a rebuilt commune boundary cache changed anything a human has to
// read, and write the pull-request body that says what.
//
// Used by .github/workflows/refresh-commune-boundary-cache.yml, which takes one
// verdict document from the committed cache and one from the rebuilt cache
// (`build-commune-boundary-cache.mjs --verdicts <path>`) and feeds both here. The
// reasoning for comparing verdicts rather than geometry is in
// scripts/lib/boundary-verdict-diff.mjs.
//
// USAGE
//   node scripts/diff-boundary-verdicts.mjs <before.json> <after.json> [--body <path>]
//
// Writes the markdown body to --body if given, else to stdout, and prints
// `changed=true|false` plus `osm_base_moved=true|false` to GITHUB_OUTPUT when the
// runner provides one. Exit status is 0 either way: "nothing changed" is a result,
// not a failure.

import { readFileSync, writeFileSync, appendFileSync } from "node:fs";

import { diffVerdicts, renderVerdictDiff } from "./lib/boundary-verdict-diff.mjs";

const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const bodyAt = process.argv.indexOf("--body");
const bodyPath = bodyAt === -1 ? null : (process.argv[bodyAt + 1] ?? null);

if (positional.length < 2) {
  console.error("usage: node scripts/diff-boundary-verdicts.mjs <before.json> <after.json> [--body <path>]");
  process.exit(2);
}

const [beforePath, afterPath] = positional;
const read = (path) => JSON.parse(readFileSync(path, "utf-8"));

const diff = diffVerdicts(read(beforePath), read(afterPath));
const body = renderVerdictDiff(diff);

if (bodyPath) writeFileSync(bodyPath, body);
else process.stdout.write(`${body}\n`);

if (process.env.GITHUB_OUTPUT)
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `changed=${diff.changed}\nosm_base_moved=${diff.osm_base_moved}\n`,
  );

console.error(
  `verdicts changed: ${diff.changed} (now outside ${diff.now_outside.length}, now inside ${diff.now_inside.length}, ` +
    `lost boundary ${diff.lost_boundary.length}, decidable again ${diff.gained_boundary.length}); ` +
    `OSM base moved: ${diff.osm_base_moved}`,
);
