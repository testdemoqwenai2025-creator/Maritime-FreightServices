# Maritime Analytics Platform — Evolution Strategy & Architecture Vision

> Documenting the strategic architectural evolution from a heuristic analytics dashboard
> to a decades-proof, event-sourced, probabilistic maritime intelligence platform.

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [The State Machine Problem](#2-the-state-machine-problem)
3. [Three-Leap Evolution: Event-Sourced Hierarchical State Machines](#3-three-leap-evolution)
4. [Component Value Assessment](#4-component-value-assessment)
5. [Decades-Proof Architecture Principles](#5-decades-proof-architecture-principles)
6. [Iteration Roadmap](#6-iteration-roadmap)

---

## 1. Current State Assessment

### What Exists

The platform today is a Next.js 16 full-stack maritime analytics system with:
- **13 Prisma domain models** (Vessel, Port, Shipment, Container, Document, Event, Carrier, TradeRoute, CargoType, Charter, Booking, TradeData, VoyageLeg)
- **25+ routes** (5 pages + 20+ API endpoints including 5 AI engines)
- **Real-time vessel tracking** via Server-Sent Events (SSE)
- **5 heuristic AI engines** (ETA prediction, anomaly detection, demand forecasting, alert system, route optimization)
- **Dark mode dashboard** with 10+ tabs, Leaflet maps, Recharts analytics

### Critical Architectural Debt

| Issue | Severity | Impact |
|-------|----------|--------|
| States are plain strings with no DB constraints | High | Invalid states can be written silently |
| No state transition enforcement | High | `Booked → Delivered` is technically allowed |
| No PATCH/PUT endpoints | Medium | State cannot be transitioned via API |
| `ShipmentEvent` and `Shipment.status` are disconnected | High | Recording a `Departed` event does NOT advance `Shipment.status` to `In Transit` |
| No audit trail of transitions | Medium | Cannot answer "who moved this shipment to Held, when, and why?" |
| AI engines are fully heuristic with `Math.random()` | Medium | No ML, no model persistence, no real prediction capability |
| No TypeScript enums for states | Low | Status values scattered as hardcoded strings |

---

## 2. The State Machine Problem

Maritime logistics is fundamentally a **state machine problem**. Every shipment, container, vessel, booking, and charter progresses through a well-defined lifecycle. The current architecture treats state as an afterthought — a comment in a schema file rather than a first-class domain concept.

### Why This Matters

1. **Correctness**: Invalid state transitions cause operational errors (loading cargo before customs clearance, discharging before arrival).
2. **Auditability**: Regulatory frameworks (SOLAS, ISM Code, customs regimes) require immutable state transition logs.
3. **ML Trainability**: AI models need clean, event-sourced state sequences to learn from. Mutable state produces noisy training data.
4. **Multi-Party Coordination**: Shippers, carriers, customs, terminals each trigger state transitions. Without formal machines, coordination collapses.
5. **Temporal Queries**: "What was the state of this shipment on December 15th?" is impossible without event sourcing.

---

## 3. Three-Leap Evolution

### Leap 1 — Formal Hierarchical Statecharts

**Goal**: Replace scattered string states with typed, versioned state machine definitions.

**Key Concepts**:
- **Nested states**: `In Transit` contains sub-states `Loaded → Departed → AtSea → Approaching`. The parent constrains child reachability.
- **Parallel regions**: A Shipment simultaneously lives in *logistics*, *customs*, *documentation*, and *financial* regions. Each evolves independently but they interact (customs `Held` blocks logistics `Departed`).
- **Guards & actions**: `canDepart: () => customs === 'Cleared' && docs.every(d => d.status === 'Approved')`.
- **Statechart as data**: Transitions defined in TypeScript, versioned in Git, no deploys to change rules.

**Shipment Lifecycle Statechart**:

```
[Shipment Lifecycle]
├── Active
│   ├── Booked ──(customs filed)──▶ Customs Clearance
│   ├── Customs Clearance
│   │   ├── Cleared ──(gate in + loaded)──▶ Pre-Transit
│   │   ├── Held ──(released)──▶ Customs Clearance.Cleared
│   │   └── Rejected ──(appealed/re-filed)──▶ Customs Clearance
│   ├── Pre-Transit ──(vessel departed)──▶ In Transit
│   └── In Transit
│       ├── AtSea
│       ├── Approaching
│       └── Exception ──(resolved)──▶ In Transit.AtSea
├── Arrived ──(discharge complete)──▶ Discharging
├── Discharging ──(all containers out)──▶ Post-Discharge
├── Post-Discharge ──(gate out)──▶ Delivered
└── Terminal
    ├── Cancelled
    └── Archived
```

**Parallel Regions** (per shipment):

```
[Customs Region]     [Documentation Region]    [Financial Region]
Booked → Filed →     BOL → Invoice →           Proforma →
Cleared/Held →       PackingList → Cert →      Invoice →
Released             CustomsDec → Approved      Payment → Settled
```

**Guards**:
- `canDepart`: customs === 'Cleared' AND all docs approved AND vessel status === 'Underway'
- `canDischarge`: shipment.status === 'Arrived' AND berth assigned AND pilot aboard
- `canDeliver`: all containers gated out AND customs cleared at destination AND demurrage settled

### Leap 2 — Event Sourcing

**Goal**: `ShipmentEvent` becomes the source of truth. `Shipment.status` is a computed projection.

**Architecture**:

```
Event Store (append-only)          Projections (read models)
┌─────────────────────┐           ┌──────────────────────┐
│ Event 1: Booked     │           │ shipment.status      │
│   actor: system     │──────────▶│ customs.region       │
│   timestamp: ...    │  replay   │ docs.region          │
├─────────────────────┤           │ financial.region     │
│ Event 2: CustomsFiled│          └──────────────────────┘
│   actor: broker     │
│   timestamp: ...    │           ┌──────────────────────┐
├─────────────────────┤           │ Time-travel query    │
│ Event 3: Departed   │──────────▶│ "State at 2025-12-15"│
│   actor: master     │           └──────────────────────┘
└─────────────────────┘
```

**Benefits**:
- **Time travel**: Reconstruct shipment state at any past timestamp.
- **Causal replay**: Re-run projections when business rules change.
- **Audit by construction**: Every transition is immutable with actor, timestamp, payload.
- **CQRS separation**: Writes are event appends (fast); reads are materialized projections (optimized).

**Enhanced Event Schema**:
- `sequence` — Event ordering within a shipment
- `actor` — Who/what triggered this transition
- `previousStatus` — State before the event
- `computedStatus` — State after the event
- `metadata` — JSON payload (reason, documents, weather, etc.)
- `signature` — Optional cryptographic proof for regulatory submissions

### Leap 3 — Probabilistic & Causal State Machines

**Goal**: State machines that reason under uncertainty, not just enforce rules.

**Key Concepts**:

1. **Probabilistic Transitions**: Instead of deterministic `A → B`, emit probability distributions.
   - `P(Arrived on time | currentState, weather, congestion) = 0.87`
   - Uses Bayesian belief networks or Hidden Markov Models over the event stream.

2. **Causal State Machines**: Model cascading effects across the supply chain.
   - Weather delay at Suez propagates through every downstream vessel.
   - Uses causal inference (Pearl's do-calculus) for counterfactuals: "Had we rerouted at day 3, would arrival have been on time?"

3. **Behavioral State Fingerprints**: A vessel's "state" is a distribution over speed, heading variance, AIS cadence, port-call duration.
   - Anomaly detection becomes **state distribution drift detection** (KL divergence, Wasserstein distance).
   - Not threshold-based, but statistical.

**Implementation**:
- Transition probability matrix estimated from historical event data
- Online Bayesian updating as new events arrive
- KL divergence scoring for state drift detection
- Causal graph for supply chain propagation analysis

---

## 4. Component Value Assessment

### Highest-Value New Components

| Component | Why It Matters | Network Effect |
|-----------|---------------|-----------------|
| **Carbon Ledger** | EU ETS (2024+), FuelEU Maritime (2025), IMO 2050 — carbon is the second-most-important number after TEU | Regulatory lock-in: once shippers use it for compliance, switching cost is enormous |
| **Sanctions & Geopolitical Risk Layer** | Red Sea, Russia sanctions, Panama drought — events rewrite trade routes in hours | No single-tenant system captures this; multi-source risk aggregation is the moat |
| **Vessel Identity & Fingerprinting** | Ownership graph, behavioral fingerprint, AIS anomaly scoring | What Windward and MarineTraffic sell for 6-figure contracts |
| **Freight Rate Intelligence** | Spot rate indices, contract benchmarks, 30/60/90-day forecasts | Expands audience from operational to commercial (10x the buyers) |
| **eBL with Verifiable Credentials** | DCSA standard, mandated by 2030, W3C VC signing | Transactional revenue: every eBL issued can be a microtransaction |
| **Digital Twin for Port Operations** | Berth allocation, crane scheduling, gate flow simulation | Enterprise sales with high-ticket, multi-year contracts |

### Components to Evolve

| Existing Component | Evolution Direction |
|--------------------|---------------------|
| Heuristic AI engines | Replace with trained models (gradient boosting on event sequences, Transformer for ETA) |
| Static trade routes | Dynamic route feasibility engine (sanctions + weather + congestion → viable routes) |
| String-based statuses | Formal statecharts with guards and parallel regions |
| Single-tenant architecture | Multi-tenant with RBAC, per-tenant config, organization isolation |
| SQLite | PostgreSQL + PostGIS for spatial queries, full-text search, JSONB for event payloads |

---

## 5. Decades-Proof Architecture Principles

### Principle 1: Domain-Driven Design over Framework Fidelity
Next.js 16 won't exist in 2035. Prisma may not. But the maritime domain — vessels, ports, shipments, bills of lading, charter parties — has been stable since the 1600s. Isolate domain models from infrastructure. The domain layer should be portable to any framework in a week.

### Principle 2: Open Standards over Proprietary Schemas
- **DCSA IoT Connectivity & eBL** — industry convergence target
- **BIMCO** charter party schemas
- **SMDG** vessel schedule schemas (EDIFACT)
- **UN/EDIFACT** for customs
- **IMO GAMSO** vessel safety taxonomy
- **ISO 28000** supply chain security

### Principle 3: Event Sourcing as Anti-Fragility
Regulations change every year for the next 30 years (carbon, sanctions, autonomous vessel codes, polar codes). Event sourcing means re-projecting history under new rules without losing data. A 2024 shipment re-evaluated for 2030 carbon accounting is impossible with mutable state.

### Principle 4: Composable Architecture (MACH)
Microservices, API-first, Cloud-native, Headless. The ETA engine, anomaly detector, document workflow, carbon ledger — all independently deployable with stable APIs. Swap a heuristic for an ML model without touching the UI. Offer the carbon ledger as standalone SaaS.

### Principle 5: Build for Climate Rewrite
By 2050 the maritime map changes:
- **Arctic routes** open 6+ months/year (Northern Sea Route, Northwest Passage)
- **Panama Canal** chronic water-level restrictions
- **Suez** periodically unviable due to geopolitics
- **Green corridors** mandatory zero-emission zones
- **Ammonia/methanol/hydrogen** bunkering hubs reshape port hierarchy

Hardcode nothing about routes. Every route is a graph edge with a validity window, a risk surface, and a carbon cost.

---

## 6. Iteration Roadmap

### Horizon 1 — Foundations (Current Sprint)
- [x] Formal statecharts for Shipment lifecycle (Leap 1)
- [x] Event-sourcing layer with projections (Leap 2)
- [x] Probabilistic transition engine (Leap 3)
- [x] State machine API endpoints (transitions, history, replay, probabilities)
- [x] State machine visualizer in Dashboard

### Horizon 2 — Real Data
- [ ] Live AIS feeds (Spire/Orbcomm/VesselFinder)
- [ ] UN Comtrade API integration
- [ ] NOAA weather feeds (wave height, wind speed, storm tracking)
- [ ] Port congestion real-time data

### Horizon 3 — Real ML
- [ ] Feature store from event-sourced data
- [ ] Trained ETA models (gradient boosting / Transformer on event sequences)
- [ ] Model registry with versioning
- [ ] Online inference with A/B testing

### Horizon 4 — Multi-Party
- [ ] eBL with verifiable credentials (DCSA standard)
- [ ] Customs filing APIs (ACE, AES, NACCS)
- [ ] Terminal TOS integration
- [ ] Smart contract payment release

### Horizon 5 — Autonomous
- [ ] Digital twin for port operations
- [ ] Predictive maintenance from IoT telemetry
- [ ] Autonomous route negotiation between carriers and shippers

---

*This document is a living architecture vision. Update as horizons are reached.*
*Last updated: 2026-07-29*
