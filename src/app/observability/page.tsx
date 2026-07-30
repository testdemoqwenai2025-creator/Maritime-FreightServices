'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Activity, Server, Database, Monitor,
  Zap, RefreshCw, ChevronRight, Eye, Trash2, Play,
  CheckCircle2, XCircle, Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

// ─── Types ──────────────────────────────────────────────────────────

interface ServerMetrics {
  runtime: string; platform: string; arch: string
  uptimeSeconds: number; uptimeHuman: string
  memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number; heapUtilPct: number }
}

interface DatabaseMetrics {
  status: string; latencyMs: number
  tables?: Record<string, number>; dbSizeMb?: number
  error?: string
}

interface Correlated {
  traceId: string; timestamp: string; path: string; method: string
  waterfall: { networkMs: number; serverHandlerMs: number; databaseMs: number; dbQueries: number }
  totals: { roundTripMs: number; networkOnlyMs: number; serverTotalMs: number }
  status: { client: number; server: number }
  responseSize: number
}

interface E2EData {
  meta: { generatedAt: string; ownLatencyMs: number; traceCount: number; beatCount: number; correlatedCount: number }
  server: ServerMetrics
  database: DatabaseMetrics
  traces: any[]
  beats: any[]
  frontendStats: any
  correlated: Correlated[]
}

// ─── API endpoints to probe ───────────────────────────────────────

const PROBE_ENDPOINTS = [
  { path: '/api/health', label: 'Health Check', category: 'System' },
  { path: '/api/dashboard', label: 'Dashboard Aggregation', category: 'Core' },
  { path: '/api/vessels', label: 'Vessels List', category: 'Core' },
  { path: '/api/ports', label: 'Ports List', category: 'Core' },
  { path: '/api/shipments', label: 'Shipments List', category: 'Core' },
  { path: '/api/carriers', label: 'Carriers List', category: 'Core' },
  { path: '/api/trade-data', label: 'Trade Data', category: 'Analytics' },
  { path: '/api/ai/eta', label: 'AI ETA Prediction', category: 'AI' },
  { path: '/api/ai/anomaly', label: 'AI Anomaly Detection', category: 'AI' },
  { path: '/api/state-machine/definition', label: 'State Machine Def', category: 'Engine' },
  { path: '/api/documents/workflows', label: 'Doc Workflows', category: 'Workflow' },
  { path: '/api/auth/session', label: 'Auth Session', category: 'Auth' },
]

// ─── Helpers ────────────────────────────────────────────────────────

function fmtMs(ms: number): string {
  if (ms < 1) return '< 1ms'
  if (ms < 1000) return ms.toFixed(1) + 'ms'
  return (ms / 1000).toFixed(2) + 's'
}

function fmtBytes(b: number): string {
  if (b < 1024) return b + 'B'
  if (b < 1048576) return (b / 1024).toFixed(1) + 'KB'
  return (b / 1048576).toFixed(1) + 'MB'
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return s + 's ago'
  const m = Math.floor(s / 60)
  if (m < 60) return m + 'm ago'
  return Math.floor(m / 60) + 'h ago'
}

function statusColor(code: number): string {
  if (code >= 200 && code < 300) return 'text-green-400'
  if (code >= 400 && code < 500) return 'text-amber-400'
  return 'text-red-400'
}

function wfBarWidth(ms: number, maxMs: number): string {
  if (maxMs <= 0) return '0%'
  return Math.max(1, (ms / maxMs) * 100) + '%'
}

// ─── Main Component ───────────────────────────────────────────────

export default function ObservabilityPage() {
  const [data, setData] = useState<E2EData | null>(null)
  const [loading, setLoading] = useState(true)
  const [probing, setProbing] = useState(false)
  const [probeResults, setProbeResults] = useState<Record<string, { ok: boolean; latencyMs: number; status: number; size: number }>>({})
  const [navTiming, setNavTiming] = useState<Record<string, number>>({})
  const [expandedWaterfall, setExpandedWaterfall] = useState<string | null>(null)
  const probeIndexRef = useRef(0)

  // ── Fetch E2E snapshot ──
  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch('/api/observability/e2e')
      if (res.ok) setData(await res.json())
    } catch (e) { console.error('E2E fetch failed:', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSnapshot() }, [fetchSnapshot])

  // ── Capture Navigation Timing ──
  useEffect(() => {
    if (typeof window === 'undefined' || !window.performance?.getEntriesByType) return
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (nav) {
      setNavTiming({
        dns: nav.domainLookupEnd - nav.domainLookupStart,
        tcp: nav.connectEnd - nav.connectStart,
        tls: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
        ttfb: nav.responseStart - nav.requestStart,
        contentDownload: nav.responseEnd - nav.responseStart,
        domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
        fullLoad: nav.loadEventEnd - nav.startTime,
      })
    }
    const resources = performance.getEntriesByType('resource')
    const totalTransfer = resources.reduce((s, r) => s + r.transferSize, 0)
    setNavTiming(prev => ({ ...prev, resourceCount: resources.length, resourceTransferBytes: totalTransfer }))
  }, [])

  // ── Run probes ──
  async function runProbes() {
    setProbing(true)
    setProbeResults({})
    probeIndexRef.current = 0
    for (const ep of PROBE_ENDPOINTS) {
      const fetchStart = performance.now()
      try {
        const res = await fetch(ep.path)
        const roundTripMs = performance.now() - fetchStart
        const size = parseInt(res.headers.get('content-length') || '0') || 0
        const traceId = res.headers.get('x-trace-id') || null
        setProbeResults(prev => ({ ...prev, [ep.path]: { ok: res.ok, latencyMs: roundTripMs, status: res.status, size } }))
        fetch('/api/observability/e2e', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ traceId, pageUrl: window.location.pathname, fetchUrl: ep.path, fetchMethod: 'GET', fetchRoundTripMs: roundTripMs, fetchStatus: res.status, fetchResponseSize: size, userAgent: navigator.userAgent, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, connectionType: (navigator as any).connection?.effectiveType || 'unknown', ...navTiming }),
        }).catch(() => {})
      } catch {
        setProbeResults(prev => ({ ...prev, [ep.path]: { ok: false, latencyMs: 0, status: 0, size: 0 } }))
      }
      probeIndexRef.current++
      await new Promise(r => setTimeout(r, 150))
    }
    setTimeout(fetchSnapshot, 500)
    setProbing(false)
  }

  async function clearAll() {
    await fetch('/api/observability/e2e?action=clear')
    setProbeResults({})
    fetchSnapshot()
  }

  if (loading) {
    return (<div className="flex min-h-screen items-center justify-center bg-background"><div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" /></div>)
  }

  const probeEndpoints = Object.keys(probeResults)
  const allOk = probeEndpoints.length === PROBE_ENDPOINTS.length && probeEndpoints.every(k => probeResults[k].ok)
  const maxLatency = Math.max(...Object.values(probeResults).map(r => r.latencyMs), 1)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-2 h-4 w-4" />Dashboard</Button></Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary"><Activity className="h-5 w-5 text-white" /></div>
            <div><h1 className="text-xl font-bold">E2E Observability</h1><p className="text-sm text-muted-foreground">Browser / Network / Server / Database correlated traces</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={clearAll}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Clear</Button>
            <Button variant="outline" size="sm" onClick={fetchSnapshot} disabled={loading}><RefreshCw className={"mr-1.5 h-3.5 w-3.5" + (loading ? " animate-spin" : "")} />Refresh</Button>
            <Button size="sm" onClick={runProbes} disabled={probing}>{probing ? <div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}Run Probes</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT COLUMN */}
          <div className="space-y-6 lg:col-span-1">
            {/* Server Runtime */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Server className="h-4 w-4 text-blue-400" />Server Runtime</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-xs">
                {data?.server ? (<>
                  <div className="flex justify-between"><span className="text-muted-foreground">Runtime</span><span className="font-mono">{data.server.runtime}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Platform</span><span className="font-mono">{data.server.platform}/{data.server.arch}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Uptime</span><span className="font-mono">{data.server.uptimeHuman}</span></div>
                  <Separator className="bg-border" /><p className="text-muted-foreground">Memory</p>
                  <div className="space-y-2">
                    <div><div className="flex justify-between mb-1"><span className="text-muted-foreground">RSS</span><span>{data.server.memory.rssMb} MB</span></div><Progress value={Math.min(100, data.server.memory.rssMb / 5)} className="h-1.5" /></div>
                    <div><div className="flex justify-between mb-1"><span className="text-muted-foreground">Heap Used</span><span>{data.server.memory.heapUsedMb} / {data.server.memory.heapTotalMb} MB</span></div><Progress value={data.server.memory.heapUtilPct} className="h-1.5" /></div>
                  </div>
                </>) : <p className="text-muted-foreground">No data</p>}
              </CardContent>
            </Card>

            {/* Database */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Database className="h-4 w-4 text-green-400" />Database (SQLite)</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-xs">
                {data?.database ? (<>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className={data.database.status === 'connected' ? "bg-green-500/10 text-green-400 border-green-500/30 text-[10px]" : "bg-red-500/10 text-red-400 border-red-500/30 text-[10px]"}>
                      {data.database.status === 'connected' ? <><CheckCircle2 className="mr-1 h-2.5 w-2.5" />Connected</> : <><XCircle className="mr-1 h-2.5 w-2.5" />Error</>}
                    </Badge>
                  </div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Probe Latency</span><span className="font-mono">{data.database.latencyMs}ms</span></div>
                  {data.database.dbSizeMb !== undefined && <div className="flex justify-between"><span className="text-muted-foreground">DB Size</span><span className="font-mono">{data.database.dbSizeMb} MB</span></div>}
                  {data.database.tables && (<>
                    <Separator className="bg-border" /><p className="text-muted-foreground">Table Counts</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(data.database.tables).map(([t, c]) => (<div key={t} className="flex justify-between rounded bg-muted/50 px-2 py-1"><span className="text-muted-foreground">{t}</span><span className="font-mono">{c as number}</span></div>))}
                    </div>
                  </>)}
                </>) : <p className="text-muted-foreground">No data</p>}
              </CardContent>
            </Card>

            {/* Browser Timing */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm"><Monitor className="h-4 w-4 text-purple-400" />Browser Timing</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">DNS Lookup</span><span className="font-mono">{fmtMs(navTiming.dns || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">TCP Connect</span><span className="font-mono">{fmtMs(navTiming.tcp || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">TLS Handshake</span><span className="font-mono">{fmtMs(navTiming.tls || 0)}</span></div>
                <Separator className="bg-border" />
                <div className="flex justify-between"><span className="text-muted-foreground">TTFB</span><span className="font-mono font-medium text-foreground">{fmtMs(navTiming.ttfb || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Content Download</span><span className="font-mono">{fmtMs(navTiming.contentDownload || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">DOM Content Loaded</span><span className="font-mono">{fmtMs(navTiming.domContentLoaded || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Full Load</span><span className="font-mono">{fmtMs(navTiming.fullLoad || 0)}</span></div>
                <Separator className="bg-border" />
                <div className="flex justify-between"><span className="text-muted-foreground">Resources Loaded</span><span className="font-mono">{navTiming.resourceCount || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Transfer Size</span><span className="font-mono">{fmtBytes(navTiming.resourceTransferBytes || 0)}</span></div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6 lg:col-span-2">
            {/* Aggregate Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {data?.frontendStats && data.frontendStats.totalBeats > 0 ? (<>
                <Card className="border-border bg-card p-3 text-center"><p className="text-lg font-bold text-foreground">{data.frontendStats.roundTrip.avgMs}<span className="text-xs text-muted-foreground">ms</span></p><p className="text-[10px] text-muted-foreground">Avg Round Trip</p></Card>
                <Card className="border-border bg-card p-3 text-center"><p className="text-lg font-bold text-foreground">{data.frontendStats.roundTrip.p95Ms}<span className="text-xs text-muted-foreground">ms</span></p><p className="text-[10px] text-muted-foreground">P95 Round Trip</p></Card>
                <Card className="border-border bg-card p-3 text-center"><p className="text-lg font-bold text-foreground">{data.frontendStats.ttfb.avgMs}<span className="text-xs text-muted-foreground">ms</span></p><p className="text-[10px] text-muted-foreground">Avg TTFB</p></Card>
                <Card className="border-border bg-card p-3 text-center"><p className="text-lg font-bold text-foreground">{data.frontendStats.correlationPct}<span className="text-xs text-muted-foreground">%</span></p><p className="text-[10px] text-muted-foreground">Trace Correlation</p></Card>
              </>) : (<Card className="border-border bg-card p-3 text-center col-span-2 sm:col-span-4"><p className="text-sm text-muted-foreground">Click Run Probes to capture browser-to-server-to-DB timings</p></Card>)}
            </div>

            {/* Probe Results */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm"><Zap className="h-4 w-4 text-amber-400" />API Probes <Badge variant="outline" className="ml-2 text-[10px] border-border">{probeEndpoints.length}/{PROBE_ENDPOINTS.length}</Badge></CardTitle>
                  {allOk && probeEndpoints.length > 0 && <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px]">All OK</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {probing && (<div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><div className="h-3 w-3 animate-spin rounded-full border-2 border-border border-t-foreground" />Probing {probeIndexRef.current}/{PROBE_ENDPOINTS.length} - {PROBE_ENDPOINTS[probeIndexRef.current]?.label}</div>)}
                <div className="space-y-1.5">
                  {PROBE_ENDPOINTS.map(ep => {
                    const result = probeResults[ep.path]
                    if (!result) return (
                      <div key={ep.path} className="flex items-center gap-3 rounded-lg bg-muted/20 px-3 py-2 text-xs">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                        <span className="flex-1 text-muted-foreground">{ep.label}</span>
                        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">{ep.category}</Badge>
                        <span className="text-muted-foreground w-16 text-right">-</span>
                      </div>
                    )
                    return (
                      <div key={ep.path} className="flex items-center gap-3 rounded-lg bg-muted/20 px-3 py-2 text-xs">
                        <div className={result.ok ? "h-2 w-2 rounded-full bg-green-400" : "h-2 w-2 rounded-full bg-red-400"} />
                        <span className="flex-1 text-foreground truncate">{ep.label}</span>
                        <Badge variant="outline" className="text-[10px] border-border">{ep.category}</Badge>
                        <span className={"text-xs font-mono w-8 text-right " + statusColor(result.status)}>{result.status}</span>
                        <span className="text-muted-foreground w-16 text-right font-mono">{fmtMs(result.latencyMs)}</span>
                        <div className="w-20"><div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={result.ok ? "h-full rounded-full bg-green-400" : "h-full rounded-full bg-red-400"} style={{ width: Math.min(100, (result.latencyMs / maxLatency) * 100) + '%' }} /></div></div>
                        <span className="text-muted-foreground w-14 text-right font-mono">{fmtBytes(result.size)}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Correlated Waterfall */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm"><Layers className="h-4 w-4 text-cyan-400" />Correlated Waterfall <Badge variant="outline" className="ml-2 text-[10px] border-border">{data?.correlated?.length || 0}</Badge></CardTitle>
                <CardDescription className="text-xs">Frontend round-trip broken down: network latency + server handler + database time</CardDescription>
              </CardHeader>
              <CardContent>
                {(!data?.correlated || data.correlated.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground"><Eye className="mb-2 h-8 w-8 opacity-30" /><p className="text-sm">No correlated traces yet</p><p className="text-xs">Run probes to generate waterfall data</p></div>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-2">
                      {data.correlated.map(c => {
                        const expanded = expandedWaterfall === c.traceId
                        const wfMax = Math.max(c.waterfall.networkMs, c.waterfall.serverHandlerMs + c.waterfall.databaseMs, 1)
                        const handlerOnly = c.waterfall.serverHandlerMs - c.waterfall.databaseMs
                        return (
                          <div key={c.traceId} className="rounded-lg border border-border bg-muted/20">
                            <button onClick={() => setExpandedWaterfall(expanded ? null : c.traceId)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors">
                              <ChevronRight className={"h-3.5 w-3.5 text-muted-foreground transition-transform" + (expanded ? " rotate-90" : "")} />
                              <Badge variant="outline" className="text-[10px] font-mono border-border w-8 justify-center">{c.method}</Badge>
                              <span className="flex-1 text-xs font-mono text-foreground truncate">{c.path}</span>
                              <span className={"text-xs font-mono w-8 text-right " + statusColor(c.status.client)}>{c.status.client}</span>
                              <span className="text-xs font-mono text-foreground font-medium w-16 text-right">{fmtMs(c.totals.roundTripMs)}</span>
                            </button>
                            {expanded && (
                              <div className="border-t border-border px-3 py-3 space-y-2">
                                <div className="flex gap-0.5 h-6 rounded overflow-hidden bg-muted">
                                  <div className="bg-blue-500/60 flex items-center justify-center" style={{ width: wfBarWidth(c.waterfall.networkMs, wfMax) }}><span className="text-[9px] font-mono text-white px-1">{fmtMs(c.waterfall.networkMs)}</span></div>
                                  <div className="bg-amber-500/60 flex items-center justify-center" style={{ width: wfBarWidth(handlerOnly, wfMax) }}><span className="text-[9px] font-mono text-white px-1">{fmtMs(handlerOnly)}</span></div>
                                  <div className="bg-green-500/60 flex items-center justify-center" style={{ width: wfBarWidth(c.waterfall.databaseMs, wfMax) }}><span className="text-[9px] font-mono text-white px-1">{fmtMs(c.waterfall.databaseMs)}</span></div>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                                  <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-blue-500/60" />Network</span>
                                  <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-amber-500/60" />Server Handler</span>
                                  <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-green-500/60" />Database ({c.waterfall.dbQueries} queries)</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs mt-1">
                                  <div className="rounded bg-muted/50 p-2 text-center"><p className="text-muted-foreground">Network</p><p className="font-mono font-medium">{fmtMs(c.waterfall.networkMs)}</p></div>
                                  <div className="rounded bg-muted/50 p-2 text-center"><p className="text-muted-foreground">Server</p><p className="font-mono font-medium">{fmtMs(c.totals.serverTotalMs)}</p></div>
                                  <div className="rounded bg-muted/50 p-2 text-center"><p className="text-muted-foreground">DB</p><p className="font-mono font-medium">{fmtMs(c.waterfall.databaseMs)}</p></div>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                                  <span>Response: {fmtBytes(c.responseSize)}</span><span>{timeAgo(c.timestamp)}</span>
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
          </div>
        </div>
      </div>
    </div>
  )
}
