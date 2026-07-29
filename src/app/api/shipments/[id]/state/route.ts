// ============================================================================
// GET /api/shipments/[id]/state
// Returns the current projected state of a shipment from its event log.
// Leap 2: State is computed from events, not read from a mutable field.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getShipmentStatechart,
  projectStateFromEvents,
  getAvailableTransitions,
  computeTransitionProbabilities,
  getAggregateStatus,
  getParentState,
} from '@/lib/state-machine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const includeTransitions = searchParams.get('transitions') === 'true';
  const includeProbabilities = searchParams.get('probabilities') === 'true';

  const shipment = await db.shipment.findUnique({
    where: { id },
    include: {
      vessel: { select: { name: true, maxSpeed: true, status: true } },
      originPort: { select: { name: true, congestionLevel: true } },
      destPort: { select: { name: true, congestionLevel: true } },
      events: {
        orderBy: { sequence: 'asc' },
      },
    },
  });

  if (!shipment) {
    return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
  }

  const statechart = getShipmentStatechart();

  // Project state from event log (Leap 2)
  const projected = projectStateFromEvents(statechart, shipment.events.map((e) => ({
    eventType: e.eventType as any,
    sequence: e.sequence,
    previousState: e.previousState || 'Booked',
    computedState: e.computedState || 'Booked',
    createdAt: e.createdAt,
  })));

  // Build response
  const response: Record<string, unknown> = {
    shipmentId: id,
    // Legacy status (from mutable field)
    legacyStatus: shipment.status,
    // Event-sourced state (Leap 2)
    projectedState: {
      hierarchicalState: projected.currentState,
      aggregateStatus: getAggregateStatus(projected.currentState),
      parentState: projected.parentState,
      enteredAt: projected.enteredAt,
      durationMs: projected.durationMs,
      eventCount: projected.eventCount,
    },
    // Parallel regions (Leap 1)
    parallelRegions: projected.parallelRegions,
    // Event summary
    lastEvent: projected.lastEvent
      ? {
          sequence: projected.lastEvent.sequence,
          eventType: projected.lastEvent.eventType,
          actor: projected.lastEvent.actor,
          timestamp: projected.lastEvent.createdAt,
        }
      : null,
    // Vessel and port context
    context: {
      vessel: shipment.vessel,
      originPort: shipment.originPort,
      destPort: shipment.destPort,
    },
  };

  // Optional: available transitions
  if (includeTransitions) {
    const available = getAvailableTransitions(statechart, projected.currentState);
    (response as any).availableTransitions = available.map((t) => ({
      event: t.event,
      targetState: t.targetState,
      targetStatus: getAggregateStatus(t.targetState),
      description: t.description,
      isGuarded: t.isGuarded,
    }));
  }

  // Optional: transition probabilities (Leap 3)
  if (includeProbabilities) {
    const destCongestion = shipment.destPort?.congestionLevel as 'Low' | 'Medium' | 'High' | 'Critical' | undefined;
    const probs = computeTransitionProbabilities(statechart, projected.currentState, {
      portCongestion: destCongestion,
      weatherRisk: 'Medium',
      seasonFactor: 1.0,
      carrierReliability: 85,
    });
    (response as any).transitionProbabilities = probs.map((p) => ({
      targetState: p.to,
      targetStatus: getAggregateStatus(p.to),
      probability: p.probability,
      confidence: p.confidence,
      sampleSize: p.sampleSize,
    }));
  }

  return NextResponse.json(response);
}
