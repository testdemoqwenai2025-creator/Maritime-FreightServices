'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Ship, Anchor, Container } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ─── Interfaces ──────────────────────────────────────────────────────

interface MapVessel {
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
  carrier?: { name: string; code: string } | null
}

interface MapPort {
  id: string
  name: string
  unlocode: string
  countryCode: string
  latitude: number
  longitude: number
  annualTEU: number
  congestionLevel: string
}

interface VesselMapProps {
  vessels: MapVessel[]
  ports: MapPort[]
  onVesselClick?: (vessel: MapVessel) => void
}

// ─── Vessel type colors ──────────────────────────────────────────────

function vesselTypeColor(type: string): string {
  switch (type) {
    case 'Container Ship': return '#60a5fa'  // blue-400
    case 'Oil Tanker': return '#f87171'     // red-400
    case 'Bulk Carrier': return '#fbbf24'   // amber-400
    case 'LNG Tanker': return '#34d399'     // emerald-400
    case 'Ro-Ro': return '#a78bfa'          // violet-400
    case 'General Cargo': return '#9ca3af'  // gray-400
    case 'Vehicle Carrier': return '#f472b6' // pink-400
    default: return '#9ca3af'
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'Active': return '#4ade80'
    case 'In Port': return '#60a5fa'
    case 'At Anchor': return '#fbbf24'
    case 'Moored': return '#60a5fa'
    case 'Underway': return '#4ade80'
    default: return '#9ca3af'
  }
}

function congestionColorHex(level: string): string {
  switch (level) {
    case 'Low': return '#4ade80'
    case 'Medium': return '#fbbf24'
    case 'High': return '#fb923c'
    case 'Critical': return '#f87171'
    default: return '#9ca3af'
  }
}

// ─── Map Component ───────────────────────────────────────────────────

export default function VesselMap({ vessels, ports, onVesselClick }: VesselMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const vesselLayerRef = useRef<any>(null)
  const portLayerRef = useRef<any>(null)
  const selectedVesselRef = useRef<MapVessel | null>(null)

  // Initialize Leaflet map (client-side only)
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return

    let L: any
    let cleanup: (() => void) | null = null

    const initMap = async () => {
      L = await import('leaflet')
      await import('leaflet/dist/leaflet.css')

      // Create map
      const map = L.map(mapRef.current!, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: true,
      })

      // CartoDB dark matter tiles (maritime feel)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map)

      // Zoom control on right
      L.control.zoom({ position: 'topright' }).addTo(map)

      mapInstanceRef.current = map

      // Create layers
      vesselLayerRef.current = L.layerGroup().addTo(map)
      portLayerRef.current = L.layerGroup().addTo(map)

      cleanup = () => {
        map.remove()
        mapInstanceRef.current = null
      }
    }

    initMap()

    return () => {
      cleanup?.()
    }
  }, [])

  // Create custom vessel marker icon
  const createVesselIcon = useCallback((vessel: MapVessel) => {
    if (typeof window === 'undefined' || !window.L) return null

    const L = window.L
    const color = vesselTypeColor(vessel.vesselType)
    const size = 12

    // Rotated triangle marker pointing in heading direction
    const rotation = vessel.heading || 0
    const svg = `<svg width="${size + 4}" height="${size + 4}" viewBox="0 0 ${size + 4} ${size + 4}" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(${(size + 4) / 2}, ${(size + 4) / 2}) rotate(${rotation})">
        <polygon points="0,${-size / 2} ${size / 3},${size / 2} ${-size / 3},${size / 2}" fill="${color}" stroke="rgba(255,255,255,0.8)" stroke-width="1" opacity="0.9"/>
      </g>
    </svg>`

    return L.divIcon({
      html: svg,
      className: 'vessel-marker',
      iconSize: [size + 4, size + 4],
      iconAnchor: [(size + 4) / 2, (size + 4) / 2],
      popupAnchor: [0, -size / 2],
    })
  }, [])

  // Create port marker icon
  const createPortIcon = useCallback((port: MapPort) => {
    if (typeof window === 'undefined' || !window.L) return null

    const L = window.L
    const color = congestionColorHex(port.congestionLevel)
    const size = port.annualTEU > 5000000 ? 14 : port.annualTEU > 1000000 ? 10 : 7

    const svg = `<svg width="${size + 6}" height="${size + 6}" viewBox="0 0 ${size + 6} ${size + 6}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${(size + 6) / 2}" cy="${(size + 6) / 2}" r="${size / 2 + 1}" fill="${color}" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" opacity="0.85"/>
    </svg>`

    return L.divIcon({
      html: svg,
      className: 'port-marker',
      iconSize: [size + 6, size + 6],
      iconAnchor: [(size + 6) / 2, (size + 6) / 2],
      popupAnchor: [0, -size / 2 - 2],
    })
  }, [])

  // Update vessel markers
  useEffect(() => {
    if (!vesselLayerRef.current || typeof window === 'undefined' || !window.L) return

    const L = window.L
    vesselLayerRef.current.clearLayers()

    vessels.forEach(v => {
      if (!v.latitude || !v.longitude) return

      const icon = createVesselIcon(v)
      if (!icon) return

      const marker = L.marker([v.latitude, v.longitude], { icon })
      marker.bindPopup(`
        <div style="font-family: system-ui; font-size: 12px; min-width: 180px;">
          <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px; color: #e8e8f0;">${v.name}</div>
          <div style="color: #8888aa; margin-bottom: 6px;">${v.carrier?.name || ''} ${v.carrier?.code ? '(' + v.carrier.code + ')' : ''}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px; font-size: 11px;">
            <span style="color: #8888aa;">Type:</span><span style="color: #d0d0e0;">${v.vesselType}</span>
            <span style="color: #8888aa;">Flag:</span><span style="color: #d0d0e0;">${v.flagCountry || '—'}</span>
            <span style="color: #8888aa;">Speed:</span><span style="color: #d0d0e0;">${v.speed?.toFixed(1) || '0'} kn</span>
            <span style="color: #8888aa;">HDG:</span><span style="color: #d0d0e0;">${v.heading || '—'}°</span>
            <span style="color: #8888aa;">Status:</span><span style="color: ${statusColor(v.status)}">${v.status}</span>
            <span style="color: #8888aa;">Dest:</span><span style="color: #d0d0e0;">${v.destination || '—'}</span>
          </div>
        </div>
      `, { className: 'dark-popup' })

      marker.on('click', () => onVesselClick?.(v))
      vesselLayerRef.current.addLayer(marker)
    })
  }, [vessels, createVesselIcon, onVesselClick])

  // Update port markers
  useEffect(() => {
    if (!portLayerRef.current || typeof window === 'undefined' || !window.L) return

    const L = window.L
    portLayerRef.current.clearLayers()

    ports.forEach(p => {
      if (!p.latitude || !p.longitude) return

      const icon = createPortIcon(p)
      if (!icon) return

      const marker = L.marker([p.latitude, p.longitude], { icon })
      marker.bindPopup(`
        <div style="font-family: system-ui; font-size: 12px; min-width: 160px;">
          <div style="font-weight: 600; font-size: 13px; color: #e8e8f0;">⚓ ${p.name}</div>
          <div style="color: #8888aa; margin-bottom: 4px;">${p.unlocode || ''} · ${p.countryCode}</div>
          <div style="font-size: 11px;">
            <span style="color: #8888aa;">TEU:</span> <span style="color: #d0d0e0;">${p.annualTEU?.toLocaleString() || '—'}</span>
            <br/><span style="color: #8888aa;">Congestion:</span> <span style="color: ${congestionColorHex(p.congestionLevel)}; font-weight: 500;">${p.congestionLevel}</span>
          </div>
        </div>
      `, { className: 'dark-popup' })

      portLayerRef.current.addLayer(marker)
    })
  }, [ports, createPortIcon])

  return (
    <Card className="border-border overflow-hidden bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Ship className="h-4 w-4" />
            Global Vessel Tracker
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
              Container
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
              Tanker
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
              Bulk
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              LNG
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-white/50" />
              Port
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={mapRef} className="h-[500px] w-full" />
      </CardContent>
    </Card>
  )
}
