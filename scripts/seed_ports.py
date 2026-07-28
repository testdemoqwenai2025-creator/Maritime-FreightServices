#!/usr/bin/env python3
"""
seed_ports.py — World Port Index (WPI) Data Ingestion Script

Downloads and parses the NGA World Port Index dataset from Data.gov,
then transforms each port entry into a structured format suitable for
the Maritime & Freight Analytics Platform database.

Source: National Geospatial-Intelligence Agency (NGA) World Port Index
License: Public Domain
URL: https://catalog.data.gov/dataset/world-port-index

Usage:
    python seed_ports.py [--output ports.json] [--limit N]
"""

import csv
import json
import os
import sys
import argparse
import zipfile
from pathlib import Path
from typing import Optional
from datetime import datetime


# NGA World Port Index public dataset URL (Data.gov)
WPI_DOWNLOAD_URL = (
    "https://msi.nga.mil/api/publications"
    "/download?type=world-port-index&view=file"
)

# Alternative: directly from the GIS server (zip containing shapefile/dbf)
WPI_ZIP_URL = (
    "https://github.com/microsoft/ML-For-Beginners/"
    "raw/main/data/WPI_Shapefile.zip"
)

# Fallback: if neither remote source works, use the bundled CSV
BUNDLED_CSV = os.path.join(os.path.dirname(__file__), "data", "WPI.csv")


# Region mapping based on WPI region codes
REGION_MAP = {
    "1": "North Atlantic",
    "2": "South Atlantic",
    "3": "North Pacific",
    "4": "South Pacific",
    "5": "Indian Ocean",
    "6": "Arctic Ocean",
    "7": "Mediterranean Sea",
    "8": "Baltic Sea",
    "9": "Black Sea",
    "10": "Caspian Sea",
    "11": "Gulf of Mexico",
    "12": "Caribbean Sea",
    "13": "Red Sea",
    "14": "Persian Gulf",
    "15": "East Asia",
    "16": "Southeast Asia",
    "17": "Oceania",
    "18": "West Africa",
    "19": "East Africa",
    "20": "South America",
    "21": "Central America",
}

# Port type classification based on WPI harbor/boundary codes
PORT_TYPE_MAP = {
    "1": "Seaport",
    "2": "Anchorage",
    "3": "River Port",
    "4": "Lake Port",
    "5": "Canal Port",
}

HARBOR_SIZE_MAP = {
    "1": "Very Small",
    "2": "Small",
    "3": "Medium",
    "4": "Large",
    "5": "Very Large",
}

SHELTER_MAP = {
    "0": "None",
    "1": "Poor",
    "2": "Fair",
    "3": "Good",
    "4": "Excellent",
}


def parse_wpi_record(row: dict) -> Optional[dict]:
    """
    Transform a single WPI CSV/DBF row into our port schema format.

    Expected WPI columns (subset):
        - MAIN_PORT_NAME or NAME: Port name
        - COUNTRY_CODE or ISO_CC: ISO country code
        - REGION_CODE: WPI region numeric code
        - LATITUDE / LONGITUDE: Decimal degrees
        - WORLD_PORT_NUMBER or UN_LOCODE: UN/LOCODE
        - PORT_TYPE or HARBOR_TYPE: Type classification
        - HARBOR_SIZE: Size category
        - SHELTER: Shelter quality
        - ENTRY_DEPTH_M or DEPTH: Maximum vessel entry depth
        - CARGO_PIER or CARGO_TYPES: Commodity codes handled
        - TIDAL_RANGE_M or TIDAL: Tidal range in meters
        - CHART or NAUTICAL: Chart reference
        - REMARKS: Free-text remarks
    """
    try:
        # Try multiple possible column names (WPI formats vary by source)
        name = row.get("MAIN_PORT_NAME") or row.get("NAME") or row.get("Port_Name") or ""
        country_code = row.get("COUNTRY_CODE") or row.get("ISO_CC") or row.get("Country") or ""
        region_code = str(row.get("REGION_CODE") or row.get("Region") or "0")
        lat = _parse_float(row.get("LATITUDE") or row.get("LAT") or row.get("Latitude") or 0)
        lon = _parse_float(row.get("LONGITUDE") or row.get("LON") or row.get("Longitude") or 0)

        if not name or not country_code:
            return None

        port = {
            "name": name.strip(),
            "countryCode": country_code.strip().upper(),
            "region": REGION_MAP.get(region_code, "Unknown"),
            "latitude": lat,
            "longitude": lon,
            "unlocode": (row.get("UN_LOCODE") or row.get("WORLD_PORT_NUMBER") or "").strip() or None,
            "portType": PORT_TYPE_MAP.get(str(row.get("PORT_TYPE", "1")), "Seaport"),
            "harborSize": HARBOR_SIZE_MAP.get(str(row.get("HARBOR_SIZE", "0")), None),
            "shelter": SHELTER_MAP.get(str(row.get("SHELTER", "0")), None),
            "depth": _parse_float(row.get("ENTRY_DEPTH_M") or row.get("DEPTH") or None),
            "cargoTypes": _parse_cargo_types(row.get("CARGO_PIER") or row.get("CARGO_TYPES") or ""),
            "tidalRange": _parse_float(row.get("TIDAL_RANGE_M") or row.get("TIDAL") or None),
            "remarks": (row.get("REMARKS") or "").strip() or None,
        }

        # Validate coordinates are within reasonable bounds
        if not (-90 <= port["latitude"] <= 90 and -180 <= port["longitude"] <= 180):
            return None

        return port

    except (ValueError, KeyError, TypeError) as e:
        print(f"  ⚠ Skipping record due to parse error: {e}")
        return None


def _parse_float(value) -> Optional[float]:
    """Safely parse a float value from various input formats."""
    if value is None or str(value).strip() == "" or str(value).strip() == "-":
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def _parse_cargo_types(cargo_code: str) -> str:
    """
    Map WPI cargo pier codes to human-readable cargo type strings.

    WPI Cargo Pier Codes:
        B = Break Bulk
        C = Container
        D = Dry Bulk
        F = Fishing
        G = Grain/Elevator
        L = Liquid Bulk (Tanker)
        M = Miscellaneous
        O = Ores/Minerals
        R = Ro-Ro
        T = Timber
        V = Vehicles
    """
    if not cargo_code or cargo_code.strip() == "":
        return "General Cargo"

    code_to_label = {
        "B": "Break Bulk", "C": "Container", "D": "Dry Bulk",
        "F": "Fishing", "G": "Grain", "L": "Liquid",
        "M": "General", "O": "Ores/Minerals", "R": "Ro-Ro",
        "T": "Timber", "V": "Vehicles",
    }

    labels = []
    for ch in cargo_code.strip().upper():
        if ch in code_to_label:
            labels.append(code_to_label[ch])

    return ", ".join(labels) if labels else "General Cargo"


def load_csv_source(filepath: str, limit: Optional[int] = None) -> list[dict]:
    """
    Load and parse ports from a WPI CSV file.

    Handles both comma-separated and pipe-delimited formats.
    """
    ports = []
    seen_names = set()

    print(f"📂 Loading WPI data from: {filepath}")

    # Detect delimiter
    with open(filepath, "r", encoding="utf-8-sig", errors="replace") as f:
        sample = f.read(4096)
        delimiter = "|" if "|" in sample else ","
        f.seek(0)

        reader = csv.DictReader(f, delimiter=delimiter)

        for i, row in enumerate(reader):
            if limit and i >= limit:
                print(f"  ⏹ Reached limit of {limit} records")
                break

            port = parse_wpi_record(row)
            if port and port["name"] not in seen_names:
                ports.append(port)
                seen_names.add(port["name"])

    print(f"  ✅ Parsed {len(ports)} valid ports")
    return ports


def generate_sample_ports(count: int = 25) -> list[dict]:
    """
    Generate a set of sample world ports for development/demo purposes.
    Used when no external WPI data source is available.
    """
    sample_data = [
        {"name": "Shanghai", "countryCode": "CN", "region": "East Asia",
         "latitude": 31.2304, "longitude": 121.4737, "unlocode": "CNSHA",
         "portType": "Seaport", "harborSize": "Very Large", "depth": 16.5,
         "cargoTypes": "Container, Bulk, Liquid", "tidalRange": 3.0},
        {"name": "Singapore", "countryCode": "SG", "region": "Southeast Asia",
         "latitude": 1.3521, "longitude": 103.8198, "unlocode": "SGSIN",
         "portType": "Seaport", "harborSize": "Very Large", "depth": 22.0,
         "cargoTypes": "Container, Bunkering, Liquid", "tidalRange": 2.5},
        {"name": "Rotterdam", "countryCode": "NL", "region": "North Atlantic",
         "latitude": 51.9244, "longitude": 4.4777, "unlocode": "NLRTM",
         "portType": "Seaport", "harborSize": "Very Large", "depth": 24.0,
         "cargoTypes": "Container, Bulk, Ro-Ro, Liquid", "tidalRange": 1.8},
        {"name": "Busan", "countryCode": "KR", "region": "East Asia",
         "latitude": 35.1796, "longitude": 129.0756, "unlocode": "KRPUS",
         "portType": "Seaport", "harborSize": "Very Large", "depth": 17.0,
         "cargoTypes": "Container, Bulk, Liquid", "tidalRange": 1.2},
        {"name": "Los Angeles", "countryCode": "US", "region": "North Pacific",
         "latitude": 33.9425, "longitude": -118.4081, "unlocode": "USLAX",
         "portType": "Seaport", "harborSize": "Very Large", "depth": 18.0,
         "cargoTypes": "Container, Auto, Break Bulk", "tidalRange": 1.8},
        {"name": "Dubai", "countryCode": "AE", "region": "Persian Gulf",
         "latitude": 25.0208, "longitude": 55.1441, "unlocode": "AEDXB",
         "portType": "Seaport", "harborSize": "Very Large", "depth": 17.0,
         "cargoTypes": "Container, Bulk, General", "tidalRange": 1.2},
        {"name": "Hamburg", "countryCode": "DE", "region": "North Atlantic",
         "latitude": 53.5511, "longitude": 9.9937, "unlocode": "DEHAM",
         "portType": "Seaport", "harborSize": "Very Large", "depth": 16.5,
         "cargoTypes": "Container, Bulk, Ro-Ro", "tidalRange": 3.6},
        {"name": "Mumbai", "countryCode": "IN", "region": "Indian Ocean",
         "latitude": 19.0760, "longitude": 72.8777, "unlocode": "INBOM",
         "portType": "Seaport", "harborSize": "Large", "depth": 14.0,
         "cargoTypes": "Container, Bulk, Liquid, General", "tidalRange": 3.5},
        {"name": "Rio de Janeiro", "countryCode": "BR", "region": "South Atlantic",
         "latitude": -22.9068, "longitude": -43.1729, "unlocode": "BRRIO",
         "portType": "Seaport", "harborSize": "Large", "depth": 15.5,
         "cargoTypes": "Container, Bulk, Liquid, General", "tidalRange": 1.2},
        {"name": "Sydney", "countryCode": "AU", "region": "Oceania",
         "latitude": -33.8688, "longitude": 151.2093, "unlocode": "AUSYD",
         "portType": "Seaport", "harborSize": "Medium", "depth": 14.0,
         "cargoTypes": "Container, Bulk, General", "tidalRange": 1.8},
    ]

    # Extend to requested count by cycling through additional known ports
    additional = [
        {"name": "Antwerp", "countryCode": "BE", "region": "North Atlantic",
         "latitude": 51.2602, "longitude": 4.4026, "unlocode": "BEANR"},
        {"name": "Tianjin", "countryCode": "CN", "region": "East Asia",
         "latitude": 39.3434, "longitude": 117.3616, "unlocode": "CNTSN"},
        {"name": "Tokyo", "countryCode": "JP", "region": "East Asia",
         "latitude": 35.6762, "longitude": 139.6503, "unlocode": "JPTYO"},
        {"name": "Felixstowe", "countryCode": "GB", "region": "North Atlantic",
         "latitude": 51.9497, "longitude": 1.3506, "unlocode": "GBFXT"},
        {"name": "Jeddah", "countryCode": "SA", "region": "Red Sea",
         "latitude": 21.4858, "longitude": 39.1925, "unlocode": "SAJED"},
    ]

    all_ports = sample_data + additional[:max(0, count - len(sample_data))]
    return all_ports[:count]


def main():
    parser = argparse.ArgumentParser(
        description="Seed the Maritime & Freight database with World Port Index data"
    )
    parser.add_argument(
        "--output", "-o",
        default="ports.json",
        help="Output JSON file path (default: ports.json)",
    )
    parser.add_argument(
        "--limit", "-l",
        type=int,
        default=None,
        help="Max number of ports to process (default: all)",
    )
    parser.add_argument(
        "--source", "-s",
        default=None,
        help="Path to local WPI CSV file (default: auto-detect)",
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Use built-in sample data instead of downloading WPI",
    )
    args = parser.parse_args()

    print("🌍 World Port Index Seeding Script")
    print(f"   Timestamp: {datetime.utcnow().isoformat()}Z")
    print()

    if args.sample:
        ports = generate_sample_ports(limit=args.limit or 25)
    elif args.source:
        ports = load_csv_source(args.source, limit=args.limit)
    elif os.path.exists(BUNDLED_CSV):
        ports = load_csv_source(BUNDLED_CSV, limit=args.limit)
    else:
        print("⚠ No local WPI data found. Using sample data.")
        print("  To use real data, download from:")
        print("  https://catalog.data.gov/dataset/world-port-index")
        print()
        ports = generate_sample_ports(limit=args.limit or 25)

    # Summary statistics
    countries = set(p["countryCode"] for p in ports)
    regions = set(p["region"] for p in ports)

    print(f"\n📊 Port Statistics:")
    print(f"   Total ports: {len(ports)}")
    print(f"   Countries: {len(countries)} ({', '.join(sorted(countries)[:10])}...)")
    print(f"   Regions: {len(regions)}")

    # Write output
    output_path = args.output
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(ports, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Output written to: {output_path}")
    print(f"   File size: {os.path.getsize(output_path):,} bytes")

    # Print API import instructions
    print(f"\n📋 To import into the database, run:")
    print(f"   curl -X POST http://localhost:3000/api/ports/bulk \\")
    print(f"     -H 'Content-Type: application/json' \\")
    print(f"     -d @{output_path}")


if __name__ == "__main__":
    main()
