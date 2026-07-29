// ============================================================================
// Shipment Statechart Definition v1.0
// ============================================================================
// Hierarchical state machine for the Shipment lifecycle.
// Version: 1.0
// Last updated: 2026-07-29
//
// Structure:
//   [Shipment Lifecycle]
//   ├── Active
//   │   ├── Booked
//   │   ├── Customs Clearance
//   │   │   ├── Pending
//   │   │   ├── Filed
//   │   │   ├── Cleared
//   │   │   ├── Held
//   │   │   └── Rejected
//   │   ├── Pre-Transit
//   │   └── In Transit
//   │       ├── AtSea
//   │       ├── Approaching
//   │       └── Exception
//   ├── Arrived
//   ├── Discharging
//   ├── Post-Discharge
//   ├── Delivered
//   └── Terminal
//       ├── Cancelled
//       └── Archived
// ============================================================================

import type { Statechart } from './types';

export const shipmentStatechartV1: Statechart = {
  version: '1.0',
  entity: 'Shipment',
  initialState: 'Booked',
  terminalStates: ['Delivered', 'Archived'],

  // ---- Hierarchical States ----
  states: [
    // Top-level aggregate states
    { id: 'Booked', initial: true, meta: { phase: 'Active', region: 'logistics' } },
    { id: 'Customs Clearance', meta: { phase: 'Active', region: 'logistics' } },
    { id: 'Pre-Transit', meta: { phase: 'Active', region: 'logistics' } },
    { id: 'In Transit', meta: { phase: 'Active', region: 'logistics' } },
    { id: 'Arrived', meta: { phase: 'Discharge', region: 'logistics' } },
    { id: 'Discharging', meta: { phase: 'Discharge', region: 'logistics' } },
    { id: 'Post-Discharge', meta: { phase: 'Discharge', region: 'logistics' } },
    { id: 'Delivered', isTerminal: true, meta: { phase: 'Complete', region: 'logistics' } },

    // Sub-states of In Transit
    { id: 'AtSea', parent: 'In Transit', meta: { phase: 'Active', region: 'logistics' } },
    { id: 'Approaching', parent: 'In Transit', meta: { phase: 'Active', region: 'logistics' } },
    { id: 'Exception', parent: 'In Transit', meta: { phase: 'Active', region: 'logistics' } },

    // Sub-states of Customs Clearance
    { id: 'CustomsPending', parent: 'Customs Clearance', meta: { phase: 'Active', region: 'customs' } },
    { id: 'CustomsFiled', parent: 'Customs Clearance', meta: { phase: 'Active', region: 'customs' } },
    { id: 'CustomsCleared', parent: 'Customs Clearance', meta: { phase: 'Active', region: 'customs' } },
    { id: 'CustomsHeld', parent: 'Customs Clearance', meta: { phase: 'Active', region: 'customs' } },
    { id: 'CustomsRejected', parent: 'Customs Clearance', meta: { phase: 'Active', region: 'customs' } },

    // Terminal states
    { id: 'Cancelled', isTerminal: true, meta: { phase: 'Terminal', region: 'logistics' } },
    { id: 'Archived', isTerminal: true, meta: { phase: 'Complete', region: 'logistics' } },
  ],

  // ---- State Transitions ----
  transitions: [
    // Booking phase
    {
      from: '*',
      event: 'Booked',
      to: 'Booked',
      description: 'Shipment created / booking confirmed',
    },

    // Customs clearance flow
    {
      from: 'Booked',
      event: 'CustomsFiled',
      to: 'CustomsFiled',
      description: 'Customs declaration filed',
    },
    {
      from: 'CustomsFiled',
      event: 'CustomsCleared',
      to: 'CustomsCleared',
      description: 'Customs clearance granted',
    },
    {
      from: 'CustomsFiled',
      event: 'CustomsHeld',
      to: 'CustomsHeld',
      description: 'Customs inspection triggered — shipment held',
    },
    {
      from: 'CustomsHeld',
      event: 'CustomsReleased',
      to: 'CustomsCleared',
      description: 'Customs hold released after inspection',
    },
    {
      from: 'CustomsFiled',
      event: 'CustomsRejected',
      to: 'CustomsRejected',
      description: 'Customs declaration rejected',
    },
    {
      from: 'CustomsRejected',
      event: 'CustomsFiled',
      to: 'CustomsFiled',
      description: 'Customs re-filed after rejection',
    },

    // Pre-transit (gate-in, loading)
    {
      from: 'CustomsCleared',
      event: 'GateIn',
      to: 'Pre-Transit',
      description: 'Cargo gated into terminal after customs clearance',
    },
    {
      from: 'Pre-Transit',
      event: 'Loaded',
      to: 'Pre-Transit',
      description: 'Cargo loaded onto vessel — still in port',
    },
    {
      from: 'Pre-Transit',
      event: 'Departed',
      to: 'AtSea',
      description: 'Vessel departed — shipment now in transit at sea',
    },

    // In-transit sub-states
    {
      from: 'AtSea',
      event: 'AtSea',
      to: 'AtSea',
      description: 'Mid-voyage position update',
    },
    {
      from: 'AtSea',
      event: 'Approaching',
      to: 'Approaching',
      description: 'Vessel approaching destination port (within 48h)',
    },
    {
      from: 'Approaching',
      event: 'AtSea',
      to: 'AtSea',
      description: 'Vessel slowed / diverted — back to open sea',
    },
    {
      from: 'Approaching',
      event: 'Arrived',
      to: 'Arrived',
      description: 'Vessel arrived at destination port',
    },

    // Exception handling in transit
    {
      from: 'AtSea',
      event: 'Exception',
      to: 'Exception',
      description: 'Voyage exception — weather delay, mechanical issue, reroute',
    },
    {
      from: 'Exception',
      event: 'ExceptionResolved',
      to: 'AtSea',
      description: 'Exception resolved — voyage resumes',
    },
    {
      from: 'Approaching',
      event: 'Exception',
      to: 'Exception',
      description: 'Exception during approach — e.g., port closure',
    },
    {
      from: 'Exception',
      event: 'Arrived',
      to: 'Arrived',
      description: 'Arrived after exception resolution',
    },

    // Discharge flow
    {
      from: 'Arrived',
      event: 'Discharging',
      to: 'Discharging',
      description: 'Cargo discharge operations began',
    },
    {
      from: 'Discharging',
      event: 'DischargeComplete',
      to: 'Post-Discharge',
      description: 'All cargo discharged from vessel',
    },
    {
      from: 'Post-Discharge',
      event: 'GateOut',
      to: 'Delivered',
      description: 'All containers gated out — delivery complete',
    },

    // Cancellation (can happen from most non-terminal states)
    {
      from: 'Booked',
      event: 'Cancelled',
      to: 'Cancelled',
      description: 'Shipment cancelled during booking phase',
    },
    {
      from: 'CustomsFiled',
      event: 'Cancelled',
      to: 'Cancelled',
      description: 'Shipment cancelled during customs processing',
    },
    {
      from: 'CustomsHeld',
      event: 'Cancelled',
      to: 'Cancelled',
      description: 'Shipment cancelled while held by customs',
    },
    {
      from: 'Pre-Transit',
      event: 'Cancelled',
      to: 'Cancelled',
      description: 'Shipment cancelled before departure',
    },

    // Archiving
    {
      from: 'Delivered',
      event: 'Archived',
      to: 'Archived',
      description: 'Delivery completed and records archived',
    },
  ],

  // ---- Parallel Regions ----
  // These track independent sub-processes running alongside the main logistics state
  parallelRegions: [
    {
      name: 'customs',
      states: ['Pending', 'Filed', 'Cleared', 'Held', 'Rejected'],
      initialState: 'Pending',
    },
    {
      name: 'documentation',
      states: ['None', 'Partial', 'Complete', 'Verified', 'Expired'],
      initialState: 'None',
    },
    {
      name: 'financial',
      states: ['Proforma', 'Invoiced', 'Paid', 'Settled', 'Overdue', 'Disputed'],
      initialState: 'Proforma',
    },
  ],
};

export default shipmentStatechartV1;
