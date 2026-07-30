// ============================================================================
// Probabilistic State Machine — Bayesian Transition Probabilities & Drift Detection
// ============================================================================
// Leap 3: Transition probability estimation, state distribution, drift detection
// ============================================================================

import type {
  Statechart,
  HierarchicalStateId,
  EventType,
  DomainEvent,
  TransitionProbability,
  StateDistribution,
  StateDriftResult,
  ProbabilisticETA,
} from './types';
import {
  getShipmentStatechart,
  executeTransition,
} from './engine';

// ---- Historical Transition Probability Matrix ----
// Pre-estimated from maritime industry data (telemetry-grade baseline).
// In production, this would be trained from actual event data.

const BASE_TRANSITION_PROBS: Record<string, Record<string, number>> = {
  Booked: {
    CustomsFiled: 0.92,
    Cancelled: 0.06,
    // Direct customs clearance (rare fast-track): 0.02
  },
  CustomsFiled: {
    CustomsCleared: 0.85,
    CustomsHeld: 0.10,
    CustomsRejected: 0.03,
    Cancelled: 0.02,
  },
  CustomsHeld: {
    CustomsReleased: 0.75,
    Cancelled: 0.20,
    // Rejected after hold: 0.05
  },
  CustomsCleared: {
    GateIn: 0.95,
    // Loaded without gate-in scan: 0.05
  },
  'Pre-Transit': {
    Departed: 0.98,
    Cancelled: 0.02,
  },
  AtSea: {
    AtSea: 0.70,       // Stays at sea (position updates)
    Approaching: 0.25,  // Transitions to approaching
    Exception: 0.05,    // Exception during voyage
  },
  Approaching: {
    Arrived: 0.90,
    Exception: 0.05,
    AtSea: 0.05,        // Diverted back
  },
  Exception: {
    ExceptionResolved: 0.80,
    Arrived: 0.15,
    // Prolonged: 0.05
  },
  Arrived: {
    Discharging: 0.98,
    // Delayed discharge: 0.02
  },
  Discharging: {
    DischargeComplete: 0.96,
    // Partial discharge events: 0.04
  },
  'Post-Discharge': {
    GateOut: 0.94,
    // Delayed gate-out: 0.06
  },
  Delivered: {
    Archived: 0.10,  // Archiving rate (low — records stay active)
  },
};

// ---- Risk factor adjustments to transition probabilities ----

interface RiskFactor {
  factor: string;
  baseProbability: number;
  adjustedProbability: number;
  reason: string;
}

/**
 * Compute transition probabilities from a given state,
 * adjusted by risk factors (congestion, weather, season, carrier reliability).
 */
export function computeTransitionProbabilities(
  statechart: Statechart,
  currentState: HierarchicalStateId,
  riskFactors?: {
    portCongestion?: 'Low' | 'Medium' | 'High' | 'Critical';
    weatherRisk?: 'Low' | 'Medium' | 'High' | 'Critical';
    seasonFactor?: number; // 0.8 – 1.2 (Q4 peak = 1.15)
    carrierReliability?: number; // 0-100
  }
): TransitionProbability[] {
  const baseProbs = BASE_TRANSITION_PROBS[currentState] || {};
  const adjustments = computeRiskAdjustments(riskFactors);
  const results: TransitionProbability[] = [];

  // Collect historical sample sizes (simulated from industry baseline)
  const sampleSizes: Record<string, number> = {
    CustomsFiled: 12000,
    CustomsCleared: 10200,
    CustomsHeld: 1200,
    CustomsRejected: 360,
    GateIn: 11400,
    Departed: 11172,
    AtSea: 7820,
    Approaching: 2793,
    Exception: 559,
    ExceptionResolved: 447,
    Arrived: 4117,
    Discharging: 4035,
    DischargeComplete: 3874,
    DischargeComplete_low: 3874,
    GateOut: 3641,
    Cancelled: 722,
    Archived: 364,
  };

  for (const [targetState, baseProb] of Object.entries(baseProbs)) {
    // Apply risk adjustments
    let adjustedProb = baseProb;

    for (const adj of adjustments) {
      if (
        (adj.factor === 'congestion' && ['Arrived', 'Discharging', 'Post-Discharge'].includes(currentState)) ||
        (adj.factor === 'weather' && ['AtSea', 'Approaching', 'Exception'].includes(currentState)) ||
        (adj.factor === 'season' && ['AtSea', 'Approaching'].includes(currentState))
      ) {
        adjustedProb *= adj.adjustedProbability;
      }
    }

    // Normalize to ensure probabilities sum to ~1.0
    adjustedProb = Math.min(Math.max(adjustedProb, 0.01), 0.99);

    results.push({
      from: currentState,
      to: targetState as HierarchicalStateId,
      event: eventForTransition(currentState, targetState as HierarchicalStateId),
      probability: Math.round(adjustedProb * 1000) / 1000,
      confidence: Math.min(0.95, 0.7 + (sampleSizes[targetState] || 500) / 50000),
      sampleSize: sampleSizes[targetState] || 500,
    });
  }

  // Normalize probabilities
  const totalProb = results.reduce((sum, r) => sum + r.probability, 0);
  if (totalProb > 0) {
    for (const r of results) {
      r.probability = Math.round((r.probability / totalProb) * 1000) / 1000;
    }
  }

  return results;
}

/**
 * Compute the state distribution for a shipment — probability of being in
 * each state given current state and risk factors.
 */
export function computeStateDistribution(
  statechart: Statechart,
  currentState: HierarchicalStateId,
  steps: number = 5,
  riskFactors?: {
    portCongestion?: 'Low' | 'Medium' | 'High' | 'Critical';
    weatherRisk?: 'Low' | 'Medium' | 'High' | 'Critical';
    seasonFactor?: number;
    carrierReliability?: number;
  }
): StateDistribution {
  // Monte Carlo simulation — run N simulations forward
  const N = 1000;
  const finalStates: Record<string, number> = {};

  for (let i = 0; i < N; i++) {
    let state = currentState;
    for (let step = 0; step < steps; step++) {
      const probs = computeTransitionProbabilities(statechart, state, riskFactors);
      // Weighted random selection
      const rand = Math.random();
      let cumulative = 0;
      for (const p of probs) {
        cumulative += p.probability;
        if (rand <= cumulative) {
          state = p.to;
          break;
        }
      }
    }
    finalStates[state] = (finalStates[state] || 0) + 1;
  }

  // Convert to probabilities
  const distribution: Record<string, number> = {};
  for (const [state, count] of Object.entries(finalStates)) {
    distribution[state] = count / N;
  }

  // Compute Shannon entropy
  let entropy = 0;
  for (const p of Object.values(distribution)) {
    if (p > 0) entropy -= p * Math.log2(p);
  }

  // Most likely state
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

  return {
    timestamp: new Date(),
    distribution,
    entropy: Math.round(entropy * 1000) / 1000,
    mostLikely: entries[0][0] as HierarchicalStateId,
    mostLikelyProbability: Math.round(entries[0][1] * 1000) / 1000,
  };
}

/**
 * Detect state drift — compares expected vs observed state distributions.
 * Uses KL divergence (Kullback-Leibler) as the primary metric.
 */
export function detectStateDrift(
  expectedState: HierarchicalStateId,
  observedState: HierarchicalStateId,
  expectedDistribution: Record<string, number>,
  observedDistribution: Record<string, number>
): StateDriftResult {
  // KL divergence: D_KL(P || Q) = sum(P(x) * log(P(x) / Q(x)))
  const allStates = new Set([...Object.keys(expectedDistribution), ...Object.keys(observedDistribution)]);
  let klDivergence = 0;

  for (const state of allStates) {
    const p = expectedDistribution[state] || 1e-10; // Small epsilon to avoid log(0)
    const q = observedDistribution[state] || 1e-10;
    klDivergence += p * Math.log2(p / q);
  }

  // Determine severity based on KL divergence thresholds
  let driftSeverity: 'None' | 'Low' | 'Medium' | 'High' | 'Critical';
  if (klDivergence < 0.05) driftSeverity = 'None';
  else if (klDivergence < 0.2) driftSeverity = 'Low';
  else if (klDivergence < 0.5) driftSeverity = 'Medium';
  else if (klDivergence < 1.0) driftSeverity = 'High';
  else driftSeverity = 'Critical';

  // Generate recommendation
  const recommendation = generateDriftRecommendation(driftSeverity, expectedState, observedState);

  return {
    klDivergence: Math.round(klDivergence * 1000) / 1000,
    driftDetected: klDivergence > 0.05,
    driftSeverity,
    expectedState,
    observedState,
    expectedDistribution,
    observedDistribution,
    recommendation,
  };
}

/**
 * Generate a probabilistic ETA prediction using the state machine.
 * Combines deterministic transit estimation with probabilistic risk factors.
 */
export function predictProbabilisticETA(
  currentState: HierarchicalStateId,
  originToDestDistanceNm: number,
  vesselSpeedKnots: number,
  riskFactors?: {
    portCongestion?: 'Low' | 'Medium' | 'High' | 'Critical';
    weatherRisk?: 'Low' | 'Medium' | 'High' | 'Critical';
    seasonFactor?: number;
    carrierReliability?: number;
    historicalReliability?: number; // 0-100 on-time percentage
  }
): ProbabilisticETA {
  // States that contribute to transit time
  const transitStates = ['Pre-Transit', 'AtSea', 'Approaching', 'Exception'];
  const isTransitState = transitStates.includes(currentState);

  // Base transit calculation
  const baseTransitHours = (originToDestDistanceNm / vesselSpeedKnots) * 24;
  const congestionHours = getCongestionDelay(riskFactors?.portCongestion);
  const weatherDelayHours = getWeatherDelay(riskFactors?.weatherRisk);
  const seasonAdjust = riskFactors?.seasonFactor || 1.0;

  // Calculate probability distribution for arrival scenarios
  const baseArrival = new Date();
  baseArrival.setHours(baseArrival.getHours() + baseTransitHours + congestionHours + weatherDelayHours);

  // Monte Carlo for probability distribution
  const N = 5000;
  let onTime = 0, delayed1_3 = 0, delayed3_7 = 0, delayed7plus = 0;

  for (let i = 0; i < N; i++) {
    const congDelay = congestionHours * (0.5 + Math.random());
    const weatherD = weatherDelayHours * (0.5 + Math.random());
    const seasonD = (seasonAdjust - 1.0) * baseTransitHours * Math.random();
    const totalDelay = congDelay + weatherD + seasonD;

    if (totalDelay <= 24) onTime++;
    else if (totalDelay <= 72) delayed1_3++;
    else if (totalDelay <= 168) delayed3_7++;
    else delayed7plus++;
  }

  const confidence = isTransitState
    ? 0.72 + (riskFactors?.carrierReliability || 80) / 1000
    : 0.85 + (riskFactors?.carrierReliability || 80) / 1000;

  // Risk level
  const delayProbability = 1 - onTime / N;
  let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  if (delayProbability < 0.15) riskLevel = 'Low';
  else if (delayProbability < 0.35) riskLevel = 'Medium';
  else if (delayProbability < 0.6) riskLevel = 'High';
  else riskLevel = 'Critical';

  // Build risk factors list
  const riskFactorList: ProbabilisticETA['riskFactors'] = [];
  if (riskFactors?.portCongestion === 'High' || riskFactors?.portCongestion === 'Critical') {
    riskFactorList.push({
      factor: 'Port congestion',
      impact: congestionHours / 24,
      probability: riskFactors.portCongestion === 'Critical' ? 0.85 : 0.65,
    });
  }
  if (riskFactors?.weatherRisk === 'High' || riskFactors?.weatherRisk === 'Critical') {
    riskFactorList.push({
      factor: 'Adverse weather',
      impact: weatherDelayHours / 24,
      probability: riskFactors.weatherRisk === 'Critical' ? 0.7 : 0.45,
    });
  }
  if ((riskFactors?.seasonFactor || 1.0) > 1.1) {
    riskFactorList.push({
      factor: 'Seasonal peak demand',
      impact: 0.3,
      probability: 0.5,
    });
  }

  return {
    shipmentId: '',
    currentState,
    predictedArrival: baseArrival,
    confidence: Math.min(Math.round(confidence * 1000) / 1000, 0.98),
    riskLevel,
    probabilityDistribution: {
      onTime: Math.round((onTime / N) * 1000) / 1000,
      delayed1_3d: Math.round((delayed1_3 / N) * 1000) / 1000,
      delayed3_7d: Math.round((delayed3_7 / N) * 1000) / 1000,
      delayed7dPlus: Math.round((delayed7plus / N) * 1000) / 1000,
    },
    riskFactors: riskFactorList,
  };
}

// ---- Internal Helpers ----

function computeRiskAdjustments(riskFactors?: {
  portCongestion?: 'Low' | 'Medium' | 'High' | 'Critical';
  weatherRisk?: 'Low' | 'Medium' | 'High' | 'Critical';
  seasonFactor?: number;
  carrierReliability?: number;
}): Array<{ factor: string; baseProbability: number; adjustedProbability: number }> {
  const adjustments: Array<{ factor: string; baseProbability: number; adjustedProbability: number }> = [];

  if (riskFactors?.portCongestion === 'High' || riskFactors?.portCongestion === 'Critical') {
    adjustments.push({
      factor: 'congestion',
      baseProbability: 1.0,
      adjustedProbability: riskFactors.portCongestion === 'Critical' ? 0.7 : 0.85,
    });
  }

  if (riskFactors?.weatherRisk === 'High' || riskFactors?.weatherRisk === 'Critical') {
    adjustments.push({
      factor: 'weather',
      baseProbability: 1.0,
      adjustedProbability: riskFactors.weatherRisk === 'Critical' ? 0.6 : 0.8,
    });
  }

  if (riskFactors?.seasonFactor && riskFactors.seasonFactor > 1.05) {
    adjustments.push({
      factor: 'season',
      baseProbability: 1.0,
      adjustedProbability: 1.0 / riskFactors.seasonFactor,
    });
  }

  if (riskFactors?.carrierReliability && riskFactors.carrierReliability < 70) {
    adjustments.push({
      factor: 'reliability',
      baseProbability: 1.0,
      adjustedProbability: 0.8 + (riskFactors.carrierReliability / 100) * 0.2,
    });
  }

  return adjustments;
}

function getCongestionDelay(congestion?: string): number {
  switch (congestion) {
    case 'Low': return 6;
    case 'Medium': return 18;
    case 'High': return 48;
    case 'Critical': return 96;
    default: return 12;
  }
}

function getWeatherDelay(weatherRisk?: string): number {
  switch (weatherRisk) {
    case 'Low': return 2;
    case 'Medium': return 12;
    case 'High': return 36;
    case 'Critical': return 72;
    default: return 6;
  }
}

function eventForTransition(from: string, to: string): EventType {
  const mapping: Record<string, EventType> = {
    'Booked:CustomsFiled': 'CustomsFiled',
    'CustomsFiled:CustomsCleared': 'CustomsCleared',
    'CustomsFiled:CustomsHeld': 'CustomsHeld',
    'CustomsFiled:CustomsRejected': 'CustomsRejected',
    'CustomsHeld:CustomsReleased': 'CustomsReleased',
    'CustomsCleared:GateIn': 'GateIn',
    'Pre-Transit:Departed': 'Departed',
    'AtSea:Approaching': 'Approaching',
    'AtSea:Exception': 'Exception',
    'Approaching:Arrived': 'Arrived',
    'Exception:ExceptionResolved': 'ExceptionResolved',
    'Arrived:Discharging': 'Discharging',
    'Discharging:DischargeComplete': 'DischargeComplete',
    'Post-Discharge:GateOut': 'GateOut',
    'Delivered:Archived': 'Archived',
    'Booked:Cancelled': 'Cancelled',
    'CustomsFiled:Cancelled': 'Cancelled',
    'CustomsHeld:Cancelled': 'Cancelled',
    'Pre-Transit:Cancelled': 'Cancelled',
  };
  return mapping[`${from}:${to}`] || 'AtSea' as EventType;
}

function generateDriftRecommendation(
  severity: string,
  expected: string,
  observed: string
): string {
  switch (severity) {
    case 'None':
      return 'State is within normal distribution. No action required.';
    case 'Low':
      return `Minor deviation detected — shipment is in '${observed}' instead of expected '${expected}'. Monitor closely.`;
    case 'Medium':
      return `Moderate state drift — shipment significantly delayed or diverted. Review recent events and assess ETA impact.`;
    case 'High':
      return `Significant state drift detected — possible route deviation, prolonged port stay, or operational failure. Immediate investigation recommended.`;
    case 'Critical':
      return `Critical state drift — shipment behavior is anomalous. Possible AIS spoofing, vessel distress, or systemic failure. Escalate to operations immediately.`;
    default:
      return 'Unable to assess drift.';
  }
}
