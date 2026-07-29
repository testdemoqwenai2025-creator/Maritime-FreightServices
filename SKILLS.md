# Maritime & Freight Analytics Platform — Evolution Roadmap

## Platform Overview

Next.js 16 full-stack maritime analytics platform with 14 Prisma models, 23 routes (4 pages + 19 API endpoints), real-time vessel tracking (SSE), dark mode dashboard with 15 tabs, Leaflet maps, Recharts analytics, interactive API docs, and full-text search. Designed for global maritime supply chain visibility, trade flow analysis, and operational intelligence. This platform is evolving into the definitive open-source operating system for global maritime logistics over the decade 2025-2035.

## Current Architecture

- **Frontend**: Next.js 16 App Router, TypeScript, Tailwind CSS 4, shadcn/ui, next-themes (dark mode default)
- **Backend**: Next.js API Routes, Prisma ORM, SQLite (dev)
- **Real-time**: Server-Sent Events (SSE) at `/api/vessels/stream`
- **Visualization**: Leaflet (vessel map with CartoDB dark tiles), Recharts (7+ chart types)
- **Data**: 14 domain models, 1,500+ seeded records (50 ports, 80 vessels, 80 shipments, 420 containers, etc.)
- **Infrastructure**: Self-healing process supervisor for containerized deployments
- **AI Endpoints**: Predictive ETA, anomaly detection, route optimization, demand forecasting, automated alerts

---

## Strategic Vision: Five Evolution Layers

The platform roadmap is organized into five interconnected capability layers, each building on the previous:

### Layer 1: Ocean Intelligence (2025-2027)
Multi-source satellite AIS fusion (Spire, exactEarth, ORBCOMM), oceanographic weather integration (ECMWF, GFS, OSCAR, HYCOM), SAR vessel detection for dark fleet monitoring, physics-informed predictive ETA engine, and real-time port congestion monitoring.

### Layer 2: AI Operations (2026-2029)
Reinforcement learning route optimisation, multi-layered anomaly detection (AIS spoofing, behavioural analytics), natural language voyage query interface, temporal fusion transformer cargo flow prediction, and port digital twins with JIT arrival simulation.

### Layer 3: Digital Twin and Simulation (2027-2030)
Port digital twins (berth allocation, crane scheduling, gate flow), global supply chain digital thread using event sourcing and CQRS patterns, maritime simulation sandbox with agent-based modelling for global what-if scenarios.

### Layer 4: Trust and Transparency (2028-2032)
Blockchain-based electronic Bills of Lading (eBL) via ICC URDTT framework, provenance verification for ethical sourcing and deforestation-free commodities, IoT-enabled smart container contracts with automated insurance claims.

### Layer 5: Autonomous Vessel Integration (2029-2035)
Shore control centre interface for MASS-compliant autonomous vessels, fleet orchestration AI using multi-agent reinforcement learning, AUV/ASV data integration, and full digital twin of the global maritime network.

---

## Phase 1 — Foundation (Complete)

- [x] 14 Prisma domain models with relations (Vessel, Port, Shipment, Container, Document, Event, Carrier, TradeRoute, CargoType, Charter, Booking, TradeData, VoyageLeg)
- [x] 19 API routes with filtering and pagination
- [x] 15-tab Dashboard UI with dark mode
- [x] Real-time vessel map with SSE streaming
- [x] Analytics charts (trade volume, carrier performance, port throughput, compliance)
- [x] Command palette (Ctrl+K) for quick navigation
- [x] Notification center with event alerts
- [x] ESG panel (CII gauge, CO2 breakdown, emissions tracking)
- [x] Voyage analytics panel (route performance, transit times)
- [x] CSV/JSON/Excel data export across all entities
- [x] Responsive dark-mode-first design system
- [x] Lucide icon integration, shadcn/ui component library
- [x] Seed data pipeline (50 ports, 80 vessels, 80 shipments, 420 containers, 200 documents, 150 events, 20 carriers, 15 trade routes)

---

## Phase 2 — Intelligence and Search (Complete)

- [x] Unified full-text search API across all entities (`/api/search?q=term&type=all`)
- [x] Enhanced landing page with platform overview (`/about`) — live stats, tech stack badges, 3-phase roadmap
- [x] Server health monitoring endpoint (`/api/health`) — uptime, memory usage, DB connectivity, response time
- [x] Excel (XLSX) export with styled formatting (headers, column widths, number formats)
- [x] Self-healing process supervisor (`scripts/supervisor.js`) — auto-restart on crash, health pinger

---

## Phase 3 — Developer Experience (Complete)

- [x] Interactive API documentation page (`/docs`) with try-it, copy URL, filter by category
- [x] OpenAPI 3.0 spec endpoint (`/api/docs`) — 23 endpoints, 12 tag categories
- [x] API docs organized: UI, System, Analytics, Search, Fleet, Infrastructure, Logistics, Documents, Events, Trade, Commercial, Real-time
- [x] Try-it feature: execute endpoints live and view formatted JSON responses
- [x] Total routes: 23 (4 pages + 19 API endpoints)

---

## Phase 4 — AI and Predictive Analytics (Complete)

- [x] AI-powered ETA prediction engine (historical transit data + weather + congestion models)
- [x] Anomaly detection for vessel behavior (route deviation, AIS spoofing, unusual speeds)
- [x] Route optimization suggestions (fuel-efficient routing, weather-avoidance rerouting)
- [x] Demand forecasting for port capacity (seasonal trends, trade lane volume prediction)
- [x] Automated alert system (weather warnings, delay predictions, congestion alerts)
- [x] Natural language query interface ("show all vessels delayed in Shanghai this week")

---

## Phase 5 — Strategic Intelligence (Complete)

- [x] Strategic Evolution Roadmap 2025-2035 (Phase 1 high-level vision document)
- [x] Deep Dive PDF Report (25-page comprehensive technical and strategic analysis)
- [x] ESG Intelligence expansion plan (real-time CII, carbon credits, Scope 3 tracking)
- [x] Satellite and remote sensing data fusion strategy
- [x] Blockchain-verified supply chain design
- [x] Autonomous vessel integration roadmap

---

## Phase 6 — Digital Supply Chain (Planned)

- [ ] Bill of Lading digitization with blockchain-backed electronic BL (eBL)
- [ ] Smart contract system for automated freight payments
- [ ] Document workflow automation (submission, approval, status tracking)
- [ ] Multi-party visibility portal (shippers, carriers, customs, terminals)
- [ ] IoT sensor data integration (reefer container temperature, humidity tracking)
- [ ] Digital twin for port operations (berth allocation, crane scheduling, gate flow)

---

## Phase 7 — Enterprise and Scale (Planned)

- [ ] Multi-tenant architecture (organization isolation, per-tenant data and config)
- [ ] Role-based access control (RBAC) — Admin, Operations, Finance, Viewer roles
- [ ] Audit trail and compliance reporting (IMO 2020, SOLAS VGM, customs filings)
- [ ] Kubernetes deployment manifests (Helm charts, HPA, health checks)
- [ ] PostgreSQL migration path (PostGIS for spatial queries, full-text search)
- [ ] Redis caching layer (hot data, session management, rate limiting)
- [ ] Message queue (RabbitMQ/Kafka) for event processing and async workflows
- [ ] Global CDN for static assets (map tiles, chart libraries, images)
- [ ] Observability stack (structured logging, metrics, distributed tracing)

---

## Phase 8 — Ecosystem and Marketplace (Planned)

- [ ] AIS data integration (real-time satellite AIS feeds — Spire, Orbcomm, VesselFinder)
- [ ] UN Comtrade API integration (official bilateral trade statistics)
- [ ] Weather API integration (wave height, wind speed, storm tracking — NOAA, StormGlass)
- [ ] Port congestion prediction marketplace (crowdsourced delay data)
- [ ] Carbon credits tracking (emissions trading, EU ETS compliance)
- [ ] Third-party developer API (rate-limited, OAuth 2.0, key-based access)
- [ ] Plugin system for custom analytics modules and integrations
- [ ] White-label deployment support for enterprise customers

---

## Technology Migration Path

| Component | Current (2025) | 2026 Target | 2030 Target |
|:---|:---|:---|:---|
| Database | SQLite | PostgreSQL + PostGIS | TimescaleDB + PostGIS + ClickHouse |
| Data Pipeline | Python scripts | Apache Airflow DAGs | Real-time Kafka Streams |
| ML Platform | None | MLflow + scikit-learn | Kubeflow + PyTorch + ONNX Runtime |
| Spatial Processing | None | PostGIS | PostGIS + custom raster tile server |
| Real-Time Comms | Polling / SSE | SSE + WebSocket | WebSocket + MQTT |
| Auth | None | NextAuth.js | OAuth 2.1 + OpenID Connect + RBAC |
| Deployment | Manual | Docker Compose | Kubernetes + Helm Charts |

---

## API Reference Summary

### Pages

| Route | Description |
|-------|-------------|
| `GET /` | Dashboard UI — main analytics dashboard |
| `GET /about` | Platform information, tech stack, roadmap |
| `GET /docs` | Interactive API documentation with try-it |

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api` | API index / heartbeat |
| `GET /api/health` | Server health check (uptime, memory, DB status) |
| `GET /api/docs` | OpenAPI 3.0 specification |
| `GET /api/dashboard` | Aggregated KPIs and summary statistics |
| `GET /api/search?q=term&type=all` | Unified full-text search across all entities |
| `GET /api/vessels` | List vessels (filter: `status`, `type`, `carrier`) |
| `GET /api/vessels/stream` | SSE real-time vessel position streaming |
| `GET /api/ports` | List ports (filter: `country`, `region`, `congestion`) |
| `GET /api/shipments` | List shipments (filter: `status`, `carrier`, `route`) |
| `GET /api/containers` | List containers (filter: `status`, `type`) |
| `GET /api/documents` | List documents (filter: `status`, `type`) |
| `GET /api/events` | List events (filter: `type`, `severity`) |
| `GET /api/carriers` | List carriers (filter: `alliance`) |
| `GET /api/trade-routes` | List trade routes |
| `GET /api/cargo-types` | List cargo types |
| `GET /api/charters` | List charters (filter: `type`, `status`) |
| `GET /api/bookings` | List bookings (filter: `status`) |
| `GET /api/trade-data` | Trade statistics and flow data |
| `GET /api/ai/eta` | AI predictive ETA for vessel voyages |
| `GET /api/ai/anomaly` | Anomaly detection for vessel behaviour |
| `GET /api/ai/routes` | AI route optimisation suggestions |
| `GET /api/ai/alerts` | Automated alert system |
| `GET /api/ai/forecast` | Demand forecasting for trade lanes |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn/ui |
| Database | SQLite (Prisma ORM) |
| Maps | Leaflet + CartoDB Dark Tiles |
| Charts | Recharts |
| Real-time | Server-Sent Events (SSE) |
| Theme | next-themes (dark mode default) |
| Icons | Lucide React |
| State | React hooks + URL state |

---

## Data Model Summary (14 Models)

| Model | Description | Key Relations |
|-------|-------------|---------------|
| **Vessel** | Maritime vessel registry | Carrier, Shipment, Charter |
| **Port** | Global port directory | Shipment, TradeRoute |
| **Shipment** | Cargo shipment tracking | Vessel, Port (origin/dest), Container, Document |
| **Container** | Individual container tracking | Shipment, CargoType |
| **Document** | Shipping documents (BL, customs) | Shipment |
| **Event** | Log of supply chain events | Vessel, Shipment, Port |
| **Carrier** | Shipping line companies | Vessel, Shipment, TradeRoute |
| **TradeRoute** | Major trade corridors | Port (origin/dest), Carrier |
| **CargoType** | Commodity classification | Container |
| **Charter** | Vessel charter agreements | Vessel |
| **Booking** | Freight booking records | Shipment, Carrier |
| **TradeData** | Aggregate trade statistics | Port, CargoType |
| **VoyageLeg** | Individual voyage segments | Vessel, Port |

---

## Commercial Model (Open Core)

| Tier | Features | Availability |
|------|----------|-------------|
| **Community** | Full dashboard, basic AIS, weather overlays, manual export | Free, self-hosted |
| **Professional** | Satellite AIS fusion, predictive ETA, route optimisation, API access | Paid subscription |
| **Enterprise** | White-label, digital twins, custom integrations, SLA support | Paid subscription |
| **Data Marketplace** | Third-party data listings, carbon credit brokerage | Commission-based |

---

*Last updated: 2026-07-29 — This is a living document. Update as milestones are reached.*
