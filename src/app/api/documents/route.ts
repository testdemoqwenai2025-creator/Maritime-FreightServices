import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shipmentId = searchParams.get('shipmentId')
    const docType = searchParams.get('docType')

    const where: Record<string, unknown> = {}
    if (shipmentId) where.shipmentId = shipmentId
    if (docType && docType !== 'All') where.docType = docType

    const docs = await db.shipmentDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: docs })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}
