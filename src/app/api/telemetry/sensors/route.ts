/**
 * GET /api/telemetry/sensors — List sensors with latest readings and status
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (type) where.sensorType = type
    if (status) where.status = status

    const sensors = await db.ioTSensor.findMany({
      where,
      orderBy: { lastReported: 'desc' },
      include: {
        container: { select: { id: true, containerNo: true, isoType: true, status: true } },
        vessel: { select: { id: true, name: true, mmsi: true, status: true } },
      },
    })

    const sensorIds = sensors.map(s => s.sensorId)
    let latestReadings: Record<string, Record<string, { numericValue: number; unit: string | null; timestamp: Date }>> = {}

    if (sensorIds.length > 0) {
      const rawReadings = await db.$queryRaw`
        SELECT r.sensorId, r.readingType, r.numericValue, r.unit, r.timestamp
        FROM TelemetryReading r
        INNER JOIN (
          SELECT sensorId, readingType, MAX(timestamp) as maxTs
          FROM TelemetryReading
          WHERE sensorId IN (${Prisma.join(sensorIds)})
          GROUP BY sensorId, readingType
        ) latest ON r.sensorId = latest.sensorId
          AND r.readingType = latest.readingType
          AND r.timestamp = latest.maxTs
      `
      for (const r of rawReadings as Array<{ sensorId: string; readingType: string; numericValue: number; unit: string | null; timestamp: string }>) {
        if (!latestReadings[r.sensorId]) latestReadings[r.sensorId] = {}
        latestReadings[r.sensorId][r.readingType] = {
          numericValue: r.numericValue,
          unit: r.unit,
          timestamp: new Date(r.timestamp),
        }
      }
    }

    const readingCounts = await db.telemetryReading.groupBy({
      by: ['sensorId'],
      where: { sensorId: { in: sensorIds } },
      _count: true,
    })
    const countMap: Record<string, number> = {}
    for (const rc of readingCounts) countMap[rc.sensorId] = rc._count

    const anomalyCounts = await db.telemetryReading.groupBy({
      by: ['sensorId'],
      where: { sensorId: { in: sensorIds }, isAnomaly: true },
      _count: true,
    })
    const anomalyMap: Record<string, number> = {}
    for (const ac of anomalyCounts) anomalyMap[ac.sensorId] = ac._count

    return NextResponse.json({
      data: sensors.map(s => ({
        id: s.id,
        sensorId: s.sensorId,
        name: s.name,
        sensorType: s.sensorType,
        status: s.status,
        batteryLevel: s.batteryLevel,
        signalStrength: s.signalStrength,
        firmwareVer: s.firmwareVer,
        lastReported: s.lastReported?.toISOString() || null,
        container: s.container,
        vessel: s.vessel,
        latestReadings: latestReadings[s.sensorId] || {},
        totalReadings: countMap[s.sensorId] || 0,
        anomalyCount: anomalyMap[s.sensorId] || 0,
      })),
      total: sensors.length,
    })
  } catch (error) {
    console.error('Telemetry sensors error:', error)
    return NextResponse.json({ error: 'Failed to fetch sensors' }, { status: 500 })
  }
}
