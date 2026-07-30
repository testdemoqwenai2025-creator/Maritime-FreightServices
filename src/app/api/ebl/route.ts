import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** GET /api/ebl — List electronic bills of lading */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const carrier = searchParams.get('carrier')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (carrier) where.carrierName = { contains: carrier }

    const [ebls, total] = await Promise.all([
      prisma.electronicBillOfLading.findMany({
        where,
        include: {
          shipment: {
            select: { id: true, status: true, cargoDesc: true, containerCount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.electronicBillOfLading.count({ where }),
    ])

    // Status distribution
    const dist = await prisma.electronicBillOfLading.groupBy({ by: ['status'], _count: true })

    return NextResponse.json({
      ebls,
      total,
      statusDistribution: dist.map(d => ({ status: d.status, count: d._count })),
    })
  } catch (error) {
    console.error('[eBL GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** POST /api/ebl — Issue a new electronic bill of lading */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shipmentId, shipperName, consigneeName, carrierName, portOfLoading, portOfDischarge } = body

    if (!shipmentId || !shipperName || !carrierName || !portOfLoading || !portOfDischarge) {
      return NextResponse.json({ error: 'shipmentId, shipperName, carrierName, portOfLoading, portOfDischarge required' }, { status: 400 })
    }

    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } })
    if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })

    const existing = await prisma.electronicBillOfLading.findFirst({ where: { shipmentId } })
    if (existing) return NextResponse.json({ error: 'eBL already exists for this shipment' }, { status: 409 })

    const crypto = await import('crypto')
    const blNumber = `eBL-${new Date().getFullYear()}-${portOfLoading}-${String(Date.now()).slice(-6)}`

    const ebl = await prisma.electronicBillOfLading.create({
      data: {
        blNumber,
        shipmentId,
        status: 'Issued',
        shipperName,
        shipperAddress: body.shipperAddress,
        consigneeName,
        consigneeAddress: body.consigneeAddress,
        notifyParty: body.notifyParty,
        carrierName,
        vesselName: body.vesselName || shipment.vesselId,
        voyageNumber: body.voyageNumber,
        portOfLoading,
        portOfDischarge,
        descriptionOfGoods: body.descriptionOfGoods || shipment.cargoDesc,
        containerCount: body.containerCount || shipment.containerCount || 0,
        grossWeight: body.grossWeight || shipment.cargoWeight,
        freightTerms: body.freightTerms || 'Prepaid',
        documentHash: `sha256:${crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 64)}`,
        blockchainTxId: `0x${crypto.randomBytes(20).toString('hex')}`,
        issuedAt: new Date(),
        issuedBy: body.issuedBy,
      },
    })

    return NextResponse.json({ ebl }, { status: 201 })
  } catch (error) {
    console.error('[eBL POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
