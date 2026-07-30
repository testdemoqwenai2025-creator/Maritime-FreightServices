'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Activity, ArrowRight, Clock, Database, Cpu, RefreshCw, Trash2, Zap,
  Shield, Globe, BarChart3, Server, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Filter, Play, Pause, Timer, Layers, Radio,
  Monitor, Wifi, ArrowDownToLine, Link2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface HandlerTrace {
  traceId: string; path: string; method: string
  handlerDurationMs: number; dbQueryCount: number; dbDurationMs: number
  statusCode: number; responseSize: number; timestamp: string
  middlewareDurationMs: number; middlewareActions: string[]
  matchedPattern: string; cacheStatus: string; clientIp: string; userAgent: string
}
interface EndpointDef { method: string; path: string; description: string; category: string }
interface TimingStat { avgMs: number; p50Ms: number; p95Ms: number; p99Ms: number; maxMs: number; minMs?: number }
interface Stats {
  totalRequests: number; timeRange?: { oldest: string; newest: string }
  middleware: TimingStat; handler: TimingStat; endToEnd: TimingStat
  database: { avgMs: number; p50Ms: number; p95Ms: number; maxMs: number; totalQueries: number; tracesWithDb: number }
  statusCodes?: Record<number, number>; methods?: Record<string, number>
  topEndpoints?: { path: string; count: number }[]
  topMiddlewareActions?: { action: string; count: number }[]
  responseSize?: { avgBytes: number; maxBytes: number }
  errorRate?: number; errors?: number; message?: string
}
interface TraceResponse {
  meta: { generatedAt: string; appUptimeSeconds: number; traceBufferSize: number; endpointCount: number; ownHandlerDurationMs: number }
  stats: Stats; traces: HandlerTrace[]; endpoints: EndpointDef[]
}

// Frontend beat types
interface FrontendBeat {
  beatId: string; traceId: string | null; clientTimestamp: string
  clientSentAt: number; serverReceivedAt: number; networkLatencyMs: number
  targetPath: string; targetMethod: string; clientStatus: number
  clientResponseTimeMs: number; clientResponseSize: number; pageUrl: string
  serverMiddlewareDurationMs: number; serverHandlerDurationMs: number
  serverDbDurationMs: number; serverDbQueries: number; serverStatusCode: number
  correlated: boolean; clientToServerMs?: number; serverProcessingMs?: number; serverToClientMs?: number
}
interface BeatResponse {
  meta: { bufferSize: number; totalBeats: number; timestamp: string }
  stats: {
    totalBeats: number; correlatedBeats: number; correlationRate: number
    uniquePages: number
    roundTrip: { avgMs: number; p50Ms: number; p95Ms: number; maxMs: number }
    networkLatency: { avgMs: number; p50Ms: number; maxMs: number }
    serverBreakdown: { middlewareAvgMs: number; handlerAvgMs: number; dbAvgMs: number }
    topPaths: { path: string; count: number }[]; message?: string
  }
  beats: FrontendBeat[]
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const methodColor = (m: string) =>
  ({ GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30', PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30', DELETE: 'bg-red-500/20 text-red-400 border-red-500/30' }[m] || 'bg-muted text-muted-foreground border-border')
const statusColor = (c: number) => c < 300 ? 'text-emerald-400' : c < 400 ? 'text-amber-400' : 'text-red-400'
const statusBg = (c: number) => c < 300 ? 'bg-emerald-500/10 border-emerald-500/20' : c < 400 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'
const durColor = (ms: number) => ms < 1 ? 'bg-emerald-500' : ms < 5 ? 'bg-yellow-500' : ms < 20 ? 'bg-amber-500' : 'bg-red-500'
const fmtBytes = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`

// ------------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------------
function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card><CardContent className="pt-6">
      <div className="flex items-center gap-3 mb-2"><div className="rounded-md bg-muted p-2">{icon}</div><span className="text-sm text-muted-foreground">{label}</span></div>
      <p className="text-2xl font-bold font-mono">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </CardContent></Card>
  )
}

function TimingCard({ title, icon, data }: { title: string; icon: React.ReactNode; data: TimingStat }) {
  const rows = [{ label: 'Average', value: data.avgMs }, { label: 'P50', value: data.p50Ms }, { label: 'P95', value: data.p95Ms }, { label: 'P99', value: data.p99Ms }, { label: 'Max', value: data.maxMs }]
  const maxVal = Math.max(...rows.map(r => r.value), 0.01)
  return (
    <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2">{icon} {title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-3 text-sm">
            <span className="w-14 text-muted-foreground text-xs">{r.label}</span>
            <div className="flex-1 h-2 rounded-full bg-muted"><div className={`h-full rounded-full ${durColor(r.value)}`} style={{ width: `${(r.value / maxVal) * 100}%` }} /></div>
            <span className="font-mono text-xs w-16 text-right">{r.value.toFixed(2)} ms</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ------------------------------------------------------------------
// Traced fetch — wraps fetch() to measure client-side timing
// ------------------------------------------------------------------
async function tracedFetch(path: string, method = 'GET') {
  const clientSentAt = performance.now()
  const clientTimestamp = new Date().toISOString()
  let clientStatus = 0
  let clientResponseSize = 0
  let traceId: string | null = null

  try {
    const res = await fetch(path)
    clientStatus = res.status
    traceId = res.headers.get('x-trace-id')
    const text = await res.text()
    clientResponseSize = text.length
    const clientResponseTimeMs = parseFloat((performance.now() - clientSentAt).toFixed(3))

    // Report beat to server (fire-and-forget)
    fetch('/api/observability/frontend-beat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientTimestamp, clientSentAt, clientResponseTimeMs, clientStatus,
        clientResponseSize, traceId, targetPath: path, targetMethod: method,
        pageUrl: window.location.href, userAgent: navigator.userAgent,
      }),
    }).catch(() => {})

    return { json: JSON.parse(text), clientResponseTimeMs, traceId, status: clientStatus }
  } catch (err) {
    const clientResponseTimeMs = parseFloat((performance.now() - clientSentAt).toFixed(3))
    return { json: null, clientResponseTimeMs, traceId, status: 0 }
  }
}

// ------------------------------------------------------------------
// Main Page
// ------------------------------------------------------------------
export default function ObservabilityPage() {
  const [data, setData] = useState<TraceResponse | null>(null)
  const [beatData, setBeatData] = useState<BeatResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pathFilter, setPathFilter] = useState('')
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [probing, setProbing] = useState(false)
  const [probeResults, setProbeResults] = useState<{ path: string; method: string; latencyMs: number; status: number; traceId: string }[]>([])
  const [frontendProbing, setFrontendProbing] = useState(false)

  // Server-side traces
  const fetchTraces = useCallback(async () => {
    try {
      const url = pathFilter ? `/api/observability/trace?path=${encodeURIComponent(pathFilter)}&limit=100` : '/api/observability/trace?limit=100'
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
      setError(null)
    } catch (err) { setError(String(err)) }
    finally { setLoading(false) }
  }, [pathFilter])

  // Frontend beats
  const fetchBeats = useCallback(async () => {
    try {
      const res = await fetch('/api/observability/frontend-beat?limit=100')
      if (res.ok) setBeatData(await res.json())
    } catch {}
  }, [])

  useEffect(() => { fetchTraces(); fetchBeats() }, [fetchTraces, fetchBeats])
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => { fetchTraces(); fetchBeats() }, 3000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, fetchTraces, fetchBeats])

  const clearAll = async () => {
    await Promise.all([
      fetch('/api/observability/trace?action=clear'),
      fetch('/api/observability/frontend-beat?action=clear'),
    ])
    fetchTraces(); fetchBeats()
  }

  // Server-side probe (basic)
  const probeEndpoints = async () => {
    setProbing(true)
    const targets = [
      { method: 'GET', path: '/api/health' }, { method: 'GET', path: '/api/dashboard' },
      { method: 'GET', path: '/api/vessels?limit=5' }, { method: 'GET', path: '/api/shipments?limit=5' },
      { method: 'GET', path: '/api/ports?limit=5' }, { method: 'GET', path: '/api/carriers?limit=5' },
    ]
    const results: typeof probeResults = []
    for (const t of targets) {
      const start = performance.now()
      try {
        const res = await fetch(t.path)
        results.push({ ...t, latencyMs: parseFloat((performance.now() - start).toFixed(3)), status: res.status, traceId: res.headers.get('x-trace-id') || 'n/a' })
      } catch { results.push({ ...t, latencyMs: 0, status: 0, traceId: 'error' }) }
    }
    setProbeResults(results)
    setProbing(false)
    setTimeout(() => { fetchTraces(); fetchBeats() }, 500)
  }

  // Frontend-to-backend probe — uses tracedFetch to capture FULL pipeline
  const probeFrontend = async () => {
    setFrontendProbing(true)
    const targets = ['/api/health', '/api/dashboard', '/api/vessels?limit=5', '/api/shipments?limit=5', '/api/ports?limit=5', '/api/carriers?limit=5']
    for (const path of targets) await tracedFetch(path)
    // Wait for beats to register
    await new Promise(r => setTimeout(r, 300))
    fetchBeats()
    fetchTraces()
    setFrontendProbing(false)
  }

  const stats = data?.stats
  const traces = data?.traces || []
  const endpoints = data?.endpoints || []
  const meta = data?.meta
  const maxE2E = Math.max(...traces.map(t => t.middlewareDurationMs + t.handlerDurationMs), 1)
  const beatStats = beatData?.stats
  const beats = beatData?.beats || []

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight md:text-3xl">
            <Radio className="h-8 w-8 text-emerald-400" />
            Request Observability
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live trace: Frontend &rarr; Network &rarr; Middleware &rarr; Handler &rarr; Database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5"><Activity className="h-3.5 w-3.5" />{meta?.traceBufferSize ?? 0} server</Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5"><Monitor className="h-3.5 w-3.5" />{beatData?.meta.bufferSize ?? 0} frontend</Badge>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button variant={autoRefresh ? 'default' : 'outline'} size="sm" onClick={() => setAutoRefresh(!autoRefresh)} className="gap-2">
          {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{autoRefresh ? 'Auto ON' : 'Auto OFF'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => { fetchTraces(); fetchBeats() }} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
        <Button variant="default" size="sm" onClick={probeFrontend} disabled={frontendProbing} className="gap-2">
          <Monitor className="h-4 w-4" />{frontendProbing ? 'Probing...' : 'Frontend Probe'}
        </Button>
        <Button variant="outline" size="sm" onClick={probeEndpoints} disabled={probing} className="gap-2">
          <Zap className="h-4 w-4" />{probing ? 'Probing...' : 'Server Probe'}
        </Button>
        <Button variant="outline" size="sm" onClick={clearAll} className="gap-2 text-red-400 hover:text-red-300">
          <Trash2 className="h-4 w-4" /> Clear
        </Button>
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter path" value={pathFilter} onChange={e => setPathFilter(e.target.value)} className="w-56 h-9 text-sm" />
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/5"><CardContent className="flex items-center gap-3 pt-6"><XCircle className="h-5 w-5 text-red-400" /><p className="text-sm text-red-300">{error}</p></CardContent></Card>
      )}

      <Tabs defaultValue="frontend" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="frontend" className="gap-2"><Monitor className="h-4 w-4" /> Frontend</TabsTrigger>
          <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" /> Server</TabsTrigger>
          <TabsTrigger value="traces" className="gap-2"><Layers className="h-4 w-4" /> Traces</TabsTrigger>
          <TabsTrigger value="endpoints" className="gap-2"><Server className="h-4 w-4" /> Endpoints</TabsTrigger>
          <TabsTrigger value="architecture" className="gap-2"><Globe className="h-4 w-4" /> Pipeline</TabsTrigger>
        </TabsList>

        {/* ========== FRONTEND TAB ========== */}
        <TabsContent value="frontend" className="space-y-6">
          {beatStats && beatStats.message ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Frontend Beats</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">{beatStats.message}</p>
              <Button onClick={probeFrontend} disabled={frontendProbing} className="gap-2"><Monitor className="h-4 w-4" />{frontendProbing ? 'Running...' : 'Run Frontend Probe'}</Button>
            </CardContent></Card>
          ) : beatStats ? (
            <>
              {/* Summary cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard icon={<Monitor className="h-5 w-5 text-blue-400" />} label="Frontend Beats" value={beatStats.totalBeats.toString()} sub={`${beatStats.uniquePages} page(s)`} />
                <StatCard icon={<Wifi className="h-5 w-5 text-cyan-400" />} label="Avg Round-Trip" value={`${beatStats.roundTrip.avgMs.toFixed(1)} ms`} sub={`p95: ${beatStats.roundTrip.p95Ms.toFixed(1)} ms`} />
                <StatCard icon={<ArrowDownToLine className="h-5 w-5 text-emerald-400" />} label="Avg Network" value={`${beatStats.networkLatency.avgMs.toFixed(1)} ms`} sub={`p50: ${beatStats.networkLatency.p50Ms.toFixed(1)} ms`} />
                <StatCard icon={<Cpu className="h-5 w-5 text-purple-400" />} label="Server Processing" value={`${(beatStats.serverBreakdown.middlewareAvgMs + beatStats.serverBreakdown.handlerAvgMs).toFixed(1)} ms`} sub={`MW: ${beatStats.serverBreakdown.middlewareAvgMs.toFixed(2)}ms + H: ${beatStats.serverBreakdown.handlerAvgMs.toFixed(1)}ms`} />
                <StatCard icon={<Link2 className="h-5 w-5" />} label="Correlation" value={`${beatStats.correlationRate}%`} sub={`${beatStats.correlatedBeats}/${beatStats.totalBeats} beats matched`} />
              </div>

              {/* Correlated pipeline waterfall */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" />Correlated Frontend &rarr; Server Pipeline</CardTitle></CardHeader>
                <CardContent>
                  {beats.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No beats. Click &quot;Frontend Probe&quot; to generate traffic from the browser.</p>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-3">
                        {[...beats].reverse().map((b) => {
                          const total = b.clientResponseTimeMs || 1
                          const netPct = Math.max((b.networkLatencyMs / total) * 100, 1)
                          const mwPct = Math.max((b.serverMiddlewareDurationMs / total) * 100, 0.5)
                          const hPct = Math.max(((b.serverHandlerDurationMs - b.serverDbDurationMs) / total) * 100, 0.5)
                          const dbPct = Math.max((b.serverDbDurationMs / total) * 100, 0.5)
                          const returnPct = Math.max(100 - netPct - mwPct - hPct - dbPct, 0)
                          return (
                            <div key={b.beatId} className="rounded-md border p-3 space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Badge className={`${methodColor(b.targetMethod)} text-[10px] border`}>{b.targetMethod}</Badge>
                                <code className="text-xs font-mono flex-1 truncate" title={b.targetPath}>{b.targetPath}</code>
                                <Badge variant={b.correlated ? 'outline' : 'secondary'} className={`text-[10px] ${b.correlated ? 'border-emerald-500/30 text-emerald-400' : ''}`}>
                                  {b.correlated ? 'Linked' : 'Unlinked'}
                                </Badge>
                                <span className={`font-mono text-xs font-bold ${statusColor(b.clientStatus)}`}>{b.clientStatus}</span>
                                <span className="font-mono text-xs text-muted-foreground w-20 text-right">{b.clientResponseTimeMs.toFixed(1)} ms</span>
                              </div>
                              {/* Waterfall bar */}
                              <div className="flex h-5 rounded overflow-hidden text-[9px] font-mono leading-5">
                                <div className="bg-cyan-500/70 text-center" style={{ width: `${netPct}%` }} title={`Network: ${b.networkLatencyMs.toFixed(1)}ms`}>NET</div>
                                <div className="bg-emerald-500/70 text-center" style={{ width: `${mwPct}%` }} title={`Middleware: ${b.serverMiddlewareDurationMs}ms`}>MW</div>
                                <div className="bg-purple-500/70 text-center" style={{ width: `${hPct}%` }} title={`Handler: ${(b.serverHandlerDurationMs - b.serverDbDurationMs).toFixed(1)}ms`}>H</div>
                                <div className="bg-amber-500/70 text-center" style={{ width: `${dbPct}%` }} title={`DB: ${b.serverDbDurationMs}ms`}>DB</div>
                                {returnPct > 0 && <div className="bg-blue-500/40 text-center" style={{ width: `${returnPct}%` }} title={`Return: ${returnPct.toFixed(1)}%`}>RET</div>}
                              </div>
                              <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                                <span>Network: <b className="text-cyan-400">{b.networkLatencyMs.toFixed(1)}ms</b></span>
                                <span>Middleware: <b className="text-emerald-400">{b.serverMiddlewareDurationMs}ms</b></span>
                                <span>Handler: <b className="text-purple-400">{b.serverHandlerDurationMs}ms</b></span>
                                <span>DB: <b className="text-amber-400">{b.serverDbDurationMs}ms ({b.serverDbQueries}q)</b></span>
                                <span>Size: <b>{fmtBytes(b.clientResponseSize)}</b></span>
                                <span className="text-muted-foreground/50">{b.traceId || '—'}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </>
          ) : loading ? <Card><CardContent className="py-16 text-center text-muted-foreground">Loading...</CardContent></Card> : null}
        </TabsContent>

        {/* ========== SERVER OVERVIEW ========== */}
        <TabsContent value="overview" className="space-y-6">
          {stats && stats.message ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Radio className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Server Traces Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">{stats.message}</p>
              <Button onClick={probeEndpoints} disabled={probing} className="gap-2"><Zap className="h-4 w-4" />Probe Now</Button>
            </CardContent></Card>
          ) : stats ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<Activity className="h-5 w-5 text-emerald-400" />} label="Server Requests" value={stats.totalRequests.toString()} sub={stats.timeRange?.oldest ? `Since ${new Date(stats.timeRange.oldest).toLocaleTimeString()}` : ''} />
                <StatCard icon={<Clock className="h-5 w-5 text-blue-400" />} label="Avg E2E" value={`${stats.endToEnd.avgMs.toFixed(2)} ms`} sub={`p95: ${stats.endToEnd.p95Ms.toFixed(2)} ms`} />
                <StatCard icon={<Database className="h-5 w-5 text-purple-400" />} label="Avg DB" value={`${stats.database.avgMs.toFixed(2)} ms`} sub={`${stats.database.totalQueries} queries`} />
                <StatCard icon={(stats.errorRate ?? 0) === 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-red-400" />} label="Errors" value={`${stats.errorRate?.toFixed(2)}%`} sub={`${stats.errors ?? 0}`} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <TimingCard title="Middleware" icon={<Shield className="h-4 w-4" />} data={stats.middleware} />
                <TimingCard title="Handler" icon={<Cpu className="h-4 w-4" />} data={stats.handler} />
                <TimingCard title="E2E" icon={<ArrowRight className="h-4 w-4" />} data={stats.endToEnd} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card><CardHeader className="pb-3"><CardTitle className="text-base">Top Endpoints</CardTitle></CardHeader><CardContent><div className="space-y-2">
                  {stats.topEndpoints?.map((ep, i) => { const mx = (stats.topEndpoints?.[0]?.count ?? 1); return (<div key={i} className="flex items-center gap-2 text-sm"><code className="w-48 truncate text-xs font-mono text-muted-foreground" title={ep.path}>{ep.path}</code><div className="flex-1 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(ep.count / mx) * 100}%` }} /></div><span className="text-xs font-mono w-8 text-right">{ep.count}</span></div>) })}
                </div></CardContent></Card>
                <Card><CardHeader className="pb-3"><CardTitle className="text-base">Status & Methods</CardTitle></CardHeader><CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">{Object.entries(stats.statusCodes || {}).map(([c, n]) => <Badge key={c} variant="outline" className={`${statusBg(Number(c))} text-xs border`}>{c}: {n}</Badge>)}</div>
                  <Separator />
                  <div className="flex flex-wrap gap-2">{Object.entries(stats.methods || {}).map(([m, n]) => <Badge key={m} className={`${methodColor(m)} text-xs border`}>{m}: {n}</Badge>)}</div>
                </CardContent></Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* ========== TRACES ========== */}
        <TabsContent value="traces">
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Server Trace Entries</CardTitle></CardHeader><CardContent>
            {traces.length === 0 ? (<p className="text-sm text-muted-foreground text-center py-8">No traces.</p>) : (
              <ScrollArea className="h-[600px]"><div className="space-y-2">
                {[...traces].reverse().map((t) => {
                  const e2e = t.middlewareDurationMs + t.handlerDurationMs
                  const isExp = expandedTrace === t.traceId
                  return (
                    <div key={t.traceId} className="rounded-md border">
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors" onClick={() => setExpandedTrace(isExp ? null : t.traceId)}>
                        <Badge className={`${methodColor(t.method)} text-xs border min-w-[50px] justify-center`}>{t.method}</Badge>
                        <code className="flex-1 text-xs font-mono text-muted-foreground truncate" title={t.path}>{t.path}</code>
                        <span className={`font-mono text-xs font-bold ${statusColor(t.statusCode)}`}>{t.statusCode}</span>
                        <div className="w-32"><div className="flex gap-0.5 h-3"><div className="rounded-l-full bg-cyan-500/80" style={{ width: `${Math.max((t.middlewareDurationMs / maxE2E) * 100, 2)}%` }} /><div className="rounded-r-full bg-blue-500/80" style={{ width: `${Math.max((t.handlerDurationMs / maxE2E) * 100, 2)}%` }} /></div></div>
                        <span className="font-mono text-xs w-16 text-right">{e2e.toFixed(2)} ms</span>
                        <span className="text-[10px] text-muted-foreground w-20 text-right">{new Date(t.timestamp).toLocaleTimeString()}</span>
                        {isExp ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      {isExp && (
                        <div className="border-t px-3 py-3 bg-muted/20 text-xs space-y-2">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div><span className="text-muted-foreground">Trace ID:</span><br /><code className="font-mono text-emerald-400">{t.traceId}</code></div>
                            <div><span className="text-muted-foreground">Middleware:</span><br /><span className="font-mono">{t.middlewareDurationMs} ms</span></div>
                            <div><span className="text-muted-foreground">Handler:</span><br /><span className="font-mono">{t.handlerDurationMs} ms</span></div>
                            <div><span className="text-muted-foreground">Database:</span><br /><span className="font-mono">{t.dbDurationMs} ms ({t.dbQueryCount}q)</span></div>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">{t.middlewareActions.map((a, i) => <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{a}</Badge>)}</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div></ScrollArea>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* ========== ENDPOINTS ========== */}
        <TabsContent value="endpoints">
          <Card><CardHeader className="pb-3"><CardTitle className="text-base">Registered API Endpoints ({endpoints.length})</CardTitle></CardHeader><CardContent>
            <ScrollArea className="h-[600px]"><div className="space-y-1">
              {endpoints.map((ep, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted/50">
                  <Badge className={`${methodColor(ep.method)} text-xs border min-w-[50px] justify-center`}>{ep.method}</Badge>
                  <code className="flex-1 font-mono text-xs">{ep.path}</code>
                  <Badge variant="outline" className="text-[10px]">{ep.category}</Badge>
                  <span className="text-xs text-muted-foreground hidden lg:block max-w-xs truncate">{ep.description}</span>
                </div>
              ))}
            </div></ScrollArea>
          </CardContent></Card>
        </TabsContent>

        {/* ========== ARCHITECTURE PIPELINE ========== */}
        <TabsContent value="architecture">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <Card><CardHeader className="pb-3"><CardTitle className="text-base">Full-Stack Pipeline</CardTitle></CardHeader><CardContent>
              <div className="space-y-0">
                {[
                  { icon: <Monitor className="h-5 w-5" />, label: 'Browser (React)', desc: 'tracedFetch() measures clientSentAt, reads x-trace-id from response headers', color: 'border-blue-500/40 bg-blue-500/5' },
                  { icon: <Wifi className="h-5 w-5" />, label: 'Network', desc: 'HTTP request/response latency (measured as serverReceivedAt - clientSentAt)', color: 'border-cyan-500/40 bg-cyan-500/5' },
                  { icon: <Shield className="h-5 w-5" />, label: 'Next.js Middleware (Edge)', desc: 'Route classification, CORS, security headers, trace ID injection', color: 'border-emerald-500/40 bg-emerald-500/5' },
                  { icon: <Server className="h-5 w-5" />, label: 'Route Handler (Node.js)', desc: 'Business logic, Prisma ORM queries, response serialization', color: 'border-purple-500/40 bg-purple-500/5' },
                  { icon: <Database className="h-5 w-5" />, label: 'SQLite via Prisma', desc: 'SQL execution, result mapping', color: 'border-amber-500/40 bg-amber-500/5' },
                  { icon: <Link2 className="h-5 w-5" />, label: 'Frontend Beat Reporter', desc: 'POST /api/observability/frontend-beat — correlates client timing with server trace', color: 'border-rose-500/40 bg-rose-500/5' },
                ].map((step, i) => (
                  <div key={i}>
                    <div className={`rounded-lg border p-4 ${step.color}`}>
                      <div className="flex items-center gap-2 mb-1"><div>{step.icon}</div><span className="font-semibold text-sm">{step.label}</span></div>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                    {i < 5 && <div className="flex justify-center py-1"><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>}
                  </div>
                ))}
              </div>
            </CardContent></Card>
            <Card><CardHeader className="pb-3"><CardTitle className="text-base">How Frontend Observation Works</CardTitle></CardHeader><CardContent className="text-sm space-y-3 text-muted-foreground">
              <p>The <code className="text-emerald-400">tracedFetch()</code> utility wraps every browser <code className="text-blue-400">fetch()</code> call:</p>
              <ol className="list-decimal list-inside space-y-1 pl-2">
                <li>Records <b>clientSentAt</b> via <code className="text-cyan-400">performance.now()</code> before the request</li>
                <li>Makes the actual <code className="text-blue-400">fetch()</code> call to the API</li>
                <li>Reads the <code className="text-emerald-400">x-trace-id</code> response header set by the middleware</li>
                <li>Measures <b>clientResponseTimeMs</b> = performance.now() - clientSentAt</li>
                <li>POSTs all client-side timing to <code className="text-rose-400">/api/observability/frontend-beat</code></li>
                <li>The beat endpoint looks up the matching server-side trace by trace ID</li>
                <li>Returns a <b>correlated view</b> of the full Frontend &rarr; Network &rarr; MW &rarr; Handler &rarr; DB pipeline</li>
              </ol>
              <Separator />
              <p className="text-xs">The &quot;Frontend Probe&quot; button fires 6 real browser requests and displays the correlated waterfall for each.</p>
            </CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}