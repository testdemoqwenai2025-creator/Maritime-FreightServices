import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all'

    if (!query.trim()) {
      return NextResponse.json({
        query: '',
        totalResults: 0,
        results: { vessels: [], ports: [], shipments: [], carriers: [] },
      })
    }

    const q = query.trim()
    const results: Record<string, unknown[]> = {}

    if (type === 'all' || type === 'vessel') {
      const vessels = await db.vessel.findMany({
        where: { name: { contains: q } },
        include: { carrier: true, tradeRoute: true },
        take: 10,
      })
      results.vessels = vessels
    } else {
      results.vessels = []
    }

    if (type === 'all' || type === 'port') {
      const ports = await db.port.findMany({
        where: { name: { contains: q } },
        take: 10,
      })
      results.ports = ports
    } else {
      results.ports = []
    }

    if (type === 'all' || type === 'shipment') {
      const shipments = await db.shipment.findMany({
        where: {
          OR: [
            { billOfLading: { contains: q } },
            { cargoDesc: { contains: q } },
          ],
        },
        include: { carrier: true, tradeRoute: true },
        take: 10,
      })
      results.shipments = shipments
    } else {
      results.shipments = []
    }

    if (type === 'all' || type === 'carrier') {
      const carriers = await db.carrier.findMany({
        where: { name: { contains: q } },
        take: 10,
      })
      results.carriers = carriers
    } else {
      results.carriers = []
    }

    const totalResults =
      (results.vessels as unknown[]).length +
      (results.ports as unknown[]).length +
      (results.shipments as unknown[]).length +
      (results.carriers as unknown[]).length

    return NextResponse.json({ query: q, totalResults, results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed', totalResults: 0, results: {} },
      { status: 500 }
    )
  }
}
