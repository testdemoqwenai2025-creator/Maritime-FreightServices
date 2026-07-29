#!/usr/bin/env python3
"""
un_comtrade_pipeline.py — UN Comtrade Trade Data Fetcher

Queries the UN Comtrade Plus API for seaborne freight trade data,
mapping commodity flows to port pairs and HS code classifications.

Free Tier Limits:
  - 500 API queries per day
  - Max 100,000 records per query
  - Registration required at https://comtradeplus.un.org/

Usage:
    # Fetch all sea trade for a reporter country
    python un_comtrade_pipeline.py --reporter CN --year 2025

    # Fetch specific commodity code between partners
    python un_comtrade_pipeline.py --reporter CN --partner US --hs 8471 --year 2025

    # Fetch with quantity and weight
    python un_comtrade_pipeline.py --reporter DE --partner CN --year 2025 --with-weight

Environment:
    UN_COMTRADE_TOKEN — Your UN Comtrade API token (required)
    UN_COMTRADE_PROXY — Optional proxy URL
"""

import json
import os
import sys
import time
import argparse
from datetime import datetime, timezone
from typing import Optional
from dataclasses import dataclass, asdict


# ============================================================================
# HS Code Reference for Maritime Cargo
# ============================================================================

MARITIME_HS_CODES = {
    "2709": ("Crude Petroleum Oil", "Tanker"),
    "2710": ("Refined Petroleum Products", "Tanker"),
    "2711": ("Natural Gas", "LNG Carrier"),
    "2601": ("Iron Ore Concentrates", "Bulk Carrier"),
    "2602": ("Manganese Ore", "Bulk Carrier"),
    "7204": ("Iron/Steel Scrap", "Bulk Carrier"),
    "8703": ("Motor Vehicles", "Ro-Ro Ship"),
    "8471": ("Automatic Data Processing Machines", "Container Ship"),
    "8542": ("Electronic Integrated Circuits", "Container Ship"),
    "3004": ("Medicaments", "Container Ship"),
    "9403": ("Furniture", "Container Ship"),
    "6203": ("Garments", "Container Ship"),
    "1001": ("Wheat", "Bulk Carrier"),
    "3824": ("Industrial Chemicals", "Container Ship"),
    "8412": ("Engines & Motors", "Container Ship"),
    "8708": ("Auto Parts", "Container Ship"),
    "7606": ("Aluminum Plates", "Container Ship"),
    "7207": ("Semi-finished Iron/Steel", "Bulk Carrier"),
    "4407": ("Sawn Wood", "General Cargo"),
    "0306": ("Crustaceans (Frozen Seafood)", "Reefer Container"),
}


@dataclass
class TradeRecord:
    """Structured UN Comtrade trade flow record."""
    reporter_code: str
    partner_code: str
    year: int
    trade_flow: str          # "Import" or "Export"
    commodity_code: str
    commodity_desc: str
    gross_weight_kg: Optional[float] = None
    trade_value_usd: Optional[float] = None
    quantity: Optional[float] = None
    origin_port: Optional[str] = None
    dest_port: Optional[str] = None
    transport_mode: str = "Sea"
    data_source: str = "UN Comtrade"
    fetched_at: str = ""

    def __post_init__(self):
        if not self.fetched_at:
            self.fetched_at = datetime.now(timezone.utc).isoformat()


# ============================================================================
# UN Comtrade API Client
# ============================================================================

COMTRADE_API_BASE = "https://comtradeplus.un.org/TradeFlow"
COMTRADE_QUERY_LIMIT = 100000  # Max records per call


def fetch_comtrade_data(
    reporter: str,
    year: int = 2025,
    partner: Optional[str] = None,
    hs_code: Optional[str] = None,
    with_weight: bool = True,
    token: Optional[str] = None,
) -> list[TradeRecord]:
    """
    Query the UN Comtrade Plus API for trade flow data.

    Args:
        reporter: Reporter country ISO code (e.g., 'CN', 'US', 'DE')
        year: Trade data year
        partner: Partner country code (optional, all partners if omitted)
        hs_code: HS commodity code filter (optional)
        with_weight: Include gross weight data if True
        token: API token (falls back to env var)
    """
    import urllib.request
    import urllib.parse

    api_token = token or os.environ.get("UN_COMTRADE_TOKEN", "")

    if not api_token:
        print("⚠ No UN Comtrade API token provided.")
        print("  Set UN_COMTRADE_TOKEN env var or register at:")
        print("  https://comtradeplus.un.org/TradeFlow")
        return _generate_sample_trade_data(reporter, year, partner, hs_code)

    # Build query parameters
    params = {
        "reporterCode": reporter,
        "year": str(year),
        "flow": "all",
        "partnerCode": partner or "all",
        "aggregateBy": "hsCode",
        "measurement": "tradeValue" + (",grossWeight" if with_weight else ""),
        "token": api_token,
    }

    if hs_code:
        params["hsCode"] = hs_code

    url = f"{COMTRADE_API_BASE}?{urllib.parse.urlencode(params)}"

    print(f"📊 Querying UN Comtrade API...")
    print(f"   Reporter: {reporter}, Year: {year}")
    if partner:
        print(f"   Partner: {partner}")
    if hs_code:
        print(f"   HS Code: {hs_code} ({MARITIME_HS_CODES.get(hs_code, ('Unknown', 'Unknown'))[0]})")
    print(f"   URL: {url[:100]}...")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MaritimePlatform/1.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode()
            data = json.loads(raw)

        records = []
        for item in data.get("data", []):
            hs = item.get("hsCode", "")
            hs_desc = item.get("hsCodeDescription") or MARITIME_HS_CODES.get(hs, ("", ""))[0]

            record = TradeRecord(
                reporter_code=reporter,
                partner_code=item.get("partnerCode", ""),
                year=year,
                trade_flow=item.get("flow", "Export"),
                commodity_code=hs,
                commodity_desc=hs_desc,
                trade_value_usd=item.get("tradeValue"),
                gross_weight_kg=item.get("grossWeight"),
                quantity=item.get("quantity"),
            )
            records.append(record)

        print(f"  ✅ Fetched {len(records)} trade records")
        return records

    except Exception as e:
        print(f"  ❌ UN Comtrade request failed: {e}")
        print("  Falling back to sample data...")
        return _generate_sample_trade_data(reporter, year, partner, hs_code)


def _generate_sample_trade_data(
    reporter: str = "CN",
    year: int = 2025,
    partner: Optional[str] = None,
    hs_code: Optional[str] = None,
) -> list[TradeRecord]:
    """Generate sample trade data when API is unavailable."""
    sample = [
        TradeRecord("CN", "US", 2025, "Export", "8542", "Electronic integrated circuits",
                    45800000, 1250000000, 12500000),
        TradeRecord("CN", "US", 2025, "Import", "2709", "Petroleum oils",
                    85000000, 420000000, 85000000),
        TradeRecord("CN", "SG", 2025, "Export", "8471", "Automatic data processing machines",
                    12200000, 890000000, 3200000),
        TradeRecord("DE", "CN", 2025, "Import", "8703", "Motor cars and vehicles",
                    23500000, 1850000000, 580000),
        TradeRecord("DE", "US", 2025, "Export", "8412", "Other engines and motors",
                    8900000, 920000000, 2100000),
        TradeRecord("JP", "CN", 2025, "Import", "3004", "Medicaments",
                    5600000, 680000000, 1800000),
        TradeRecord("JP", "US", 2025, "Export", "8703", "Motor cars",
                    62000000, 5200000000, 1500000),
        TradeRecord("KR", "CN", 2025, "Export", "8542", "Semiconductor devices",
                    18500000, 2100000000, 8500000),
        TradeRecord("AU", "CN", 2025, "Export", "2601", "Iron ores and concentrates",
                    850000000, 68000000000, 850000000),
        TradeRecord("US", "SA", 2025, "Import", "2709", "Crude petroleum oil",
                    180000000, 8900000000, 180000000),
    ]

    filtered = sample
    if reporter and reporter != "all":
        filtered = [r for r in filtered if r.reporter_code == reporter]
    if partner:
        filtered = [r for r in filtered if r.partner_code == partner]
    if hs_code:
        filtered = [r for r in filtered if r.commodity_code == hs_code]

    print(f"  📦 Generated {len(filtered)} sample trade records")
    return filtered


def records_to_api_payload(records: list[TradeRecord]) -> list[dict]:
    """
    Convert TradeRecord objects to the format expected by the
    Maritime platform /api/trade-data endpoint.
    """
    return [asdict(r) for r in records]


# ============================================================================
# HS Code Tonnage Estimation
# ============================================================================

def estimate_deadweight_gap(trade_weight_kg: float, commodity_code: str) -> dict:
    """
    Estimate the number of vessel voyages needed and the
    deadweight tonnage gap for a given cargo weight.

    Returns estimated vessel count and recommended vessel types.
    """
    hs_info = MARITIME_HS_CODES.get(commodity_code, ("Unknown", "Container Ship"))
    vessel_type = hs_info[1]

    # Typical vessel capacities (metric tonnes)
    capacity_map = {
        "Container Ship": 70000,
        "Bulk Carrier": 80000,
        "Tanker": 100000,
        "LNG Carrier": 85000,
        "Ro-Ro Ship": 25000,
        "General Cargo": 30000,
        "Reefer Container": 40000,
    }

    capacity = capacity_map.get(vessel_type, 50000)
    voyages_needed = math.ceil(trade_weight_kg / capacity)

    return {
        "commodity": hs_info[0],
        "vesselType": vessel_type,
        "totalWeightKg": trade_weight_kg,
        "singleVesselCapacityKg": capacity,
        "estimatedVoyages": voyages_needed,
        "totalDeadweightNeeded": voyages_needed * capacity,
    }


import math


def main():
    parser = argparse.ArgumentParser(
        description="UN Comtrade Trade Data Pipeline"
    )
    parser.add_argument("--reporter", "-r", default="CN", help="Reporter country code")
    parser.add_argument("--partner", "-p", help="Partner country code")
    parser.add_argument("--hs", help="HS commodity code filter")
    parser.add_argument("--year", "-y", type=int, default=2025, help="Trade year")
    parser.add_argument("--with-weight", action="store_true", help="Include gross weight data")
    parser.add_argument("--output", "-o", default="trade_data.json", help="Output JSON file")
    parser.add_argument("--sample", action="store_true", help="Use sample data only")
    parser.add_argument("--limit", "-l", type=int, default=None, help="Max records")
    parser.add_argument("--estimate", type=int, help="Estimate tonnage for total kg value")
    args = parser.parse_args()

    print("📊 UN Comtrade Trade Data Pipeline")
    print(f"   Timestamp: {datetime.utcnow().isoformat()}Z\n")

    if args.sample:
        records = _generate_sample_trade_data(args.reporter, args.year, args.partner, args.hs)
    else:
        records = fetch_comtrade_data(
            reporter=args.reporter,
            year=args.year,
            partner=args.partner,
            hs_code=args.hs,
            with_weight=args.with_weight,
        )

    if args.limit:
        records = records[:args.limit]

    # Tonnage estimation
    if args.estimate:
        gap = estimate_deadweight_gap(args.estimate, args.hs or "2709")
        print(f"\n⚖ Tonnage Estimation:")
        print(f"   Commodity: {gap['commodity']}")
        print(f"   Vessel Type: {gap['vesselType']}")
        print(f"   Total Weight: {gap['totalWeightKg']:,} kg")
        print(f"   Est. Voyages: {gap['estimatedVoyages']}")
        print(f"   Deadweight Gap: {gap['totalDeadweightNeeded']:,} kg")

    # Write output
    output_path = args.output
    payload = records_to_api_payload(records)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Output written to: {output_path}")
    print(f"   Records: {len(records)}")

    print(f"\n📋 To import into the database:")
    print(f"   curl -X POST http://localhost:3000/api/trade-data/bulk \\")
    print(f"     -H 'Content-Type: application/json' \\")
    print(f"     -d @{output_path}")


if __name__ == "__main__":
    main()
