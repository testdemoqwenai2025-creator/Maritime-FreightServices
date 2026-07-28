import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [
      totalVessels,
      activeVessels,
      totalPorts,
      totalShipments,
      shipmentsByStatus,
      vesselTypeBreakdown,
      recentArrivals,
      tradeOverview,
      topTradePartners,
    ] = await Promise.all([
      db.vessel.count(),
      db.vessel.count({ where: { status: 'Active' } }),
      db.port.count(),
      db.shipment.count(),
      db.shipment.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      db.vessel.groupBy({
        by: ['vesselType'],
        _count: { vesselType: true },
      }),
      db.vesselArrival.findMany({
        take: 10,
        orderBy: { arrivalAt: 'desc' },
        include: {
          vessel: { select: { name: true, flagCountry: true, vesselType: true } },
          port: { select: { name: true, countryCode: true } },
        },
      }),
      db.tradeData.aggregate({
        _sum: { tradeValueUsd: true, grossWeightKg: true },
      }),
      db.tradeData.groupBy({
        by: ['partnerCode'],
        _sum: { tradeValueUsd: true },
        orderBy: { _sum: { tradeValueUsd: 'desc' } },
        take: 10,
      }),
    ])

    const totalContainers = await db.container.count()

    return NextResponse.json({
      summary: {
        totalVessels,
        activeVessels,
        totalPorts,
        totalShipments,
        totalContainers,
      },
      shipmentsByStatus: shipmentsByStatus.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      vesselTypeBreakdown: vesselTypeBreakdown.map((v) => ({
        type: v.vesselType,
        count: v._count.vesselType,
      })),
      recentArrivals,
      tradeOverview: {
        totalTradeValue: tradeOverview._sum.tradeValueUsd || 0,
        totalGrossWeight: tradeOverview._sum.grossWeightKg || 0,
      },
      topTradePartners: topTradePartners.map((p) => ({
        partnerCode: p.partnerCode,
        totalValue: p._sum.tradeValueUsd || 0,
      })),
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
