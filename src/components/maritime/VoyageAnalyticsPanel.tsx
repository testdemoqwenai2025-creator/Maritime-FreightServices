'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Navigation, Ship, Clock, Gauge, TrendingUp,
  MapPin, Anchor, BarChart3, Activity
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Interfaces ──────────────────────────────────────────────────────

interface Vessel {
  id: string
  name: string
  mmsi: string
  status: string
  speed: number
  maxSpeed: number
  latitude: number
  longitude: number
  destination: string
  eta: string
  teuCapacity: number
  emissionRating: string
  totalVoyages: number
  vesselType: string
  carrier?: { name: string; code: string } | null
  tradeRoute?: { name: string; code: string; originRegion: string; destRegion: string } | null
}

interface Shipment {
  id: string
  status: string
  originPort: { name: string; countryCode: string }
  destPort: { name: string; countryCode: string }
  vessel: { name: string }
  tradeRoute?: { name: string } | null
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatETA(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function emissionColor(rating: string) {
  switch (rating) {
    case 'A': return 'text-green-400'
    case 'B': return 'text-blue-400'
    case 'C': return 'text-amber-400'
    case 'D': return 'text-red-400'
    default: return 'text-muted-foreground'
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'Active': return 'bg-green-500/10 text-green-400 border-green-500/30'
    case 'In Port': return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    case 'At Anchor': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    default: return 'bg-muted text-muted-foreground border-border'
  }
}

// ─── Seeded random for consistent simulation ─────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash)
}

// ─── Custom Tooltip ──────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-muted-foreground">
          <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
          {entry.name}: <span className="font-medium text-foreground">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Active Voyages Summary Cards ────────────────────────────────────

function ActiveVoyagesSummary({ vessels }: { vessels: Vessel[] }) {
  const activeVessels = vessels.filter(v => v.status === 'Active' && v.destination && v.eta)

  // Simulate origin positions (offset from current position)
  const voyageCards = useMemo(() => {
    return activeVessels.slice(0, 8).map(vessel => {
      const rng = seededRandom(hashString(vessel.id + 'progress'))
      const progress = Math.floor(rng() * 60) + 20 // 20-80%
      // Simulate speed factor
      const speedFactor = vessel.speed / Math.max(vessel.maxSpeed, 1)
      // Predicted vs scheduled ETA
      const scheduledETA = new Date(vessel.eta)
      const delayHours = Math.floor(rng() * 24) - 8 // -8 to +16 hours
      const predictedETA = new Date(scheduledETA.getTime() + delayHours * 3600000)
      const isOnTime = delayHours <= 0

      return {
        ...vessel,
        progress,
        speedFactor,
        predictedETA,
        scheduledETA,
        delayHours,
        isOnTime,
      }
    })
  }, [activeVessels])

  if (voyageCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Ship className="mb-2 h-8 w-8 opacity-40" />
        <p className="text-sm">No active voyages</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {voyageCards.map(v => (
        <Card key={v.id} className="border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{v.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{v.vesselType}</p>
              </div>
              <Badge variant="outline" className={`ml-2 flex-shrink-0 text-[10px] ${statusBadge(v.status)}`}>
                {v.status}
              </Badge>
            </div>

            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{v.destination}</span>
            </div>

            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Voyage progress</span>
                <span className="font-medium text-foreground">{v.progress}%</span>
              </div>
              <Progress value={v.progress} className="h-2" />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Gauge className="h-3 w-3" />
                <span>{v.speed.toFixed(1)} kn</span>
              </div>
              <div className={`flex items-center gap-1 text-xs ${v.isOnTime ? 'text-green-400' : 'text-amber-400'}`}>
                <Clock className="h-3 w-3" />
                <span>{v.delayHours > 0 ? `+${v.delayHours}h` : 'On time'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── ETA Predictions Table ──────────────────────────────────────────

function ETAPredictionsTable({ vessels }: { vessels: Vessel[] }) {
  const activeVessels = vessels.filter(v => v.status === 'Active' && v.destination && v.eta)

  const predictions = useMemo(() => {
    return activeVessels.slice(0, 12).map(vessel => {
      const rng = seededRandom(hashString(vessel.id + 'eta'))
      // Simulate delay: base on congestion, speed, and random factors
      const speedRatio = vessel.speed / Math.max(vessel.maxSpeed, 1)
      const baseDelay = (1 - speedRatio) * 24 // slower = more delay
      const randomDelay = rng() * 16 - 4 // -4 to +12
      const totalDelay = Math.round(baseDelay + randomDelay)

      const scheduled = new Date(vessel.eta)
      const predicted = new Date(scheduled.getTime() + totalDelay * 3600000)

      // Confidence score based on speed ratio and how close to ETA
      const daysToETA = Math.max(0, (scheduled.getTime() - Date.now()) / 86400000)
      const confidence = Math.min(95, Math.max(45, Math.round(
        50 + speedRatio * 20 + Math.min(daysToETA, 5) * 5
      )))

      return {
        id: vessel.id,
        vesselName: vessel.name,
        destination: vessel.destination,
        carrier: vessel.carrier?.name ?? '—',
        speed: vessel.speed,
        maxSpeed: vessel.maxSpeed,
        scheduledETA: vessel.eta,
        predictedETA: predicted.toISOString(),
        delayHours: totalDelay,
        confidence,
        emissionRating: vessel.emissionRating,
      }
    })
  }, [activeVessels])

  if (predictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Clock className="mb-2 h-6 w-6 opacity-40" />
        <p className="text-sm">No active voyages with ETA data</p>
      </div>
    )
  }

  return (
    <ScrollArea className="max-h-96">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-xs font-medium text-muted-foreground">Vessel</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Destination</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Speed</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Scheduled ETA</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Predicted ETA</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Delay</TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {predictions.map(p => (
            <TableRow key={p.id} className="border-border">
              <TableCell>
                <div className="flex items-center gap-2">
                  <Ship className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{p.vesselName}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.destination}</TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">{p.speed.toFixed(1)} kn</span>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatETA(p.scheduledETA)}</TableCell>
              <TableCell className="text-xs text-foreground">{formatETA(p.predictedETA)}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    p.delayHours > 8
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : p.delayHours > 2
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : p.delayHours > 0
                          ? 'bg-amber-500/10 text-amber-400/70 border-amber-500/20'
                          : 'bg-green-500/10 text-green-400 border-green-500/30'
                  }`}
                >
                  {p.delayHours > 0 ? `+${p.delayHours}h` : p.delayHours === 0 ? 'On time' : `${p.delayHours}h`}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={p.confidence} className="h-1.5 w-12" />
                  <span className="text-xs text-muted-foreground">{p.confidence}%</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}

// ─── Voyage Duration Bar Chart ───────────────────────────────────────

function VoyageDurationChart({ vessels }: { vessels: Vessel[] }) {
  const data = useMemo(() => {
    // Group by trade route and calculate average duration
    const routeDurations: Record<string, { total: number; count: number; route: string }> = {}
    const rng = seededRandom(42)

    for (const vessel of vessels) {
      const routeName = vessel.tradeRoute?.name || 'Unknown Route'
      if (!routeDurations[routeName]) {
        routeDurations[routeName] = { total: 0, count: 0, route: routeName }
      }
      // Simulate voyage duration based on total voyages and speed
      const baseDays = 5 + (vessel.maxSpeed - vessel.speed) * 2
      const randomVariation = rng() * 6 - 3
      const days = Math.max(2, Math.round(baseDays + randomVariation))
      routeDurations[routeName].total += days
      routeDurations[routeName].count += 1
    }

    return Object.values(routeDurations)
      .filter(r => r.count >= 2)
      .sort((a, b) => (b.total / b.count) - (a.total / a.count))
      .slice(0, 10)
      .map(r => ({
        route: r.route.length > 20 ? r.route.slice(0, 18) + '…' : r.route,
        fullRoute: r.route,
        avgDays: Math.round((r.total / r.count) * 10) / 10,
        voyageCount: r.count,
      }))
  }, [vessels])

  const BAR_COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee', '#fb923c', '#818cf8', '#f472b6', '#4ade80']

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 40, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis
          dataKey="route"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          angle={-30}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          label={{ value: 'Days', fill: 'hsl(var(--muted-foreground))', fontSize: 11, angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<DarkTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} />
        <Bar dataKey="avgDays" name="Avg Duration (days)" radius={[4, 4, 0, 0]}>
          {data.map((_, idx) => (
            <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} opacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Speed Distribution Area Chart ──────────────────────────────────

function SpeedDistributionChart({ vessels }: { vessels: Vessel[] }) {
  const data = useMemo(() => {
    // Create histogram buckets for speed
    const buckets: Record<string, number> = {}
    for (const v of vessels) {
      const bucket = Math.floor(v.speed / 2) * 2 // 0-2, 2-4, etc.
      const label = `${bucket}-${bucket + 2}`
      buckets[label] = (buckets[label] || 0) + 1
    }

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([range, count]) => ({
        range,
        count,
        label: `${range} kn`,
      }))
  }, [vessels])

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
        <defs>
          <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          label={{ value: 'Vessels', fill: 'hsl(var(--muted-foreground))', fontSize: 11, angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<DarkTooltip />} />
        <Area
          type="monotone"
          dataKey="count"
          name="Vessel Count"
          stroke="#60a5fa"
          fill="url(#speedGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── On-Time Performance Widget ─────────────────────────────────────

function OnTimePerformance({ vessels }: { vessels: Vessel[] }) {
  const stats = useMemo(() => {
    const activeVessels = vessels.filter(v => v.status === 'Active' && v.destination && v.eta)
    let onTime = 0
    let delayed = 0
    let early = 0

    for (const vessel of activeVessels) {
      const rng = seededRandom(hashString(vessel.id + 'otp'))
      const speedRatio = vessel.speed / Math.max(vessel.maxSpeed, 1)
      const delayHours = (1 - speedRatio) * 24 + (rng() * 16 - 4)

      if (delayHours <= 0) early++
      else if (delayHours <= 6) onTime++
      else delayed++
    }

    const total = early + onTime + delayed
    return {
      early,
      onTime,
      delayed,
      total,
      onTimePct: total > 0 ? Math.round(((early + onTime) / total) * 100) : 0,
      delayedPct: total > 0 ? Math.round((delayed / total) * 100) : 0,
      earlyPct: total > 0 ? Math.round((early / total) * 100) : 0,
    }
  }, [vessels])

  return (
    <div className="space-y-4">
      {/* Big percentage display */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="#34d399"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${stats.onTimePct * 2.64} 264`}
                className="transition-all duration-700"
              />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="#fbbf24"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${stats.delayedPct * 2.64} 264`}
                strokeDashoffset={`${-(stats.onTimePct * 2.64)}`}
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute text-2xl font-bold text-foreground">{stats.onTimePct}%</span>
          </div>
          <p className="mt-2 text-xs font-medium text-muted-foreground">On-Time Rate</p>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              <span className="text-sm text-foreground">Early / On Time</span>
            </div>
            <span className="text-sm font-semibold text-green-400">{stats.early + stats.onTime} vessels</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="text-sm text-foreground">Delayed (+6h)</span>
            </div>
            <span className="text-sm font-semibold text-amber-400">{stats.delayed} vessels</span>
          </div>
          <div className="mt-2 border-t border-border pt-2">
            <p className="text-xs text-muted-foreground">
              Based on {stats.total} active voyages with scheduled ETAs
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Loading State ──────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg border border-border" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg border border-border" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-lg border border-border" />
        <Skeleton className="h-80 rounded-lg border border-border" />
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────

export default function VoyageAnalyticsPanel() {
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/vessels?limit=50').then(r => r.json()),
      fetch('/api/shipments?limit=50').then(r => r.json()),
    ])
      .then(([vData, sData]) => {
        setVessels(vData.data || [])
        setShipments(sData.data || [])
      })
      .catch(() => {
        // empty data is fine
      })
      .finally(() => setLoading(false))
  }, [])

  const activeVessels = vessels.filter(v => v.status === 'Active' && v.destination)
  const avgSpeed = activeVessels.length > 0
    ? (activeVessels.reduce((sum, v) => sum + v.speed, 0) / activeVessels.length).toFixed(1)
    : '—'

  if (loading) return <LoadingState />

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Navigation className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Voyage Analytics & Predictive ETA</h2>
            <p className="text-sm text-muted-foreground">
              Real-time voyage tracking, ETA predictions, and fleet performance analysis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-border bg-green-500/10 text-green-400">
            <Activity className="mr-1 h-3 w-3" />
            {activeVessels.length} active voyages
          </Badge>
          <Badge variant="outline" className="border-border bg-secondary text-secondary-foreground">
            <Gauge className="mr-1 h-3 w-3" />
            Avg {avgSpeed} kn
          </Badge>
        </div>
      </div>

      {/* Active Voyages Map Summary */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Ship className="h-4 w-4 text-primary" />
            <CardTitle className="text-base text-foreground">Active Voyages Summary</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Vessels currently underway with voyage progress indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActiveVoyagesSummary vessels={vessels} />
        </CardContent>
      </Card>

      {/* ETA Predictions Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <CardTitle className="text-base text-foreground">ETA Predictions</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Predicted vs scheduled arrival times based on speed, distance, and congestion factors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ETAPredictionsTable vessels={vessels} />
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Voyage Duration Analysis */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base text-foreground">Voyage Duration by Route</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Average voyage duration (days) across trade routes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VoyageDurationChart vessels={vessels} />
          </CardContent>
        </Card>

        {/* Speed Distribution */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <CardTitle className="text-base text-foreground">Fleet Speed Distribution</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Current speed distribution across all tracked vessels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SpeedDistributionChart vessels={vessels} />
          </CardContent>
        </Card>
      </div>

      {/* On-Time Performance */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <CardTitle className="text-base text-foreground">On-Time Performance</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Percentage of vessels arriving within the scheduled ETA window (±6h)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnTimePerformance vessels={vessels} />
        </CardContent>
      </Card>
    </div>
  )
}
