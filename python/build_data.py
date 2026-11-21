"""Copy the administrative data from packages/dataset into the Python package.

Run from this directory before building: python build_data.py
"""
import json
from pathlib import Path
from typing import Dict

HERE = Path(__file__).parent
SRC = HERE.parent / "packages" / "dataset"
OUT = Path("src") / "geoalgeria" / "data"

# Copied whole, as the npm package ships them.
VERBATIM = ("dairas", "wilaya-lineage", "name-history")


def _read(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _dump(rows) -> str:
    return json.dumps(rows, ensure_ascii=False, separators=(",", ":")) + "\n"


def derive() -> Dict[str, str]:
    """Every file the package bundles, by path relative to this directory, and its text."""
    wilayas = _read(SRC / "data" / "wilayas.json")["wilayas"]
    communes = []
    for name in ("communes_w1_w23", "communes_w24_w48", "communes_w49_w69"):
        communes += _read(SRC / "data" / f"{name}.json")
    communes.sort(key=lambda c: c["code_commune"])
    files = {str(OUT / "wilayas.json"): _dump(wilayas), str(OUT / "communes.json"): _dump(communes)}
    for name in VERBATIM:
        files[str(OUT / f"{name}.json")] = _dump(_read(SRC / "data" / f"{name}.json"))
    files[str(OUT / "VERSION")] = _read(SRC / "package.json")["version"] + "\n"
    for name in ("LICENSE", "NOTICE"):
        files[name] = (SRC / name).read_text(encoding="utf-8")
    return files


def main() -> None:
    files = derive()
    for path, text in files.items():
        (HERE / path).parent.mkdir(parents=True, exist_ok=True)
        (HERE / path).write_text(text, encoding="utf-8")
    print(f"{len(files)} files, data {files[str(OUT / 'VERSION')].strip()}")


if __name__ == "__main__":
    main()
