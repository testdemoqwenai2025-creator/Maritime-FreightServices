// ============================================================================
// GET /api/state-machine/drift?expected=AtSea&observed=Exception&severity=medium
// Detects state distribution drift using KL divergence — Leap 3
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { detectStateDrift, computeStateDistribution, getShipmentStatechart, getAggregateStatus } from '@/lib/state-machine';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const expectedState = searchParams.get('expected');
  const observedState = searchParams.get('observed');

  if (!expectedState || !observedState) {
    return NextResponse.json(
      { error: 'Query parameters "expected" and "observed" are required.' },
      { status: 400 }
    );
  }

  const statechart = getShipmentStatechart();

  // Compute expected and observed distributions from each state
  const expectedDist = computeStateDistribution(statechart, expectedState, 3);
  const observedDist = computeStateDistribution(statechart, observedState, 3);

  // Build observed distribution centered on the observed state
  const observedAsDistribution: Record<string, number> = {};
  observedAsDistribution[observedState] = 0.85; // High probability of observed state
  // Distribute remaining probability
  const remaining = 0.15;
  const otherStates = Object.keys(expectedDist.distribution).filter((s) => s !== observedState);
  for (let i = 0; i < otherStates.length; i++) {
    observedAsDistribution[otherStates[i]] = remaining / otherStates.length;
  }

  const driftResult = detectStateDrift(
    expectedState,
    observedState,
    expectedDist.distribution,
    observedAsDistribution
  );

  return NextResponse.json({
    analysis: {
      expectedState,
      expectedStatus: getAggregateStatus(expectedState),
      observedState,
      observedStatus: getAggregateStatus(observedState),
    },
    drift: {
      detected: driftResult.driftDetected,
      severity: driftResult.driftSeverity,
      klDivergence: driftResult.klDivergence,
      explanation: getDriftExplanation(driftResult.klDivergence),
    },
    distributions: {
      expected: Object.entries(expectedDist.distribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([state, prob]) => ({
          state,
          status: getAggregateStatus(state),
          probability: `${Math.round(prob * 100)}%`,
        })),
      observed: Object.entries(observedAsDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([state, prob]) => ({
          state,
          status: getAggregateStatus(state),
          probability: `${Math.round((prob as number) * 100)}%`,
        })),
    },
    recommendation: driftResult.recommendation,
  });
}

function getDriftExplanation(klDivergence: number): string {
  if (klDivergence < 0.05) return 'States are statistically indistinguishable — normal behavior.';
  if (klDivergence < 0.2) return 'Minor deviation — within expected variance for maritime operations.';
  if (klDivergence < 0.5) return 'Moderate deviation — may indicate weather delay, minor reroute, or port congestion effect.';
  if (klDivergence < 1.0) return 'Significant deviation — likely route deviation, prolonged delay, or operational issue.';
  return 'Critical deviation — anomalous behavior requiring immediate investigation.';
}
