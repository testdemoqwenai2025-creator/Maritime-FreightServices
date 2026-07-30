// ============================================================================
// State Machine Engine — Transition Validation, Guard Evaluation, Projection
// ============================================================================
// Leap 1: Formal statechart engine with transition validation
// Leap 2: Event projection — compute current state from event replay
// ============================================================================

import type {
  Statechart,
  TransitionResult,
  AvailableTransition,
  TransitionContext,
  HierarchicalStateId,
  DomainEvent,
  ProjectedState,
  TimeTravelState,
  EventAppendRequest,
  EventAppendResult,
  EventType,
} from './types';
import { shipmentStatechartV1 } from './shipment-statechart';
import { STATE_TO_STATUS } from './types';

// ---- Statechart Registry ----

const statechartRegistry: Record<string, Statechart> = {
  Shipment: shipmentStatechartV1,
};

export function getStatechart(entity: string): Statechart {
  const sc = statechartRegistry[entity];
  if (!sc) throw new Error(`No statechart registered for entity: ${entity}`);
  return sc;
}

export function getShipmentStatechart(): Statechart {
  return shipmentStatechartV1;
}

// ---- Leap 1: Transition Validation Engine ----

/**
 * Validate whether a transition from `currentState` via `event` is valid
 * according to the statechart rules.
 */
export function validateTransition(
  statechart: Statechart,
  currentState: HierarchicalStateId,
  event: EventType,
  context?: Partial<TransitionContext>
): TransitionResult {
  const errors: string[] = [];

  // Find applicable transitions
  const applicable = statechart.transitions.filter(
    (t) => (t.from === currentState || t.from === '*') && t.event === event
  );

  if (applicable.length === 0) {
    return {
      valid: false,
      from: currentState,
      to: currentState,
      event,
      errors: [`No transition defined from '${currentState}' via event '${event}'`],
    };
  }

  // Evaluate each applicable transition (specific matches first)
  const specific = applicable.find((t) => t.from === currentState);
  const wildcard = applicable.find((t) => t.from === '*');
  const transition = specific || wildcard!;

  // Evaluate guard if present
  let guardResult = true;
  let guardReason: string | undefined;

  if (transition.guard && context) {
    const fullContext: TransitionContext = {
      currentState,
      targetState: transition.to,
      event,
      actor: context.actor || 'system',
      shipmentId: context.shipmentId,
      entityData: context.entityData,
      metadata: context.metadata,
    };
    guardResult = transition.guard(fullContext);
    guardReason = guardResult ? undefined : 'Guard condition not met';
  }

  // Check if target state is terminal and event is not a terminal event
  const targetIsTerminal = statechart.terminalStates.includes(currentState);
  if (targetIsTerminal && event !== 'Archived') {
    return {
      valid: false,
      from: currentState,
      to: currentState,
      event,
      errors: [`Cannot transition from terminal state '${currentState}'`],
    };
  }

  const valid = guardResult;

  return {
    valid,
    from: currentState,
    to: transition.to,
    event,
    guardResult,
    guardReason,
    errors: valid ? [] : [guardReason || 'Transition blocked'],
  };
}

/**
 * Execute a transition — returns the new state after applying the event.
 */
export function executeTransition(
  statechart: Statechart,
  currentState: HierarchicalStateId,
  event: EventType,
  context?: Partial<TransitionContext>
): { newState: HierarchicalStateId; result: TransitionResult } {
  const result = validateTransition(statechart, currentState, event, context);
  return {
    newState: result.valid ? result.to : currentState,
    result,
  };
}

/**
 * Get all available transitions from a given state.
 */
export function getAvailableTransitions(
  statechart: Statechart,
  currentState: HierarchicalStateId
): AvailableTransition[] {
  const transitions = statechart.transitions.filter(
    (t) => t.from === currentState || t.from === '*'
  );

  // Deduplicate by event (prefer specific over wildcard)
  const seen = new Set<string>();
  return transitions.reduce<AvailableTransition[]>((acc, t) => {
    const key = `${t.from}:${t.event}`;
    if (seen.has(t.event)) return acc;
    seen.add(t.event);

    // Skip terminal-state transitions if not applicable
    if (statechart.terminalStates.includes(currentState) && t.event !== 'Archived') {
      return acc;
    }

    acc.push({
      event: t.event,
      targetState: t.to,
      description: t.description,
      isGuarded: !!t.guard,
    });
    return acc;
  }, []);
}

/**
 * Get parent state for a hierarchical state.
 */
export function getParentState(state: HierarchicalStateId): HierarchicalStateId | undefined {
  for (const s of shipmentStatechartV1.states) {
    if (s.id === state && s.parent) return s.parent;
  }
  return undefined;
}

/**
 * Get aggregate shipment status from a hierarchical state.
 */
export function getAggregateStatus(hierarchicalState: HierarchicalStateId): string {
  return STATE_TO_STATUS[hierarchicalState] || hierarchicalState;
}

// ---- Leap 2: Event Sourcing — Projections ----

/**
 * Project the current state from a list of domain events.
 * Replays events in sequence order to compute the final state.
 */
export function projectStateFromEvents(
  statechart: Statechart,
  events: Array<{
    eventType: EventType;
    sequence: number;
    previousState: string;
    computedState: string;
    createdAt: Date;
  }>
): ProjectedState {
  if (events.length === 0) {
    return {
      currentState: statechart.initialState,
      parallelRegions: initParallelRegions(statechart),
      lastEvent: null as unknown as DomainEvent,
      eventCount: 0,
      enteredAt: new Date(),
      durationMs: 0,
    };
  }

  // Sort by sequence
  const sorted = [...events].sort((a, b) => a.sequence - b.sequence);
  const last = sorted[sorted.length - 1];

  return {
    currentState: last.computedState as HierarchicalStateId,
    parentState: getParentState(last.computedState as HierarchicalStateId),
    parallelRegions: projectParallelRegions(statechart, sorted),
    lastEvent: last as unknown as DomainEvent,
    eventCount: sorted.length,
    enteredAt: last.createdAt,
    durationMs: Date.now() - last.createdAt.getTime(),
  };
}

/**
 * Project state at a specific point in time (time-travel query).
 */
export function projectStateAtTimestamp(
  statechart: Statechart,
  events: Array<{
    eventType: EventType;
    sequence: number;
    previousState: string;
    computedState: string;
    createdAt: Date;
  }>,
  timestamp: Date
): TimeTravelState {
  const beforeTimestamp = events.filter(
    (e) => new Date(e.createdAt) <= timestamp
  ).sort((a, b) => a.sequence - b.sequence);

  const current = beforeTimestamp.length > 0
    ? beforeTimestamp[beforeTimestamp.length - 1]
    : null;

  return {
    timestamp,
    state: (current?.computedState || statechart.initialState) as HierarchicalStateId,
    parentState: getParentState(
      (current?.computedState || statechart.initialState) as HierarchicalStateId
    ),
    eventHistory: beforeTimestamp as unknown as DomainEvent[],
    parallelRegions: current
      ? projectParallelRegions(statechart, beforeTimestamp)
      : initParallelRegions(statechart),
  };
}

/**
 * Build an EventAppendResult — validates transition, computes new state.
 */
export function buildEventAppend(
  statechart: Statechart,
  currentState: HierarchicalStateId,
  request: EventAppendRequest
): EventAppendResult {
  const transitionResult = validateTransition(
    statechart,
    currentState,
    request.eventType,
    { actor: request.actor, metadata: request.metadata }
  );

  if (!transitionResult.valid) {
    return {
      success: false,
      transitionResult,
    };
  }

  const event: DomainEvent = {
    id: '', // Will be assigned by DB
    entityType: 'Shipment',
    entityId: '', // Will be assigned by caller
    sequence: 0,  // Will be assigned by caller
    eventType: request.eventType,
    previousState: currentState,
    computedState: transitionResult.to,
    actor: request.actor,
    location: request.location,
    latitude: request.latitude,
    longitude: request.longitude,
    eventDesc: request.eventDesc,
    metadata: request.metadata,
    createdAt: new Date(),
  };

  const projected: ProjectedState = {
    currentState: transitionResult.to,
    parentState: getParentState(transitionResult.to),
    parallelRegions: initParallelRegions(statechart),
    lastEvent: event,
    eventCount: 1,
    enteredAt: event.createdAt,
    durationMs: 0,
  };

  return {
    success: true,
    event,
    transitionResult,
    projectedState: projected,
  };
}

// ---- Internal Helpers ----

function initParallelRegions(statechart: Statechart): Record<string, string> {
  const regions: Record<string, string> = {};
  if (statechart.parallelRegions) {
    for (const r of statechart.parallelRegions) {
      regions[r.name] = r.initialState;
    }
  }
  return regions;
}

function projectParallelRegions(
  statechart: Statechart,
  _events: Array<{ eventType: EventType; sequence: number; previousState: string; computedState: string; createdAt: Date }>
): Record<string, string> {
  // For now, return initial states. Full parallel region projection
  // would track customs/docs/financial events independently.
  return initParallelRegions(statechart);
}
