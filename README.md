# Global Maritime and Freight Analytics Platform

> **Live Operations Center** — Monitor all platform subsystems in real-time: [https://preview-ghpc.space-z.ai/operations](https://preview-ghpc.space-z.ai/operations)

> **Main Dashboard** — Full analytics dashboard with 16 tabs: [https://preview-ghpc.space-z.ai](https://preview-ghpc.space-z.ai)

An open-source analytics platform designed to ingest, process, and map global maritime traffic and cargo distribution data using freely accessible public endpoints. Built with Next.js 16, TypeScript, Prisma ORM, and shadcn/ui, this platform is evolving into the definitive open-source operating system for global maritime logistics.

## Strategic Vision 2025-2035

The maritime industry moves over 80% of global trade by volume, yet remains one of the most data-fragmented sectors in the world economy. This platform is positioned to become the open-source nerve centre connecting vessel operators, port authorities, cargo owners, insurers, regulators, and environmental monitors into a single, intelligent fabric.

The decade-long evolution follows five interconnected capability layers:

1. **Ocean Intelligence Layer (2025-2027)** — Satellite AIS fusion, weather integration, predictive ETA
2. **AI Operations Layer (2026-2029)** — ML route optimisation, anomaly detection, natural language queries
3. **Digital Twin Layer (2027-2030)** — Port twins, supply chain digital thread, simulation sandbox
4. **Trust and Transparency Layer (2028-2032)** — Blockchain eBL, smart containers, provenance verification
5. **Autonomous Vessel Layer (2029-2035)** — Shore control centre, fleet orchestration AI

See [docs/STRATEGIC-EVOLUTION-2025-2035.md](docs/STRATEGIC-EVOLUTION-2025-2035.md) for the full high-level vision and the [PDF deep-dive report](docs/Maritime-Strategic-Evolution-Deep-Dive-2025-2035.pdf) for comprehensive technical analysis.

## System Architecture

### Current State

- **Presentation Layer**: Next.js 16 web dashboard with real-time vessel tracking, shipment management, port operations, trade analytics, ESG monitoring, AI predictive endpoints, and a unified Live Operations Center. Built with shadcn/ui components and Tailwind CSS 4.
- **API Layer**: RESTful API routes for vessels, ports, shipments, trade data, dashboard aggregation, and systems health monitoring. 28 endpoints across 14 categories with OpenAPI 3.0 specification.
- **State Machine Layer**: Event-sourced hierarchical state machine with Monte Carlo probabilistic transitions and KL divergence drift detection (3-leap architecture).
- **AI Layer**: Predictive ETA, anomaly detection, route optimisation, demand forecasting, and automated alerts.
- **Middleware Layer**: CORS protection, security headers, request tracking (X-Request-ID), cache control, and API versioning.
- **Storage Layer**: SQLite database (development) with Prisma ORM. Production path: PostgreSQL with PostGIS, TimescaleDB, ClickHouse.
- **Data Pipeline Layer**: Python scripts for ingesting data from public maritime APIs (AISHub, UN Comtrade, NGA World Port Index).

### Target Architecture (2030 Horizon)

```
+-----------------------------------------------------------+
|                   Presentation Layer                       |
|   Next.js Dashboard  |  Mobile App  |  API Portal        |
|   Command Palette    |  Push Alerts |  WebSocket Streams  |
+-----------------------------------------------------------+
|                   Intelligence Layer                       |
|   ML Route Optimiser  |  Anomaly Detection Engine       |
|   NLP Query Engine    |  Demand Forecasting Models       |
|   Simulation Sandbox  |  ESG Scoring Service             |
+-----------------------------------------------------------+
|                   Data Fusion Layer                        |
|   Satellite AIS Hub   |  Weather/Ocean Data Lake         |
|   SAR Processing      |  Imagery Analysis Pipeline       |
|   Blockchain Oracle   |  IoT Telemetry Ingestion         |
+-----------------------------------------------------------+
|                   Storage Layer                           |
|   TimescaleDB (AIS)  |  PostGIS (Spatial)                |
|   S3/Object Store    |  Redis (Cache & Streams)          |
|   ClickHouse (OLAP)  |  Graph DB (Ownership Chains)      |
+-----------------------------------------------------------+
```

## Data Sourcing and Free-Tier Limits

| Dataset | Source Provider | Global Coverage | Free Tier Limitations |
| :--- | :--- | :--- | :--- |
| **Vessel Traffic** | [AISHub](https://www.aishub.net/) | ~50%-60% global fleet | Requires data-share swap / Rate-limited calls |
| **Cargo Freight** | [UN Comtrade API](https://comtradeplus.un.org/) | >99% world trade | 500 requests/day, max 100k records per call |
| **Global Ports** | [NGA World Port Index](https://nga.mil) | 100% major ports | Completely open, no usage restrictions |

## Database Schema

### Core Models (14 tables, 1,500+ seeded records)

- **Vessel**: Commercial vessel tracking with MMSI, IMO, real-time position, speed, heading, destination, and ETA.
- **Port**: Global port infrastructure with coordinates, depth, cargo types, tidal data, and UN/LOCODE identifiers.
- **Shipment**: Cargo shipment lifecycle management with Bill of Lading, origin/destination ports, transit times, and freight costs.
- **Container**: Individual container tracking with ISO type, size, weight, and current status.
- **TradeData**: UN Comtrade trade flow records with HS codes, commodity values, gross weights, and partner countries.
- **Carrier**: Shipping line companies with alliance memberships and fleet composition.
- **TradeRoute**: Major trade corridors connecting port pairs with typical transit times.
- **CargoType**: Commodity classification (containerised, bulk, liquid, ro-ro).
- **Charter**: Vessel charter agreements with type, duration, and financial terms.
- **Booking**: Freight booking records linked to shipments and carriers.
- **Document**: Shipping documents (BL, customs declarations, certificates).
- **Event**: Log of supply chain events with severity and type classification.
- **VoyageLeg**: Individual voyage segments with departure/arrival data.

### Relationships

- Vessel has many Shipments, Containers, Charters, VoyageLegs
- Port has many Shipments (origin + destination), TradeRoutes, VoyageLegs
- Shipment belongs to Vessel, originPort, destPort, and has many Containers and Documents
- Carrier has many Vessels, Shipments, TradeRoutes

## Dashboard Features

The platform includes a comprehensive dark-mode dashboard with 16 interactive tabs:

| Tab | Description |
|-----|-------------|
| **Overview** | KPI cards, recent activity, quick stats |
| **Live Map** | Real-time vessel positions on Leaflet map with CartoDB dark tiles |
| **Analytics** | Trade volume charts, carrier performance, port throughput |
| **Shipments** | Shipment lifecycle tracking with filtering and pagination |
| **Vessels** | Fleet management with status, type, and carrier filters |
| **Trade** | Bilateral trade flow data with HS code classification |
| **Ports** | Global port directory with congestion and capacity data |
| **Containers** | Container-level tracking with type and status filters |
| **Carriers** | Shipping line profiles with alliance memberships |
| **Charters** | Vessel charter agreement management |
| **Bookings** | Freight booking records and status |
| **Compliance** | Regulatory compliance tracking (IMO 2020, SOLAS) |
| **ESG** | Carbon Intensity Indicator gauge, CO2 breakdown, emissions tracking |
| **Voyage** | Voyage analytics with route performance and transit times |
| **Alerts** | Notification center with event alerts and AI predictions |
| **State Machine** | Event-sourced state engine with probability simulation and drift detection |

**Additional features**: Command palette (Ctrl+K), Excel export with formatted styling, full-text search across all entities, interactive API documentation with try-it capability, Live Ops navigation link.

## Live Operations Center

The `/operations` endpoint is a dedicated real-time monitoring page that dynamically communicates with **all** platform components:

| Subsystem | What It Monitors |
|:---|:---|
| **Database** | Record counts, query latency, connection status |
| **State Machine Engine** | Statechart health, Monte Carlo entropy, transition count |
| **AI Predictive Layer** | ETA prediction, anomaly detection, route optimisation, forecasting, alerts |
| **API Layer** | 28 endpoints, protocol, specification |
| **Event Sourcing Layer** | Immutable event log, valid/invalid event counts, recent events |
| **Middleware Layer** | CORS, security headers, request tracking, cache control |

Features auto-refresh every 30 seconds, system health indicators, live shipment data, trade analytics, and AI prediction results. Access it 24/7 at the preview URL above.

## Event-Sourced State Machine (Phase 5)

The platform implements a 3-leap progressive state machine architecture for shipment lifecycle management:

| Leap | Capability | Technical Detail |
|:---|:---|:---|
| **Leap 1** | Formal Typed Statecharts | 18 hierarchical states, 28 transitions, 3 parallel regions (customs, documentation, financial) |
| **Leap 2** | Event Sourcing | Immutable append-only event log, state projection, time-travel replay |
| **Leap 3** | Probabilistic Transitions | Monte Carlo simulation (N=1000), Shannon entropy, KL divergence drift detection |

### State Machine API Endpoints

| Endpoint | Method | Description |
|:---|:---|:---|
| `/api/state-machine/definition` | GET | Full statechart definition (states, transitions, parallel regions) |
| `/api/state-machine/transitions?state=X` | GET | Available transitions from a given state |
| `/api/state-machine/probabilities?state=X` | GET | Transition probabilities and Monte Carlo state distribution |
| `/api/state-machine/drift?expected=X&observed=Y` | GET | KL divergence drift detection with severity grading |
| `/api/shipments/[id]/events` | GET/POST | Event list and append (validates against statechart) |
| `/api/shipments/[id]/state` | GET | Projected state from event log with transitions and probabilities |
| `/api/shipments/[id]/history` | GET | Full event timeline with state durations |
| `/api/shipments/[id]/replay` | GET | Time-travel query (state at a specific timestamp) |

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
# Seed the database with 50 ports, 80 vessels, 80 shipments, 420 containers, and more
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
```

### ais_pipeline.py — AIS Vessel Tracking

Connects to AISHub for real-time vessel positions with NMEA-0183 parsing and anomaly detection.

```bash
# Generate sample positions for development
python scripts/ais_pipeline.py --sample

# Track specific vessels by MMSI
python scripts/ais_pipeline.py --mmsi 477394500 636091537 311045300
```

### un_comtrade_pipeline.py — Trade Data Fetcher

Queries the UN Comtrade API for seaborne freight trade data with HS code classification and tonnage estimation.

```bash
# Fetch all sea trade for a reporter country
python scripts/un_comtrade_pipeline.py --reporter CN --year 2025

# Estimate tonnage requirements
python scripts/un_comtrade_pipeline.py --estimate 50000000 --hs 2601
```

## API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api` | GET | API heartbeat |
| `/api/health` | GET | Server health check (uptime, memory, DB status) |
| `/api/systems` | GET | Unified systems health — all 6 subsystems (DB, State Machine, AI, API, Events, Middleware) |
| `/api/docs` | GET | OpenAPI 3.0 specification |
| `/api/dashboard` | GET | Aggregated dashboard metrics |
| `/api/search` | GET | Unified full-text search across all entities |
| `/api/vessels` | GET | List vessels with pagination and filtering |
| `/api/vessels/stream` | GET | SSE real-time vessel position streaming |
| `/api/ports` | GET | List ports with filtering |
| `/api/shipments` | GET | List shipments with vessel and port details |
| `/api/shipments/[id]/events` | GET/POST | Event-sourced event log (append + list) |
| `/api/shipments/[id]/state` | GET | Projected state with transitions and probabilities |
| `/api/shipments/[id]/history` | GET | Full event timeline with state durations |
| `/api/shipments/[id]/replay` | GET | Time-travel query (state at timestamp) |
| `/api/containers` | GET | List containers with filtering |
| `/api/documents` | GET | List shipping documents |
| `/api/events` | GET | List supply chain events |
| `/api/carriers` | GET | List carriers with alliance filtering |
| `/api/trade-routes` | GET | List major trade corridors |
| `/api/cargo-types` | GET | List commodity classifications |
| `/api/charters` | GET | List charter agreements |
| `/api/bookings` | GET | List freight bookings |
| `/api/trade-data` | GET | Trade statistics and flow data |
| `/api/state-machine/definition` | GET | Full statechart definition |
| `/api/state-machine/transitions` | GET | Available transitions from a state |
| `/api/state-machine/probabilities` | GET | Transition probabilities + Monte Carlo distribution |
| `/api/state-machine/drift` | GET | KL divergence drift detection |
| `/api/ai/eta` | GET | AI predictive ETA |
| `/api/ai/anomaly` | GET | Vessel behaviour anomaly detection |
| `/api/ai/routes` | GET | AI route optimisation |
| `/api/ai/alerts` | GET | Automated alert system |
| `/api/ai/forecast` | GET | Demand forecasting |

## Technology Stack

| Layer | Technology |
|:---|:---|
| Framework | Next.js 16 (App Router, TypeScript, Turbopack) |
| UI | Tailwind CSS 4, shadcn/ui (New York style), Lucide Icons |
| Database | Prisma ORM (SQLite dev / PostgreSQL production) |
| Maps | Leaflet + CartoDB Dark Tiles |
| Charts | Recharts |
| Real-time | Server-Sent Events (SSE) |
| AI | Built-in predictive analytics endpoints |
| Data Pipelines | Python 3 (urllib, csv, json — zero external dependencies) |
| Theme | next-themes (dark mode default) |

## Implementation Roadmap

| Phase | Timeline | Status |
|:---|:---|:---|
| 1. Foundation | 2025 | Complete |
| 2. Intelligence and Search | 2025 | Complete |
| 3. Developer Experience | 2025 | Complete |
| 4. AI and Predictive Analytics | 2025 | Complete |
| 5. Strategic Intelligence | 2025 | Complete |
| 6. Digital Supply Chain | 2026-2027 | Planned |
| 7. Enterprise and Scale | 2027-2029 | Planned |
| 8. Ecosystem and Marketplace | 2028-2030 | Planned |

## License

This project is open-source. See LICENSE for details.
