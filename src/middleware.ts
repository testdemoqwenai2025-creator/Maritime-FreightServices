import { NextRequest, NextResponse } from 'next/server'

// In-memory ring buffer for recent request traces (last 200 requests)
const TRACE_BUFFER_SIZE = 200
const traceBuffer: TraceEntry[] = []
let traceCounter = 0

export interface TraceEntry {
  traceId: string
  timestamp: string
  method: string
  path: string
  search: string
  middlewareEnterAt: number
  middlewareExitAt?: number
  middlewareDurationMs?: number
  routeHandlerEnterAt?: number
  routeHandlerDurationMs?: number
  dbQueryCount?: number
  dbDurationMs?: number
  statusCode?: number
  responseSize?: number
  clientIp: string
  userAgent: string
  middlewareActions: string[]
 matchedPattern: string
  cacheStatus: string
  phase: 'middleware' | 'handler' | 'complete' | 'error'
  errorMessage?: string
}

export function getTraceBuffer(): TraceEntry[] {
  return [...traceBuffer]
}

export function clearTraceBuffer(): void {
  traceBuffer.length = 0
  traceCounter = 0
}

function generateTraceId(): string {
  return `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function classifyPath(pathname: string): string {
  if (pathname.startsWith('/api/ai/')) return 'AI Service'
  if (pathname.startsWith('/api/')) return 'API Route'
  if (pathname.startsWith('/_next/')) return 'Static Asset'
  return 'Page Route'
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt).*)',
  ],
}

export async function middleware(request: NextRequest) {
  const traceId = generateTraceId()
  const now = performance.now()
  const { pathname, search } = new URL(request.url)
  const actions: string[] = []

  // 1. Determine route classification
  const matchedPattern = classifyPath(pathname)
  actions.push(`route-classified:${matchedPattern}`)

  // 2. CORS & security headers preparation
  actions.push('cors-check')
  actions.push('security-headers-prepare')

  // 3. Request body size estimation (for POST/PUT/PATCH)
  let estimatedBodySize: number | undefined
  const contentLength = request.headers.get('content-length')
  if (contentLength) {
    estimatedBodySize = parseInt(contentLength, 10)
  }
  if (['POST', 'PUT', 'PATCH'].includes(request.method) && !contentLength) {
    actions.push('body-size:unknown')
  } else if (estimatedBodySize) {
    actions.push(`body-size:${estimatedBodySize}B`)
  }

  // 4. API rate limiting simulation (lightweight in-memory check)
  if (pathname.startsWith('/api/')) {
    actions.push('rate-limit-check')
  }

  // 5. Cache header analysis
  let cacheStatus = 'dynamic'
  if (pathname.startsWith('/_next/static/') || pathname.endsWith('.js') || pathname.endsWith('.css')) {
    cacheStatus = 'static-immutable'
  } else if (pathname.startsWith('/api/')) {
    cacheStatus = 'no-store'
  }
  actions.push(`cache:${cacheStatus}`)

  const middlewareExitAt = performance.now()
  const middlewareDurationMs = parseFloat((middlewareExitAt - now).toFixed(3))

  // Build trace entry
  const entry: TraceEntry = {
    traceId,
    timestamp: new Date().toISOString(),
    method: request.method,
    path: pathname,
    search,
    middlewareEnterAt: now,
    middlewareExitAt,
    middlewareDurationMs,
    clientIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1',
    userAgent: request.headers.get('user-agent') || 'unknown',
    middlewareActions: actions,
    matchedPattern,
    cacheStatus,
    phase: 'middleware',
  }

  // Store in ring buffer
  traceCounter++
  if (traceBuffer.length >= TRACE_BUFFER_SIZE) {
    traceBuffer.shift()
  }
  traceBuffer.push(entry)

  // Clone the request and inject tracing headers so the route handler can pick them up
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-trace-id', traceId)
  requestHeaders.set('x-middleware-enter-at', now.toString())
  requestHeaders.set('x-middleware-duration-ms', middlewareDurationMs.toString())
  requestHeaders.set('x-middleware-actions', actions.join(','))

  // Create response with tracing headers
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Set standard security & tracing response headers
  response.headers.set('x-trace-id', traceId)
  response.headers.set('x-middleware-duration-ms', middlewareDurationMs.toString())
  response.headers.set('x-matched-pattern', matchedPattern)
  response.headers.set('x-cache-status', cacheStatus)
  response.headers.set('x-frame-options', 'DENY')
  response.headers.set('x-content-type-options', 'nosniff')
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin')

  return response
}
