/**
 * GET /api/telemetry/readings — Query telemetry readings with filters
 *
 * Query params:
 *   sensorId  — filter by sensor hardware ID
 *   type      — filter by readingType (temperature, humidity, shock, latitude, etc.)
 *   from      — ISO date string for start of time range
 *   to        — ISO date string for end of time range
 *   anomaly   — "true" to only return flagged anomalies
 *   limit     — max results (default 200)
 *   offset    — pagination offset
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sensorId = searchParams.get('sensorId')
    const type = searchParams.get('type')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const anomaly = searchParams.get('anomaly')
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 5000)
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}

    if (sensorId) where.sensorId = sensorId
    if (type) where.readingType = type
    if (anomaly === 'true') where.isAnomaly = true

    if (from || to) {
      const ts: Record<string, unknown> = {}
      if (from) ts.gte = new Date(from)
      if (to) ts.lte = new Date(to)
      where.timestamp = ts
    }

    const [readings, total] = await Promise.all([
      db.telemetryReading.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.telemetryReading.count({ where }),
    ])

    return NextResponse.json({
      data: readings.map(r => ({
        ...r,
        timestamp: r.timestamp.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
      pagination: { limit, offset, total },
    })
  } catch (error) {
    console.error('Telemetry readings error:', error)
    return NextResponse.json({ error: 'Failed to fetch readings' }, { status: 500 })
  }
}
