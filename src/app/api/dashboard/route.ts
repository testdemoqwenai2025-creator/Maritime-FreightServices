import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [
      totalVessels, activeVessels, inPortVessels,
      totalPorts, totalShipments, totalContainers,
      shipmentsByStatus, vesselTypeBreakdown,
      vesselStatusBreakdown, containerStatusBreakdown,
      recentArrivals, tradeOverview, topTradePartners,
      tradeByRoute, congestionDistribution,
      documentStats, totalTradeRecords,
    ] = await Promise.all([
      db.vessel.count(),
      db.vessel.count({ where: { status: 'Active' } }),
      db.vessel.count({ where: { status: 'In Port' } }),
      db.port.count(),
      db.shipment.count(),
      db.container.count(),
      db.shipment.groupBy({ by: ['status'], _count: { status: true } }),
      db.vessel.groupBy({ by: ['vesselType'], _count: { vesselType: true } }),
      db.vessel.groupBy({ by: ['status'], _count: { status: true } }),
      db.container.groupBy({ by: ['status'], _count: { status: true } }),
      db.vesselArrival.findMany({
        take: 10, orderBy: { arrivalAt: 'desc' },
        include: { vessel: { select: { name: true, flagCountry: true, vesselType: true } }, port: { select: { name: true, countryCode: true } } },
      }),
      db.tradeData.aggregate({ _sum: { tradeValueUsd: true, grossWeightKg: true, co2EmissionsT: true } }),
      db.tradeData.groupBy({ by: ['partnerCode'], _sum: { tradeValueUsd: true }, orderBy: { _sum: { tradeValueUsd: 'desc' } }, take: 10 }),
      db.tradeData.groupBy({ by: ['tradeRoute'], _sum: { tradeValueUsd: true, co2EmissionsT: true }, orderBy: { _sum: { tradeValueUsd: 'desc' } }, take: 10 }),
      db.port.groupBy({ by: ['congestionLevel'], _count: { congestionLevel: true } }),
      db.shipmentDocument.groupBy({ by: ['status'], _count: { status: true } }),
      db.tradeData.count(),
    ])

    const totalDocuments = await db.shipmentDocument.count()

    return NextResponse.json({
      summary: { totalVessels, activeVessels, inPortVessels, totalPorts, totalShipments, totalContainers, totalDocuments, totalTradeRecords },
      shipmentsByStatus: shipmentsByStatus.map((s) => ({ status: s.status, count: s._count.status })),
      vesselTypeBreakdown: vesselTypeBreakdown.map((v) => ({ type: v.vesselType, count: v._count.vesselType })),
      vesselStatusBreakdown: vesselStatusBreakdown.map((v) => ({ status: v.status, count: v._count.status })),
      containerStatusBreakdown: containerStatusBreakdown.map((c) => ({ status: c.status, count: c._count.status })),
      recentArrivals,
      tradeOverview: { totalTradeValue: tradeOverview._sum.tradeValueUsd || 0, totalGrossWeight: tradeOverview._sum.grossWeightKg || 0, totalCO2: tradeOverview._sum.co2EmissionsT || 0 },
      topTradePartners: topTradePartners.map((p) => ({ partnerCode: p.partnerCode, totalValue: p._sum.tradeValueUsd || 0 })),
      tradeByRoute: tradeByRoute.map((r) => ({ route: r.tradeRoute, totalValue: r._sum.tradeValueUsd || 0, co2Emissions: r._sum.co2EmissionsT || 0 })),
      congestionDistribution: congestionDistribution.map((c) => ({ level: c.congestionLevel, count: c._count.congestionLevel })),
      documentStats: documentStats.map((d) => ({ status: d.status, count: d._count.status })),
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
