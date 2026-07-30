// ============================================================================
// GET /api/state-machine/transitions?state=AtSea
// Returns available transitions from a given state — Leap 1
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getShipmentStatechart, getAvailableTransitions, getAggregateStatus, getParentState } from '@/lib/state-machine';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state');

  if (!state) {
    return NextResponse.json(
      { error: 'Query parameter "state" is required. Use a valid hierarchical state ID.' },
      { status: 400 }
    );
  }

  const statechart = getShipmentStatechart();

  // Check if state exists
  const stateDef = statechart.states.find((s) => s.id === state);
  if (!stateDef) {
    return NextResponse.json(
      { error: `Unknown state: "${state}"`, validStates: statechart.states.map((s) => s.id) },
      { status: 404 }
    );
  }

  const available = getAvailableTransitions(statechart, state);

  return NextResponse.json({
    currentState: state,
    aggregateStatus: getAggregateStatus(state),
    parentState: getParentState(state) || null,
    isTerminal: stateDef.isTerminal || false,
    meta: stateDef.meta || {},
    availableTransitions: available.map((t) => ({
      event: t.event,
      targetState: t.targetState,
      targetAggregateStatus: getAggregateStatus(t.targetState),
      description: t.description,
      isGuarded: t.isGuarded,
    })),
    totalAvailable: available.length,
  });
}
