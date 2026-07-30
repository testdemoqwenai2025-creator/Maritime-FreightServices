// ============================================================================
// GET /api/state-machine/probabilities?state=AtSea&congestion=High&weather=Medium
// Returns transition probabilities and state distribution — Leap 3: Probabilistic
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getShipmentStatechart,
  computeTransitionProbabilities,
  computeStateDistribution,
  getAggregateStatus,
} from '@/lib/state-machine';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state');
  const congestion = searchParams.get('congestion') as 'Low' | 'Medium' | 'High' | 'Critical' | undefined;
  const weather = searchParams.get('weather') as 'Low' | 'Medium' | 'High' | 'Critical' | undefined;
  const seasonFactor = searchParams.get('season') ? parseFloat(searchParams.get('season')!) : undefined;
  const reliability = searchParams.get('reliability') ? parseInt(searchParams.get('reliability')!) : undefined;
  const steps = searchParams.get('steps') ? parseInt(searchParams.get('steps')!) : 5;

  if (!state) {
    return NextResponse.json(
      { error: 'Query parameter "state" is required.' },
      { status: 400 }
    );
  }

  const statechart = getShipmentStatechart();
  const stateDef = statechart.states.find((s) => s.id === state);
  if (!stateDef) {
    return NextResponse.json(
      { error: `Unknown state: "${state}"`, validStates: statechart.states.map((s) => s.id) },
      { status: 404 }
    );
  }

  const riskFactors = {
    portCongestion: congestion,
    weatherRisk: weather,
    seasonFactor: seasonFactor || 1.0,
    carrierReliability: reliability || 85,
  };

  const probabilities = computeTransitionProbabilities(statechart, state, riskFactors);
  const distribution = computeStateDistribution(statechart, state, steps, riskFactors);

  return NextResponse.json({
    currentState: state,
    aggregateStatus: getAggregateStatus(state),
    riskFactors,
    simulationSteps: steps,
    transitionProbabilities: probabilities.map((p) => ({
      targetState: p.to,
      targetAggregateStatus: getAggregateStatus(p.to),
      event: p.event,
      probability: p.probability,
      probabilityPercent: `${Math.round(p.probability * 100)}%`,
      confidence: p.confidence,
      confidencePercent: `${Math.round(p.confidence * 100)}%`,
      sampleSize: p.sampleSize,
    })),
    stateDistribution: {
      timestamp: distribution.timestamp,
      entropy: distribution.entropy,
      mostLikelyState: distribution.mostLikely,
      mostLikelyStatus: getAggregateStatus(distribution.mostLikely),
      mostLikelyProbability: `${Math.round(distribution.mostLikelyProbability * 100)}%`,
      states: Object.entries(distribution.distribution)
        .sort((a, b) => b[1] - a[1])
        .map(([s, prob]) => ({
          state: s,
          status: getAggregateStatus(s),
          probability: prob,
          probabilityPercent: `${Math.round(prob * 100)}%`,
        })),
    },
  });
}
