"""Copy the administrative data from packages/dataset into the Python package.

Run from this directory before building: python build_data.py
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE.parent / "packages" / "dataset"
OUT = HERE / "src" / "geoalgeria" / "data"


def main() -> None:
    wilayas = json.loads((SRC / "data" / "wilayas.json").read_text(encoding="utf-8"))["wilayas"]
    communes = []
    for name in ("communes_w1_w23", "communes_w24_w48", "communes_w49_w69"):
        communes += json.loads((SRC / "data" / f"{name}.json").read_text(encoding="utf-8"))
    communes.sort(key=lambda c: c["code_commune"])
    version = json.loads((SRC / "package.json").read_text(encoding="utf-8"))["version"]
    OUT.mkdir(parents=True, exist_ok=True)
    for name, rows in (("wilayas", wilayas), ("communes", communes)):
        (OUT / f"{name}.json").write_text(
            json.dumps(rows, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    (OUT / "VERSION").write_text(version + "\n", encoding="utf-8")
    for name in ("LICENSE", "NOTICE"):
        (HERE / name).write_text((SRC / name).read_text(encoding="utf-8"), encoding="utf-8")
    print(f"{len(wilayas)} wilayas, {len(communes)} communes, data {version}")


if __name__ == "__main__":
    main()
