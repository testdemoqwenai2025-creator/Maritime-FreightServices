import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity') || 'all' // all, critical, high, medium, low

    // Automated alert generation engine
    // Scans vessels, ports, shipments for conditions requiring attention
    const alerts: unknown[] = []
    const now = new Date()

    // 1. Port congestion alerts
    const ports = await db.port.findMany({
      where: { congestionLevel: { in: ['High', 'Critical'] } },
    })
    for (const port of ports) {
      const p = port as Record<string, unknown>
      alerts.push({
        id: `alert-port-${p.id}`,
        type: 'CONGESTION',
        severity: p.congestionLevel === 'Critical' ? 'critical' : 'high',
        category: 'Infrastructure',
        title: `Port congestion: ${p.name}`,
        description: `${p.name} (${p.countryCode}) reporting ${p.congestionLevel.toLowerCase()} congestion levels. Expect delays of ${p.congestionLevel === 'Critical' ? '48-72h' : '24-48h'} for vessel operations.`,
        entityId: p.id,
        entityType: 'Port',
        location: { lat: p.latitude, lon: p.longitude },
        recommendation: p.congestionLevel === 'Critical'
          ? 'Consider rerouting to alternative ports within 200nm radius'
          : 'Monitor closely, advise vessels to adjust arrival timing',
        impactScore: p.congestionLevel === 'Critical' ? 9 : 6,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 24 * 3600000).toISOString(),
      })
    }

    // 2. Shipment delay alerts
    const shipments = await db.shipment.findMany({
      where: {
        status: 'In Transit',
        eta: { lt: new Date(now.getTime() + 48 * 3600000) },
      },
      include: { vessel: true, carrier: true },
      take: 10,
    })
    for (const s of shipments) {
      const shipment = s as Record<string, unknown>
      const vessel = shipment.vessel as Record<string, unknown> | null
      alerts.push({
        id: `alert-shipment-${shipment.id}`,
        type: 'ETA_WARNING',
        severity: 'medium',
        category: 'Logistics',
        title: `Shipment approaching ETA: ${shipment.billOfLading || shipment.id}`,
        description: `Shipment expected to arrive within 48h. Vessel ${vessel?.name || 'Unknown'} (${vessel?.status || 'unknown'}) on final approach.`,
        entityId: shipment.id,
        entityType: 'Shipment',
        recommendation: 'Prepare berth allocation, customs pre-clearance, and discharge equipment',
        impactScore: 4,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 48 * 3600000).toISOString(),
      })
    }

    // 3. Dangerous cargo alerts
    const dangerousCargo = await db.shipment.findMany({
      where: { cargoType: { contains: 'DG' } },
      include: { vessel: true },
      take: 5,
    })
    for (const s of dangerousCargo) {
      const shipment = s as Record<string, unknown>
      const vessel = shipment.vessel as Record<string, unknown> | null
      alerts.push({
        id: `alert-cargo-${shipment.id}`,
        type: 'DANGEROUS_CARGO',
        severity: 'high',
        category: 'Safety',
        title: `Dangerous cargo in transit: ${shipment.cargoType}`,
        description: `Shipment ${shipment.billOfLading || shipment.id} with ${shipment.cargoType} cargo aboard ${vessel?.name || 'unknown vessel'}. Requires special handling at destination.`,
        entityId: shipment.id,
        entityType: 'Shipment',
        recommendation: 'Ensure IMDG compliance, emergency response plan at destination port',
        impactScore: 8,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 72 * 3600000).toISOString(),
      })
    }

    // 4. Document expiry alerts
    const pendingDocs = await db.shipmentDocument.findMany({
      where: { status: 'Pending' },
      take: 10,
    })
    for (const d of pendingDocs) {
      const doc = d as Record<string, unknown>
      const issuedAt = doc.issuedAt ? new Date(doc.issuedAt as string) : null
      const daysSinceIssue = issuedAt ? Math.floor((Date.now() - issuedAt.getTime()) / 86400000) : 0
      if (daysSinceIssue > 5) {
        alerts.push({
          id: `alert-doc-${doc.id}`,
          type: 'DOCUMENT_OVERDUE',
          severity: 'low',
          category: 'Compliance',
          title: `Pending document: ${doc.docType}`,
          description: `${doc.docType} for shipment has been pending for ${daysSinceIssue} days. Expected processing time is 3-5 days.`,
          entityId: doc.id,
          entityType: 'Document',
          recommendation: 'Escalate to document processing team for expedited review',
          impactScore: 3,
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 24 * 3600000).toISOString(),
        })
      }
    }

    // 5. Vessel maintenance alerts (simulated)
    const vessels = await db.vessel.findMany({
      where: { status: 'Active' },
      take: 5,
    })
    for (const v of vessels) {
      const vessel = v as Record<string, unknown>
      if (Math.random() < 0.15) {
        alerts.push({
          id: `alert-vessel-${vessel.id}`,
          type: 'MAINTENANCE_DUE',
          severity: 'medium',
          category: 'Operations',
          title: `Scheduled maintenance overdue: ${vessel.name}`,
          description: `${vessel.name} (${vessel.vesselType}) has exceeded recommended maintenance interval. Risk of mechanical failure increases.`,
          entityId: vessel.id,
          entityType: 'Vessel',
          recommendation: 'Schedule dry dock inspection at next port of call',
          impactScore: 5,
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 168 * 3600000).toISOString(),
        })
      }
    }

    // Filter by severity
    const filtered = severity === 'all'
      ? alerts
      : alerts.filter((a: Record<string, unknown>) => a.severity === severity)

    // Sort by impact score desc
    filtered.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      Number(b.impactScore) - Number(a.impactScore)
    )

    const severityCounts = {
      critical: alerts.filter((a: Record<string, unknown>) => a.severity === 'critical').length,
      high: alerts.filter((a: Record<string, unknown>) => a.severity === 'high').length,
      medium: alerts.filter((a: Record<string, unknown>) => a.severity === 'medium').length,
      low: alerts.filter((a: Record<string, unknown>) => a.severity === 'low').length,
    }

    return NextResponse.json({
      engine: 'MaritimeAI Alert System v1.0',
      generatedAt: now.toISOString(),
      totalAlerts: alerts.length,
      returnedAlerts: filtered.length,
      filter: severity,
      alerts: filtered.slice(0, 50),
      summary: severityCounts,
      topPriority: filtered[0]?.title || 'No active alerts',
    })
  } catch (error) {
    console.error('Alert system error:', error)
    return NextResponse.json({ error: 'Alert generation failed' }, { status: 500 })
  }
}
