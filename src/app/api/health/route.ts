import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { finalizeTrace } from '@/lib/trace-store'

const startTime = Date.now()

export async function GET(request: Request) {
  const handlerStart = performance.now()
  const mem = process.memoryUsage()
  let dbDurationMs = 0
  let dbQueryCount = 0
  let response: NextResponse

  try {
    const dbStart = performance.now()
    await db.port.count()
    dbDurationMs = parseFloat((performance.now() - dbStart).toFixed(3))
    dbQueryCount = 1

    response = NextResponse.json({
      status: 'healthy',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      uptimeHuman: formatUptime(Date.now() - startTime),
      memory: {
        rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      },
      database: {
        status: 'connected',
        responseTime: `${dbDurationMs}ms`,
      },
      runtime: {
        node: process.version,
        platform: process.platform,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    response = NextResponse.json(
      {
        status: 'degraded',
        database: { status: 'disconnected', error: String(error) },
        uptime: Math.floor((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }

  response.headers.set('x-handler-duration-ms', parseFloat((performance.now() - handlerStart).toFixed(3)).toString())
  response.headers.set('x-db-duration-ms', dbDurationMs.toString())
  response.headers.set('x-db-queries', dbQueryCount.toString())

  finalizeTrace(request, response, { dbQueryCount, dbDurationMs, handlerStartPerf: handlerStart })
  return response
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${sec}s`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}
