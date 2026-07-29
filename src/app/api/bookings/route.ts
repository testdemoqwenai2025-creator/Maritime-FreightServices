import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const rateType = searchParams.get('rateType')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status && status !== 'All') where.status = status
    if (rateType && rateType !== 'All') where.rateType = rateType
    if (search) {
      where.OR = [
        { bookingNumber: { contains: search } },
        { commodity: { contains: search } },
      ]
    }

    const [bookings, total] = await Promise.all([
      db.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { bookingDate: 'desc' },
        include: {
          carrier: { select: { name: true, code: true } },
          vessel: { select: { name: true, mmsi: true, imo: true } },
          originPort: { select: { name: true, countryCode: true, unlocode: true } },
          destPort: { select: { name: true, countryCode: true, unlocode: true } },
          shipment: { select: { billOfLading: true, status: true } },
        },
      }),
      db.booking.count({ where }),
    ])

    return NextResponse.json({
      data: bookings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}
