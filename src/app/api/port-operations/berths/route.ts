import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** GET /api/port-operations/berths — Berth allocations + crane status */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const portId = searchParams.get('portId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (portId) where.portId = portId
    if (status) where.status = status

    const [berths, cranes] = await Promise.all([
      prisma.berthAllocation.findMany({
        where,
        include: { port: { select: { name: true, unlocode: true } } },
        orderBy: { arrivalETA: 'asc' },
      }),
      prisma.craneSchedule.findMany({
        where: portId ? { portId } : {},
        orderBy: { status: 'asc' },
      }),
    ])

    // Berth utilization
    const activeBerths = berths.filter(b => ['Berthed', 'Working', 'Arrived'].includes(b.status))
    const totalTEU = berths.reduce((s, b) => s + (b.teuLoaded || 0), 0)
    const expectedTEU = berths.reduce((s, b) => s + (b.teuExpected || 0), 0)
    const workingCranes = cranes.filter(c => c.status === 'Working')
    const avgEfficiency = workingCranes.length > 0
      ? workingCranes.reduce((s, c) => s + (c.efficiencyPct || 0), 0) / workingCranes.length
      : 0

    return NextResponse.json({
      berths,
      cranes,
      summary: {
        totalBerths: berths.length,
        activeBerths: activeBerths.length,
        totalCranes: cranes.length,
        workingCranes: workingCranes.length,
        teuLoaded: totalTEU,
        teuExpected: expectedTEU,
        utilizationPct: expectedTEU > 0 ? Math.round((totalTEU / expectedTEU) * 100) : 0,
        avgCraneEfficiency: Math.round(avgEfficiency),
      },
    })
  } catch (error) {
    console.error('[PortOps GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
