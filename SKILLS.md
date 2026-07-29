# Maritime & Freight Analytics Platform — Evolution Roadmap

## Platform Overview

Next.js 16 full-stack maritime analytics platform with 13 Prisma models, 18+ API routes, real-time vessel tracking (SSE), dark mode dashboard with 10+ tabs, Leaflet maps, and Recharts analytics. Designed for global maritime supply chain visibility, trade flow analysis, and operational intelligence.

## Current Architecture

- **Frontend**: Next.js 16 App Router, TypeScript, Tailwind CSS 4, shadcn/ui, next-themes (dark mode default)
- **Backend**: Next.js API Routes, Prisma ORM, SQLite (dev)
- **Real-time**: Server-Sent Events (SSE) at `/api/vessels/stream`
- **Visualization**: Leaflet (vessel map with CartoDB dark tiles), Recharts (7+ chart types)
- **Data**: 13 domain models, 1,500+ seeded records (50 ports, 80 vessels, 80 shipments, 420 containers, etc.)

---

## Phase 1 — Foundation ✅ (Complete)

- [x] 13 Prisma domain models with relations (Vessel, Port, Shipment, Container, Document, Event, Carrier, TradeRoute, CargoType, Charter, Booking, TradeData, VoyageLeg)
- [x] 18 API routes with filtering and pagination
- [x] 10+ tab Dashboard UI with dark mode
- [x] Real-time vessel map with SSE streaming
- [x] Analytics charts (trade volume, carrier performance, port throughput, compliance)
- [x] Command palette (`Ctrl+K`) for quick navigation
- [x] Notification center with event alerts
- [x] ESG panel (emissions tracking, sustainability metrics)
- [x] Voyage analytics panel (route performance, transit times)
- [x] CSV/JSON data export across all entities
- [x] Responsive dark-mode-first design system
- [x] Lucide icon integration, shadcn/ui component library
- [x] Seed data pipeline (50 ports, 80 vessels, 80 shipments, 420 containers, 200 documents, 150 events, 20 carriers, 15 trade routes)

---

## Phase 2 — Intelligence & Search (Current)

- [ ] Unified full-text search API across all entities (`/api/search`)
- [ ] Enhanced landing page with platform overview, stats, and feature highlights
- [ ] Server health monitoring endpoint (`/api/health`) with uptime, memory, and DB status
- [ ] API documentation page (`/docs`) with endpoint catalog, parameters, and response examples
- [ ] Excel (XLSX) export with styled formatting (headers, column widths, number formats)
- [ ] Keyboard shortcuts system (global hotkeys, shortcut reference overlay)

---

## Phase 3 — AI & Predictive Analytics

- [ ] AI-powered ETA prediction engine (historical transit data + weather + congestion models)
- [ ] Anomaly detection for vessel behavior (route deviation, AIS spoofing, unusual speeds)
- [ ] Route optimization suggestions (fuel-efficient routing, weather-avoidance rerouting)
- [ ] Demand forecasting for port capacity (seasonal trends, trade lane volume prediction)
- [ ] Automated alert system (weather warnings, delay predictions, congestion alerts)
- [ ] Natural language query interface ("show all vessels delayed in Shanghai this week")

---

## Phase 4 — Digital Supply Chain

- [ ] Bill of Lading digitization with blockchain-backed electronic BL (eBL)
- [ ] Smart contract system for automated freight payments
- [ ] Document workflow automation (submission, approval, status tracking)
- [ ] Multi-party visibility portal (shippers, carriers, customs, terminals)
- [ ] IoT sensor data integration (reefer container temperature, humidity tracking)
- [ ] Digital twin for port operations (berth allocation, crane scheduling, gate flow)

---

## Phase 5 — Enterprise & Scale

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

## Phase 6 — Ecosystem & Marketplace

- [ ] AIS data integration (real-time satellite AIS feeds — Spire, Orbcomm, VesselFinder)
- [ ] UN Comtrade API integration (official bilateral trade statistics)
- [ ] Weather API integration (wave height, wind speed, storm tracking — NOAA, StormGlass)
- [ ] Port congestion prediction marketplace (crowdsourced delay data)
- [ ] Carbon credits tracking (emissions trading, EU ETS compliance)
- [ ] Third-party developer API (rate-limited, OAuth 2.0, key-based access)
- [ ] Plugin system for custom analytics modules and integrations
- [ ] White-label deployment support for enterprise customers

---

## API Reference Summary

### Pages

| Route | Description |
|-------|-------------|
| `GET /` | Dashboard UI — main analytics dashboard |
| `GET /about` | Platform information and overview page |

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api` | API index / heartbeat |
| `GET /api/health` | Server health check (uptime, memory, DB status) |
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

## Data Model Summary (13 Models)

| Model | Description | Key Relations |
|-------|-------------|---------------|
| **Vessel** | Maritime vessel registry | → Carrier, Shipment, Charter |
| **Port** | Global port directory | → Shipment, TradeRoute |
| **Shipment** | Cargo shipment tracking | → Vessel, Port (origin/dest), Container, Document |
| **Container** | Individual container tracking | → Shipment, CargoType |
| **Document** | Shipping documents (BL, customs) | → Shipment |
| **Event** | Log of supply chain events | → Vessel, Shipment, Port |
| **Carrier** | Shipping line companies | → Vessel, Shipment, TradeRoute |
| **TradeRoute** | Major trade corridors | → Port (origin/dest), Carrier |
| **CargoType** | Commodity classification | → Container |
| **Charter** | Vessel charter agreements | → Vessel |
| **Booking** | Freight booking records | → Shipment, Carrier |
| **TradeData** | Aggregate trade statistics | → Port, CargoType |
| **VoyageLeg** | Individual voyage segments | → Vessel, Port |

---

*Last updated: 2025-07-10 — This is a living document. Update as milestones are reached.*
