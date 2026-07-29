'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Activity, ArrowRight, Clock, Database, Cpu, RefreshCw, Trash2, Zap,
  Shield, Globe, BarChart3, Server, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Filter, Play, Pause, Timer, Layers, Radio
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
  totalRequests: number
  timeRange?: { oldest: string; newest: string }
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
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-2"><div className="rounded-md bg-muted p-2">{icon}</div><span className="text-sm text-muted-foreground">{label}</span></div>
        <p className="text-2xl font-bold font-mono">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function TimingCard({ title, icon, data }: { title: string; icon: React.ReactNode; data: TimingStat }) {
  const rows = [
    { label: 'Average', value: data.avgMs },
    { label: 'P50', value: data.p50Ms },
    { label: 'P95', value: data.p95Ms },
    { label: 'P99', value: data.p99Ms },
    { label: 'Max', value: data.maxMs },
  ]
  const maxVal = Math.max(...rows.map(r => r.value), 0.01)
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2">{icon} {title}</CardTitle></CardHeader>
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
// Main Page
// ------------------------------------------------------------------
export default function ObservabilityPage() {
  const [data, setData] = useState<TraceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pathFilter, setPathFilter] = useState('')
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [probing, setProbing] = useState(false)
  const [probeResults, setProbeResults] = useState<{ path: string; method: string; latencyMs: number; status: number; traceId: string }[]>([])

  const fetchData = useCallback(async () => {
    try {
      const url = pathFilter ? `/api/observability/trace?path=${encodeURIComponent(pathFilter)}&limit=100` : '/api/observability/trace?limit=100'
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
      setError(null)
    } catch (err) { setError(String(err)) }
    finally { setLoading(false) }
  }, [pathFilter])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    if (autoRefresh) intervalRef.current = setInterval(fetchData, 3000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, fetchData])

  const clearTraces = async () => { await fetch('/api/observability/trace?action=clear'); fetchData() }

  const probeEndpoints = async () => {
    setProbing(true)
    const targets = [
      { method: 'GET', path: '/api/health' },
      { method: 'GET', path: '/api/dashboard' },
      { method: 'GET', path: '/api/vessels?limit=5' },
      { method: 'GET', path: '/api/shipments?limit=5' },
      { method: 'GET', path: '/api/ports?limit=5' },
      { method: 'GET', path: '/api/carriers?limit=5' },
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
    setTimeout(fetchData, 500)
  }

  const stats = data?.stats
  const traces = data?.traces || []
  const endpoints = data?.endpoints || []
  const meta = data?.meta
  const maxE2E = Math.max(...traces.map(t => t.middlewareDurationMs + t.handlerDurationMs), 1)

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
            Live trace view: Frontend &rarr; Middleware &rarr; Route Handler &rarr; Database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5"><Activity className="h-3.5 w-3.5" />{meta?.traceBufferSize ?? 0} traces</Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5"><Timer className="h-3.5 w-3.5" />Uptime {meta?.appUptimeSeconds ?? 0}s</Badge>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button variant={autoRefresh ? 'default' : 'outline'} size="sm" onClick={() => setAutoRefresh(!autoRefresh)} className="gap-2">
          {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
        </Button>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2"><RefreshCw className="h-4 w-4" /> Refresh</Button>
        <Button variant="outline" size="sm" onClick={probeEndpoints} disabled={probing} className="gap-2">
          <Zap className="h-4 w-4" />{probing ? 'Probing...' : 'Probe Endpoints'}
        </Button>
        <Button variant="outline" size="sm" onClick={clearTraces} className="gap-2 text-red-400 hover:text-red-300">
          <Trash2 className="h-4 w-4" /> Clear
        </Button>
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter path (e.g. /api/vessels)" value={pathFilter} onChange={e => setPathFilter(e.target.value)} className="w-64 h-9 text-sm" />
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-red-500/30 bg-red-500/5"><CardContent className="flex items-center gap-3 pt-6"><XCircle className="h-5 w-5 text-red-400" /><p className="text-sm text-red-300">{error}</p></CardContent></Card>
      )}

      {/* Probe Results */}
      {probeResults.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" />Probe Results (Browser &rarr; Server round-trip)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {probeResults.map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                  <Badge className={`${methodColor(p.method)} text-xs border`}>{p.method}</Badge>
                  <code className="flex-1 text-xs font-mono text-muted-foreground">{p.path}</code>
                  <span className={`font-mono text-xs font-bold ${statusColor(p.status)}`}>{p.status}</span>
                  <div className="w-24"><div className="h-1.5 w-full rounded-full bg-muted"><div className={`h-full rounded-full ${durColor(p.latencyMs)}`} style={{ width: `${Math.min((p.latencyMs / 2000) * 100, 100)}%` }} /></div></div>
                  <span className="font-mono text-xs w-16 text-right">{p.latencyMs} ms</span>
                  <code className="text-[10px] text-muted-foreground w-24 truncate" title={p.traceId}>{p.traceId}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="traces" className="gap-2"><Layers className="h-4 w-4" /> Traces</TabsTrigger>
          <TabsTrigger value="endpoints" className="gap-2"><Server className="h-4 w-4" /> Endpoints</TabsTrigger>
          <TabsTrigger value="architecture" className="gap-2"><Globe className="h-4 w-4" /> Pipeline</TabsTrigger>
        </TabsList>

        {/* ========== OVERVIEW ========== */}
        <TabsContent value="overview" className="space-y-6">
          {stats && stats.message ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Radio className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Traces Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">{stats.message}</p>
              <Button onClick={probeEndpoints} disabled={probing} className="gap-2"><Zap className="h-4 w-4" />{probing ? 'Probing...' : 'Probe Endpoints Now'}</Button>
            </CardContent></Card>
          ) : stats ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<Activity className="h-5 w-5 text-emerald-400" />} label="Total Requests" value={stats.totalRequests.toString()} sub={stats.timeRange?.oldest ? `Since ${new Date(stats.timeRange.oldest).toLocaleTimeString()}` : ''} />
                <StatCard icon={<Clock className="h-5 w-5 text-blue-400" />} label="Avg E2E Latency" value={`${stats.endToEnd.avgMs.toFixed(2)} ms`} sub={`p95: ${stats.endToEnd.p95Ms.toFixed(2)} ms`} />
                <StatCard icon={<Database className="h-5 w-5 text-purple-400" />} label="Avg DB Time" value={`${stats.database.avgMs.toFixed(2)} ms`} sub={`${stats.database.totalQueries} total queries`} />
                <StatCard icon={(stats.errorRate ?? 0) === 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-red-400" />} label="Error Rate" value={`${stats.errorRate?.toFixed(2)}%`} sub={`${stats.errors ?? 0} errors`} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <TimingCard title="Middleware" icon={<Shield className="h-4 w-4" />} data={stats.middleware} />
                <TimingCard title="Route Handler" icon={<Cpu className="h-4 w-4" />} data={stats.handler} />
                <TimingCard title="End-to-End" icon={<ArrowRight className="h-4 w-4" />} data={stats.endToEnd} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Top Endpoints</CardTitle></CardHeader>
                  <CardContent><div className="space-y-2">
                    {stats.topEndpoints?.map((ep, i) => {
                      const mx = (stats.topEndpoints?.[0]?.count ?? 1)
                      return (<div key={i} className="flex items-center gap-2 text-sm">
                        <code className="w-48 truncate text-xs font-mono text-muted-foreground" title={ep.path}>{ep.path}</code>
                        <div className="flex-1 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(ep.count / mx) * 100}%` }} /></div>
                        <span className="text-xs font-mono w-8 text-right">{ep.count}</span>
                      </div>)
                    })}
                  </div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Status Codes & Methods</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(stats.statusCodes || {}).map(([code, count]) => (
                        <Badge key={code} variant="outline" className={`${statusBg(Number(code))} text-xs border`}>{code}: {count}</Badge>
                      ))}
                    </div>
                    <Separator />
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(stats.methods || {}).map(([method, count]) => (
                        <Badge key={method} className={`${methodColor(method)} text-xs border`}>{method}: {count}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : loading ? <Card><CardContent className="py-16 text-center text-muted-foreground">Loading...</CardContent></Card> : null}
        </TabsContent>

        {/* ========== TRACES ========== */}
        <TabsContent value="traces">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Recent Trace Entries</CardTitle></CardHeader>
            <CardContent>
              {traces.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No traces. Click "Probe Endpoints" or navigate the dashboard to generate traffic.</p>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {[...traces].reverse().map((t) => {
                      const e2e = t.middlewareDurationMs + t.handlerDurationMs
                      const isExpanded = expandedTrace === t.traceId
                      return (
                        <div key={t.traceId} className="rounded-md border">
                          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors" onClick={() => setExpandedTrace(isExpanded ? null : t.traceId)}>
                            <Badge className={`${methodColor(t.method)} text-xs border min-w-[50px] justify-center`}>{t.method}</Badge>
                            <code className="flex-1 text-xs font-mono text-muted-foreground truncate" title={t.path}>{t.path}</code>
                            <span className={`font-mono text-xs font-bold ${statusColor(t.statusCode)}`}>{t.statusCode}</span>
                            <div className="w-32">
                              <div className="flex gap-0.5 h-3">
                                <div className="rounded-l-full bg-cyan-500/80" style={{ width: `${Math.max((t.middlewareDurationMs / maxE2E) * 100, 2)}%` }} title={`Middleware: ${t.middlewareDurationMs}ms`} />
                                <div className="rounded-r-full bg-blue-500/80" style={{ width: `${Math.max((t.handlerDurationMs / maxE2E) * 100, 2)}%` }} title={`Handler: ${t.handlerDurationMs}ms`} />
                              </div>
                            </div>
                            <span className="font-mono text-xs w-16 text-right">{e2e.toFixed(2)} ms</span>
                            <span className="text-[10px] text-muted-foreground w-20 text-right">{new Date(t.timestamp).toLocaleTimeString()}</span>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                          </button>
                          {isExpanded && (
                            <div className="border-t px-3 py-3 bg-muted/20 text-xs space-y-2">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div><span className="text-muted-foreground">Trace ID:</span><br /><code className="font-mono text-emerald-400">{t.traceId}</code></div>
                                <div><span className="text-muted-foreground">Middleware:</span><br /><span className="font-mono">{t.middlewareDurationMs} ms</span></div>
                                <div><span className="text-muted-foreground">Handler:</span><br /><span className="font-mono">{t.handlerDurationMs} ms</span></div>
                                <div><span className="text-muted-foreground">Database:</span><br /><span className="font-mono">{t.dbDurationMs} ms ({t.dbQueryCount} queries)</span></div>
                                <div><span className="text-muted-foreground">Pattern:</span><br /><span className="font-mono">{t.matchedPattern}</span></div>
                                <div><span className="text-muted-foreground">Cache:</span><br /><span className="font-mono">{t.cacheStatus}</span></div>
                                <div><span className="text-muted-foreground">Response Size:</span><br /><span className="font-mono">{fmtBytes(t.responseSize)}</span></div>
                                <div><span className="text-muted-foreground">Client IP:</span><br /><span className="font-mono">{t.clientIp}</span></div>
                              </div>
                              <div><span className="text-muted-foreground">Middleware Actions:</span>
                                <div className="flex flex-wrap gap-1 mt-1">{t.middlewareActions.map((a, i) => <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{a}</Badge>)}</div>
                              </div>
                              <div><span className="text-muted-foreground">Timing Breakdown:</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="w-16 text-right">MW</span>
                                  <div className="flex-1 h-4 rounded bg-muted overflow-hidden"><div className="h-full bg-cyan-500/70 rounded-l" style={{ width: `${(t.middlewareDurationMs / e2e) * 100}%` }} /></div>
                                  <span className="w-16 font-mono">{t.middlewareDurationMs}ms</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="w-16 text-right">Handler</span>
                                  <div className="flex-1 h-4 rounded bg-muted overflow-hidden"><div className={`h-full rounded ${t.dbDurationMs > 0 ? 'bg-purple-500/50' : 'bg-blue-500/70'}`} style={{ width: `${((t.handlerDurationMs - t.dbDurationMs) / e2e) * 100}%` }} /></div>
                                  <span className="w-16 font-mono">{t.handlerDurationMs}ms</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="w-16 text-right">DB</span>
                                  <div className="flex-1 h-4 rounded bg-muted overflow-hidden"><div className="h-full bg-amber-500/70 rounded" style={{ width: `${e2e > 0 ? (t.dbDurationMs / e2e) * 100 : 0}%` }} /></div>
                                  <span className="w-16 font-mono">{t.dbDurationMs}ms</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== ENDPOINTS ========== */}
        <TabsContent value="endpoints">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Registered API Endpoints ({endpoints.length})</CardTitle></CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-1">
                  {endpoints.map((ep, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted/50">
                      <Badge className={`${methodColor(ep.method)} text-xs border min-w-[50px] justify-center`}>{ep.method}</Badge>
                      <code className="flex-1 font-mono text-xs">{ep.path}</code>
                      <Badge variant="outline" className="text-[10px]">{ep.category}</Badge>
                      <span className="text-xs text-muted-foreground hidden lg:block max-w-xs truncate">{ep.description}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== ARCHITECTURE PIPELINE ========== */}
        <TabsContent value="architecture">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {/* Pipeline Diagram */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Request Pipeline Architecture</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {[
                    { icon: <Globe className="h-5 w-5" />, label: 'Browser / Client', desc: 'fetch() from React component', color: 'border-blue-500/40 bg-blue-500/5' },
                    { icon: <ArrowRight className="h-5 w-5" />, label: '', desc: '', color: '', isArrow: true },
                    { icon: <Shield className="h-5 w-5" />, label: 'Next.js Middleware (Edge)', desc: 'Route classification, CORS, security headers, trace ID injection', color: 'border-cyan-500/40 bg-cyan-500/5' },
                    { icon: <ArrowRight className="h-5 w-5" />, label: '', desc: '', color: '', isArrow: true },
                    { icon: <Server className="h-5 w-5" />, label: 'Route Handler (Node.js)', desc: 'Request parsing, business logic, Prisma queries', color: 'border-purple-500/40 bg-purple-500/5' },
                    { icon: <ArrowRight className="h-5 w-5" />, label: '', desc: '', color: '', isArrow: true },
                    { icon: <Database className="h-5 w-5" />, label: 'SQLite via Prisma ORM', desc: 'SQL query execution, result serialization', color: 'border-amber-500/40 bg-amber-500/5' },
                    { icon: <ArrowRight className="h-5 w-5" />, label: '', desc: '', color: '', isArrow: true },
                    { icon: <Activity className="h-5 w-5" />, label: 'Trace Store (In-Memory)', desc: 'Ring buffer (200 entries) for observability', color: 'border-emerald-500/40 bg-emerald-500/5' },
                  ].map((step, i) => (
                    step.isArrow ? (
                      <div key={i} className="flex justify-center py-1"><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
                    ) : (
                      <div key={i} className={`rounded-lg border p-4 ${step.color}`}>
                        <div className="flex items-center gap-2 mb-1"><div className="text-foreground">{step.icon}</div><span className="font-semibold text-sm">{step.label}</span></div>
                        <p className="text-xs text-muted-foreground">{step.desc}</p>
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Response Header Guide */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Tracing Response Headers</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Every API response now includes these tracing headers, readable from browser DevTools:</p>
                <div className="space-y-2 font-mono text-xs">
                  {[
                    { header: 'x-trace-id', desc: 'Unique trace identifier linking middleware to handler' },
                    { header: 'x-middleware-duration-ms', desc: 'Time spent in Edge middleware (ms)' },
                    { header: 'x-handler-duration-ms', desc: 'Time spent in the Node.js route handler (ms)' },
                    { header: 'x-db-duration-ms', desc: 'Time spent executing Prisma/DB queries (ms)' },
                    { header: 'x-db-queries', desc: 'Number of database queries executed' },
                    { header: 'x-matched-pattern', desc: 'Route classification (API Route, AI Service, etc.)' },
                    { header: 'x-cache-status', desc: 'Cache strategy (dynamic, no-store, static-immutable)' },
                    { header: 'x-frame-options', desc: 'Security: DENY' },
                    { header: 'x-content-type-options', desc: 'Security: nosniff' },
                    { header: 'referrer-policy', desc: 'Security: strict-origin-when-cross-origin' },
                  ].map((h, i) => (
                    <div key={i} className="rounded border px-3 py-2">
                      <span className="text-emerald-400">{h.header}</span>
                      <span className="text-muted-foreground ml-2">— {h.desc}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
                <p className="text-sm text-muted-foreground">Open DevTools &rarr; Network tab &rarr; click any API request &rarr; Response Headers to inspect.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}