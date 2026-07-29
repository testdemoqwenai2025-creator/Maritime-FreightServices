import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const startTime = Date.now()

export async function GET() {
  const mem = process.memoryUsage()
  const start = performance.now()

  try {
    await db.port.count()

    const dbTime = performance.now() - start

    return NextResponse.json({
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
        responseTime: `${dbTime.toFixed(1)}ms`,
      },
      runtime: {
        node: process.version,
        platform: process.platform,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        database: { status: 'disconnected', error: String(error) },
        uptime: Math.floor((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
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
