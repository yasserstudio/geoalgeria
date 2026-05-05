#!/usr/bin/env python3
"""Validate all dataset files for integrity and schema conformity."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent / "data"
errors = []


def error(msg):
    errors.append(msg)
    print(f"  FAIL: {msg}")


def validate_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        error(f"{path.name}: invalid JSON — {e}")
        return None


def validate_wilayas(data):
    required = {"code", "name_fr", "name_ar", "postal_code", "latitude", "longitude", "created"}
    valid_created = {"original", "1984", "2019", "2025"}
    codes = set()
    for i, w in enumerate(data):
        missing = required - set(w.keys())
        if missing:
            error(f"wilayas[{i}]: missing fields {missing}")
        if w.get("code") in codes:
            error(f"wilayas[{i}]: duplicate code {w.get('code')}")
        codes.add(w.get("code"))
        if w.get("created") not in valid_created:
            error(f"wilayas[{i}]: invalid created value '{w.get('created')}'")
    if len(data) != 69:
        error(f"wilayas.json: expected 69, got {len(data)}")
    return codes


def validate_communes(data, filename):
    required = {"name_fr", "name_ar", "wilaya_code", "daira", "postal_code"}
    seen = set()
    for i, c in enumerate(data):
        missing = required - set(c.keys())
        if missing:
            error(f"{filename}[{i}]: missing fields {missing}")
        key = (c.get("wilaya_code"), c.get("name_fr"))
        if key in seen:
            error(f"{filename}[{i}]: duplicate commune {key}")
        seen.add(key)
    return len(data)


def validate_dairas(data, wilaya_codes):
    required = {"id", "wilaya_code", "name_fr", "commune_count"}
    ids = set()
    for i, d in enumerate(data):
        missing = required - set(d.keys())
        if missing:
            error(f"dairas[{i}]: missing fields {missing}")
        if d.get("commune_count", 0) < 1:
            error(f"dairas[{i}]: commune_count must be >= 1")
        if d.get("id") in ids:
            error(f"dairas[{i}]: duplicate id {d.get('id')}")
        ids.add(d.get("id"))
        if d.get("wilaya_code") not in wilaya_codes:
            error(f"dairas[{i}]: unknown wilaya_code {d.get('wilaya_code')}")


def validate_ecommerce(data, total_communes):
    required = {"id", "commune_name_fr", "commune_name_ar", "daira_name_fr", "wilaya_code", "wilaya_name_fr", "wilaya_name_ar", "postal_code"}
    ids = set()
    for i, c in enumerate(data):
        missing = required - set(c.keys())
        if missing:
            error(f"ecommerce[{i}]: missing fields {missing}")
        if c.get("id") in ids:
            error(f"ecommerce[{i}]: duplicate id {c.get('id')}")
        ids.add(c.get("id"))
    if len(data) != total_communes:
        error(f"ecommerce count ({len(data)}) != commune count ({total_communes})")


def validate_unified(data, total_communes):
    if not isinstance(data, list):
        error("algeria.json: expected array at root")
        return
    if len(data) != 69:
        error(f"algeria.json: expected 69 wilayas, got {len(data)}")
    total = sum(len(w.get("communes", [])) for w in data)
    if total != total_communes:
        error(f"algeria.json: has {total} nested communes, expected {total_communes}")


def validate_geojson(path, expected_type="FeatureCollection"):
    data = validate_json(path)
    if not data:
        return 0
    if data.get("type") != expected_type:
        error(f"{path.name}: type should be '{expected_type}', got '{data.get('type')}'")
    features = data.get("features", [])
    for i, f in enumerate(features):
        if f.get("type") != "Feature":
            error(f"{path.name}[{i}]: feature type invalid")
            break
        geom = f.get("geometry", {})
        if geom.get("type") != "Point":
            error(f"{path.name}[{i}]: expected Point geometry")
            break
        coords = geom.get("coordinates", [])
        if len(coords) != 2:
            error(f"{path.name}[{i}]: coordinates must have 2 values")
            break
    return len(features)


def main():
    print("Validating dataset...\n")

    # Wilayas
    print("[wilayas.json]")
    wilayas = validate_json(ROOT / "wilayas.json")
    wilaya_codes = set()
    if wilayas:
        wilaya_codes = validate_wilayas(wilayas)
        print(f"  OK: {len(wilayas)} wilayas")

    # Communes
    total_communes = 0
    for fname in ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"]:
        print(f"[{fname}]")
        data = validate_json(ROOT / fname)
        if data:
            n = validate_communes(data, fname)
            total_communes += n
            print(f"  OK: {n} communes")

    # Dairas
    print("[dairas.json]")
    dairas = validate_json(ROOT / "dairas.json")
    if dairas:
        validate_dairas(dairas, wilaya_codes)
        print(f"  OK: {len(dairas)} dairas")

    # E-commerce
    print("[ecommerce/communes.json]")
    ecomm = validate_json(ROOT / "ecommerce" / "communes.json")
    if ecomm:
        validate_ecommerce(ecomm, total_communes)
        print(f"  OK: {len(ecomm)} entries")

    # Unified
    print("[algeria.json]")
    unified = validate_json(ROOT / "algeria.json")
    if unified:
        validate_unified(unified, total_communes)
        print(f"  OK: {len(unified)} wilayas with nested communes")

    # GeoJSON
    print("[geojson/wilayas.geojson]")
    n = validate_geojson(ROOT / "geojson" / "wilayas.geojson")
    if n:
        print(f"  OK: {n} features")

    print("[geojson/communes.geojson]")
    n = validate_geojson(ROOT / "geojson" / "communes.geojson")
    if n:
        print(f"  OK: {n} features")

    # Summary
    print(f"\n{'='*40}")
    if errors:
        print(f"FAILED: {len(errors)} error(s)")
        sys.exit(1)
    else:
        print(f"PASSED: {len(wilayas or [])} wilayas, {total_communes} communes, {len(dairas or [])} dairas")
        sys.exit(0)


if __name__ == "__main__":
    main()
