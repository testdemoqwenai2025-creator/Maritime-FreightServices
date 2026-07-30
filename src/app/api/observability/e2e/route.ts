import { NextRequest, NextResponse } from 'next/server'
import { getTraceBuffer, type ServerTrace } from '@/lib/server-tracer'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * GET /api/observability/e2e — Full E2E observability snapshot
 * POST /api/observability/e2e — Receive a frontend beat
 *
 * GET returns: server metrics, DB health, server traces, frontend beats,
 * and correlated front→server→DB waterfall data.
 *
 * POST body: browser Performance API timings + fetch round-trip data + traceId
 */

// ─── Frontend beat storage ───────────────────────────────────────

const BEAT_BUFFER = 200
const beats: E2EBeat[] = []

interface E2EBeat {
  beatId: string
  traceId: string | null
  timestamp: string
  pageUrl: string
  // Navigation Timing API
  dnsLookupMs: number
  tcpConnectMs: number
  tlsHandshakeMs: number
  ttfbMs: number
  contentDownloadMs: number
  domContentLoadedMs: number
  fullLoadMs: number
  // Resource Timing
  resourceCount: number
  resourceTransferBytes: number
  // Fetch round-trip
  fetchUrl: string
  fetchMethod: string
  fetchRoundTripMs: number
  fetchStatus: number
  fetchResponseSize: number
  // Browser env
  userAgent: string
  viewportWidth: number
  viewportHeight: number
  connectionType: string
  // Server correlation
  serverTrace?: {
    handlerDurationMs: number
    dbDurationMs: number
    dbQueryCount: number
    statusCode: number
  }
  correlated: boolean
}

// ─── POST: Receive frontend beat ──────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json()
  const beatId = `beat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

  const traces = getTraceBuffer()
  const matched = body.traceId
    ? traces.find((t) => t.traceId === body.traceId)
    : traces.find((t) => t.path === (body.fetchUrl?.split('?')[0] || ''))

  const beat: E2EBeat = {
    beatId,
    traceId: body.traceId || null,
    timestamp: new Date().toISOString(),
    pageUrl: body.pageUrl || 'unknown',
    dnsLookupMs: body.dnsLookupMs || 0,
    tcpConnectMs: body.tcpConnectMs || 0,
    tlsHandshakeMs: body.tlsHandshakeMs || 0,
    ttfbMs: body.ttfbMs || 0,
    contentDownloadMs: body.contentDownloadMs || 0,
    domContentLoadedMs: body.domContentLoadedMs || 0,
    fullLoadMs: body.fullLoadMs || 0,
    resourceCount: body.resourceCount || 0,
    resourceTransferBytes: body.resourceTransferBytes || 0,
    fetchUrl: body.fetchUrl || '',
    fetchMethod: body.fetchMethod || 'GET',
    fetchRoundTripMs: body.fetchRoundTripMs || 0,
    fetchStatus: body.fetchStatus || 0,
    fetchResponseSize: body.fetchResponseSize || 0,
    userAgent: body.userAgent || '',
    viewportWidth: body.viewportWidth || 0,
    viewportHeight: body.viewportHeight || 0,
    connectionType: body.connectionType || 'unknown',
    serverTrace: matched
      ? {
          handlerDurationMs: matched.handlerDurationMs,
          dbDurationMs: matched.dbDurationMs,
          dbQueryCount: matched.dbQueryCount,
          statusCode: matched.statusCode,
        }
      : undefined,
    correlated: !!matched,
  }

  if (beats.length >= BEAT_BUFFER) beats.shift()
  beats.push(beat)

  const networkOnlyMs = matched
    ? parseFloat(Math.max(0, beat.fetchRoundTripMs - matched.handlerDurationMs).toFixed(3))
    : 0

  return NextResponse.json({
    beat: {
      ...beat,
      networkOnlyMs,
      serverProcessingMs: matched?.handlerDurationMs || 0,
      dbProcessingMs: matched?.dbDurationMs || 0,
    },
    serverTrace: matched || null,
    meta: { bufferSize: beats.length, correlated: !!matched },
  })
}

// ─── GET: Full E2E observability snapshot ────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const pathFilter = searchParams.get('path')
  const reqStart = performance.now()

  if (action === 'ping') {
    return NextResponse.json({
      status: 'ok',
      latencyMs: parseFloat((performance.now() - reqStart).toFixed(3)),
      timestamp: new Date().toISOString(),
    })
  }

  if (action === 'clear') {
    beats.length = 0
    const { clearTraceBuffer } = await import('@/lib/server-tracer')
    clearTraceBuffer()
    return NextResponse.json({ status: 'cleared', timestamp: new Date().toISOString() })
  }

  // ── Full snapshot ──
  const traces = getTraceBuffer()
  const filteredTraces = pathFilter
    ? traces.filter((t) => t.path.includes(pathFilter))
    : traces
  const recentTraces = filteredTraces.slice(-limit)

  const recentBeats = beats.slice(-limit)
  const fStats = computeFrontendStats(recentBeats)
  const correlated = buildCorrelated(recentTraces, recentBeats)

  // DB probe
  let db: Record<string, unknown> = { status: 'skipped' }
  if (action !== 'server') {
    db = await probeDatabase()
  }

  const server = getServerMetrics()

  return NextResponse.json({
    meta: {
      generatedAt: new Date().toISOString(),
      ownLatencyMs: parseFloat((performance.now() - reqStart).toFixed(3)),
      traceCount: recentTraces.length,
      beatCount: recentBeats.length,
      correlatedCount: correlated.length,
    },
    server,
    database: db,
    traces: recentTraces,
    beats: recentBeats,
    frontendStats: fStats,
    correlated,
  })
}

// ─── Helpers ─────────────────────────────────────────────────────

function getServerMetrics() {
  const mem = process.memoryUsage()
  const up = process.uptime()
  return {
    runtime: process.version,
    platform: process.platform,
    arch: process.arch,
    uptimeSeconds: Math.floor(up),
    uptimeHuman: fmtUptime(up),
    memory: {
      rssMb: +((mem.rss / 1048576).toFixed(2)),
      heapUsedMb: +((mem.heapUsed / 1048576).toFixed(2)),
      heapTotalMb: +((mem.heapTotal / 1048576).toFixed(2)),
      heapUtilPct: +((mem.heapUsed / mem.heapTotal * 100).toFixed(1)),
    },
  }
}

async function probeDatabase() {
  const t0 = performance.now()
  try {
    const [users, vessels, ports, shipments, events] = await Promise.all([
      prisma.user.count(), prisma.vessel.count(), prisma.port.count(),
      prisma.shipment.count(), prisma.shipmentEvent.count(),
    ])
    const latencyMs = +((performance.now() - t0).toFixed(3))
    let dbSizeMb = 0
    try {
      const fs = await import('node:fs')
      dbSizeMb = +((fs.statSync('/home/z/my-project/prisma/dev.db').size / 1048576).toFixed(2))
    } catch { /* ignore */ }
    return { status: 'connected', latencyMs, tables: { users, vessels, ports, shipments, events }, dbSizeMb }
  } catch (err) {
    return { status: 'error', latencyMs: +((performance.now() - t0).toFixed(3)), error: String(err) }
  }
}

function computeFrontendStats(beats: E2EBeat[]) {
  if (beats.length === 0) return { totalBeats: 0, message: 'No frontend beats yet.' }
  const fetches = beats.filter((b) => b.fetchRoundTripMs > 0)
  const rts = fetches.map((b) => b.fetchRoundTripMs)
  const ttbfs = fetches.map((b) => b.ttfbMs).filter((v) => v > 0)
  const avg = (a: number[]) => (a.length ? +(a.reduce((s, v) => s + v, 0) / a.length).toFixed(3) : 0)
  const p = (a: number[], pct: number) => {
    if (!a.length) return 0
    const s = [...a].sort((x, y) => x - y)
    return +s[Math.max(0, Math.ceil((pct / 100) * s.length) - 1)].toFixed(3)
  }
  return {
    totalBeats: beats.length,
    fetchBeats: fetches.length,
    correlatedBeats: beats.filter((b) => b.correlated).length,
    correlationPct: +((beats.filter((b) => b.correlated).length / beats.length * 100).toFixed(1)),
    roundTrip: { avgMs: avg(rts), p50Ms: p(rts, 50), p95Ms: p(rts, 95), maxMs: rts.length ? Math.max(...rts) : 0 },
    ttfb: { avgMs: avg(ttbfs), p50Ms: p(ttbfs, 50), p95Ms: p(ttbfs, 95) },
  }
}

function buildCorrelated(traces: ServerTrace[], beats: E2EBeat[]) {
  return beats
    .filter((b) => b.correlated && b.serverTrace)
    .map((b) => {
      const netMs = Math.max(0, b.fetchRoundTripMs - (b.serverTrace?.handlerDurationMs || 0))
      return {
        traceId: b.traceId,
        timestamp: b.timestamp,
        path: b.fetchUrl,
        method: b.fetchMethod,
        waterfall: {
          networkMs: +netMs.toFixed(3),
          serverHandlerMs: b.serverTrace?.handlerDurationMs || 0,
          databaseMs: b.serverTrace?.dbDurationMs || 0,
          dbQueries: b.serverTrace?.dbQueryCount || 0,
        },
        totals: {
          roundTripMs: b.fetchRoundTripMs,
          networkOnlyMs: +netMs.toFixed(3),
          serverTotalMs: (b.serverTrace?.handlerDurationMs || 0) + (b.serverTrace?.dbDurationMs || 0),
        },
        status: { client: b.fetchStatus, server: b.serverTrace?.statusCode || 0 },
        responseSize: b.fetchResponseSize,
      }
    })
}

function fmtUptime(s: number) {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return `${d > 0 ? d + 'd ' : ''}${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${sec}s`
}