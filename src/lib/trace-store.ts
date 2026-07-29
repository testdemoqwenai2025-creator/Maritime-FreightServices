/**
 * Trace Store — bridge between middleware (Edge) and route handlers (Node runtime).
 *
 * Because Next.js middleware runs on the Edge runtime while API routes run on
 * Node.js, they cannot share in-memory state. Instead, route handlers read the
 * tracing headers injected by the middleware and report timing back through
 * a lightweight in-memory store (Node-side) that the /api/observability/trace
 * endpoint aggregates.
 */

export interface HandlerTrace {
  traceId: string
  path: string
  method: string
  handlerEnterAt: number
  handlerDurationMs: number
  dbQueryCount: number
  dbDurationMs: number
  statusCode: number
  responseSize: number
  timestamp: string
  middlewareDurationMs: number
  middlewareActions: string[]
  matchedPattern: string
  cacheStatus: string
  clientIp: string
  userAgent: string
}

const TRACE_STORE_SIZE = 200
const traceStore: HandlerTrace[] = []

export function recordHandlerTrace(trace: HandlerTrace): void {
  if (traceStore.length >= TRACE_STORE_SIZE) {
    traceStore.shift()
  }
  traceStore.push(trace)
}

export function getTraceStore(): HandlerTrace[] {
  return [...traceStore]
}

export function clearTraceStore(): void {
  traceStore.length = 0
}

/**
 * Helper to be called at the END of a route handler.
 * Reads tracing headers set by the middleware, measures handler timing,
 * and records the complete trace.
 *
 * Usage in a route handler:
 *   import { finalizeTrace } from '@/lib/trace-store'
 *   // ... do work, get `response` and `dbTiming` ...
 *   finalizeTrace(request, response, { dbQueryCount, dbDurationMs, handlerStartPerf })
 *   return response
 */
export function finalizeTrace(
  request: Request,
  response: Response,
  opts: {
    dbQueryCount?: number
    dbDurationMs?: number
    handlerStartPerf: number
  }
) {
  const traceId = request.headers.get('x-trace-id') || 'unknown'
  const middlewareDuration = parseFloat(request.headers.get('x-middleware-duration-ms') || '0')
  const middlewareActions = (request.headers.get('x-middleware-actions') || '').split(',').filter(Boolean)
  const matchedPattern = request.headers.get('x-matched-pattern') || 'unknown'
  const cacheStatus = request.headers.get('x-cache-status') || 'unknown'

  const { pathname } = new URL(request.url)

  // Estimate response size from Content-Length or clone body
  let responseSize = 0
  const contentLength = response.headers.get('content-length')
  if (contentLength) {
    responseSize = parseInt(contentLength, 10)
  }

  const handlerDurationMs = parseFloat((performance.now() - opts.handlerStartPerf).toFixed(3))

  const entry: HandlerTrace = {
    traceId,
    path: pathname,
    method: request.method,
    handlerEnterAt: opts.handlerStartPerf,
    handlerDurationMs,
    dbQueryCount: opts.dbQueryCount || 0,
    dbDurationMs: opts.dbDurationMs || 0,
    statusCode: response.status,
    responseSize,
    timestamp: new Date().toISOString(),
    middlewareDurationMs: middlewareDuration,
    middlewareActions,
    matchedPattern,
    cacheStatus,
    clientIp: request.headers.get('x-forwarded-for') || '127.0.0.1',
    userAgent: request.headers.get('user-agent') || 'unknown',
  }

  recordHandlerTrace(entry)
}
