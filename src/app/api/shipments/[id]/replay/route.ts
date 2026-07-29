// ============================================================================
// GET /api/shipments/[id]/replay?timestamp=2025-12-15T00:00:00Z
// Time-travel query — reconstruct shipment state at a specific point in time.
// Leap 2: Replay events up to a timestamp.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getShipmentStatechart,
  projectStateAtTimestamp,
  getAggregateStatus,
} from '@/lib/state-machine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const timestampStr = searchParams.get('timestamp');

  if (!timestampStr) {
    return NextResponse.json(
      { error: 'Query parameter "timestamp" is required (ISO 8601 format).' },
      { status: 400 }
    );
  }

  const timestamp = new Date(timestampStr);
  if (isNaN(timestamp.getTime())) {
    return NextResponse.json(
      { error: 'Invalid timestamp format. Use ISO 8601 (e.g., 2025-12-15T00:00:00Z).' },
      { status: 400 }
    );
  }

  const shipment = await db.shipment.findUnique({
    where: { id },
    select: { id: true, status: true, createdAt: true },
  });

  if (!shipment) {
    return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
  }

  // Fetch all events up to the timestamp
  const events = await db.shipmentEvent.findMany({
    where: {
      shipmentId: id,
      createdAt: { lte: timestamp },
    },
    orderBy: { sequence: 'asc' },
  });

  const statechart = getShipmentStatechart();

  // Project state at the given timestamp
  const timeTravelState = projectStateAtTimestamp(
    statechart,
    events.map((e) => ({
      eventType: e.eventType as any,
      sequence: e.sequence,
      previousState: e.previousState || 'Booked',
      computedState: e.computedState || 'Booked',
      createdAt: e.createdAt,
    })),
    timestamp
  );

  return NextResponse.json({
    shipmentId: id,
    queryTimestamp: timestamp.toISOString(),
    shipmentCreated: shipment.createdAt.toISOString(),
    timeTravelResult: {
      state: timeTravelState.state,
      aggregateStatus: getAggregateStatus(timeTravelState.state),
      parentState: timeTravelState.parentState,
      parallelRegions: timeTravelState.parallelRegions,
      eventsAtThatTime: timeTravelState.eventHistory.length,
      latestEventAtTime: timeTravelState.eventHistory.length > 0
        ? {
            sequence: timeTravelState.eventHistory[timeTravelState.eventHistory.length - 1].sequence,
            eventType: timeTravelState.eventHistory[timeTravelState.eventHistory.length - 1].eventType,
            timestamp: timeTravelState.eventHistory[timeTravelState.eventHistory.length - 1].createdAt,
          }
        : null,
    },
    currentState: {
      state: shipment.status,
      status: shipment.status,
    },
    eventsAtTime: timeTravelState.eventHistory.slice(-10).map((e) => ({
      sequence: e.sequence,
      eventType: e.eventType,
      previousState: e.previousState,
      computedState: e.computedState,
      actor: e.actor,
      timestamp: e.createdAt,
    })),
    note: 'This state was reconstructed by replaying events up to the requested timestamp. The "currentState" field shows the actual current state of the shipment.',
  });
}
