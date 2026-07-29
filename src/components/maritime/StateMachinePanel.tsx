'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  ChevronRight,
  ChevronDown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  BarChart3,
  History,
  Zap,
  Eye,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---- Types ----
interface StateNode {
  id: string;
  parent: string | null;
  isTerminal: boolean;
  isInitial: boolean;
  isParallelRegion: boolean;
  regionName: string | null;
  meta: Record<string, string>;
}

interface Transition {
  from: string;
  to: string;
  event: string;
  hasGuard: boolean;
  description: string | null;
}

interface StatechartData {
  entity: string;
  version: string;
  initialState: string;
  terminalStates: string[];
  stateCount: number;
  transitionCount: number;
  states: StateNode[];
  transitions: Transition[];
  parallelRegions: { name: string; states: string[]; initialState: string }[];
}

interface TransitionAvail {
  event: string;
  targetState: string;
  targetStatus: string;
  description: string;
  isGuarded: boolean;
}

interface ProbabilityData {
  currentState: string;
  aggregateStatus: string;
  transitionProbabilities: {
    targetState: string;
    targetStatus: string;
    probability: number;
    probabilityPercent: string;
    confidence: number;
  }[];
  stateDistribution: {
    entropy: number;
    mostLikelyState: string;
    mostLikelyStatus: string;
    mostLikelyProbability: string;
    states: { state: string; status: string; probability: number; probabilityPercent: string }[];
  };
}

interface DriftData {
  analysis: { expectedState: string; expectedStatus: string; observedState: string; observedStatus: string };
  drift: { detected: boolean; severity: string; klDivergence: number; explanation: string };
  recommendation: string;
}

interface ShipmentEvent {
  id: string;
  sequence: number;
  eventType: string;
  previousState: string;
  computedState: string;
  aggregateStatus: string;
  actor: string;
  isValid: boolean;
  createdAt: string;
}

interface Shipment {
  id: string;
  status: string;
}

// ---- State Machine Visualizer Component ----
export default function StateMachinePanel() {
  const [statechart, setStatechart] = useState<StatechartData | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('AtSea');
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set(['In Transit', 'Customs Clearance']));
  const [transitions, setTransitions] = useState<TransitionAvail[]>([]);
  const [probabilities, setProbabilities] = useState<ProbabilityData | null>(null);
  const [driftResult, setDriftResult] = useState<DriftData | null>(null);
  const [eventHistory, setEventHistory] = useState<ShipmentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('statechart');

  // Fetch statechart definition
  useEffect(() => {
    async function fetchStatechart() {
      try {
        const res = await fetch('/api/state-machine/definition');
        const data = await res.json();
        setStatechart(data);
        setLoading(false);
      } catch (e) {
        console.error('Failed to fetch statechart:', e);
        setLoading(false);
      }
    }
    fetchStatechart();
  }, []);

  // Fetch shipments list
  useEffect(() => {
    async function fetchShipments() {
      try {
        const res = await fetch('/api/shipments?limit=50');
        const data = await res.json();
        setShipments(data.data || []);
        if (data.data?.[0]?.id) {
          setSelectedShipmentId(data.data[0].id);
        }
      } catch (e) {
        console.error('Failed to fetch shipments:', e);
      }
    }
    fetchShipments();
  }, []);

  // Fetch transitions for selected state
  useEffect(() => {
    if (!selectedState) return;
    async function fetchTransitions() {
      try {
        const res = await fetch(`/api/state-machine/transitions?state=${encodeURIComponent(selectedState)}`);
        const data = await res.json();
        setTransitions(data.availableTransitions || []);
      } catch (e) {
        console.error('Failed to fetch transitions:', e);
      }
    }
    fetchTransitions();
  }, [selectedState]);

  // Fetch probabilities for selected state
  useEffect(() => {
    if (!selectedState) return;
    async function fetchProbabilities() {
      try {
        const res = await fetch(`/api/state-machine/probabilities?state=${encodeURIComponent(selectedState)}&congestion=Medium&weather=Medium`);
        const data = await res.json();
        setProbabilities(data);
      } catch (e) {
        console.error('Failed to fetch probabilities:', e);
      }
    }
    fetchProbabilities();
  }, [selectedState]);

  // Fetch event history for selected shipment
  useEffect(() => {
    if (!selectedShipmentId) return;
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/shipments/${selectedShipmentId}/history?limit=20`);
        const data = await res.json();
        setEventHistory(data.timeline || []);
      } catch (e) {
        console.error('Failed to fetch event history:', e);
      }
    }
    fetchHistory();
  }, [selectedShipmentId]);

  const toggleExpand = useCallback((stateId: string) => {
    setExpandedStates((prev) => {
      const next = new Set(prev);
      if (next.has(stateId)) next.delete(stateId);
      else next.add(stateId);
      return next;
    });
  }, []);

  // ---- State color helper ----
  const getStateColor = (stateId: string): string => {
    const colors: Record<string, string> = {
      Booked: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'CustomsFiled': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'CustomsCleared': 'bg-green-500/20 text-green-400 border-green-500/30',
      'CustomsHeld': 'bg-red-500/20 text-red-400 border-red-500/30',
      'CustomsRejected': 'bg-red-600/20 text-red-500 border-red-600/30',
      'Pre-Transit': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      AtSea: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      Approaching: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      Exception: 'bg-red-500/20 text-red-400 border-red-500/30',
      Arrived: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      Discharging: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      'Post-Discharge': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      Delivered: 'bg-green-500/20 text-green-400 border-green-500/30',
      Cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      Archived: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return colors[stateId] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'None': return 'text-green-400';
      case 'Low': return 'text-yellow-400';
      case 'Medium': return 'text-orange-400';
      case 'High': return 'text-red-400';
      case 'Critical': return 'text-red-500';
      default: return 'text-zinc-400';
    }
  };

  if (loading) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-8 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin mr-3" />
          <span className="text-zinc-400">Loading state machine...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitBranch className="w-5 h-5 text-cyan-400" />
              <div>
                <CardTitle className="text-lg font-semibold text-zinc-100">
                  State Machine Engine
                </CardTitle>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Event-Sourced Hierarchical Statechart — v{statechart?.version || '1.0'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">
                {statechart?.stateCount || 0} states
              </Badge>
              <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400">
                {statechart?.transitionCount || 0} transitions
              </Badge>
              <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                {(statechart?.parallelRegions?.length || 0)} regions
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-zinc-800/50 border border-zinc-700/50">
          <TabsTrigger value="statechart" className="text-xs gap-1.5 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            <GitBranch className="w-3.5 h-3.5" /> Statechart
          </TabsTrigger>
          <TabsTrigger value="probabilities" className="text-xs gap-1.5 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
            <BarChart3 className="w-3.5 h-3.5" /> Probabilities
          </TabsTrigger>
          <TabsTrigger value="events" className="text-xs gap-1.5 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            <History className="w-3.5 h-3.5" /> Event Log
          </TabsTrigger>
          <TabsTrigger value="drift" className="text-xs gap-1.5 data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
            <AlertTriangle className="w-3.5 h-3.5" /> Drift
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Statechart Definition */}
        <TabsContent value="statechart" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* State Tree */}
            <Card className="border-zinc-800 bg-zinc-900/50 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-cyan-400" />
                  Hierarchical States
                  <span className="text-xs text-zinc-500 ml-auto">Click to inspect transitions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                <div className="space-y-0.5">
                  {statechart?.states.map((state) => {
                    const hasChildren = statechart.states.some((s) => s.parent === state.id);
                    const isExpanded = expandedStates.has(state.id);
                    const isSelected = selectedState === state.id;
                    const children = statechart.states.filter((s) => s.parent === state.id);
                    const transitionsFromState = statechart.transitions.filter(
                      (t) => t.from === state.id || (t.from === '*' && !statechart.transitions.some((t2) => t2.from === state.id && t2.event === t.event))
                    );

                    return (
                      <div key={state.id}>
                        <button
                          onClick={() => {
                            setSelectedState(state.id);
                            if (hasChildren) toggleExpand(state.id);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${
                            isSelected
                              ? 'bg-cyan-500/10 border border-cyan-500/30'
                              : 'hover:bg-zinc-800/50 border border-transparent'
                          }`}
                          style={{ paddingLeft: state.parent ? ((getDepth(statechart.states, state.id) - 1) * 20 + 12) + 'px' : '12px' }}
                        >
                          <div className="flex items-center gap-2">
                            {hasChildren ? (
                              isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                            ) : (
                              <span className="w-3.5" />
                            )}
                            <span className={`inline-block w-2 h-2 rounded-full ${getStateColor(state.id).split(' ')[0]}`} />
                            <span className={`font-medium ${isSelected ? 'text-cyan-400' : 'text-zinc-300'}`}>
                              {state.id}
                            </span>
                            {state.isInitial && <Badge className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-400 border-0">initial</Badge>}
                            {state.isTerminal && <Badge className="text-[10px] px-1.5 py-0 bg-red-500/20 text-red-400 border-0">terminal</Badge>}
                            {state.parent && <span className="text-[10px] text-zinc-600">↳ {state.parent}</span>}
                            <span className="ml-auto text-[10px] text-zinc-600">{transitionsFromState.length} transitions</span>
                          </div>
                        </button>
                        {hasChildren && isExpanded && (
                          <div className="mt-0.5 ml-2">
                            {children.map((child) => (
                              <div key={child.id}>{/* rendered by parent loop */}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Transition Inspector */}
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-purple-400" />
                  Transitions from: <span className="text-cyan-400">{selectedState}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                {transitions.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4">No transitions available (terminal state)</p>
                ) : (
                  <div className="space-y-2">
                    {transitions.map((t, i) => (
                      <div key={i} className="bg-zinc-800/30 rounded-md p-3 border border-zinc-700/30">
                        <div className="flex items-center gap-2 text-xs">
                          <Badge className={`text-[10px] px-1.5 py-0 border-0 ${getStateColor(selectedState)}`}>
                            {selectedState}
                          </Badge>
                          <ArrowRight className="w-3 h-3 text-zinc-500" />
                          <Badge className={`text-[10px] px-1.5 py-0 border-0 ${getStateColor(t.targetState)}`}>
                            {t.targetState}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[11px]">
                          <Badge variant="outline" className="text-[10px] px-1.5 border-zinc-600 text-zinc-400">
                            {t.event}
                          </Badge>
                          {t.isGuarded && (
                            <Badge variant="outline" className="text-[10px] px-1.5 border-amber-500/30 text-amber-400">
                              guarded
                            </Badge>
                          )}
                          <span className="text-zinc-500">→ {t.targetStatus}</span>
                        </div>
                        {t.description && (
                          <p className="text-[11px] text-zinc-500 mt-1">{t.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Parallel Regions */}
          {statechart?.parallelRegions && statechart.parallelRegions.length > 0 && (
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Parallel Regions (Independent Sub-Processes)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {statechart.parallelRegions.map((region) => (
                    <div key={region.name} className="bg-zinc-800/30 rounded-md p-3 border border-zinc-700/30">
                      <h4 className="text-xs font-medium text-amber-400 capitalize mb-2">{region.name}</h4>
                      <div className="space-y-1">
                        {region.states.map((state) => (
                          <div key={state} className="flex items-center gap-2 text-[11px]">
                            <span className={`w-1.5 h-1.5 rounded-full ${state === region.initialState ? 'bg-amber-400' : 'bg-zinc-600'}`} />
                            <span className="text-zinc-400">{state}</span>
                            {state === region.initialState && (
                              <span className="text-[10px] text-zinc-600">initial</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Probabilistic Analysis */}
        <TabsContent value="probabilities" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Transition Probabilities */}
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  Transition Probabilities
                  <Badge variant="outline" className="text-[10px] px-1.5 ml-auto border-purple-500/30 text-purple-400">
                    From: {selectedState}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {probabilities?.transitionProbabilities.map((p, i) => (
                  <div key={i} className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-300">
                        {p.targetState} <span className="text-zinc-600">({p.targetStatus})</span>
                      </span>
                      <span className="text-purple-400 font-medium">{p.probabilityPercent}</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all"
                        style={{ width: `${Math.max(p.probability * 100, 2)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">
                      Confidence: {Math.round(p.confidence * 100)}% (n={p.sampleSize?.toLocaleString()})
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* State Distribution */}
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  State Distribution (5-Step Monte Carlo)
                  <Badge variant="outline" className="text-[10px] px-1.5 ml-auto border-cyan-500/30 text-cyan-400">
                    H = {probabilities?.stateDistribution.entropy || 0}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 p-2 rounded bg-zinc-800/30 border border-zinc-700/30">
                  <div className="text-xs text-zinc-400">
                    Most likely after 5 steps:{' '}
                    <span className="text-cyan-400 font-medium">
                      {probabilities?.stateDistribution.mostLikelyState}
                    </span>
                    <span className="text-zinc-500"> ({probabilities?.stateDistribution.mostLikelyStatus})</span>
                    <span className="text-purple-400 ml-2">
                      {probabilities?.stateDistribution.mostLikelyProbability}
                    </span>
                  </div>
                </div>
                {probabilities?.stateDistribution.states.map((s, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-zinc-400">{s.state}</span>
                      <span className="text-zinc-500">{s.probabilityPercent}</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500/60 transition-all"
                        style={{ width: `${Math.max((s.probability || 0) * 100, 1)}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-[10px] text-zinc-600 mt-2">
                  Shannon Entropy (H) measures uncertainty: lower = more predictable, higher = more uncertain
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Event Log (per shipment) */}
        <TabsContent value="events" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                Shipment Event Log (Immutable Audit Trail)
              </CardTitle>
              <div className="mt-2">
                <Select value={selectedShipmentId} onValueChange={setSelectedShipmentId}>
                  <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-xs h-8">
                    <SelectValue placeholder="Select shipment..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {shipments.slice(0, 30).map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.id.slice(0, 8)}... — {s.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
              {eventHistory.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">No events for this shipment</p>
              ) : (
                <div className="space-y-1.5">
                  {eventHistory.map((event, i) => (
                    <div key={event.id} className="relative pl-6 pb-2">
                      {/* Timeline line */}
                      {i < eventHistory.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-zinc-700/50" />
                      )}
                      {/* Timeline dot */}
                      <div className={`absolute left-2 top-1.5 w-3 h-3 rounded-full border-2 ${
                        event.isValid
                          ? 'bg-green-500/20 border-green-500/60'
                          : 'bg-red-500/20 border-red-500/60'
                      }`} />
                      {/* Event card */}
                      <div className="bg-zinc-800/30 rounded-md p-2.5 border border-zinc-700/20 hover:border-zinc-600/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] px-1.5 py-0 border-0 ${getStateColor(event.computedState)}`}>
                              {event.eventType}
                            </Badge>
                            <span className="text-[10px] text-zinc-500">seq: {event.sequence}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <Clock className="w-3 h-3 text-zinc-600" />
                            <span className="text-zinc-500">
                              {new Date(event.createdAt).toLocaleDateString()}{' '}
                              {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-[10px]">
                          <span className={getStateColor(event.previousState).split(' ').slice(1).join(' ')}>{event.previousState}</span>
                          <ArrowRight className="w-2.5 h-2.5 text-zinc-600" />
                          <span className={getStateColor(event.computedState).split(' ').slice(1).join(' ')}>{event.computedState}</span>
                          <span className="text-zinc-600 ml-1">({event.aggregateStatus})</span>
                          {!event.isValid && (
                            <Badge className="text-[10px] px-1 py-0 bg-red-500/20 text-red-400 border-0 ml-2">
                              invalid
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 text-[10px] text-zinc-600">
                          Actor: {event.actor}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Drift Detection */}
        <TabsContent value="drift" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                State Drift Detection (KL Divergence Analysis)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Expected State</label>
                  <Select value="AtSea" onValueChange={(v) => setSelectedState(v)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {statechart?.states.filter(s => !s.isTerminal).map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Observed State</label>
                  <Select defaultValue="Exception">
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {statechart?.states.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/state-machine/drift?expected=AtSea&observed=Exception`);
                    const data = await res.json();
                    setDriftResult(data);
                  } catch (e) { console.error(e); }
                }}
                size="sm"
                className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 text-xs"
              >
                <Zap className="w-3 h-3 mr-1" /> Analyze Drift
              </Button>

              {driftResult && (
                <div className="mt-4 space-y-3">
                  <div className="bg-zinc-800/50 rounded-md p-3 border border-zinc-700/30">
                    <div className="flex items-center gap-2 mb-2">
                      {driftResult.drift.detected ? (
                        <AlertTriangle className={`w-4 h-4 ${getSeverityColor(driftResult.drift.severity)}`} />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      )}
                      <span className={`text-sm font-medium ${getSeverityColor(driftResult.drift.severity)}`}>
                        {driftResult.drift.detected ? `Drift Detected: ${driftResult.drift.severity}` : 'No Drift Detected'}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 space-y-1">
                      <p>KL Divergence: <span className="text-purple-400 font-mono">{driftResult.drift.klDivergence}</span></p>
                      <p>Expected: <span className="text-cyan-400">{driftResult.analysis.expectedState} ({driftResult.analysis.expectedStatus})</span></p>
                      <p>Observed: <span className="text-red-400">{driftResult.analysis.observedState} ({driftResult.analysis.observedStatus})</span></p>
                      <p className="text-zinc-500 mt-2">{driftResult.drift.explanation}</p>
                    </div>
                  </div>
                  <div className="bg-zinc-800/30 rounded-md p-3 border border-zinc-700/20">
                    <p className="text-xs text-zinc-300 font-medium mb-1">Recommendation</p>
                    <p className="text-xs text-zinc-400">{driftResult.recommendation}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---- Utility: Get nesting depth of a state ----
function getDepth(states: StateNode[], stateId: string, depth: number = 1): number {
  const state = states.find((s) => s.id === stateId);
  if (!state || !state.parent) return depth;
  return getDepth(states, state.parent, depth + 1);
}
