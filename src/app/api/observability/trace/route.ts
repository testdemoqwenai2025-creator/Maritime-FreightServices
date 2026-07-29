import { NextResponse } from 'next/server'
import { getTraceStore, clearTraceStore } from '@/lib/trace-store'

const APP_START_TIME = Date.now()
const routeStartPerf = performance.now()

/**
 * GET /api/observability/trace
 *
 * Returns a full observability snapshot:
 *   - Recent traces (frontend -> middleware -> route handler -> DB)
 *   - Aggregate statistics
 *   - Registered API endpoints
 *   - System health
 *
 * Query params:
 *   ?action=stats     — return aggregated statistics only
 *   ?action=clear     — clear the trace buffer
 *   ?action=endpoints — return registered endpoint map only
 *   ?path=/api/vessels — filter traces by path prefix
 *   ?limit=50         — limit number of trace entries returned
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const pathFilter = searchParams.get('path')
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  // --- Registered endpoints map ---
  const endpoints = getRegisteredEndpoints()

  // Handle clear action
  if (action === 'clear') {
    clearTraceStore()
    return NextResponse.json({
      status: 'cleared',
      message: 'Trace buffer cleared',
      timestamp: new Date().toISOString(),
    })
  }

  // Handle endpoints-only action
  if (action === 'endpoints') {
    return NextResponse.json({ endpoints, timestamp: new Date().toISOString() })
  }

  // --- Gather all traces ---
  let traces = getTraceStore()

  // Filter by path prefix if requested
  if (pathFilter) {
    traces = traces.filter((t) => t.path.startsWith(pathFilter))
  }

  // Limit results
  traces = traces.slice(-limit)

  // --- Compute aggregate statistics ---
  const stats = computeStats(traces)

  // --- If stats-only, return early ---
  if (action === 'stats') {
    return NextResponse.json({ stats, timestamp: new Date().toISOString() })
  }

  // --- Full response ---
  const handlerDuration = parseFloat((performance.now() - routeStartPerf).toFixed(3))

  return NextResponse.json({
    meta: {
      generatedAt: new Date().toISOString(),
      appUptimeSeconds: Math.floor((Date.now() - APP_START_TIME) / 1000),
      traceBufferSize: traces.length,
      endpointCount: endpoints.length,
      ownHandlerDurationMs: handlerDuration,
    },
    stats,
    traces,
    endpoints,
  })
}

// ------------------------------------------------------------------
// Registered API endpoints (manually curated from the codebase)
// ------------------------------------------------------------------
function getRegisteredEndpoints() {
  return [
    { method: 'GET',    path: '/api/health',              description: 'Health check with DB connectivity',     category: 'System' },
    { method: 'GET',    path: '/api/dashboard',           description: 'Full dashboard aggregation (20+ queries)', category: 'Core' },
    { method: 'GET',    path: '/api/vessels',             description: 'List/search vessels with pagination',    category: 'Core' },
    { method: 'POST',   path: '/api/vessels',             description: 'Create a new vessel record',             category: 'Core' },
    { method: 'GET',    path: '/api/vessels/stream',      description: 'SSE stream for vessel position updates', category: 'Core' },
    { method: 'GET',    path: '/api/ports',               description: 'List/search ports',                      category: 'Core' },
    { method: 'GET',    path: '/api/shipments',           description: 'List/search shipments with relations',   category: 'Core' },
    { method: 'POST',   path: '/api/shipments',           description: 'Create a new shipment',                  category: 'Core' },
    { method: 'GET',    path: '/api/containers',          description: 'List containers',                        category: 'Core' },
    { method: 'GET',    path: '/api/carriers',            description: 'List carriers with alliance data',       category: 'Core' },
    { method: 'GET',    path: '/api/trade-routes',        description: 'List trade routes',                      category: 'Core' },
    { method: 'GET',    path: '/api/trade-data',          description: 'UN Comtrade data with filters',         category: 'Analytics' },
    { method: 'GET',    path: '/api/bookings',            description: 'List bookings',                          category: 'Core' },
    { method: 'POST',   path: '/api/bookings',            description: 'Create a booking',                       category: 'Core' },
    { method: 'GET',    path: '/api/charters',            description: 'List charters',                          category: 'Core' },
    { method: 'GET',    path: '/api/cargo-types',         description: 'List cargo types with DG info',          category: 'Reference' },
    { method: 'GET',    path: '/api/documents',           description: 'List shipment documents',               category: 'Core' },
    { method: 'GET',    path: '/api/events',              description: 'Shipment event timeline',                category: 'Core' },
    { method: 'GET',    path: '/api/search',              description: 'Global search across entities',          category: 'Search' },
    { method: 'GET',    path: '/api/docs',                description: 'API documentation generator',            category: 'System' },
    { method: 'GET',    path: '/api/ai/alerts',           description: 'AI-generated operational alerts',        category: 'AI' },
    { method: 'GET',    path: '/api/ai/forecast',         description: 'AI demand forecast',                     category: 'AI' },
    { method: 'GET',    path: '/api/ai/routes',           description: 'AI route optimization',                  category: 'AI' },
    { method: 'GET',    path: '/api/ai/eta',              description: 'AI ETA prediction',                      category: 'AI' },
    { method: 'GET',    path: '/api/ai/anomaly',          description: 'AI anomaly detection',                   category: 'AI' },
    { method: 'GET',    path: '/api/observability/trace', description: 'Observability trace viewer (this)',      category: 'Observability' },
  ]
}

// ------------------------------------------------------------------
// Statistics computation
// ------------------------------------------------------------------
function computeStats(traces: ReturnType<typeof getTraceStore>) {
  if (traces.length === 0) {
    return {
      totalRequests: 0,
      message: 'No traces recorded yet. Make some API calls to populate data.',
    }
  }

  const totalRequests = traces.length

  // Middleware timing
  const mwDurations = traces.map((t) => t.middlewareDurationMs)
  const mwAvg = avg(mwDurations)
  const mwP50 = percentile(mwDurations, 50)
  const mwP95 = percentile(mwDurations, 95)
  const mwP99 = percentile(mwDurations, 99)
  const mwMax = Math.max(...mwDurations)
  const mwMin = Math.min(...mwDurations)

  // Handler timing
  const hDurations = traces.map((t) => t.handlerDurationMs)
  const hAvg = avg(hDurations)
  const hP50 = percentile(hDurations, 50)
  const hP95 = percentile(hDurations, 95)
  const hP99 = percentile(hDurations, 99)
  const hMax = Math.max(...hDurations)
  const hMin = Math.min(...hDurations)

  // DB timing
  const dbDurations = traces.map((t) => t.dbDurationMs).filter((d) => d > 0)
  const dbAvg = dbDurations.length > 0 ? avg(dbDurations) : 0
  const dbP50 = dbDurations.length > 0 ? percentile(dbDurations, 50) : 0
  const dbP95 = dbDurations.length > 0 ? percentile(dbDurations, 95) : 0
  const dbMax = dbDurations.length > 0 ? Math.max(...dbDurations) : 0
  const totalDbQueries = traces.reduce((s, t) => s + t.dbQueryCount, 0)
  const tracesWithDb = traces.filter((t) => t.dbQueryCount > 0).length

  // End-to-end timing
  const e2eDurations = traces.map((t) => t.middlewareDurationMs + t.handlerDurationMs)
  const e2eAvg = avg(e2eDurations)
  const e2eP50 = percentile(e2eDurations, 50)
  const e2eP95 = percentile(e2eDurations, 95)
  const e2eP99 = percentile(e2eDurations, 99)

  // Status code distribution
  const statusCounts: Record<number, number> = {}
  for (const t of traces) {
    statusCounts[t.statusCode] = (statusCounts[t.statusCode] || 0) + 1
  }

  // Request method distribution
  const methodCounts: Record<string, number> = {}
  for (const t of traces) {
    methodCounts[t.method] = (methodCounts[t.method] || 0) + 1
  }

  // Top endpoints by hit count
  const pathCounts: Record<string, number> = {}
  for (const t of traces) {
    pathCounts[t.path] = (pathCounts[t.path] || 0) + 1
  }
  const topEndpoints = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }))

  // Response size stats
  const responseSizes = traces.map((t) => t.responseSize).filter((s) => s > 0)
  const avgResponseSize = responseSizes.length > 0 ? avg(responseSizes) : 0
  const maxResponseSize = responseSizes.length > 0 ? Math.max(...responseSizes) : 0

  // Middleware actions breakdown
  const actionCounts: Record<string, number> = {}
  for (const t of traces) {
    for (const action of t.middlewareActions) {
      actionCounts[action] = (actionCounts[action] || 0) + 1
    }
  }
  const topActions = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([action, count]) => ({ action, count }))

  // Errors
  const errors = traces.filter((t) => t.statusCode >= 400)
  const errorRate = totalRequests > 0 ? (errors.length / totalRequests) * 100 : 0

  return {
    totalRequests,
    timeRange: {
      oldest: traces[0]?.timestamp,
      newest: traces[traces.length - 1]?.timestamp,
    },
    middleware: {
      avgMs: mwAvg, p50Ms: mwP50, p95Ms: mwP95, p99Ms: mwP99,
      maxMs: mwMax, minMs: mwMin,
    },
    handler: {
      avgMs: hAvg, p50Ms: hP50, p95Ms: hP95, p99Ms: hP99,
      maxMs: hMax, minMs: hMin,
    },
    database: {
      avgMs: dbAvg, p50Ms: dbP50, p95Ms: dbP95, maxMs: dbMax,
      totalQueries: totalDbQueries,
      tracesWithDb,
    },
    endToEnd: {
      avgMs: e2eAvg, p50Ms: e2eP50, p95Ms: e2eP95, p99Ms: e2eP99,
    },
    statusCodes: statusCounts,
    methods: methodCounts,
    topEndpoints,
    topMiddlewareActions: topActions,
    responseSize: {
      avgBytes: avgResponseSize,
      maxBytes: maxResponseSize,
    },
    errorRate: parseFloat(errorRate.toFixed(2)),
    errors: errors.length,
  }
}

// ------------------------------------------------------------------
// Math helpers
// ------------------------------------------------------------------
function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(3))
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return parseFloat(sorted[Math.max(0, idx)].toFixed(3))
}
