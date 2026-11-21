"""Shared fixtures read from the npm side of the monorepo at test time.

The Golden corpus and the match cases are JavaScript modules in
`@geoalgeria/normalize`, so Node reads them and hands them over as JSON. Nothing
here is copied by hand: a case added on the npm side is a case Python must pass.
"""
import json
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
NORMALIZE = ROOT / "packages" / "normalize"
DATASET = ROOT / "packages" / "dataset"


def node(script: str, stdin: str = "") -> str:
    """Run an ES module script with Node from the repo root and return its stdout."""
    return subprocess.run(
        ["node", "--input-type=module", "-e", script],
        cwd=ROOT, input=stdin, check=True, capture_output=True, text=True, encoding="utf-8",
    ).stdout


@pytest.fixture(scope="session")
def golden():
    """`corpus` and `matchCases` from `@geoalgeria/normalize/fixtures`."""
    url = json.dumps((NORMALIZE / "fixtures" / "index.js").as_uri())
    return json.loads(node(
        f"import {{ corpus, matchCases }} from {url};"
        "process.stdout.write(JSON.stringify({ corpus, matchCases }));"
    ))


@pytest.fixture(scope="session")
def npm_keys():
    """The npm Conservative and Loose keys of each text, for differential tests."""
    url = json.dumps((NORMALIZE / "index.js").as_uri())
    script = (
        f"import {{ conservativeKey, looseKey }} from {url};"
        "let data = ''; process.stdin.setEncoding('utf8');"
        "process.stdin.on('data', (chunk) => (data += chunk));"
        "process.stdin.on('end', () => process.stdout.write(JSON.stringify("
        "JSON.parse(data).map((t) => [conservativeKey(t), looseKey(t)]))));"
    )
    return lambda texts: [tuple(pair) for pair in json.loads(node(script, json.dumps(texts)))]
