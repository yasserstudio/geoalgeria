// Every merged PR from an outside contributor is credited by its number
// ("#349") in a pending changeset or a package CHANGELOG before the Version
// PR merges. geoalgeria 2.5.0 shipped #349 with no credit; this makes the
// promise mechanical.
//
// Usage: node scripts/check-contributor-credit.mjs   (needs `gh`, GH_TOKEN in CI)
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OWNER = "yasserstudio";

/** PRs by outside, non-bot authors whose number appears nowhere in `text`. */
export function findUncredited(prs, text, owner = OWNER) {
  return prs.filter(
    (pr) =>
      pr.author &&
      !pr.author.is_bot &&
      pr.author.login !== owner &&
      !new RegExp(`#${pr.number}(?!\\d)`).test(text),
  );
}

function creditText(root) {
  const files = [];
  const changesets = join(root, ".changeset");
  if (existsSync(changesets)) {
    for (const f of readdirSync(changesets)) {
      if (f.endsWith(".md") && f !== "README.md") files.push(join(changesets, f));
    }
  }
  const packages = join(root, "packages");
  for (const p of readdirSync(packages)) {
    const log = join(packages, p, "CHANGELOG.md");
    if (existsSync(log)) files.push(log);
  }
  return files.map((f) => readFileSync(f, "utf8")).join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const prs = JSON.parse(
    execFileSync(
      "gh",
      ["pr", "list", "--state", "merged", "--limit", "2000", "--json", "number,author,title"],
      { cwd: root, encoding: "utf8" },
    ),
  );
  const missing = findUncredited(prs, creditText(root));
  if (missing.length) {
    for (const pr of missing) {
      console.error(`#${pr.number} by @${pr.author.login} is not credited: ${pr.title}`);
    }
    console.error(
      'Add "Contributed by @handle in #N" to the changeset (it flows into the CHANGELOG) and a thanks line in the release notes.',
    );
    process.exit(1);
  }
  console.log(`Contributor credit: all ${prs.length} merged PRs checked.`);
}
