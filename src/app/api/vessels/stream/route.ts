import { NextRequest } from 'next/server'

// SSE endpoint for real-time vessel position simulation
// Returns simulated AIS position data every 5 seconds

interface SimulatedVessel {
  id: string
  name: string
  mmsi: number
  vesselType: string
  flagCountry: string
  status: string
  speed: number
  heading: number
  latitude: number
  longitude: number
  destination: string
}

function generateVessels(): SimulatedVessel[] {
  const names = [
    'MSC Oscar', 'Maersk Alabama', 'COSCO Harmony', 'CMA CGM Marco Polo',
    'Ever Given', 'HMM Copenhagen', 'Yang Ming Unity', 'ONE Fortune',
    'Pacific Star', 'Ocean Express', 'ZIM Mediterranean', 'PIL Harmony',
    'Wan Hai 506', 'KMTC Seoul', 'IRIS Leader', 'Star Maersk',
    'Tokyo Express', 'Singapore Spirit', 'Rotterdam Pioneer', 'Hong Kong Glory',
    'Shanghai Fortune', 'Busan Bridge', 'Hamburg Maersk', 'LA Spirit',
    'NYK Aurora', 'K Line Blue', 'MOL Courage', 'OOCL Berlin',
    'APL Changi', 'President Wilson', 'Matson Molokai', 'Horizon Navigator',
    'TOTE Perseverance', 'Crowley Venture', 'Seaboard Pride', 'Sea-Land Mercury',
    'X-Press Pearl', 'Berge Stena', 'Frontier Falcon', 'Polaris Venture',
    'Atlantis Crown', 'Neptune Voyager', 'Atlas Carrier', 'Titan Explorer',
    'Meridian Star', 'Coral Bay', 'Aqua Marine', 'Cobalt Seas',
    'Crimson Tide', 'Sapphire Wave', 'Emerald Isle', 'Golden Horizon',
    'Silver Cloud', 'Jade River', 'Ruby Express', 'Opal Dream',
    'Topaz Glory', 'Amber Coast', 'Onyx Venture', 'Pearl Harbor',
    'Diamond Fleet', 'Crystal Clear', 'Quartz Pioneer', 'Granite Shield',
    'Marble Arch', 'Slate Voyager', 'Basalt Runner', 'Obsidian Star',
    'Flint Arrow', 'Chalk White', 'Limestone Bay', 'Sandstone Bridge',
    'Pebble Creek', 'Boulder Peak', 'Gravel Coast', 'Cobble Lane',
    'Ridge Runner', 'Valley Forge', 'Summit Peak', 'Canyon Cross',
    'Gorge Express', 'Plateau Star', 'Mesa Voyager', 'Butte Venture'
  ]

  const types = ['Container Ship', 'Oil Tanker', 'Bulk Carrier', 'LNG Tanker', 'Ro-Ro', 'General Cargo', 'Vehicle Carrier']
  const flags = ['Panama', 'Liberia', 'Marshall Islands', 'Hong Kong', 'Singapore', 'Greece', 'Norway', 'Bahamas']
  const statuses = ['Active', 'Active', 'Active', 'Active', 'In Port', 'At Anchor', 'Underway', 'Active']
  const destinations = [
    'Rotterdam NL', 'Shanghai CN', 'Singapore SG', 'Busan KR', 'Los Angeles US',
    'Hamburg DE', 'Felixstowe GB', 'Dubai AE', 'Yokohama JP', 'Long Beach US',
    'Antwerp BE', 'Tanjung Pelepas MY', 'Ningbo CN', 'Kaohsiung TW', 'Sydney AU',
    'New York US', 'Santos BR', 'Mumbai IN', 'Jeddah SA', 'Durban ZA'
  ]

  const lanes = [
    { latMin: 1, latMax: 5, lonMin: 103, lonMax: 105 },
    { latMin: 50, latMax: 52, lonMin: 3, lonMax: 5 },
    { latMin: 31, latMax: 32, lonMin: 121, lonMax: 122 },
    { latMin: 34, latMax: 36, lonMin: 129, lonMax: 130 },
    { latMin: 33, latMax: 34, lonMin: -118, lonMax: -117 },
    { latMin: 25, latMax: 27, lonMin: 55, lonMax: 56 },
    { latMin: 51, latMax: 52, lonMin: 1, lonMax: 2 },
    { latMin: 22, latMax: 23, lonMin: 113, lonMax: 115 },
    { latMin: 35, latMax: 36, lonMin: 139, lonMax: 141 },
    { latMin: -33, latMax: -34, lonMin: 151, lonMax: 152 },
    { latMin: 40, latMax: 41, lonMin: -74, lonMax: -73 },
    { latMin: -23, latMax: -24, lonMin: -46, lonMax: -45 },
    { latMin: 18, latMax: 19, lonMin: 72, lonMax: 73 },
    { latMin: 21, latMax: 22, lonMin: 39, lonMax: 40 },
    { latMin: -29, latMax: -30, lonMin: 31, lonMax: 32 },
  ]

  return names.map((name, i) => {
    const lane = lanes[i % lanes.length]
    return {
      id: `v-${i.toString().padStart(3, '0')}`,
      name,
      mmsi: 200000000 + i * 1000 + Math.floor(Math.random() * 999),
      vesselType: types[i % types.length],
      flagCountry: flags[i % flags.length],
      status: statuses[i % statuses.length],
      speed: Math.round(8 + Math.random() * 18),
      heading: Math.round(Math.random() * 360),
      latitude: parseFloat((lane.latMin + Math.random() * (lane.latMax - lane.latMin)).toFixed(4)),
      longitude: parseFloat((lane.lonMin + Math.random() * (lane.lonMax - lane.lonMin)).toFixed(4)),
      destination: destinations[i % destinations.length],
    }
  })
}

function simulateMovement(vessels: SimulatedVessel[]): SimulatedVessel[] {
  return vessels.map(v => {
    if (v.status === 'In Port' || v.status === 'At Anchor') return v

    const latDelta = (Math.sin((v.heading * Math.PI) / 180) * v.speed * 0.00014) + (Math.random() - 0.5) * 0.001
    const lonDelta = (Math.cos((v.heading * Math.PI) / 180) * v.speed * 0.00014) + (Math.random() - 0.5) * 0.001
    const headingDelta = Math.round((Math.random() - 0.5) * 4)
    const newHeading = (v.heading + headingDelta + 360) % 360
    const newSpeed = Math.max(4, Math.min(28, parseFloat((v.speed + (Math.random() - 0.5) * 0.5).toFixed(1))))

    return {
      ...v,
      latitude: parseFloat((v.latitude + latDelta).toFixed(4)),
      longitude: parseFloat((v.longitude + lonDelta).toFixed(4)),
      heading: newHeading,
      speed: Math.round(newSpeed),
    }
  })
}

export const dynamic = 'force-dynamic'

export async function GET() {
  // Use TransformStream for a clean SSE implementation
  const vessels = generateVessels()
  const encoder = new TextEncoder()

  const stream = new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(chunk)
    },
  })

  const writer = stream.writable.getWriter()

  // Write initial state
  writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'init', vessels })}\n\n`))

  // Schedule position updates
  let currentVessels = vessels
  const interval = setInterval(() => {
    try {
      currentVessels = simulateMovement(currentVessels)
      writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'update', vessels: currentVessels })}\n\n`))
    } catch {
      clearInterval(interval)
    }
  }, 5000)

  // Auto-close after 5 minutes to prevent resource leak
  setTimeout(() => {
    clearInterval(interval)
    try { writer.close() } catch { /* ignore */ }
  }, 300000)

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
