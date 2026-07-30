import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** GET /api/iot/sensors — List sensors with latest readings */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const includeReadings = searchParams.get('readings') === 'true'

    const where: Record<string, unknown> = {}
    if (type) where.sensorType = type
    if (status) where.status = status

    const sensors = await prisma.ioTSensor.findMany({
      where,
      include: {
        container: { select: { containerNo: true, isoType: true, status: true } },
        vessel: { select: { name: true, mmsi: true, status: true } },
        readings: includeReadings
          ? { orderBy: { timestamp: 'desc' }, take: 20 }
          : false,
      },
      orderBy: { lastReported: 'desc' },
    })

    // Get latest reading per sensor
    const sensorIds = sensors.map(s => s.sensorId)
    const latestReadings = await prisma.telemetryReading.findMany({
      where: { sensorId: { in: sensorIds } },
      distinct: ['sensorId'],
      orderBy: { timestamp: 'desc' },
    })
    const readingMap = Object.fromEntries(latestReadings.map(r => [r.sensorId, r]))

    // Anomaly count
    const anomalyCount = await prisma.telemetryReading.count({ where: { isAnomaly: true } })
    const totalReadings = await prisma.telemetryReading.count()

    return NextResponse.json({
      sensors,
      latestReadings: readingMap,
      summary: {
        totalSensors: sensors.length,
        onlineSensors: sensors.filter(s => s.status === 'Online').length,
        anomalyRate: totalReadings > 0 ? parseFloat(((anomalyCount / totalReadings) * 100).toFixed(1)) : 0,
      },
    })
  } catch (error) {
    console.error('[IoT GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
