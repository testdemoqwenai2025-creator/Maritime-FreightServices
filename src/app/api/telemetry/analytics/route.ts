/**
 * GET /api/telemetry/analytics — Aggregated analytics with anomaly detection
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const THRESHOLDS: Record<string, { min: number; max: number }> = {
  temperature: { min: -30, max: 30 },
  humidity: { min: 10, max: 100 },
  shock: { min: 0, max: 15 },
  speed: { min: 0, max: 30 },
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sensorId = searchParams.get('sensorId')
    const type = searchParams.get('type')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: Record<string, unknown> = {}
    if (sensorId) where.sensorId = sensorId
    if (type) where.readingType = type
    if (from || to) {
      const ts: Record<string, unknown> = {}
      if (from) ts.gte = new Date(from)
      if (to) ts.lte = new Date(to)
      where.timestamp = ts
    }

    const aggregations = await db.telemetryReading.groupBy({
      by: ['readingType'],
      where,
      _count: true,
      _min: { numericValue: true },
      _max: { numericValue: true },
      _avg: { numericValue: true },
    })

    const stats = aggregations.map(a => ({
      type: a.readingType,
      count: a._count,
      min: a._min.numericValue,
      max: a._max.numericValue,
      avg: parseFloat((a._avg.numericValue || 0).toFixed(2)),
      threshold: THRESHOLDS[a.readingType] || null,
    }))

    const allReadings = await db.telemetryReading.findMany({
      where,
      select: { id: true, sensorId: true, readingType: true, numericValue: true },
    })

    let anomalyFlagCount = 0
    for (const r of allReadings) {
      const th = THRESHOLDS[r.readingType]
      if (th && (r.numericValue < th.min || r.numericValue > th.max)) {
        await db.telemetryReading.update({
          where: { id: r.id },
          data: {
            isAnomaly: true,
            anomalyReason: `Value ${r.numericValue} outside threshold [${th.min}, ${th.max}]`,
          },
        })
        anomalyFlagCount++
      }
    }

    const [totalSensors, totalReadings, totalAnomalies, onlineSensors] = await Promise.all([
      db.ioTSensor.count(),
      db.telemetryReading.count({ where }),
      db.telemetryReading.count({ where: { ...where, isAnomaly: true } }),
      db.ioTSensor.count({ where: { status: 'Online' } }),
    ])

    const recentAnomalies = await db.telemetryReading.findMany({
      where: { isAnomaly: true },
      orderBy: { timestamp: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      summary: { totalSensors, onlineSensors, totalReadings, totalAnomalies, newAnomaliesFlagged: anomalyFlagCount },
      stats,
      recentAnomalies: recentAnomalies.map(a => ({
        id: a.id, sensorId: a.sensorId, readingType: a.readingType,
        numericValue: a.numericValue, unit: a.unit, anomalyReason: a.anomalyReason,
        timestamp: a.timestamp.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Telemetry analytics error:', error)
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 })
  }
}
