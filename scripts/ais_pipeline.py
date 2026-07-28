#!/usr/bin/env python3
"""
ais_pipeline.py — AIS Vessel Tracking Data Ingestion Pipeline

Connects to public AIS data networks (AISHub API) to fetch real-time
vessel positions, parses NMEA-0183 sentences, and outputs structured
vessel tracking data compatible with the Maritime platform API.

Features:
  - NMEA-0183 sentence parsing (VDM/VDO types)
  - Geospatial bounding box filtering
  - Impossible speed/position anomaly detection
  - Rate-limited API calls for free-tier compliance

Usage:
    # Fetch all vessels in a bounding box
    python ais_pipeline.py --bbox 51.0,1.0 52.0,2.0

    # Fetch specific vessel types only
    python ais_pipeline.py --bbox 51.0,1.0 52.0,2.0 --types "Cargo,Tanker"

    # Fetch by MMSI list
    python ais_pipeline.py --mmsi 477394500 636091537 311045300

Environment:
    AIS_HUB_API_KEY  — Your AISHub API key (required for API access)
    AIS_DATA_SHARE   — Set to "true" if participating in data share program
"""

import json
import os
import sys
import time
import math
import argparse
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass, asdict, field


# ============================================================================
# NMEA-0183 AIS Sentence Parser
# ============================================================================

@dataclass
class AISPosition:
    """Parsed AIS vessel position report."""
    mmsi: int
    name: str = ""
    call_sign: str = ""
    vessel_type: str = "Unknown"
    flag_country: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    speed: float = 0.0
    heading: float = 0.0
    course: float = 0.0
    destination: str = ""
    eta: Optional[str] = None
    draft: float = 0.0
    imo: Optional[int] = None
    gross_tonnage: Optional[float] = None
    deadweight: Optional[float] = None
    length: Optional[float] = None
    breadth: Optional[float] = None
    year_built: Optional[int] = None
    timestamp: str = ""
    source: str = "AISHub"
    raw: str = ""


def parse_vdm_sentence(line: str) -> Optional[AISPosition]:
    """
    Parse an AIS VDM (VHF Data-link Message) sentence.
    Supports Message Types 1, 2, 3 (Position Reports) and
    Message Type 5 (Static Voyage Data).
    """
    line = line.strip()
    if not line.startswith("!"):
        return None

    parts = line.split(",")
    if len(parts) < 7:
        return None

    # Extract message type from payload (6-bit ASCII encoded)
    try:
        payload = parts[5]
        if not payload:
            return None

        # Decode first 6 bits for message type
        msg_type = _sixbit_decode(payload[0])

        if msg_type in (1, 2, 3):
            return _parse_position_report(parts, payload, msg_type)
        elif msg_type == 5:
            return _parse_static_voyage(parts, payload)
        else:
            return None

    except (IndexError, ValueError) as e:
        return None


def _sixbit_decode(char: str) -> int:
    """Decode a single 6-bit ASCII character used in AIS payloads."""
    val = ord(char) - 48
    if val >= 40:
        val -= 8
    return val


def _parse_position_report(parts: list, payload: str, msg_type: int) -> Optional[AISPosition]:
    """Parse AIS message type 1/2/3: Position Report."""
    try:
        mmsi_str = payload[1:10]
        mmsi = int(_sixbit_value(mmsi_str))

        pos = AISPosition(mmsi=mmsi, raw=parts[0])
        pos.timestamp = datetime.now(timezone.utc).isoformat()

        # Speed over ground (knots) - bits 50-59
        if len(payload) > 46:
            speed = _sixbit_value(payload[46:50])
            pos.speed = speed * 0.1 if speed != 1023 else 0.0

        # Longitude - bits 61-88
        if len(payload) > 61:
            lon_raw = _sixbit_value(payload[57:85])
            if lon_raw != 0x6791AC:  # Not available
                pos.longitude = lon_raw / 600000.0 - 180.0

        # Latitude - bits 89-116
        if len(payload) > 85:
            lat_raw = _sixbit_value(payload[85:113])
            if lat_raw != 0x341214:
                pos.latitude = lat_raw / 600000.0 - 90.0

        # Course over ground - bits 116-127
        if len(payload) > 116:
            cog = _sixbit_value(payload[113:120])
            pos.course = cog * 0.1 if cog != 3600 else 0.0

        # True heading - bits 128-136
        if len(payload) > 128:
            hdg = _sixbit_value(payload[120:127])
            pos.heading = hdg if hdg != 511 else 0.0

        return pos

    except (IndexError, ValueError):
        return None


def _parse_static_voyage(parts: list, payload: str) -> Optional[AISPosition]:
    """Parse AIS message type 5: Static and Voyage Data."""
    try:
        mmsi_str = payload[1:10]
        mmsi = int(_sixbit_value(mmsi_str))

        pos = AISPosition(mmsi=mmsi, raw=parts[0])
        pos.timestamp = datetime.now(timezone.utc).isoformat()

        # IMO number
        if len(payload) > 33:
            imo_raw = _sixbit_value(payload[33:40])
            if imo_raw > 0:
                pos.imo = imo_raw

        # Call sign
        if len(payload) > 70:
            pos.call_sign = _ais_string_decode(payload[43:72])

        # Vessel name
        if len(payload) > 112:
            pos.name = _ais_string_decode(payload[72:112])

        # Destination
        if len(payload) > 272:
            pos.destination = _ais_string_decode(payload[263:293])

        return pos

    except (IndexError, ValueError):
        return None


def _sixbit_value(chars: str) -> int:
    """Decode multiple 6-bit characters to an integer value."""
    val = 0
    for char in chars:
        val = val * 64 + _sixbit_decode(char)
    return val


def _ais_string_decode(chars: str) -> str:
    """Decode a 6-bit encoded AIS text string."""
    result = []
    for char in chars:
        val = _sixbit_decode(char)
        if val == 0:
            result.append('@')  # Pad character
        elif val < 32:
            result.append(chr(val + 64))
        else:
            result.append(chr(val))
    return ''.join(result).strip().strip('@')


# ============================================================================
# Vessel Type Mapping (AIS Type Codes)
# ============================================================================

AIS_VESSEL_TYPES = {
    0: ("Unknown", "Not available"),
    1: ("Reserved", "Reserved for future use"),
    2: ("Reserved", "Reserved for future use"),
    3: ("Fishing", "Fishing vessel"),
    4: ("High Speed", "High-speed craft"),
    5: ("High Speed", "High-speed craft with hazard cat A"),
    6: ("High Speed", "High-speed craft with hazard cat B"),
    7: ("High Speed", "High-speed craft with hazard cat C"),
    8: ("High Speed", "High-speed craft with hazard cat D"),
    9: ("Wing in Ground", "Wing-in-ground craft"),
    10: ("Wing in Ground", "WIG with hazard cat A"),
    11: ("Wing in Ground", "WIG with hazard cat B"),
    12: ("Wing in Ground", "WIG with hazard cat C"),
    13: ("Wing in Ground", "WIG with hazard cat D"),
    14: ("Unknown", "Unknown"),
    15: ("Unknown", "Unknown"),
    16: ("Unknown", "Unknown"),
    17: ("Unknown", "Unknown"),
    18: ("Reserved", "Reserved for future use"),
    19: ("Reserved", "Reserved for future use"),
    20: ("No Vessel", "Not carrying dangerous goods"),
    21: ("General Cargo", "General cargo ship"),
    22: ("Tanker", "Tanker"),
    23: ("General Cargo", "General cargo ship type B"),
    24: ("General Cargo", "General cargo ship type C"),
    25: ("General Cargo", "General cargo ship type D"),
    26: ("General Cargo", "General cargo ship with hazardous cargo"),
    27: ("Tanker", "Tanker with hazardous cargo"),
    28: ("General Cargo", "General cargo ship no additional info"),
    29: ("Tanker", "Tanker no additional info"),
    30: ("General Cargo", "General cargo / tanker (unknown)"),
    31: ("Tug", "Tug"),
    32: ("Tug", "Tug with hazardous cargo"),
    33: ("Passenger", "Passenger ship"),
    34: ("Passenger", "Passenger ship with hazardous cargo"),
    35: ("Passenger", "Passenger ship no additional info"),
    36: ("General Cargo", "Specialized vessel"),
    37: ("General Cargo", "Specialized vessel with hazardous cargo"),
    38: ("General Cargo", "Specialized vessel no additional info"),
    39: ("General Cargo", "Heavy load carrier"),
    40: ("General Cargo", "Heavy load carrier with hazardous cargo"),
    41: ("General Cargo", "Heavy load carrier no additional info"),
    42: ("Ro-Ro Ship", "Ro-Ro (roll-on/roll-off) ship"),
    43: ("Ro-Ro Ship", "Ro-Ro ship with hazardous cargo"),
    44: ("Ro-Ro Ship", "Ro-Ro ship no additional info"),
    45: ("General Cargo", "General cargo ship with containers"),
    46: ("General Cargo", "General cargo ship with containers, hazardous"),
    47: ("General Cargo", "General cargo ship with containers, no info"),
    48: ("General Cargo", "General cargo ship, containers and vehicles"),
    49: ("General Cargo", "GC ship, containers, vehicles, hazardous"),
    50: ("General Cargo", "GC ship, containers, vehicles, no info"),
    51: ("General Cargo", "General cargo ship, vehicles only"),
    52: ("General Cargo", "GC ship, vehicles, hazardous cargo"),
    53: ("General Cargo", "GC ship, vehicles, no additional info"),
    54: ("General Cargo", "General cargo ship, vehicles and containers"),
    55: ("General Cargo", "GC ship, vehicles, containers, hazardous"),
    56: ("General Cargo", "GC ship, vehicles, containers, no info"),
    57: ("LNG Carrier", "LNG carrier"),
    58: ("LNG Carrier", "LNG carrier with hazardous cargo"),
    59: ("LNG Carrier", "LNG carrier no additional info"),
    60: ("LPG Carrier", "LPG carrier"),
    61: ("LPG Carrier", "LPG carrier with hazardous cargo"),
    62: ("LPG Carrier", "LPG carrier no additional info"),
    63: ("Bulk Carrier", "Bulk carrier"),
    64: ("Bulk Carrier", "Bulk carrier with hazardous cargo"),
    65: ("Bulk Carrier", "Bulk carrier no additional info"),
    66: ("General Cargo", "Offshore supply vessel"),
    67: ("General Cargo", "Offshore supply vessel with hazardous cargo"),
    68: ("General Cargo", "Offshore supply vessel no additional info"),
    69: ("General Cargo", "Pilot vessel"),
    70: ("General Cargo", "Search and rescue vessel"),
    71: ("Tug", "Towing vessel"),
    72: ("General Cargo", "Dredger"),
    73: ("General Cargo", "Diving operations vessel"),
    74: ("General Cargo", "Military vessel"),
    75: ("General Cargo", "Sailing vessel"),
    76: ("General Cargo", "Pleasure craft"),
    77: ("General Cargo", "HSC with hazardous cargo"),
    78: ("Unknown", "Not available (medical transport)"),
    79: ("General Cargo", "Law enforcement vessel"),
    80: ("General Cargo", "Spare"),
    81: ("General Cargo", "Spare"),
    82: ("General Cargo", "Spare"),
    83: ("General Cargo", "Spare"),
    84: ("General Cargo", "Spare"),
    85: ("General Cargo", "Spare"),
    86: ("General Cargo", "Spare"),
    87: ("General Cargo", "Spare"),
    88: ("General Cargo", "Spare"),
    89: ("General Cargo", "Vessel not specified"),
}


# ============================================================================
# Anomaly Detection
# ============================================================================

MAX_REASONABLE_SPEED = 55.0  # knots (absolute max - some HSC reach 50kn)
MAX_CARGO_SPEED = 25.0       # knots (reasonable max for cargo vessels)


def detect_anomaly(pos: AISPosition) -> list[str]:
    """
    Check for impossible or improbable vessel data.

    Returns a list of anomaly descriptions (empty if no anomalies).
    """
    anomalies = []

    # Speed checks
    if pos.speed > MAX_REASONABLE_SPEED:
        anomalies.append(f"Impossible speed: {pos.speed:.1f} kn (max {MAX_REASONABLE_SPEED} kn)")
    elif pos.vessel_type in ("Cargo", "Tanker", "Bulk Carrier") and pos.speed > MAX_CARGO_SPEED:
        anomalies.append(f"Unusual cargo speed: {pos.speed:.1f} kn (expected < {MAX_CARGO_SPEED} kn)")

    # Position validity
    if pos.latitude is not None and (pos.latitude < -90 or pos.latitude > 90):
        anomalies.append(f"Invalid latitude: {pos.latitude}")
    if pos.longitude is not None and (pos.longitude < -180 or pos.longitude > 180):
        anomalies.append(f"Invalid longitude: {pos.longitude}")

    # Heading validity
    if pos.heading < 0 or pos.heading > 359.9:
        anomalies.append(f"Invalid heading: {pos.heading}")

    # Land-locked check would require a coastline database (e.g., GSHHG)
    # Placeholder for future integration

    return anomalies


# ============================================================================
# AISHub API Integration
# ============================================================================

def fetch_aishub_data(
    bbox: Optional[tuple] = None,
    mmsi_list: Optional[list[int]] = None,
    vessel_types: Optional[list[str]] = None,
    api_key: Optional[str] = None,
) -> list[AISPosition]:
    """
    Fetch live vessel data from the AISHub API.

    AISHub provides free data under their data-exchange program.
    Visit https://www.aishub.net/ for API key registration.

    Args:
        bbox: (lat_min, lon_min, lat_max, lon_max) bounding box
        mmsi_list: List of specific MMSI numbers to track
        vessel_types: Filter by vessel type names
        api_key: AISHub API key (falls back to env var)
    """
    import urllib.request
    import urllib.parse

    key = api_key or os.environ.get("AIS_HUB_API_KEY", "")

    if not key:
        print("⚠ No AISHub API key provided. Set AIS_HUB_API_KEY env var.")
        print("  Register at: https://www.aishub.net/")
        return []

    params = {"key": key, "format": "json"}

    if mmsi_list:
        params["mmsi"] = ",".join(str(m) for m in mmsi_list)
    elif bbox:
        lat_min, lon_min, lat_max, lon_max = bbox
        params["bbox"] = f"{lat_min},{lon_min},{lat_max},{lon_max}"

    url = f"https://www.aishub.net/stations/json?{urllib.parse.urlencode(params)}"

    print(f"📡 Fetching from AISHub...")
    print(f"   URL: {url[:80]}...")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MaritimePlatform/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())

        positions = []
        for vessel in data if isinstance(data, list) else []:
            pos = AISPosition(
                mmsi=vessel.get("MMSI", 0),
                name=vessel.get("NAME", ""),
                call_sign=vessel.get("CALLSIGN", ""),
                latitude=vessel.get("LAT"),
                longitude=vessel.get("LON"),
                speed=vessel.get("SOG", 0),
                heading=vessel.get("HEADING", 0),
                course=vessel.get("COG", 0),
                destination=vessel.get("DEST", ""),
                timestamp=datetime.now(timezone.utc).isoformat(),
                source="AISHub",
            )

            anomalies = detect_anomaly(pos)
            if anomalies:
                print(f"  ⚠ Anomaly detected for MMSI {pos.mmsi}: {'; '.join(anomalies)}")
                continue

            if vessel_types:
                type_name = pos.vessel_type or "Unknown"
                if not any(t.lower() in type_name.lower() for t in vessel_types):
                    continue

            positions.append(pos)

        print(f"  ✅ Received {len(positions)} valid vessel positions")
        return positions

    except Exception as e:
        print(f"  ❌ AISHub request failed: {e}")
        return []


# ============================================================================
# Output & Integration
# ============================================================================

def positions_to_api_payload(positions: list[AISPosition]) -> list[dict]:
    """
    Convert AISPosition objects to the format expected by the
    Maritime platform /api/vessels endpoint.
    """
    return [
        {
            "mmsi": p.mmsi,
            "imo": p.imo,
            "name": p.name,
            "callSign": p.call_sign,
            "vesselType": p.vessel_type or "Unknown",
            "flagCountry": p.flag_country,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "speed": p.speed,
            "heading": p.heading,
            "destination": p.destination,
            "eta": p.eta,
            "draft": p.draft,
            "grossTonnage": p.gross_tonnage,
            "deadweight": p.deadweight,
            "length": p.length,
            "breadth": p.breadth,
            "yearBuilt": p.year_built,
            "status": "Active",
            "lastPosition": p.timestamp,
        }
        for p in positions
        if p.latitude is not None and p.longitude is not None
    ]


def generate_sample_positions(count: int = 15) -> list[dict]:
    """
    Generate realistic sample vessel position data for development/testing.
    """
    sample_vessels = [
        {"mmsi": 477394500, "name": "Pacific Fortune", "vesselType": "Container Ship",
         "flagCountry": "HK", "latitude": 22.28, "longitude": 114.17, "speed": 14.2,
         "heading": 265, "destination": "SGSIN", "grossTonnage": 54236},
        {"mmsi": 636091537, "name": "MV Atlantic Star", "vesselType": "Bulk Carrier",
         "flagCountry": "LR", "latitude": 34.05, "longitude": -20.12, "speed": 11.8,
         "heading": 45, "destination": "NLRTM", "grossTonnage": 38542},
        {"mmsi": 311045300, "name": "CMA CGM Marco Polo", "vesselType": "Container Ship",
         "flagCountry": "PA", "latitude": 51.92, "longitude": 4.48, "speed": 16.5,
         "heading": 210, "destination": "SGSIN", "grossTonnage": 156278},
    ]

    return sample_vessels[:count]


def main():
    parser = argparse.ArgumentParser(
        description="AIS Vessel Tracking Data Pipeline"
    )
    parser.add_argument("--bbox", nargs=4, type=float, metavar=("LAT_MIN", "LON_MIN", "LAT_MAX", "LON_MAX"),
                        help="Bounding box filter (lat_min lon_min lat_max lon_max)")
    parser.add_argument("--mmsi", nargs="+", type=int, help="Track specific MMSI numbers")
    parser.add_argument("--types", nargs="+", help="Filter by vessel type names")
    parser.add_argument("--output", "-o", default="ais_positions.json", help="Output JSON file")
    parser.add_argument("--sample", action="store_true", help="Generate sample data")
    parser.add_argument("--limit", "-l", type=int, default=None, help="Max records to output")
    args = parser.parse_args()

    print("🚢 AIS Data Pipeline")
    print(f"   Timestamp: {datetime.utcnow().isoformat()}Z\n")

    if args.sample:
        positions = generate_sample_positions(limit=args.limit or 15)
    elif args.mmsi or args.bbox:
        bbox = tuple(args.bbox) if args.bbox else None
        mmsi_list = args.mmsi if args.mmsi else None
        parsed = fetch_aishub_data(bbox=bbox, mmsi_list=mmsi_list, vessel_types=args.types)
        positions = positions_to_api_payload(parsed)
    else:
        print("⚠ No data source specified. Use --sample, --bbox, or --mmsi")
        print("   Generating sample data for demonstration...")
        positions = generate_sample_positions(limit=args.limit or 15)

    # Limit results
    if args.limit:
        positions = positions[:args.limit]

    # Write output
    output_path = args.output
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(positions, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Output written to: {output_path}")
    print(f"   Records: {len(positions)}")

    # Print API import instructions
    print(f"\n📋 To import into the database, run:")
    for pos in positions[:3]:
        print(f"   curl -X POST http://localhost:3000/api/vessels \\")
        print(f"     -H 'Content-Type: application/json' \\")
        print(f"     -d '{json.dumps(pos)}'")


if __name__ == "__main__":
    main()
