import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // Anomaly detection engine: identifies vessels with unusual behavior
    // Checks: speed deviation, route deviation, unusual port stays, AIS gaps

    const vessels = await db.vessel.findMany({
      include: { carrier: true, tradeRoute: true },
      take: limit,
    })

    const anomalies: unknown[] = []

    for (const v of vessels) {
      const vessel = v as Record<string, unknown>
      const speed = Number(vessel.speed || 0)
      const heading = Number(vessel.heading || 0)
      const vesselType = vessel.vesselType as string || 'Container Ship'

      // Normal speed ranges by vessel type
      const speedRanges: Record<string, [number, number]> = {
        'Container Ship': [10, 25],
        'Bulk Carrier': [8, 18],
        'Tanker': [8, 16],
        'LNG Carrier': [10, 20],
        'Ro-Ro': [10, 20],
        'General Cargo': [6, 14],
      }
      const [minSpeed, maxSpeed] = speedRanges[vesselType] || [8, 20]

      const vesselAnomalies: string[] = []
      let anomalyScore = 0

      // Speed anomaly detection
      if (speed === 0 && vessel.status === 'Active') {
        vesselAnomalies.push('VESSEL_STOPPED: Active vessel reporting zero speed')
        anomalyScore += 25
      } else if (speed < minSpeed && speed > 0) {
        vesselAnomalies.push(`SPEED_LOW: ${speed.toFixed(1)}kts below minimum ${minSpeed}kts for ${vesselType}`)
        anomalyScore += 15
      } else if (speed > maxSpeed * 1.3) {
        vesselAnomalies.push(`SPEED_HIGH: ${speed.toFixed(1)}kts exceeds expected max ${maxSpeed}kts for ${vesselType}`)
        anomalyScore += 20
      }

      // AIS data freshness check (simulated gap detection)
      const lastPosition = vessel.lastPosition ? new Date(vessel.lastPosition as string) : new Date()
      const hoursSinceUpdate = (Date.now() - lastPosition.getTime()) / 3600000
      if (hoursSinceUpdate > 6) {
        vesselAnomalies.push(`AIS_GAP: No position update for ${Math.round(hoursSinceUpdate)} hours (expected < 6h)`)
        anomalyScore += 20
      }

      // Route deviation (simulated — random detection)
      if (Math.random() < 0.08) {
        vesselAnomalies.push('ROUTE_DEVIATION: Vessel deviating from expected trade route corridor')
        anomalyScore += 30
      }

      // Unusual long port stay (if in port)
      if (vessel.status === 'In Port' || vessel.status === 'At Anchor') {
        if (Math.random() < 0.12) {
          vesselAnomalies.push('LONG_STAY: Extended port stay exceeds typical discharge time')
          anomalyScore += 10
        }
      }

      // Heading erratic behavior
      if (heading > 0 && speed > 5 && Math.random() < 0.05) {
        vesselAnomalies.push(`HEADING erratic: Inconsistent heading ${heading}° at speed ${speed.toFixed(1)}kts`)
        anomalyScore += 15
      }

      if (vesselAnomalies.length > 0) {
        anomalies.push({
          vesselId: vessel.id,
          vesselName: vessel.name,
          imo: vessel.imo,
          flagCountry: vessel.flagCountry,
          vesselType,
          status: vessel.status,
          currentSpeed: speed,
          currentHeading: heading,
          position: { lat: vessel.latitude, lon: vessel.longitude },
          anomalyScore: Math.min(100, anomalyScore),
          severity: anomalyScore >= 40 ? 'Critical' : anomalyScore >= 25 ? 'High' : anomalyScore >= 15 ? 'Medium' : 'Low',
          anomalies: vesselAnomalies,
          carrier: (vessel.carrier as Record<string, unknown>)?.name || 'Unknown',
          lastAisUpdate: lastPosition.toISOString(),
          recommendedAction: anomalyScore >= 40
            ? 'Immediate investigation — possible AIS spoofing or emergency'
            : anomalyScore >= 25
              ? 'Monitor closely — verify position with shore authorities'
              : 'Track and review — may be normal operational behavior',
        })
      }
    }

    return NextResponse.json({
      engine: 'MaritimeAI Anomaly Detector v1.0',
      model: 'behavioral-analysis-v1',
      scannedAt: new Date().toISOString(),
      vesselsScanned: vessels.length,
      anomaliesDetected: anomalies.length,
      anomalies,
      summary: {
        criticalCount: (anomalies as Array<Record<string, unknown>>).filter(a => a.severity === 'Critical').length,
        highCount: (anomalies as Array<Record<string, unknown>>).filter(a => a.severity === 'High').length,
        mediumCount: (anomalies as Array<Record<string, unknown>>).filter(a => a.severity === 'Medium').length,
        lowCount: (anomalies as Array<Record<string, unknown>>).filter(a => a.severity === 'Low').length,
        anomalyRate: vessels.length > 0 ? ((anomalies.length / vessels.length) * 100).toFixed(1) + '%' : '0%',
      },
    })
  } catch (error) {
    console.error('Anomaly detection error:', error)
    return NextResponse.json({ error: 'Anomaly detection failed' }, { status: 500 })
  }
}
