// ============================================================================
// State Machine Core Types — Event-Sourced Hierarchical State Machines
// ============================================================================
// Leap 1: Formal typed definitions for statecharts
// Leap 2: Event sourcing types (immutable event log, projections)
// Leap 3: Probabilistic types (transition probabilities, drift detection)
// ============================================================================

// ---- Leap 1: Core Statechart Types ----

/** Hierarchical state identifier — uses dot notation for nesting */
export type HierarchicalStateId = string; // e.g. "In Transit.AtSea"

/** Event type that can trigger transitions */
export type EventType =
  | 'Booked'
  | 'CustomsFiled'
  | 'CustomsCleared'
  | 'CustomsHeld'
  | 'CustomsReleased'
  | 'CustomsRejected'
  | 'GateIn'
  | 'Loaded'
  | 'Departed'
  | 'AtSea'
  | 'Approaching'
  | 'Arrived'
  | 'Discharging'
  | 'DischargeComplete'
  | 'GateOut'
  | 'Delivered'
  | 'Exception'
  | 'ExceptionResolved'
  | 'Cancelled'
  | 'Archived';

/** A guard function that checks if a transition is allowed */
export type GuardFn = (context: TransitionContext) => boolean;

/** Side-effect executed during a valid transition */
export type ActionFn = (context: TransitionContext) => void | Promise<void>;

/** A single state transition definition */
export interface Transition {
  from: HierarchicalStateId | '*'; // '*' = any state
  event: EventType;
  to: HierarchicalStateId;
  guard?: GuardFn;
  action?: ActionFn;
  description?: string;
}

/** A hierarchical state definition */
export interface HierarchicalState {
  id: HierarchicalStateId;
  parent?: HierarchicalStateId;
  children?: HierarchicalStateId[];
  initial?: boolean;
  isTerminal?: boolean;
  isParallelRegion?: boolean;
  regionName?: string;
  meta?: Record<string, string>;
}

/** Parallel region within a statechart */
export interface ParallelRegion {
  name: string;
  states: string[];
  initialState: string;
}

/** Complete statechart definition (versioned) */
export interface Statechart {
  version: string;
  entity: 'Shipment' | 'Container' | 'Vessel' | 'Booking' | 'Charter' | 'Document';
  states: HierarchicalState[];
  transitions: Transition[];
  parallelRegions?: ParallelRegion[];
  initialState: HierarchicalStateId;
  terminalStates: HierarchicalStateId[];
}

/** Context passed to guards and actions */
export interface TransitionContext {
  currentState: HierarchicalStateId;
  targetState: HierarchicalStateId;
  event: EventType;
  actor: string;
  shipmentId?: string;
  entityData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/** Result of a transition validation */
export interface TransitionResult {
  valid: boolean;
  from: HierarchicalStateId;
  to: HierarchicalStateId;
  event: EventType;
  guardResult?: boolean;
  guardReason?: string;
  errors: string[];
}

/** Available transitions from a given state */
export interface AvailableTransition {
  event: EventType;
  targetState: HierarchicalStateId;
  description?: string;
  isGuarded: boolean;
}

// ---- Leap 2: Event Sourcing Types ----

/** Immutable domain event stored in the event log */
export interface DomainEvent {
  id: string;
  entityType: 'Shipment' | 'Container' | 'Vessel' | 'Booking';
  entityId: string;
  sequence: number;
  eventType: EventType;
  previousState: HierarchicalStateId;
  computedState: HierarchicalStateId;
  actor: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  eventDesc?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/** Projected read model — current state computed from event replay */
export interface ProjectedState {
  currentState: HierarchicalStateId;
  parentState?: HierarchicalStateId;
  parallelRegions: Record<string, string>;
  lastEvent: DomainEvent;
  eventCount: number;
  enteredAt: Date;
  durationMs: number;
}

/** Time-travel query result — state at a point in time */
export interface TimeTravelState {
  timestamp: Date;
  state: HierarchicalStateId;
  parentState?: HierarchicalStateId;
  eventHistory: DomainEvent[];
  parallelRegions: Record<string, string>;
}

/** Event append request */
export interface EventAppendRequest {
  eventType: EventType;
  actor: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  eventDesc?: string;
  metadata?: Record<string, unknown>;
}

/** Event append result */
export interface EventAppendResult {
  success: boolean;
  event?: DomainEvent;
  transitionResult: TransitionResult;
  projectedState?: ProjectedState;
}

// ---- Leap 3: Probabilistic Types ----

/** Transition probability between two states given an event */
export interface TransitionProbability {
  from: HierarchicalStateId;
  to: HierarchicalStateId;
  event: EventType;
  probability: number; // 0-1
  confidence: number; // 0-1, based on sample size
  sampleSize: number;
}

/** Probabilistic state distribution — for a shipment at a given time */
export interface StateDistribution {
  timestamp: Date;
  distribution: Record<HierarchicalStateId, number>; // state → probability
  entropy: number; // Shannon entropy of the distribution
  mostLikely: HierarchicalStateId;
  mostLikelyProbability: number;
}

/** State drift detection result — compares two distributions */
export interface StateDriftResult {
  klDivergence: number; // Kullback-Leibler divergence
  wassersteinDistance?: number; // Earth mover's distance
  driftDetected: boolean;
  driftSeverity: 'None' | 'Low' | 'Medium' | 'High' | 'Critical';
  expectedState: string;
  observedState: string;
  expectedDistribution: Record<string, number>;
  observedDistribution: Record<string, number>;
  recommendation: string;
}

/** Causal propagation result — how an event affects downstream entities */
export interface CausalPropagation {
  sourceEvent: DomainEvent;
  affectedEntities: {
    entityType: string;
    entityId: string;
    impact: 'High' | 'Medium' | 'Low' | 'None';
    probabilityImpact: number;
    etaImpactDays?: number;
    description: string;
  }[];
  cascadeDepth: number;
}

/** ETA prediction with probability distribution */
export interface ProbabilisticETA {
  shipmentId: string;
  currentState: HierarchicalStateId;
  predictedArrival: Date;
  confidence: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  probabilityDistribution: {
    onTime: number;     // P(arrival <= ETA)
    delayed1_3d: number; // P(ETA < arrival <= ETA+3d)
    delayed3_7d: number;
    delayed7dPlus: number;
  };
  riskFactors: {
    factor: string;
    impact: number;
    probability: number;
  }[];
}

// ---- Shipment Status (backward-compatible aggregate states) ----

/** Aggregate shipment status — the "parent" states used in the existing system */
export const SHIPMENT_STATUS = {
  BOOKED: 'Booked',
  CUSTOMS_CLEARANCE: 'Customs Clearance',
  IN_TRANSIT: 'In Transit',
  ARRIVED: 'Arrived',
  DISCHARGING: 'Discharging',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
} as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUS)[keyof typeof SHIPMENT_STATUS];

/** Map from hierarchical sub-states to aggregate statuses */
export const STATE_TO_STATUS: Record<string, ShipmentStatus> = {
  Booked: 'Booked',
  'Customs Clearance': 'Customs Clearance',
  'Pre-Transit': 'Customs Clearance',
  'In Transit': 'In Transit',
  AtSea: 'In Transit',
  Approaching: 'In Transit',
  Arrived: 'Arrived',
  Discharging: 'Discharging',
  'Post-Discharge': 'Discharging',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
  Archived: 'Delivered',
};

/** Map from event types to the aggregate status they produce */
export const EVENT_TO_STATUS: Partial<Record<EventType, ShipmentStatus>> = {
  Booked: 'Booked',
  CustomsFiled: 'Customs Clearance',
  CustomsCleared: 'Customs Clearance',
  GateIn: 'Customs Clearance',
  Loaded: 'Customs Clearance',
  Departed: 'In Transit',
  AtSea: 'In Transit',
  Approaching: 'In Transit',
  Arrived: 'Arrived',
  Discharging: 'Discharging',
  DischargeComplete: 'Discharging',
  GateOut: 'Delivered',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
};
