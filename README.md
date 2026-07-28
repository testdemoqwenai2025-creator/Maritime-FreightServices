# Global Maritime & Freight Analytics Platform

An open-source analytics platform designed to ingest, process, and map over 50% of global maritime traffic and cargo distribution data using freely accessible public endpoints. Built with Next.js 16, TypeScript, Prisma ORM, and shadcn/ui.

## System Architecture

- **Presentation Layer**: Next.js 16 web dashboard with real-time vessel tracking, shipment management, port operations, and trade analytics views. Built with shadcn/ui components and Tailwind CSS 4.
- **API Layer**: RESTful API routes for vessels, ports, shipments, trade data, and dashboard aggregation. Server-side Prisma queries with pagination support.
- **Storage Layer**: SQLite database (development) with Prisma ORM. Production-ready PostgreSQL schema with PostGIS spatial extension support.
- **Data Pipeline Layer**: Python scripts for ingesting data from public maritime APIs (AISHub, UN Comtrade, NGA World Port Index).

## Data Sourcing & Free-Tier Limits

| Dataset | Source Provider | Global Coverage | Free Tier Limitations |
| :--- | :--- | :--- | :--- |
| **Vessel Traffic** | [AISHub](https://www.aishub.net/) | ~50%–60% global fleet | Requires data-share swap / Rate-limited calls |
| **Cargo Freight** | [UN Comtrade API](https://comtradeplus.un.org/) | >99% world trade | 500 requests/day, max 100k records per call |
| **Global Ports** | [NGA World Port Index](https://nga.mil) | 100% major ports | Completely open, no usage restrictions |

## Database Schema

### Core Models

- **Port**: Global port infrastructure with coordinates, depth, cargo types, tidal data, and UN/LOCODE identifiers.
- **Vessel**: Commercial vessel tracking with MMSI, IMO, real-time position, speed, heading, destination, and ETA.
- **Shipment**: Cargo shipment lifecycle management with Bill of Lading, origin/destination ports, transit times, and freight costs.
- **Container**: Individual container tracking with ISO type, size, weight, and current status.
- **TradeData**: UN Comtrade trade flow records with HS codes, commodity values, gross weights, and partner countries.
- **User**: Platform user management with role-based access control.

### Relationships

- Vessel has many Shipments, Containers, Arrivals, Departures
- Port has many Shipments (origin + destination), Arrivals, Departures
- Shipment belongs to Vessel, originPort, destPort, and has many Containers

## Quick Start Guide

### 1. Prerequisites

- Node.js 18+ and Bun runtime
- Docker and PostgreSQL (for production deployment with PostGIS)

### 2. Install Dependencies

```bash
bun install
```

### 3. Database Setup

```bash
# Push schema to database
bun run db:push

# Generate Prisma client
bun run db:generate
```

### 4. Seed Sample Data

```bash
# Seed the database with 25 ports, 15 vessels, 10 shipments, and trade data
bun run scripts/seed-maritime.ts
```

### 5. Start Development Server

```bash
bun run dev
```

### 6. Environment Configuration

Create a `.env` file in the root directory for production data pipeline usage:

```env
DATABASE_URL=postgresql://postgres:mysecretpassword@localhost:5432/maritime
AIS_HUB_API_KEY=your_aishub_key_here
UN_COMTRADE_TOKEN=your_un_comtrade_token_here
```

## Python Data Pipeline Scripts

### seed_ports.py — World Port Index Ingestion

Downloads and parses the NGA World Port Index dataset, transforming each port entry into the platform schema format.

```bash
# Use sample data (no external download required)
python scripts/seed_ports.py --sample --output ports.json

# Parse a local WPI CSV file
python scripts/seed_ports.py --source data/WPI.csv --limit 100

# Full dataset with no limit
python scripts/seed_ports.py --source data/WPI.csv
```

### ais_pipeline.py — AIS Vessel Tracking

Connects to AISHub for real-time vessel positions with NMEA-0183 parsing and anomaly detection.

```bash
# Generate sample positions for development
python scripts/ais_pipeline.py --sample

# Fetch vessels in a bounding box from AISHub
python scripts/ais_pipeline.py --bbox 51.0 1.0 52.0 2.0

# Track specific vessels by MMSI
python scripts/ais_pipeline.py --mmsi 477394500 636091537 311045300

# Filter by vessel type
python scripts/ais_pipeline.py --bbox 50.0 -5.0 52.0 2.0 --types Cargo Tanker
```

### un_comtrade_pipeline.py — Trade Data Fetcher

Queries the UN Comtrade API for seaborne freight trade data with HS code classification and tonnage estimation.

```bash
# Fetch all sea trade for a reporter country
python scripts/un_comtrade_pipeline.py --reporter CN --year 2025

# Fetch specific commodity between partners
python scripts/un_comtrade_pipeline.py --reporter DE --partner CN --hs 8703 --year 2025

# Estimate tonnage requirements
python scripts/un_comtrade_pipeline.py --estimate 50000000 --hs 2601
```

## API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/dashboard` | GET | Aggregated dashboard metrics (KPIs, charts, recent activity) |
| `/api/vessels` | GET/POST | List/create vessels with pagination, filtering by status/type/search |
| `/api/ports` | GET/POST | List/create ports with pagination, filtering by region/country/search |
| `/api/shipments` | GET/POST | List/create shipments with vessel and port details included |
| `/api/trade-data` | GET | List trade records with pagination, filtering by flow/year |

## Technology Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **UI**: Tailwind CSS 4, shadcn/ui (New York style), Lucide Icons
- **Database**: Prisma ORM (SQLite dev / PostgreSQL production)
- **Data Pipelines**: Python 3 (urllib, csv, json — zero external dependencies)
- **State**: React hooks, server-side rendering
