'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, RadialBarChart, RadialBar,
} from 'recharts'
import { Leaf, TrendingDown, Flame, Droplets, Wind, ArrowDownRight, Gauge, BarChart3, Ship, AlertTriangle } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────

interface DashboardData {
  summary: Record<string, number>
  carrierStats: { avgReliability: number; avgCO2PerTEU: number }
  tradeOverview: { totalTradeValue: number; totalGrossWeight: number; totalCO2: number }
  vesselTypeBreakdown: { type: string; count: number }[]
  tradeByRoute: { route: string; totalValue: number; co2Emissions: number }[]
}

interface VesselRecord {
  id: string
  name: string
  vesselType: string
  flagCountry: string | null
  fuelType: string | null
  engineType: string | null
  emissionRating: string | null
  grossTonnage: number | null
  teuCapacity: number | null
  speed: number | null
  carrier: { name: string; code: string; alliance: string } | null
}

// ─── Color Palettes ───────────────────────────────────────────────────

const ESG_COLORS = {
  green: '#4ade80',
  lime: '#a3e635',
  amber: '#fbbf24',
  red: '#f87171',
  cyan: '#22d3ee',
  teal: '#2dd4bf',
  blue: '#60a5fa',
  purple: '#a78bfa',
  pink: '#f472b6',
  orange: '#fb923c',
}

const CII_RATING_COLORS: Record<string, string> = {
  A: ESG_COLORS.green,
  B: ESG_COLORS.lime,
  C: ESG_COLORS.amber,
  D: ESG_COLORS.red,
}

const VESSEL_TYPE_COLORS: Record<string, string> = {
  Container: ESG_COLORS.cyan,
  Bulk: ESG_COLORS.amber,
  Tanker: ESG_COLORS.blue,
  RoRo: ESG_COLORS.purple,
  Cargo: ESG_COLORS.teal,
  LNG: ESG_COLORS.green,
  General: ESG_COLORS.orange,
  'Reefer': ESG_COLORS.pink,
}

// ─── Custom Tooltip ────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-muted-foreground">
          <span style={{ color: entry.color }}>●</span>{' '}
          {entry.name}: <span className="font-medium text-foreground">
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </p>
      ))}
    </div>
  )
}

// ─── CII Gauge Chart ──────────────────────────────────────────────────

function CIIGauge({ value, label }: { value: number; label: string }) {
  // CII reference values: A < 30, B < 50, C < 70, D >= 70 gCO2/TEU-km
  // We normalize to a 0-100 scale where 0 = best (A) and 100 = worst (D)
  const normalizedScore = Math.min(Math.max((value / 100) * 100, 0), 100)
  const rating =
    value < 30 ? 'A' : value < 50 ? 'B' : value < 70 ? 'C' : 'D'
  const ratingColor = CII_RATING_COLORS[rating]

  const gaugeData = [
    { name: 'Excellent (A)', value: 30, fill: ESG_COLORS.green },
    { name: 'Good (B)', value: 20, fill: ESG_COLORS.lime },
    { name: 'Average (C)', value: 20, fill: ESG_COLORS.amber },
    { name: 'Poor (D)', value: 30, fill: ESG_COLORS.red },
  ]

  // Indicator value
  const indicatorData = [{ name: 'Fleet CII', value: Math.max(normalizedScore, 5), fill: ratingColor }]

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <ResponsiveContainer width={200} height={130}>
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              stroke="none"
              dataKey="value"
            >
              {gaugeData.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} opacity={0.3} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Needle / indicator */}
        <div
          className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col items-center"
        >
          <svg width="180" height="70" viewBox="0 0 180 70" className="absolute bottom-0">
            {/* Needle pointing to the correct position */}
            <line
              x1={90}
              y1={60}
              x2={90 - 75 * Math.cos(((180 - normalizedScore * 1.8) * Math.PI) / 180)}
              y2={60 - 75 * Math.sin(((180 - normalizedScore * 1.8) * Math.PI) / 180)}
              stroke={ratingColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <circle cx={90} cy={60} r={5} fill={ratingColor} />
          </svg>
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-3xl font-bold" style={{ color: ratingColor }}>{rating}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
        <p className="text-sm text-foreground/80 mt-0.5">{value.toFixed(1)} gCO₂/TEU-km</p>
      </div>
    </div>
  )
}

// ─── Rating Badge ─────────────────────────────────────────────────────

function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating) return <Badge variant="outline" className="text-muted-foreground">N/A</Badge>
  const colorMap: Record<string, string> = {
    A: 'bg-green-500/10 text-green-400 border-green-500/30',
    B: 'bg-lime-500/10 text-lime-400 border-lime-500/30',
    C: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    D: 'bg-red-500/10 text-red-400 border-red-500/30',
  }
  return (
    <Badge variant="outline" className={colorMap[rating] || 'bg-muted text-foreground/70 border-border'}>
      {rating}
    </Badge>
  )
}

// ─── Main ESGPanel Component ────────────────────────────────────────

export default function ESGPanel() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [vessels, setVessels] = useState<VesselRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashRes, vesselsRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/vessels?limit=100'),
        ])
        const dashJson = await dashRes.json()
        const vesselsJson = await vesselsRes.json()
        setDashboardData(dashJson)
        setVessels(vesselsJson.data || [])
      } catch (err) {
        console.error('Error loading ESG data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // ─── Computed data ──────────────────────────────────────────────────

  const co2PerTeu = dashboardData?.carrierStats?.avgCO2PerTEU || 0

  // Emission breakdown by vessel type (weighted by count as proxy)
  const emissionByType = useMemo(() => {
    const vesselTypes = dashboardData?.vesselTypeBreakdown || []
    return vesselTypes.map(v => {
      // Use route CO2 data to estimate per-type emissions
      const routeCO2 = (dashboardData?.tradeByRoute || []).reduce((sum, r) => sum + (r.co2Emissions || 0), 0)
      const totalVessels = vesselTypes.reduce((sum, v) => sum + v.count, 0)
      const weight = totalVessels > 0 ? v.count / totalVessels : 0
      return {
        name: v.type,
        value: Math.round(routeCO2 * weight),
        count: v.count,
      }
    })
  }, [dashboardData])

  // Fleet emission ratings count
  const ratingDistribution = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
    vessels.forEach(v => {
      const r = v.emissionRating
      if (r && r in counts) counts[r]++
    })
    return [
      { rating: 'A', label: 'Excellent', count: counts.A, fill: CII_RATING_COLORS.A },
      { rating: 'B', label: 'Good', count: counts.B, fill: CII_RATING_COLORS.B },
      { rating: 'C', label: 'Average', count: counts.C, fill: CII_RATING_COLORS.C },
      { rating: 'D', label: 'Poor', count: counts.D, fill: CII_RATING_COLORS.D },
    ]
  }, [vessels])

  // Top emitters (vessels sorted by CO2/TEU proxy)
  const topEmitters = useMemo(() => {
    return vessels
      .filter(v => v.emissionRating)
      .map(v => ({
        name: v.name,
        vesselType: v.vesselType,
        flagCountry: v.flagCountry,
        fuelType: v.fuelType || 'Unknown',
        emissionRating: v.emissionRating,
        carrierName: v.carrier?.name || '—',
        // CO2 per TEU proxy: based on rating + tonnage
        teu: v.teuCapacity || 1000,
        gt: v.grossTonnage || 50000,
      }))
      .sort((a, b) => {
        const order: Record<string, number> = { D: 4, C: 3, B: 2, A: 1 }
        return (order[b.emissionRating] || 0) - (order[a.emissionRating] || 0)
      })
      .slice(0, 10)
  }, [vessels])

  // CO2 savings calculations
  const totalCO2 = dashboardData?.tradeOverview?.totalCO2 || 0
  const totalVessels = dashboardData?.summary?.totalVessels || 0
  const lngSavingsPct = 0.23  // LNG reduces CO2 ~23%
  const ammoniaSavingsPct = 0.65 // Green ammonia ~65% reduction
  const lngSavings = Math.round(totalCO2 * lngSavingsPct)
  const ammoniaSavings = Math.round(totalCO2 * ammoniaSavingsPct)

  const axisStyle = { fontSize: 11, fill: 'oklch(0.65 0.02 260)' }

  if (loading) {
    return (
      <div className="flex h-[500px] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Row 1: CII Gauge + Emission Breakdown + Rating Distribution ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* CII Gauge */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Gauge className="h-4 w-4" />
              Carbon Intensity Indicator (CII)
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              Fleet average CO₂ per TEU vs IMO targets
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pb-4">
            <CIIGauge value={co2PerTeu || 45} label="Fleet Average CII Rating" />
            <div className="mt-4 grid grid-cols-4 gap-2 w-full text-center">
              {(['A', 'B', 'C', 'D'] as const).map(r => (
                <div key={r} className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-bold" style={{ color: CII_RATING_COLORS[r] }}>{r}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {r === 'A' ? '<30' : r === 'B' ? '30-50' : r === 'C' ? '50-70' : '70+'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Emission Breakdown by Vessel Type */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Flame className="h-4 w-4" />
              Emission Breakdown by Vessel Type
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              CO₂ distribution across fleet segments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={emissionByType}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={2}
                  label={({ name, percent }: any) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={{ stroke: 'oklch(0.35 0.02 260)' }}
                >
                  {emissionByType.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={VESSEL_TYPE_COLORS[entry.name] || ESG_COLORS.blue}
                    />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: 'oklch(0.65 0.02 260)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fleet Emission Ratings */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <BarChart3 className="h-4 w-4" />
              Fleet Emission Ratings
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              Vessel count by IMO CII rating
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ratingDistribution} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <XAxis dataKey="label" tick={axisStyle} />
                <YAxis tick={axisStyle} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="count" name="Vessels" radius={[6, 6, 0, 0]}>
                  {ratingDistribution.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ─── Row 2: CO₂ Savings Potential Cards ─────────────────────────── */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Leaf className="h-4 w-4 text-green-400" />
          CO₂ Savings Potential
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Current Fleet CO2 */}
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                Current Annual CO₂
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {(totalCO2 / 1000).toFixed(1)}<span className="text-sm font-normal text-muted-foreground">K tonnes</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Across {totalVessels} vessels
              </p>
            </CardContent>
          </Card>

          {/* LNG Savings */}
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                Switch to LNG
              </div>
              <p className="mt-2 text-2xl font-bold text-green-400">
                -{(lngSavings / 1000).toFixed(1)}<span className="text-sm font-normal text-muted-foreground">K tonnes</span>
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs">
                <ArrowDownRight className="h-3 w-3 text-green-400" />
                <span className="text-green-400 font-medium">{lngSavingsPct * 100}% reduction</span>
              </div>
            </CardContent>
          </Card>

          {/* Ammonia Savings */}
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Wind className="h-3.5 w-3.5 text-teal-400" />
                Switch to Green Ammonia
              </div>
              <p className="mt-2 text-2xl font-bold text-green-400">
                -{(ammoniaSavings / 1000).toFixed(1)}<span className="text-sm font-normal text-muted-foreground">K tonnes</span>
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs">
                <ArrowDownRight className="h-3 w-3 text-green-400" />
                <span className="text-green-400 font-medium">{ammoniaSavingsPct * 100}% reduction</span>
              </div>
            </CardContent>
          </Card>

          {/* Fleet CII Target */}
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Gauge className="h-3.5 w-3.5 text-amber-400" />
                Fleet CII Rating
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {co2PerTeu < 30 ? 'A' : co2PerTeu < 50 ? 'B' : co2PerTeu < 70 ? 'C' : 'D'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                {co2PerTeu.toFixed(1)} gCO₂/TEU-km avg
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Row 3: Top Emitters Table ─────────────────────────────────── */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Top 10 Emitters by Emission Rating
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            Vessels with the highest CO₂ intensity ratings across the fleet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground">#</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Vessel Name</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Type</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Flag</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Fuel</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Carrier</TableHead>
                  <TableHead className="text-xs text-muted-foreground">CII Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topEmitters.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      No emission data available
                    </TableCell>
                  </TableRow>
                ) : (
                  topEmitters.map((v, idx) => (
                    <TableRow key={v.name} className="border-border">
                      <TableCell className="text-xs text-muted-foreground font-medium">{idx + 1}</TableCell>
                      <TableCell className="text-xs text-foreground font-medium">{v.name}</TableCell>
                      <TableCell className="text-xs text-foreground/80">{v.vesselType}</TableCell>
                      <TableCell className="text-xs text-foreground/70">{v.flagCountry || '—'}</TableCell>
                      <TableCell className="text-xs text-foreground/70">{v.fuelType}</TableCell>
                      <TableCell className="text-xs text-foreground/80">{v.carrierName}</TableCell>
                      <TableCell>
                        <RatingBadge rating={v.emissionRating} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
