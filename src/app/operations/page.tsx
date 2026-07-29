'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Activity, Database, GitBranch, Brain, Globe, Server, Shield,
  Clock, RefreshCw, ArrowUpRight, ArrowDownRight, CheckCircle2,
  AlertTriangle, XCircle, Radio, Ship, Anchor, Package,
  Container, TrendingUp, Zap, Eye, BarChart3, Layers,
  Wifi, WifiOff, Cpu, HardDrive, Network, Navigation,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

// ─── Types ──────────────────────────────────────────────────────────────

interface ComponentHealth {
  status: 'operational' | 'degraded' | 'down'
  latencyMs: number
  details: Record<string, unknown>
}

interface SystemsData {
  status: 'operational' | 'degraded' | 'down'
  platform: string
  version: string
  timestamp: string
  uptime: number
  totalResponseTimeMs: number
  components: Record<string, ComponentHealth>
  summary: { operational: number; degraded: number; down: number; total: number }
}

interface DashboardMetrics {
  summary: Record<string, number>
  shipmentsByStatus: { status: string; count: number }[]
  vesselTypeBreakdown: { type: string; count: number }[]
  tradeOverview: { totalTradeValue: number; totalGrossWeight: number; totalCO2: number }
  topTradePartners: { partnerCode: string; totalValue: number }[]
  congestionDistribution: { level: string; count: number }[]
  allianceBreakdown: { alliance: string; count: number; totalTEU: number }[]
  carrierStats: { avgReliability: number; avgCO2PerTEU: number }
  topCarriers: { name: string; code: string; totalTEUCapacity: number; fleetSize: number; reliability: number }[]
}

interface StatechartInfo {
  entity: string
  version: string
  initialState: string
  terminalStates: string[]
  stateCount: number
  transitionCount: number
  states: { id: string; parent: string | null; isTerminal: boolean; isInitial: boolean }[]
  transitions: { from: string; to: string; event: string; description: string | null }[]
  parallelRegions: { name: string; states: string[]; initialState: string }[]
}

interface ShipmentEntry {
  id: string
  billOfLading: string
  status: string
  cargoType: string
  vessel: { name: string; mmsi: string; flagCountry: string } | null
  originPort: { name: string; countryCode: string }
  destPort: { name: string; countryCode: string }
}

interface RecentEvent {
  eventType: string
  computedState: string | null
  valid: boolean
}

interface AIPrediction {
  prediction: string
  confidence: number
  reasoning: string
  vesselId?: string
}

// ─── Utility Functions ──────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toString()
}

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function statusIcon(status: string) {
  switch (status) {
    case 'operational': return <CheckCircle2 className="h-4 w-4 text-green-400" />
    case 'degraded': return <AlertTriangle className="h-4 w-4 text-amber-400" />
    case 'down': return <XCircle className="h-4 w-4 text-red-400" />
    default: return <Activity className="h-4 w-4 text-muted-foreground" />
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'operational': return 'text-green-400'
    case 'degraded': return 'text-amber-400'
    case 'down': return 'text-red-400'
    default: return 'text-muted-foreground'
  }
}

function statusBadgeVariant(status: string): string {
  switch (status) {
    case 'operational': return 'bg-green-500/10 text-green-400 border-green-500/30'
    case 'degraded': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    case 'down': return 'bg-red-500/10 text-red-400 border-red-500/30'
    default: return 'bg-muted text-foreground/70 border-border'
  }
}

function shipmentStatusColor(status: string): string {
  switch (status) {
    case 'Booked': return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    case 'In Transit': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    case 'Arrived': return 'bg-green-500/10 text-green-400 border-green-500/30'
    case 'Delivered': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    case 'Cancelled': return 'bg-red-500/10 text-red-400 border-red-500/30'
    default: return 'bg-muted text-foreground/70 border-border'
  }
}

// ─── Component Cards ───────────────────────────────────────────────────

function ComponentCard({
  name,
  icon,
  health,
  expanded = false,
}: {
  name: string
  icon: React.ReactNode
  health: ComponentHealth
  expanded?: boolean
}) {
  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm transition-all hover:bg-card/80">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${health.status === 'operational' ? 'bg-green-500/10' : health.status === 'degraded' ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">
                {health.latencyMs}ms
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusBadgeVariant(health.status)}>
              {health.status}
            </Badge>
            {statusIcon(health.status)}
          </div>
        </div>
        {expanded && health.details && (
          <div className="mt-3 space-y-2">
            <Separator className="bg-border/50" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(health.details).slice(0, 8).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1.5">
                  <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="font-medium text-foreground">
                    {typeof value === 'number' ? formatNumber(value) : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value).substring(0, 24)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────

export default function OperationsCenter() {
  const [systems, setSystems] = useState<SystemsData | null>(null)
  const [dashboard, setDashboard] = useState<DashboardMetrics | null>(null)
  const [statechart, setStatechart] = useState<StatechartInfo | null>(null)
  const [shipments, setShipments] = useState<ShipmentEntry[]>([])
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([])
  const [aiPrediction, setAiPrediction] = useState<AIPrediction | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState('overview')
  const refreshInterval = useRef<NodeJS.Timeout | null>(null)

  // ─── Fetch: Systems Health ───────────────────────────────────────
  const fetchSystems = useCallback(async () => {
    setLoading(prev => ({ ...prev, systems: true }))
    try {
      const res = await fetch('/api/systems')
      const data = await res.json()
      setSystems(data)
      setLastRefresh(new Date())
    } catch (e) {
      console.error('Systems fetch failed:', e)
    } finally {
      setLoading(prev => ({ ...prev, systems: false }))
    }
  }, [])

  // ─── Fetch: Dashboard Metrics ─────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setLoading(prev => ({ ...prev, dashboard: true }))
    try {
      const res = await fetch('/api/dashboard')
      const data = await res.json()
      setDashboard(data)
    } catch (e) {
      console.error('Dashboard fetch failed:', e)
    } finally {
      setLoading(prev => ({ ...prev, dashboard: false }))
    }
  }, [])

  // ─── Fetch: State Machine Definition ──────────────────────────────
  const fetchStatechart = useCallback(async () => {
    setLoading(prev => ({ ...prev, statechart: true }))
    try {
      const res = await fetch('/api/state-machine/definition')
      const data = await res.json()
      setStatechart(data)
    } catch (e) {
      console.error('Statechart fetch failed:', e)
    } finally {
      setLoading(prev => ({ ...prev, statechart: false }))
    }
  }, [])

  // ─── Fetch: Shipments ─────────────────────────────────────────────
  const fetchShipments = useCallback(async () => {
    setLoading(prev => ({ ...prev, shipments: true }))
    try {
      const res = await fetch('/api/shipments?limit=10')
      const data = await res.json()
      setShipments(data.data || data.shipments || [])
    } catch (e) {
      console.error('Shipments fetch failed:', e)
    } finally {
      setLoading(prev => ({ ...prev, shipments: false }))
    }
  }, [])

  // ─── Fetch: Recent Events (from systems) ──────────────────────────
  // Events come from the /api/systems endpoint (event-sourcing component)

  // ─── Fetch: AI Prediction ─────────────────────────────────────────
  const fetchAIPrediction = useCallback(async () => {
    setLoading(prev => ({ ...prev, ai: true }))
    try {
      const res = await fetch('/api/ai/eta?vesselId=1')
      const data = await res.json()
      setAiPrediction(data)
    } catch (e) {
      console.error('AI fetch failed:', e)
    } finally {
      setLoading(prev => ({ ...prev, ai: false }))
    }
  }, [])

  // ─── Initial Load ────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetchSystems(),
      fetchDashboard(),
      fetchStatechart(),
      fetchShipments(),
      fetchAIPrediction(),
    ])
  }, [fetchSystems, fetchDashboard, fetchStatechart, fetchShipments, fetchAIPrediction])

  // ─── Auto-refresh every 30 seconds ───────────────────────────────
  useEffect(() => {
    refreshInterval.current = setInterval(() => {
      fetchSystems()
      fetchDashboard()
    }, 30000)
    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current)
    }
  }, [fetchSystems, fetchDashboard])

  // ─── Extract recent events from systems data ──────────────────────
  useEffect(() => {
    if (systems?.components?.['event-sourcing']?.details) {
      const details = systems.components['event-sourcing'].details
      if (Array.isArray(details.recentEvents)) {
        setRecentEvents(details.recentEvents as RecentEvent[])
      }
    }
  }, [systems])

  // ─── Manual Refresh ─────────────────────────────────────────────
  const handleRefresh = () => {
    fetchSystems()
    fetchDashboard()
    fetchShipments()
    fetchAIPrediction()
  }

  // ─── Overall Status Indicator ──────────────────────────────────
  const overallStatus = systems?.status || 'loading'

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg bg-primary/10 p-2">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Live Operations Center
              </h1>
              <p className="text-xs text-muted-foreground">
                Real-time platform monitoring across all subsystems
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Overall Status */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
              <div className={`h-2 w-2 rounded-full animate-pulse ${overallStatus === 'operational' ? 'bg-green-400' : overallStatus === 'degraded' ? 'bg-amber-400' : 'bg-red-400'}`} />
              <span className={`text-xs font-medium ${statusColor(overallStatus)}`}>
                {overallStatus === 'loading' ? 'Connecting...' : overallStatus.toUpperCase()}
              </span>
            </div>
            {/* Last Refresh */}
            {lastRefresh && (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            {/* Refresh Button */}
            <Button variant="outline" size="icon" onClick={handleRefresh} className="h-8 w-8">
              <RefreshCw className={`h-3.5 w-3.5 ${loading.systems ? 'animate-spin' : ''}`} />
            </Button>
            {/* Navigation */}
            <Button variant="outline" size="sm" asChild>
              <a href="/" className="flex items-center gap-1.5 text-xs">
                <BarChart3 className="h-3.5 w-3.5" />
                Dashboard
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="backend" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Server className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Backend</span>
            </TabsTrigger>
            <TabsTrigger value="state-machine" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <GitBranch className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">State Engine</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Database className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Data Flow</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Brain className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI Layer</span>
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB: OVERVIEW — All systems at a glance                    */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Status Summary Banner */}
              <div className={`rounded-lg border p-4 ${overallStatus === 'operational' ? 'border-green-500/20 bg-green-500/5' : overallStatus === 'degraded' ? 'border-amber-500/20 bg-amber-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                <div className="flex items-center gap-3">
                  {overallStatus === 'operational' ? (
                    <Wifi className="h-5 w-5 text-green-400" />
                  ) : overallStatus === 'degraded' ? (
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {overallStatus === 'operational' ? 'All Systems Operational' : overallStatus === 'degraded' ? 'Partial Degradation Detected' : 'Service Disruption'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {systems ? `${systems.summary.operational}/${systems.summary.total} components healthy` : 'Connecting to subsystems...'}
                      {systems && ` | Uptime: ${formatUptime(systems.uptime)} | Response: ${systems.totalResponseTimeMs}ms`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Component Health Grid */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {systems && Object.entries(systems.components).map(([name, health]) => {
                  const icons: Record<string, React.ReactNode> = {
                    database: <Database className="h-4 w-4 text-blue-400" />,
                    'state-machine': <GitBranch className="h-4 w-4 text-purple-400" />,
                    'ai-predictive': <Brain className="h-4 w-4 text-cyan-400" />,
                    'api-layer': <Globe className="h-4 w-4 text-emerald-400" />,
                    'event-sourcing': <Layers className="h-4 w-4 text-orange-400" />,
                    middleware: <Shield className="h-4 w-4 text-indigo-400" />,
                  }
                  return (
                    <ComponentCard
                      key={name}
                      name={name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      icon={icons[name] || <Cpu className="h-4 w-4 text-muted-foreground" />}
                      health={health}
                      expanded
                    />
                  )
                })}
              </div>

              {/* KPI Row */}
              {dashboard && (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
                  {[
                    { label: 'Vessels', value: formatNumber(dashboard.summary.totalVessels || 0), icon: <Ship className="h-3.5 w-3.5" />, sub: `${formatNumber(dashboard.summary.activeVessels || 0)} active` },
                    { label: 'Ports', value: formatNumber(dashboard.summary.totalPorts || 0), icon: <Anchor className="h-3.5 w-3.5" />, sub: 'global network' },
                    { label: 'Shipments', value: formatNumber(dashboard.summary.totalShipments || 0), icon: <Package className="h-3.5 w-3.5" />, sub: 'in lifecycle' },
                    { label: 'Containers', value: formatNumber(dashboard.summary.totalContainers || 0), icon: <Container className="h-3.5 w-3.5" />, sub: 'tracked units' },
                    { label: 'Trade Value', value: formatCurrency(dashboard.tradeOverview?.totalTradeValue || 0), icon: <TrendingUp className="h-3.5 w-3.5" />, sub: 'total value' },
                    { label: 'Carriers', value: formatNumber(dashboard.summary.totalCarriers || 0), icon: <Globe className="h-3.5 w-3.5" />, sub: `${(dashboard.carrierStats?.avgReliability || 0).toFixed(1)}% reliability` },
                  ].map(kpi => (
                    <Card key={kpi.label} className="border-border">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          {kpi.icon}
                          <span className="text-[10px] font-medium uppercase tracking-wider">{kpi.label}</span>
                        </div>
                        <p className="mt-1 text-xl font-bold text-foreground">{kpi.value}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{kpi.sub}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Shipment Status Distribution */}
              {dashboard && dashboard.shipmentsByStatus && dashboard.shipmentsByStatus.length > 0 && (
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      Shipment Lifecycle Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard.shipmentsByStatus.map(s => {
                        const total = dashboard.shipmentsByStatus.reduce((a, b) => a + b.count, 0)
                        const pct = total > 0 ? (s.count / total) * 100 : 0
                        return (
                          <div key={s.status} className="flex items-center gap-3">
                            <span className="w-28 text-xs text-muted-foreground truncate">{s.status}</span>
                            <div className="flex-1">
                              <Progress value={pct} className="h-2" />
                            </div>
                            <span className="w-16 text-right text-xs font-medium text-foreground">{s.count} ({pct.toFixed(0)}%)</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB: BACKEND — Database, API, Middleware details             */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="backend">
            <div className="space-y-6">
              {/* Database Deep Dive */}
              {systems?.components?.database && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-blue-400" />
                      Database Engine
                      <Badge variant="outline" className={statusBadgeVariant(systems.components.database.status)}>
                        {systems.components.database.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>Record counts and query performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                      {systems.components.database.details.records &&
                        Object.entries(systems.components.database.details.records as Record<string, number>).map(([key, count]) => (
                          <div key={key} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                            <p className="text-2xl font-bold text-foreground">{formatNumber(count)}</p>
                            <p className="text-xs text-muted-foreground capitalize">{key}</p>
                          </div>
                        ))}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold text-foreground">{formatNumber((systems.components.database.details.totalRecords as number) || 0)}</p>
                        <p className="text-xs text-muted-foreground">Total Records</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold text-foreground">{systems.components.database.latencyMs}ms</p>
                        <p className="text-xs text-muted-foreground">Query Latency</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold text-foreground">{systems.components.database.details.engine}</p>
                        <p className="text-xs text-muted-foreground">Engine</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* API Layer */}
              {systems?.components?.['api-layer'] && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Network className="h-4 w-4 text-emerald-400" />
                      API Layer
                      <Badge variant="outline" className={statusBadgeVariant(systems.components['api-layer'].status)}>
                        {systems.components['api-layer'].status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      {[
                        { label: 'Total Endpoints', value: systems.components['api-layer'].details.totalEndpoints },
                        { label: 'Protocol', value: systems.components['api-layer'].details.protocol },
                        { label: 'Specification', value: systems.components['api-layer'].details.specification },
                        { label: 'Latency', value: `${systems.components['api-layer'].latencyMs}ms` },
                      ].map(item => (
                        <div key={item.label} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                          <p className="text-lg font-bold text-foreground">{String(item.value)}</p>
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">Available API Endpoints:</p>
                      <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
                        {[
                          '/api/health', '/api/dashboard', '/api/vessels', '/api/shipments',
                          '/api/ports', '/api/containers', '/api/trade-data', '/api/carriers',
                          '/api/charters', '/api/bookings', '/api/search', '/api/systems',
                          '/api/state-machine/definition', '/api/state-machine/probabilities',
                          '/api/state-machine/drift', '/api/shipments/[id]/events',
                          '/api/shipments/[id]/state', '/api/shipments/[id]/replay',
                          '/api/shipments/[id]/history', '/api/ai/eta', '/api/ai/anomaly',
                          '/api/ai/routes', '/api/ai/alerts', '/api/ai/forecast', '/api/vessels/stream',
                          '/api/docs', '/api/events', '/api/documents',
                        ].map(ep => (
                          <a
                            key={ep}
                            href={ep.includes('[id]') ? '#' : ep}
                            target={ep.includes('[id]') ? undefined : '_blank'}
                            rel="noopener noreferrer"
                            className="rounded border border-border bg-muted/50 px-2 py-1.5 text-[10px] font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition-colors truncate"
                          >
                            {ep}
                          </a>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Middleware */}
              {systems?.components?.middleware && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4 text-indigo-400" />
                      Middleware Layer
                      <Badge variant="outline" className={statusBadgeVariant(systems.components.middleware.status)}>
                        {systems.components.middleware.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                      {[
                        { label: 'CORS Protection', value: String(systems.components.middleware.details.cors) },
                        { label: 'Request Tracking', value: String(systems.components.middleware.details.requestTracking) },
                        { label: 'Cache Control', value: String(systems.components.middleware.details.cacheControl) },
                        { label: 'API Versioning', value: String(systems.components.middleware.details.apiVersioning) },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                          <div>
                            <p className="text-xs font-medium text-foreground">{item.label}</p>
                            <p className="text-[10px] text-muted-foreground">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {(systems.components.middleware.details.securityHeaders as string[])?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-muted-foreground mb-2">Security Headers:</p>
                        <div className="flex flex-wrap gap-2">
                          {(systems.components.middleware.details.securityHeaders as string[]).map(h => (
                            <Badge key={h} variant="outline" className="text-[10px] font-mono">
                              {h}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB: STATE ENGINE — State Machine & Event Sourcing           */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="state-machine">
            <div className="space-y-6">
              {/* Engine Health */}
              {systems?.components?.['state-machine'] && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-purple-400" />
                      State Machine Engine
                      <Badge variant="outline" className={statusBadgeVariant(systems.components['state-machine'].status)}>
                        {systems.components['state-machine'].status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Event-Sourced Hierarchical State Machine — Leap 1 (Formal Statecharts), Leap 2 (Event Sourcing), Leap 3 (Probabilistic Transitions)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                      {[
                        { label: 'Version', value: systems.components['state-machine'].details.version },
                        { label: 'States', value: systems.components['state-machine'].details.stateCount },
                        { label: 'Transitions', value: systems.components['state-machine'].details.transitionCount },
                        { label: 'Parallel Regions', value: systems.components['state-machine'].details.parallelRegions },
                        { label: 'Initial Transitions', value: systems.components['state-machine'].details.availableTransitionsFromInitial },
                        { label: 'Monte Carlo Entropy', value: systems.components['state-machine'].details.monteCarloEntropy },
                      ].map(item => (
                        <div key={item.label} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                          <p className="text-lg font-bold text-foreground">{String(item.value)}</p>
                          <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Statechart Visualization */}
              {statechart && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4 text-purple-400" />
                      Shipment Statechart v{statechart.version}
                    </CardTitle>
                    <CardDescription>
                      {statechart.stateCount} hierarchical states | {statechart.transitionCount} transitions | {statechart.parallelRegions.length} parallel regions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {/* States */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">States</p>
                        <ScrollArea className="h-64">
                          <div className="space-y-1">
                            {statechart.states.map(s => (
                              <div key={s.id} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted/50">
                                {s.isInitial && <Zap className="h-3 w-3 text-amber-400" />}
                                {s.isTerminal && <XCircle className="h-3 w-3 text-red-400" />}
                                {!s.isInitial && !s.isTerminal && <CheckCircle2 className="h-3 w-3 text-muted-foreground" />}
                                <span className={`font-mono ${s.parent ? 'pl-3 text-muted-foreground' : 'text-foreground font-medium'}`}>
                                  {s.id}
                                </span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                      {/* Transitions */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Transitions (sample)</p>
                        <ScrollArea className="h-64">
                          <div className="space-y-1">
                            {statechart.transitions.slice(0, 30).map((t, i) => (
                              <div key={i} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted/50">
                                <ArrowUpRight className="h-3 w-3 text-purple-400" />
                                <span className="font-mono text-foreground">{t.from}</span>
                                <span className="text-muted-foreground">--[{t.event}]--&gt;</span>
                                <span className="font-mono text-foreground">{t.to}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Event Sourcing Layer */}
              {systems?.components?.['event-sourcing'] && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4 text-orange-400" />
                      Event Sourcing Layer
                      <Badge variant="outline" className={statusBadgeVariant(systems.components['event-sourcing'].status)}>
                        {systems.components['event-sourcing'].status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>Immutable append-only event log with state projection</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      {[
                        { label: 'Total Events', value: formatNumber((systems.components['event-sourcing'].details.totalEvents as number) || 0) },
                        { label: 'Valid Events', value: formatNumber((systems.components['event-sourcing'].details.validEvents as number) || 0) },
                        { label: 'Invalid Events', value: formatNumber((systems.components['event-sourcing'].details.invalidEvents as number) || 0) },
                        { label: 'Log Status', value: String(systems.components['event-sourcing'].details.appendOnlyLog) },
                      ].map(item => (
                        <div key={item.label} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                          <p className="text-lg font-bold text-foreground">{item.value}</p>
                          <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        </div>
                      ))}
                    </div>
                    {recentEvents.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Recent Events (Live)</p>
                        <div className="space-y-1">
                          {recentEvents.map((ev, i) => (
                            <div key={i} className="flex items-center gap-2 rounded border border-border bg-muted/30 px-3 py-2 text-xs">
                              {ev.valid ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <XCircle className="h-3 w-3 text-red-400" />}
                              <span className="font-mono text-foreground">{ev.eventType}</span>
                              {ev.computedState && (
                                <>
                                  <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                                  <Badge variant="outline" className="text-[10px]">{ev.computedState}</Badge>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB: DATA FLOW — Shipments, Trade, Vessels                  */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="data">
            <div className="space-y-6">
              {/* Active Shipments */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Active Shipments (Live Data)
                  </CardTitle>
                  <CardDescription>Real-time shipment data from the backend API</CardDescription>
                </CardHeader>
                <CardContent>
                  {shipments.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Loading shipments...</div>
                  ) : (
                    <ScrollArea className="h-80">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-left">
                            <th className="pb-2 font-medium text-muted-foreground">B/L</th>
                            <th className="pb-2 font-medium text-muted-foreground">Status</th>
                            <th className="pb-2 font-medium text-muted-foreground">Vessel</th>
                            <th className="pb-2 font-medium text-muted-foreground hidden md:table-cell">Origin</th>
                            <th className="pb-2 font-medium text-muted-foreground hidden md:table-cell">Destination</th>
                            <th className="pb-2 font-medium text-muted-foreground hidden lg:table-cell">Cargo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shipments.map(s => (
                            <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-2 font-mono text-foreground">{s.billOfLading}</td>
                              <td className="py-2">
                                <Badge variant="outline" className={`text-[10px] ${shipmentStatusColor(s.status)}`}>
                                  {s.status}
                                </Badge>
                              </td>
                              <td className="py-2 text-muted-foreground">{s.vessel?.name || '-'}</td>
                              <td className="py-2 text-muted-foreground hidden md:table-cell">{s.originPort?.name || '-'}</td>
                              <td className="py-2 text-muted-foreground hidden md:table-cell">{s.destPort?.name || '-'}</td>
                              <td className="py-2 text-muted-foreground hidden lg:table-cell">{s.cargoType}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Trade Overview */}
              {dashboard && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                        Trade Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                          <span className="text-xs text-muted-foreground">Total Trade Value</span>
                          <span className="text-lg font-bold text-foreground">{formatCurrency(dashboard.tradeOverview?.totalTradeValue || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                          <span className="text-xs text-muted-foreground">Gross Weight</span>
                          <span className="text-lg font-bold text-foreground">{formatNumber(dashboard.tradeOverview?.totalGrossWeight || 0)} kg</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                          <span className="text-xs text-muted-foreground">CO2 Emissions</span>
                          <span className="text-lg font-bold text-red-400">{formatNumber(dashboard.tradeOverview?.totalCO2 || 0)}t</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Port Congestion */}
                  {dashboard.congestionDistribution && dashboard.congestionDistribution.length > 0 && (
                    <Card className="border-border">
                      <CardHeader>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Anchor className="h-4 w-4 text-blue-400" />
                          Port Congestion Levels
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {dashboard.congestionDistribution.map(c => {
                            const total = dashboard.congestionDistribution.reduce((a, b) => a + b.count, 0)
                            const pct = total > 0 ? (c.count / total) * 100 : 0
                            return (
                              <div key={c.level} className="flex items-center gap-3">
                                <span className="w-20 text-xs text-muted-foreground">{c.level}</span>
                                <div className="flex-1">
                                  <Progress value={pct} className="h-2" />
                                </div>
                                <span className="w-12 text-right text-xs font-medium text-foreground">{c.count}</span>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Top Carriers */}
              {dashboard?.topCarriers && dashboard.topCarriers.length > 0 && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4 text-cyan-400" />
                      Top Carriers by Capacity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {dashboard.topCarriers.slice(0, 6).map(c => (
                        <div key={c.code} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {c.code.substring(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground">{c.code} | {c.fleetSize} vessels</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-foreground">{formatNumber(c.totalTEUCapacity)}</p>
                            <p className="text-[10px] text-muted-foreground">TEU</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TAB: AI LAYER — Predictive Analytics                        */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <TabsContent value="ai">
            <div className="space-y-6">
              {/* AI Layer Health */}
              {systems?.components?.['ai-predictive'] && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Brain className="h-4 w-4 text-cyan-400" />
                      AI & Predictive Analytics Layer
                      <Badge variant="outline" className={statusBadgeVariant(systems.components['ai-predictive'].status)}>
                        {systems.components['ai-predictive'].status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                      {(systems.components['ai-predictive'].details.modules as string[])?.map(mod => (
                        <div key={mod} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                          <span className="text-xs text-foreground">{mod}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI ETA Prediction */}
              {aiPrediction && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-cyan-400" />
                      AI Predictive ETA (Live Result)
                    </CardTitle>
                    <CardDescription>Real-time prediction from /api/ai/eta endpoint</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {aiPrediction.prediction && (
                        <div className="flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
                          <Brain className="h-5 w-5 text-cyan-400" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{String(aiPrediction.prediction)}</p>
                            {aiPrediction.confidence && (
                              <p className="text-xs text-muted-foreground">
                                Confidence: {(aiPrediction.confidence * 100).toFixed(0)}%
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {aiPrediction.reasoning && (
                        <div className="rounded-lg border border-border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground mb-1">Reasoning:</p>
                          <p className="text-xs text-foreground">{String(aiPrediction.reasoning)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Capabilities */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    AI Module Endpoints
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {[
                      { endpoint: '/api/ai/eta', desc: 'Predictive ETA using vessel speed profiles, congestion, seasonal factors', icon: <Clock className="h-4 w-4 text-cyan-400" /> },
                      { endpoint: '/api/ai/anomaly', desc: 'Vessel behaviour anomaly detection using deviation patterns', icon: <AlertTriangle className="h-4 w-4 text-amber-400" /> },
                      { endpoint: '/api/ai/routes', desc: 'AI-powered route optimisation with weather and fuel efficiency', icon: <Navigation className="h-4 w-4 text-green-400" /> },
                      { endpoint: '/api/ai/alerts', desc: 'Automated alert generation based on predictive models', icon: <Radio className="h-4 w-4 text-red-400" /> },
                      { endpoint: '/api/ai/forecast', desc: 'Demand forecasting using historical trade patterns', icon: <TrendingUp className="h-4 w-4 text-purple-400" /> },
                    ].map(mod => (
                      <a key={mod.endpoint} href={mod.endpoint} target="_blank" rel="noopener noreferrer" className="group rounded-lg border border-border bg-muted/30 p-4 transition-all hover:bg-muted/50 hover:border-primary/30">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">{mod.icon}</div>
                          <div>
                            <p className="text-xs font-mono font-medium text-foreground group-hover:text-primary">{mod.endpoint}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">{mod.desc}</p>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
              <Radio className="h-3 w-3 text-green-400" />
              <span>Live Operations Center</span>
            </div>
            <span className="text-xs text-muted-foreground/50">|</span>
            <span className="text-xs text-muted-foreground/50">Maritime & Freight Services v2.0</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
            <span>{systems?.components?.length || 0} subsystems monitored</span>
            <span className="text-muted-foreground/50">|</span>
            <span>Auto-refresh: 30s</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
