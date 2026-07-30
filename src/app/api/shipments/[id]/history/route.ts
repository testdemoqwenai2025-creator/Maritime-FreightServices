// ============================================================================
// GET /api/shipments/[id]/history
// Full event timeline for a shipment — complete audit trail.
// Leap 2: Immutable event log with state transitions.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getShipmentStatechart, getAggregateStatus } from '@/lib/state-machine';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');
  const includeInvalid = searchParams.get('includeInvalid') === 'true';

  const shipment = await db.shipment.findUnique({
    where: { id },
    select: { id: true, status: true, billOfLading: true },
  });

  if (!shipment) {
    return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
  }

  const where: Record<string, unknown> = { shipmentId: id };
  if (!includeInvalid) {
    where.isValid = true;
  }

  const [events, total] = await Promise.all([
    db.shipmentEvent.findMany({
      where,
      orderBy: { sequence: 'asc' },
      take: limit,
      skip: offset,
    }),
    db.shipmentEvent.count({ where: { shipmentId: id } }),
  ]);

  const statechart = getShipmentStatechart();

  // Build timeline with state transitions
  const timeline = events.map((event, index) => {
    const prevState = event.previousState || (index === 0 ? statechart.initialState : events[index - 1].computedState);
    const newState = event.computedState || prevState;

    return {
      sequence: event.sequence,
      timestamp: event.createdAt,
      eventType: event.eventType,
      transition: {
        from: prevState,
        fromStatus: getAggregateStatus(prevState),
        to: newState,
        toStatus: getAggregateStatus(newState),
        isStateChanged: prevState !== newState,
      },
      actor: event.actor || event.performedBy || 'system',
      location: event.location,
      coordinates: event.latitude && event.longitude
        ? { lat: event.latitude, lng: event.longitude }
        : null,
      description: event.eventDesc,
      metadata: event.metadata ? JSON.parse(event.metadata) : null,
      isValid: event.isValid,
      id: event.id,
    };
  });

  // Compute state duration for each event
  const enrichedTimeline = timeline.map((item, index) => {
    const nextEvent = timeline[index + 1];
    const durationMs = nextEvent
      ? new Date(nextEvent.timestamp).getTime() - new Date(item.timestamp).getTime()
      : null;
    const durationHours = durationMs ? Math.round(durationMs / (1000 * 60 * 60)) : null;

    return {
      ...item,
      stateDuration: durationHours ? `${durationHours}h` : 'current',
      stateDurationHours: durationHours,
    };
  });

  return NextResponse.json({
    shipmentId: id,
    billOfLading: shipment.billOfLading,
    legacyStatus: shipment.status,
    projectedStatus: events.length > 0
      ? getAggregateStatus(events[events.length - 1].computedState || shipment.status)
      : shipment.status,
    totalEvents: total,
    pagination: { limit, offset, returned: enrichedTimeline.length },
    timeline: enrichedTimeline,
  });
}
