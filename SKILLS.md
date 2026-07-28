---
name: maritime-freight-analytics
description: Procedures for processing, validating, and querying global AIS vessel tracks and UN Comtrade shipping freight datasets.
---

# Maritime & Freight Core Skills

## 1. AIS Data Pipeline Automation

### Data Ingestion
- **NMEA-0183 Parsing**: Decodes raw AIS sentence strings (VDM/VDO message types 1, 2, 3, 5) from public data networks including 6-bit ASCII payload decoding for MMSI, position, speed, heading, and voyage data.
- **JSON Stream Processing**: Handles structured JSON responses from AISHub and similar public AIS APIs, mapping fields directly to the vessel schema.
- **Batch Processing**: Supports bulk ingestion of historical AIS data with configurable batch sizes and rate limiting to stay within free-tier API quotas.

### Geospatial Processing
- **Bounding Box Filtering**: Filters vessel positions within rectangular geographic regions using latitude/longitude bounds. Supports both point-in-box and route-through-box checks.
- **Distance Calculation**: Implements Haversine great-circle distance computation for port-to-port and vessel-to-port proximity calculations.
- **GeoJSON Export**: Converts vessel tracks and port positions to GeoJSON format for visualization in mapping libraries.

### Anomaly Detection
- **Speed Validation**: Flags vessel speeds exceeding 55 knots (absolute max) or cargo vessel speeds exceeding 25 knots as impossible readings.
- **Position Validation**: Rejects coordinates outside the valid range (lat: -90 to 90, lon: -180 to 180).
- **Signal Loss Detection**: Identifies vessels with gaps exceeding 6 hours between consecutive position reports.

## 2. Freight & Trade Mapping

### HS Code Matching
- **Code Lookup**: Maps cargo descriptions to standardized Harmonized System (HS) codes using a curated reference table of 30+ maritime-relevant commodity codes.
- **Description Resolution**: Resolves HS codes to human-readable commodity descriptions for display in the tracking dashboard.
- **Vessel Type Suggestion**: Recommends optimal vessel types (Container Ship, Bulk Carrier, Tanker, Ro-Ro, LNG Carrier) based on the HS code classification.

### Tonnage Estimation
- **Deadweight Calculation**: Estimates the number of vessel voyages and total deadweight tonnage needed for a given cargo weight, using per-vessel-type capacity benchmarks.
- **Capacity Benchmarks**: Maintains average vessel capacities by type — Container Ship (70,000 DWT), Bulk Carrier (80,000 DWT), Tanker (100,000 DWT), LNG Carrier (85,000 DWT), Ro-Ro (25,000 DWT), General Cargo (30,000 DWT).

### Route Optimization
- **Historical Transit Times**: Computes average port-to-port transit times from historical shipment data stored in the database.
- **Route Suggestion**: Suggests optimal routing between origin and destination ports based on historical performance metrics.

## 3. Database Maintenance

### Data Thinning
- **Position Aggregation**: Compresses hyper-dense positional data (multiple readings per minute) into hourly or daily intervals, keeping the most recent raw position for each vessel.
- **Retention Policy**: Supports configurable data retention periods for AIS position history, trade data, and shipment records.

### Index Strategy
- **Spatial Indexing**: In production PostgreSQL environments, optimizes spatial queries using PostGIS GIST indexes on latitude/longitude columns for fast bounding-box and nearest-port queries.
- **Composite Indexes**: Maintains indexes on frequently queried column combinations (vessel status, shipment status, trade flow + year, port country + region).

### Data Validation
- **Schema Enforcement**: All ingested data passes through validation against the Prisma schema before database insertion, rejecting records with missing required fields or invalid data types.
- **Deduplication**: Prevents duplicate vessel entries using unique MMSI and IMO number constraints. Prevents duplicate shipments using unique Bill of Lading constraints.
