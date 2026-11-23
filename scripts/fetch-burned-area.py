#!/usr/bin/env python3
"""Fetch NASA's MODIS MCD64A1 v061 grids over Algeria and keep the burned cells,
with the MCD12Q1 land class of each, plus the GWIS table the build checks them against.

Writes two JSON files that scripts/capture-burned-area.mjs stores under sources/:
  cells.json  {"tiles": [...], "land_cover": {"YYYY": year of the map used},
               "months": {"YYYY-MM": {tile: [[row, col, land class], ...]}}}
  gwis.json   {"rows": [the Algeria rows of the GWIS table, as published]}

A tile-month NASA published always has a key, even with no burned cell; one it did
not publish has none, so the build can tell "nothing burned" from "no data".

Needs pyhdf and numpy, and a NASA Earthdata token (urs.earthdata.nasa.gov, approve
"LP DAAC Data Pool") in a file outside the repository, mode 600. The token goes to
curl on stdin, so it is in no argument list, log or output.

Usage:
  python3 -I scripts/fetch-burned-area.py --work DIR [--token-file FILE]
      [--first 2001] [--last YEAR]

Grids already in DIR are not downloaded again, except those of the last three months
NASA lists, which it may have replaced. An interrupted run can be restarted.
"""

import argparse
import concurrent.futures
import csv
import datetime
import io
import json
import math
import os
import re
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import zipfile

import numpy as np
from pyhdf.SD import SD, SDC

TILES = sorted(f"h{h}v{v:02d}" for h in (17, 18, 19) for v in (5, 6, 7))
BBOX = (-8.7, 18.9, 12.0, 37.3)  # Algeria, west south east north
RADIUS = 6371007.181
TILE = math.pi * RADIUS / 18
CELL = TILE / 2400
CMR = "https://cmr.earthdata.nasa.gov/search/granules.json"
GWIS = (
    "https://gwis.jrc.ec.europa.eu/downloads/country.profile/"
    "MCD64A1_burned_area_full_dataset_2002_2025.zip"
)


def list_granules(year, product="MCD64A1"):
    """[(yyyyddd, tile, url)] NASA lists for a year."""
    query = urllib.parse.urlencode(
        {
            "short_name": product,
            "version": "061",
            "bounding_box": ",".join(map(str, BBOX)),
            "temporal": f"{year}-01-01T00:00:00Z,{year}-12-31T23:59:59Z",
            "page_size": 500,
        }
    )
    with urllib.request.urlopen(f"{CMR}?{query}", timeout=60) as response:
        entries = json.load(response)["feed"]["entry"]
    found = []
    for entry in entries:
        match = re.match(product + r"\.A(\d{7})\.(h\d\dv\d\d)\.061\.", entry["title"])
        if not match or match[2] not in TILES or not match[1].startswith(str(year)):
            continue
        url = next(
            l["href"]
            for l in entry["links"]
            if l["href"].startswith("https://") and l["href"].endswith(".hdf") and "data#" in l["rel"]
        )
        found.append((match[1], match[2], url))
    return found


def download(url, path, token):
    if os.path.exists(path):
        return None
    error = ""
    for _ in range(3):
        result = subprocess.run(
            ["curl", "-sSL", "--fail", "--max-time", "120", "-H", "@-", "-o", path + ".part", url],
            input=f"Authorization: Bearer {token}\n",
            text=True,
            capture_output=True,
        )
        if result.returncode == 0:
            os.rename(path + ".part", path)
            return None
        error = result.stderr.strip()[-150:]
    return f"{os.path.basename(path)}: {error}"


def burned_cells(path, tile, land_path):
    """Sorted [row, col, MCD12Q1 land class] of the burned cells whose centre is in the Algeria box."""
    grid = SD(path, SDC.READ).select("Burn Date").get()
    if grid.shape != (2400, 2400):
        raise ValueError(f"{path}: unexpected grid {grid.shape}")
    land = SD(land_path, SDC.READ).select("LC_Type1").get()
    if land.shape != grid.shape:
        raise ValueError(f"{land_path}: unexpected grid {land.shape}")
    rows, cols = np.nonzero(grid > 0)
    h, v = int(tile[1:3]), int(tile[4:6])
    lat = ((9 - v) * TILE - (rows + 0.5) * CELL) / RADIUS
    lng = np.degrees(((h - 18) * TILE + (cols + 0.5) * CELL) / (RADIUS * np.cos(lat)))
    lat = np.degrees(lat)
    west, south, east, north = BBOX
    keep = (lng >= west) & (lng <= east) & (lat >= south) & (lat <= north)
    return np.stack([rows[keep], cols[keep], land[rows, cols][keep]], axis=1).tolist()


def month_of(yyyyddd):
    day = datetime.date(int(yyyyddd[:4]), 1, 1) + datetime.timedelta(int(yyyyddd[4:]) - 1)
    return f"{day:%Y-%m}"


def gwis_rows():
    """Algeria's rows of the GWIS table, as published."""
    with urllib.request.urlopen(GWIS, timeout=120) as response:
        archive = zipfile.ZipFile(io.BytesIO(response.read()))
    name = next(n for n in archive.namelist() if n.endswith(".csv"))
    with archive.open(name) as raw:
        return [row for row in csv.DictReader(io.TextIOWrapper(raw, "utf-8")) if row["gid_0"] == "DZA"]


def write_json(path, payload):
    with tempfile.NamedTemporaryFile("w", dir=os.path.dirname(path), delete=False) as f:
        json.dump(payload, f)
    os.replace(f.name, path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--work", required=True)
    parser.add_argument("--token-file", default="~/.credentials/earthdata-token")
    parser.add_argument("--first", type=int, default=2001)
    parser.add_argument("--last", type=int, default=datetime.date.today().year)
    args = parser.parse_args()

    work = os.path.abspath(args.work)
    grids = os.path.join(work, "gran")
    os.makedirs(grids, exist_ok=True)
    with open(os.path.expanduser(args.token_file)) as f:
        token = f.read().strip()

    listed = [g for year in range(args.first, args.last + 1) for g in list_granules(year)]
    path_of = lambda day, tile: os.path.join(grids, f"{day}.{tile}.hdf")
    for recent in sorted({day for day, _, _ in listed})[-3:]:
        for tile in TILES:
            if os.path.exists(path_of(recent, tile)):
                os.remove(path_of(recent, tile))
    maps = [g for year in range(args.first, args.last + 1) for g in list_granules(year, "MCD12Q1")]
    land_of = lambda year, tile: os.path.join(grids, f"land.{year}.{tile}.hdf")
    map_years = sorted({int(day[:4]) for day, _, _ in maps})
    land_cover = {
        year: max((m for m in map_years if m <= year), default=map_years[0])
        for year in sorted({int(day[:4]) for day, _, _ in listed})
    }
    jobs = [(url, path_of(day, tile)) for day, tile, url in listed]
    jobs += [(url, land_of(int(day[:4]), tile)) for day, tile, url in maps]
    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        errors = list(pool.map(lambda job: download(*job, token), jobs))
    failed = [e for e in errors if e]
    if failed:
        # A grid NASA lists but we could not read would look like a month NASA never published.
        sys.exit("grids not downloaded, nothing written:\n  " + "\n  ".join(failed))

    months = {}
    for day, tile, _ in sorted(listed):
        months.setdefault(month_of(day), {})[tile] = burned_cells(
            path_of(day, tile), tile, land_of(land_cover[int(day[:4])], tile)
        )
    write_json(os.path.join(work, "cells.json"), {"tiles": TILES, "land_cover": land_cover, "months": months})
    write_json(os.path.join(work, "gwis.json"), {"rows": gwis_rows()})
    print(f"{len(listed)} grids, {min(months)} to {max(months)}, written to {work}")


if __name__ == "__main__":
    main()
