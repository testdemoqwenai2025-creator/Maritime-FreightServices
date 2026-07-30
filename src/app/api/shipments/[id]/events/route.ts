// ============================================================================
// POST /api/shipments/[id]/events
// Append a domain event to a shipment — triggers state machine transition.
// Leap 1: Validates transition against statechart.
// Leap 2: Records immutable event with sequence, actor, previous/computed state.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getShipmentStatechart,
  buildEventAppend,
  getAggregateStatus,
} from '@/lib/state-machine';
import type { EventType } from '@/lib/state-machine';

interface EventRequestBody {
  eventType: EventType;
  actor?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  eventDesc?: string;
  metadata?: Record<string, unknown>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const shipment = await db.shipment.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!shipment) {
    return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
  }

  const statechart = getShipmentStatechart();
  const events = await db.shipmentEvent.findMany({
    where: { shipmentId: id },
    orderBy: { sequence: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    shipmentId: id,
    currentStatus: shipment.status,
    currentHierarchicalState: events[0]?.computedState || shipment.status,
    recentEvents: events.map((e) => ({
      id: e.id,
      sequence: e.sequence,
      eventType: e.eventType,
      previousState: e.previousState,
      computedState: e.computedState,
      actor: e.actor || e.performedBy,
      location: e.location,
      eventDesc: e.eventDesc,
      isValid: e.isValid,
      createdAt: e.createdAt,
    })),
    totalEvents: await db.shipmentEvent.count({ where: { shipmentId: id } }),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Fetch shipment with current state
  const shipment = await db.shipment.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { sequence: 'desc' },
        take: 1,
      },
    },
  });

  if (!shipment) {
    return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
  }

  // Parse request body
  let body: EventRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.eventType) {
    return NextResponse.json(
      { error: 'Field "eventType" is required.' },
      { status: 400 }
    );
  }

  // Determine current state (from event-sourced projection)
  const currentState = shipment.events[0]?.computedState || shipment.status;

  // Build event append result (validates transition)
  const appendResult = buildEventAppend(getShipmentStatechart(), currentState, {
    eventType: body.eventType,
    actor: body.actor || 'system',
    location: body.location,
    latitude: body.latitude,
    longitude: body.longitude,
    eventDesc: body.eventDesc,
    metadata: body.metadata,
  });

  if (!appendResult.success) {
    return NextResponse.json(
      {
        error: 'Transition validation failed',
        currentState,
        attemptedEvent: body.eventType,
        transitionResult: appendResult.transitionResult,
      },
      { status: 422 }
    );
  }

  // Get next sequence number
  const maxSeq = await db.shipmentEvent.aggregate({
    where: { shipmentId: id },
    _max: { sequence: true },
  });
  const nextSequence = (maxSeq._max.sequence || 0) + 1;

  // Persist the event (immutable — append only)
  const event = await db.shipmentEvent.create({
    data: {
      shipmentId: id,
      sequence: nextSequence,
      eventType: body.eventType,
      previousState: currentState,
      computedState: appendResult.transitionResult.to,
      eventDesc: body.eventDesc,
      location: body.location,
      latitude: body.latitude,
      longitude: body.longitude,
      vesselName: shipment.vesselId || undefined,
      performedBy: body.actor || 'system',
      actor: body.actor || 'system',
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      isValid: appendResult.transitionResult.valid,
    },
  });

  // Update shipment status (aggregate projection)
  const newAggregateStatus = getAggregateStatus(appendResult.transitionResult.to);
  await db.shipment.update({
    where: { id },
    data: { status: newAggregateStatus },
  });

  return NextResponse.json({
    success: true,
    event: {
      id: event.id,
      sequence: event.sequence,
      eventType: event.eventType,
      previousState: event.previousState,
      computedState: event.computedState,
      aggregateStatus: newAggregateStatus,
      actor: event.actor,
      isValid: event.isValid,
      createdAt: event.createdAt,
    },
    transition: {
      from: appendResult.transitionResult.from,
      to: appendResult.transitionResult.to,
      valid: appendResult.transitionResult.valid,
    },
    shipmentUpdated: {
      id,
      previousStatus: shipment.status,
      newStatus: newAggregateStatus,
    },
  });
}
