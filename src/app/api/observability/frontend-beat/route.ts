import { NextResponse } from 'next/server'
import { getTraceStore } from '@/lib/trace-store'

// In-memory store for frontend-reported beats (last 200)
const FRONTEND_BUFFER_SIZE = 200
const frontendBeats: FrontendBeat[] = []

interface FrontendBeat {
  beatId: string
  traceId: string | null
  clientTimestamp: string
  clientSentAt: number
  serverReceivedAt: number
  networkLatencyMs: number
  targetPath: string
  targetMethod: string
  clientStatus: number
  clientResponseTimeMs: number
  clientResponseSize: number
  pageUrl: string
  userAgent: string
  // Server-side data filled in by this handler
  serverMiddlewareDurationMs: number
  serverHandlerDurationMs: number
  serverDbDurationMs: number
  serverDbQueries: number
  serverStatusCode: number
  correlated: boolean
}

/**
 * POST /api/observability/frontend-beat
 *
 * The frontend calls this after every measured fetch(). It sends:
 *   - clientSentAt: performance.now() right before fetch()
 *   - clientResponseTimeMs: total round-trip from fetch start to end
 *   - clientStatus: HTTP status from the fetch Response
 *   - clientResponseSize: response body size in bytes
 *   - targetPath / targetMethod: which API was called
 *   - traceId: the x-trace-id header from the response (if available)
 *   - pageUrl: which page initiated the request
 *
 * The server correlates this with its own trace data and returns
 * a merged view of the full Frontend → Middleware → Handler → DB pipeline.
 */
export async function POST(request: Request) {
  const serverReceivedAt = performance.now()
  const body = await request.json()

  const beatId = `beat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

  // Try to find the matching server-side trace
  const serverTraces = getTraceStore()
  const matchedTrace = body.traceId
    ? serverTraces.find((t) => t.traceId === body.traceId)
    : serverTraces.find(
        (t) => t.path === body.targetPath && t.method === (body.targetMethod || 'GET')
      )

  const serverMiddlewareMs = matchedTrace?.middlewareDurationMs ?? 0
  const serverHandlerMs = matchedTrace?.handlerDurationMs ?? 0
  const serverDbMs = matchedTrace?.dbDurationMs ?? 0
  const serverDbQueries = matchedTrace?.dbQueryCount ?? 0
  const serverStatus = matchedTrace?.statusCode ?? 0

  const networkLatencyMs = body.clientSentAt
    ? parseFloat((serverReceivedAt - body.clientSentAt).toFixed(3))
    : 0

  const beat: FrontendBeat = {
    beatId,
    traceId: body.traceId || null,
    clientTimestamp: body.clientTimestamp || new Date().toISOString(),
    clientSentAt: body.clientSentAt || 0,
    serverReceivedAt,
    networkLatencyMs,
    targetPath: body.targetPath || 'unknown',
    targetMethod: body.targetMethod || 'GET',
    clientStatus: body.clientStatus || 0,
    clientResponseTimeMs: body.clientResponseTimeMs || 0,
    clientResponseSize: body.clientResponseSize || 0,
    pageUrl: body.pageUrl || 'unknown',
    userAgent: body.userAgent || 'unknown',
    serverMiddlewareDurationMs: serverMiddlewareMs,
    serverHandlerDurationMs: serverHandlerMs,
    serverDbDurationMs: serverDbMs,
    serverDbQueries,
    serverStatusCode: serverStatus,
    correlated: !!matchedTrace,
  }

  // Store in ring buffer
  if (frontendBeats.length >= FRONTEND_BUFFER_SIZE) frontendBeats.shift()
  frontendBeats.push(beat)

  // Return the correlated beat immediately
  return NextResponse.json({
    beat: {
      ...beat,
      // Derived timings
      clientToServerMs: networkLatencyMs,
      serverProcessingMs: serverMiddlewareMs + serverHandlerMs,
      serverToClientMs: parseFloat(
        Math.max(
          0,
          (beat.clientResponseTimeMs || 0) - networkLatencyMs - serverMiddlewareMs - serverHandlerMs
        ).toFixed(3)
      ),
    },
    serverTrace: matchedTrace || null,
    meta: {
      bufferSize: frontendBeats.length,
      totalBeats: frontendBeats.length,
    },
  })
}

/**
 * GET /api/observability/frontend-beat
 *
 * Returns all recorded frontend beats with optional filtering.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const pathFilter = searchParams.get('path')
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  if (action === 'clear') {
    frontendBeats.length = 0
    return NextResponse.json({ status: 'cleared', timestamp: new Date().toISOString() })
  }

  let beats = [...frontendBeats]
  if (pathFilter) beats = beats.filter((b) => b.targetPath.includes(pathFilter))
  beats = beats.slice(-limit)

  // Compute aggregate stats
  const stats = computeFrontendStats(beats)

  return NextResponse.json({
    meta: {
      bufferSize: frontendBeats.length,
      returnedBeats: beats.length,
      timestamp: new Date().toISOString(),
    },
    stats,
    beats,
  })
}

// ------------------------------------------------------------------
function computeFrontendStats(beats: FrontendBeat[]) {
  if (beats.length === 0)
    return { totalBeats: 0, message: 'No frontend beats recorded yet.' }

  const roundTrips = beats.map((b) => b.clientResponseTimeMs).filter((v) => v > 0)
  const networkLatencies = beats.map((b) => b.networkLatencyMs).filter((v) => v > 0)
  const mwDurations = beats.map((b) => b.serverMiddlewareDurationMs).filter((v) => v > 0)
  const handlerDurations = beats.map((b) => b.serverHandlerDurationMs).filter((v) => v > 0)
  const dbDurations = beats.map((b) => b.serverDbDurationMs).filter((v) => v > 0)

  const avg = (arr: number[]) =>
    arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(3)) : 0
  const p = (arr: number[], pct: number) => {
    if (arr.length === 0) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    return parseFloat(sorted[Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1)].toFixed(3))
  }

  const correlated = beats.filter((b) => b.correlated).length
  const pages = new Set(beats.map((b) => b.pageUrl))
  const topPaths = new Map<string, number>()
  for (const b of beats) topPaths.set(b.targetPath, (topPaths.get(b.targetPath) || 0) + 1)

  return {
    totalBeats: beats.length,
    correlatedBeats: correlated,
    correlationRate: parseFloat(((correlated / beats.length) * 100).toFixed(1)),
    uniquePages: pages.size,
    roundTrip: {
      avgMs: avg(roundTrips),
      p50Ms: p(roundTrips, 50),
      p95Ms: p(roundTrips, 95),
      maxMs: roundTrips.length > 0 ? Math.max(...roundTrips) : 0,
    },
    networkLatency: {
      avgMs: avg(networkLatencies),
      p50Ms: p(networkLatencies, 50),
      maxMs: networkLatencies.length > 0 ? Math.max(...networkLatencies) : 0,
    },
    serverBreakdown: {
      middlewareAvgMs: avg(mwDurations),
      handlerAvgMs: avg(handlerDurations),
      dbAvgMs: avg(dbDurations),
    },
    topPaths: [...topPaths.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count })),
  }
}
