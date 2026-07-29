// ============================================================================
// GET /api/state-machine/definition
// Returns the formal Shipment statechart definition (all states, transitions,
// parallel regions) — Leap 1: Hierarchical Statechart
// ============================================================================

import { NextResponse } from 'next/server';
import { shipmentStatechartV1 } from '@/lib/state-machine';

export async function GET() {
  return NextResponse.json({
    entity: shipmentStatechartV1.entity,
    version: shipmentStatechartV1.version,
    initialState: shipmentStatechartV1.initialState,
    terminalStates: shipmentStatechartV1.terminalStates,
    stateCount: shipmentStatechartV1.states.length,
    transitionCount: shipmentStatechartV1.transitions.length,
    states: shipmentStatechartV1.states.map((s) => ({
      id: s.id,
      parent: s.parent || null,
      isTerminal: s.isTerminal || false,
      isInitial: s.initial || false,
      isParallelRegion: s.isParallelRegion || false,
      regionName: s.regionName || null,
      meta: s.meta || {},
    })),
    transitions: shipmentStatechartV1.transitions.map((t) => ({
      from: t.from,
      to: t.to,
      event: t.event,
      hasGuard: !!t.guard,
      description: t.description || null,
    })),
    parallelRegions: shipmentStatechartV1.parallelRegions || [],
  });
}
