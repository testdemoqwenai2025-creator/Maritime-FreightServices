import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { finalizeTrace } from '@/lib/trace-store'

export async function GET(request: Request) {
  const handlerStart = performance.now()
  let dbDurationMs = 0
  let dbQueryCount = 0
  let response: NextResponse
  let statusCode = 200

  try {
    const dbStart = performance.now()

    const [
      totalVessels, activeVessels, inPortVessels,
      totalPorts, totalShipments, totalContainers,
      totalCarriers, totalCharters, totalBookings,
      totalCargoTypes, totalTradeRoutes,
      shipmentsByStatus, vesselTypeBreakdown,
      vesselStatusBreakdown, containerStatusBreakdown,
      recentArrivals, tradeOverview, topTradePartners,
      tradeByRoute, congestionDistribution,
      documentStats, totalTradeRecords, totalDocuments,
      allianceBreakdown, carrierReliability,
      topCarriers, bookingStatusBreakdown,
      charterTypeBreakdown, dangerousCargoCount,
    ] = await Promise.all([
      db.vessel.count(),
      db.vessel.count({ where: { status: 'Active' } }),
      db.vessel.count({ where: { status: 'In Port' } }),
      db.port.count(),
      db.shipment.count(),
      db.container.count(),
      db.carrier.count(),
      db.charter.count(),
      db.booking.count(),
      db.cargoType.count(),
      db.tradeRoute.count(),
      db.shipment.groupBy({ by: ['status'], _count: { status: true } }),
      db.vessel.groupBy({ by: ['vesselType'], _count: { vesselType: true } }),
      db.vessel.groupBy({ by: ['status'], _count: { status: true } }),
      db.container.groupBy({ by: ['status'], _count: { status: true } }),
      db.vesselArrival.findMany({
        take: 10, orderBy: { arrivalAt: 'desc' },
        include: {
          vessel: { select: { name: true, flagCountry: true, vesselType: true, carrier: { select: { name: true, code: true } } } },
          port: { select: { name: true, countryCode: true, congestionLevel: true } },
        },
      }),
      db.tradeData.aggregate({ _sum: { tradeValueUsd: true, grossWeightKg: true, co2EmissionsT: true } }),
      db.tradeData.groupBy({ by: ['partnerCode'], _sum: { tradeValueUsd: true }, orderBy: { _sum: { tradeValueUsd: 'desc' } }, take: 10 }),
      db.tradeData.groupBy({ by: ['tradeRoute'], _sum: { tradeValueUsd: true, co2EmissionsT: true }, orderBy: { _sum: { tradeValueUsd: 'desc' } }, take: 10 }),
      db.port.groupBy({ by: ['congestionLevel'], _count: { congestionLevel: true } }),
      db.shipmentDocument.groupBy({ by: ['status'], _count: { status: true } }),
      db.tradeData.count(),
      db.shipmentDocument.count(),
      db.carrier.groupBy({ by: ['alliance'], _count: { alliance: true }, _sum: { totalTEUCapacity: true } }),
      db.carrier.aggregate({ _avg: { reliability: true, co2PerTeu: true } }),
      db.carrier.findMany({ take: 5, orderBy: { totalTEUCapacity: 'desc' }, select: { name: true, code: true, totalTEUCapacity: true, fleetSize: true, reliability: true } }),
      db.booking.groupBy({ by: ['status'], _count: { status: true } }),
      db.charter.groupBy({ by: ['charterType'], _count: { charterType: true } }),
      db.cargoType.count({ where: { dangerous: true } }),
    ])

    dbDurationMs = parseFloat((performance.now() - dbStart).toFixed(3))
    dbQueryCount = 21 // 21 parallel queries

    response = NextResponse.json({
      summary: {
        totalVessels, activeVessels, inPortVessels, totalPorts, totalShipments,
        totalContainers, totalDocuments, totalTradeRecords,
        totalCarriers, totalCharters, totalBookings, totalCargoTypes, totalTradeRoutes,
      },
      shipmentsByStatus: shipmentsByStatus.map((s) => ({ status: s.status, count: s._count.status })),
      vesselTypeBreakdown: vesselTypeBreakdown.map((v) => ({ type: v.vesselType, count: v._count.vesselType })),
      vesselStatusBreakdown: vesselStatusBreakdown.map((v) => ({ status: v.status, count: v._count.status })),
      containerStatusBreakdown: containerStatusBreakdown.map((c) => ({ status: c.status, count: c._count.status })),
      recentArrivals,
      tradeOverview: {
        totalTradeValue: tradeOverview._sum.tradeValueUsd || 0,
        totalGrossWeight: tradeOverview._sum.grossWeightKg || 0,
        totalCO2: tradeOverview._sum.co2EmissionsT || 0,
      },
      topTradePartners: topTradePartners.map((p) => ({ partnerCode: p.partnerCode, totalValue: p._sum.tradeValueUsd || 0 })),
      tradeByRoute: tradeByRoute.map((r) => ({ route: r.tradeRoute, totalValue: r._sum.tradeValueUsd || 0, co2Emissions: r._sum.co2EmissionsT || 0 })),
      congestionDistribution: congestionDistribution.map((c) => ({ level: c.congestionLevel, count: c._count.congestionLevel })),
      documentStats: documentStats.map((d) => ({ status: d.status, count: d._count.status })),
      allianceBreakdown: allianceBreakdown.map((a) => ({
        alliance: a.alliance,
        count: a._count.alliance,
        totalTEU: a._sum.totalTEUCapacity || 0,
      })),
      carrierStats: {
        avgReliability: carrierReliability._avg.reliability || 0,
        avgCO2PerTEU: carrierReliability._avg.co2PerTeu || 0,
      },
      topCarriers,
      bookingStatusBreakdown: bookingStatusBreakdown.map((b) => ({ status: b.status, count: b._count.status })),
      charterTypeBreakdown: charterTypeBreakdown.map((c) => ({ type: c.charterType, count: c._count.charterType })),
      dangerousCargoCount,
    })
  } catch (error) {
    statusCode = 500
    console.error('Error fetching dashboard data:', error)
    response = NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }

  // Inject trace timing into response headers
  response.headers.set('x-handler-duration-ms', parseFloat((performance.now() - handlerStart).toFixed(3)).toString())
  response.headers.set('x-db-duration-ms', dbDurationMs.toString())
  response.headers.set('x-db-queries', dbQueryCount.toString())

  finalizeTrace(request, response, { dbQueryCount, dbDurationMs, handlerStartPerf: handlerStart })
  return response
}
