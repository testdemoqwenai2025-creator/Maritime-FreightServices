import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shipmentId = searchParams.get('shipmentId')

    if (!shipmentId) {
      return NextResponse.json({ error: 'shipmentId is required' }, { status: 400 })
    }

    const events = await db.shipmentEvent.findMany({
      where: { shipmentId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ data: events })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}
