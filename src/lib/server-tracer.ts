/**
 * Server-side tracer — lightweight in-process tracing for API route handlers.
 * 
 * Since middleware.ts is disabled (Next.js 16 deprecation), this module provides
 * an equivalent in-process tracing mechanism. Route handlers call `startTrace()` at
 * the top and `finalizeTrace()` at the end. Traces are stored in-memory and
 * exposed via /api/observability/trace.
 *
 * Usage in any API route handler:
 *   import { startTrace, finalizeTrace } from '@/lib/server-tracer'
 *   export async function GET(req: NextRequest) {
 *     const { traceCtx, startPerf } = startTrace(req)
 *     // ... do work, measure DB queries ...
 *     const dbStart = performance.now()
 *     await prisma.vessel.findMany(...)
 *     const dbMs = performance.now() - dbStart
 *     const res = NextResponse.json(data)
 *     finalizeTrace(req, res, {
 *       dbQueryCount: 3, dbDurationMs: dbMs, handlerStartPerf: startPerf,
 *     })
 *     return res
 *   }
 */

export interface ServerTrace {
  traceId: string
  timestamp: string
  method: string
  path: string
  search: string
  // Phase timings (all in ms, high-resolution)
  handlerStartPerf: number
  handlerDurationMs: number
  dbQueryCount: number
  dbDurationMs: number
  // Response
  statusCode: number
  responseSize: number
  // Client context
  clientIp: string
  userAgent: string
  // Classification
  matchedPattern: string
  cacheStatus: string
  // Frontend correlation
  frontendBeatId?: string
  frontendRoundTripMs?: number
}

const TRACE_BUFFER_SIZE = 300
const traceBuffer: ServerTrace[] = []
let traceCounter = 0

function generateTraceId(): string {
  return `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function classifyPath(pathname: string): string {
  if (pathname.startsWith('/api/ai/')) return 'AI Service'
  if (pathname.startsWith('/api/auth/')) return 'Auth'
  if (pathname.startsWith('/api/observability/')) return 'Observability'
  if (pathname.startsWith('/api/')) return 'API Route'
  return 'Page Route'
}

function cacheStatusFor(pathname: string): string {
  if (pathname.startsWith('/api/')) return 'no-store'
  return 'dynamic'
}

/**
 * Call at the start of a route handler. Returns the trace context and perf marker.
 */
export function startTrace(request: Request) {
  const traceId = request.headers.get('x-trace-id') || generateTraceId()
  const { pathname, search } = new URL(request.url)
  const startPerf = performance.now()

  return {
    traceCtx: {
      traceId,
      pathname,
      search,
      method: request.method,
      clientIp: request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || 'unknown',
    },
    startPerf,
  }
}

/**
 * Call at the end of a route handler, before returning the response.
 * Records the trace into the in-memory buffer.
 */
export function recordTrace(opts: {
  request: Request
  response: Response
  startPerf: number
  traceId: string
  dbQueryCount?: number
  dbDurationMs?: number
}) {
  const { request, response, startPerf, traceId, dbQueryCount = 0, dbDurationMs = 0 } = opts
  const { pathname, search } = new URL(request.url)

  let responseSize = 0
  const cl = response.headers.get('content-length')
  if (cl) responseSize = parseInt(cl, 10)

  const entry: ServerTrace = {
    traceId,
    timestamp: new Date().toISOString(),
    method: request.method,
    path: pathname,
    search,
    handlerStartPerf: startPerf,
    handlerDurationMs: parseFloat((performance.now() - startPerf).toFixed(3)),
    dbQueryCount,
    dbDurationMs: parseFloat(dbDurationMs.toFixed(3)),
    statusCode: response.status,
    responseSize,
    clientIp: request.headers.get('x-forwarded-for') || '127.0.0.1',
    userAgent: request.headers.get('user-agent') || 'unknown',
    matchedPattern: classifyPath(pathname),
    cacheStatus: cacheStatusFor(pathname),
  }

  traceCounter++
  if (traceBuffer.length >= TRACE_BUFFER_SIZE) traceBuffer.shift()
  traceBuffer.push(entry)

  return entry
}

/**
 * Get all recorded traces (copy).
 */
export function getTraceBuffer(): ServerTrace[] {
  return [...traceBuffer]
}

/**
 * Clear the trace buffer.
 */
export function clearTraceBuffer(): void {
  traceBuffer.length = 0
  traceCounter = 0
}

/**
 * Correlate a frontend beat with a server trace.
 */
export function correlateBeat(traceId: string, beatId: string, roundTripMs: number): void {
  const trace = traceBuffer.find(t => t.traceId === traceId)
  if (trace) {
    trace.frontendBeatId = beatId
    trace.frontendRoundTripMs = parseFloat(roundTripMs.toFixed(3))
  }
}

// Re-export finalizeTrace from trace-store for backward compat
export { recordHandlerTrace } from './trace-store'
