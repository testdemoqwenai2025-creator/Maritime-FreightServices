/**
 * POST /api/telemetry/ingest — Bulk ingest telemetry readings
 *
 * Accepts an array of readings and upserts sensors.
 * Body: { readings: Array<{ sensorId, readingType, numericValue, unit?, quality?, metadata?, timestamp? }> }
 *
 * If a sensor doesn't exist yet, it is auto-created with defaults.
 * This is the primary entry point for simulated (or real) IoT data.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  const start = performance.now()

  try {
    const body = await request.json()
    const { readings } = body as {
      readings: Array<{
        sensorId: string
        readingType: string
        numericValue: number
        unit?: string
        quality?: string
        metadata?: string
        timestamp?: string
      }>
    }

    if (!Array.isArray(readings) || readings.length === 0) {
      return NextResponse.json({ error: 'readings must be a non-empty array' }, { status: 400 })
    }

    if (readings.length > 5000) {
      return NextResponse.json({ error: 'Max 5000 readings per batch' }, { status: 400 })
    }

    // Collect unique sensor IDs to ensure they exist
    const sensorIds = [...new Set(readings.map(r => r.sensorId))]
    const now = new Date()

    // Ensure all referenced sensors exist — upsert with defaults
    for (const sid of sensorIds) {
      const typeGuess = readings.find(r => r.sensorId === sid)?.readingType
      let sensorType = 'unknown'
      if (typeGuess === 'temperature' || typeGuess === 'humidity') sensorType = 'reefer'
      else if (typeGuess === 'shock') sensorType = 'shock'
      else if (['latitude', 'longitude', 'speed', 'heading'].includes(typeGuess || '')) sensorType = 'gps'

      await db.ioTSensor.upsert({
        where: { sensorId: sid },
        update: { lastReported: now, status: 'Online' },
        create: {
          sensorId: sid,
          name: `Sensor ${sid}`,
          sensorType,
          status: 'Online',
          batteryLevel: 85 + Math.random() * 15,
          signalStrength: 70 + Math.random() * 30,
          lastReported: now,
        },
      })
    }

    // Batch insert readings using createMany
    const dbStart = performance.now()
    const result = await db.telemetryReading.createMany({
      data: readings.map(r => ({
        sensorId: r.sensorId,
        readingType: r.readingType,
        numericValue: r.numericValue,
        unit: r.unit || null,
        quality: r.quality || 'good',
        metadata: r.metadata || null,
        timestamp: r.timestamp ? new Date(r.timestamp) : now,
      })),
      skipDuplicates: true,
    })
    const dbDuration = parseFloat((performance.now() - dbStart).toFixed(2))

    return NextResponse.json({
      ingested: result.count,
      sensorCount: sensorIds.length,
      dbDurationMs: dbDuration,
      totalDurationMs: parseFloat((performance.now() - start).toFixed(2)),
    })
  } catch (error) {
    console.error('Telemetry ingest error:', error)
    return NextResponse.json({ error: 'Failed to ingest telemetry data', details: String(error) }, { status: 500 })
  }
}
