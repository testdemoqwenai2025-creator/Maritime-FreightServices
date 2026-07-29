'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  Treemap,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Line, Scatter
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendingUp, Globe, Ship, Anchor, Package, DollarSign, Activity } from 'lucide-react'

// ─── Interfaces ──────────────────────────────────────────────────────

interface DashboardData {
  summary: Record<string, number>
  shipmentsByStatus: { status: string; count: number }[]
  vesselTypeBreakdown: { type: string; count: number }[]
  vesselStatusBreakdown: { status: string; count: number }[]
  containerStatusBreakdown: { status: string; count: number }[]
  tradeOverview: { totalTradeValue: number; totalGrossWeight: number; totalCO2: number }
  topTradePartners: { partnerCode: string; totalValue: number }[]
  tradeByRoute: { route: string; totalValue: number; co2Emissions: number }[]
  congestionDistribution: { level: string; count: number }[]
  documentStats: { status: string; count: number }[]
  allianceBreakdown: { alliance: string; count: number; totalTEU: number }[]
  carrierStats: { avgReliability: number; avgCO2PerTEU: number }
  topCarriers: { name: string; code: string; totalTEUCapacity: number; fleetSize: number; reliability: number }[]
  bookingStatusBreakdown: { status: string; count: number }[]
  charterTypeBreakdown: { type: string; count: number }[]
  dangerousCargoCount: number
}

// ─── Color palettes ──────────────────────────────────────────────────

const COLORS = ['#60a5fa', '#f87171', '#fbbf24', '#34d399', '#a78bfa', '#f472b6', '#22d3ee', '#fb923c', '#818cf8', '#2dd4bf', '#fb7185', '#a3e635']
const STATUS_COLORS: Record<string, string> = {
  'Booked': '#fbbf24', 'Customs Clearance': '#fb923c', 'In Transit': '#60a5fa',
  'Arrived': '#34d399', 'Discharging': '#a78bfa', 'Delivered': '#4ade80', 'Cancelled': '#f87171',
  'Active': '#4ade80', 'In Port': '#60a5fa', 'At Anchor': '#fbbf24', 'Underway': '#22d3ee', 'Moored': '#a78bfa',
  'Empty': '#9ca3af', 'Loaded': '#60a5fa', 'Stripped': '#f87171', 'Returned': '#818cf8',
  'Confirmed': '#4ade80', 'Pending': '#fbbf24', 'No-Show': '#9ca3af', 'Rolled': '#a78bfa',
  'Approved': '#4ade80', 'Rejected': '#f87171',
  'Low': '#4ade80', 'Medium': '#fbbf24', 'High': '#fb923c', 'Critical': '#f87171',
}

function getColor(key: string, idx?: number): string {
  return STATUS_COLORS[key] || COLORS[idx !== undefined ? idx % COLORS.length : 0]
}

// ─── Custom Tooltip (dark mode optimized) ──────────────────────────

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

// ─── Formatting ───────────────────────────────────────────────────────

function formatCurrencyShort(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

// ─── Main Analytics Charts Component ─────────────────────────────────

export default function AnalyticsCharts({ data }: { data: DashboardData }) {
  // Prepare chart data
  const tradeRouteData = (data.tradeByRoute || []).map(r => ({
    name: r.route || 'Unknown',
    value: r.totalValue || 0,
    co2: r.co2Emissions || 0,
  })).filter(d => d.name && d.name !== 'null').sort((a, b) => b.value - a.value).slice(0, 10)

  const topPartners = (data.topTradePartners || []).map(p => ({
    name: p.partnerCode,
    value: p.totalValue || 0,
  })).filter(d => d.name && d.name !== 'null').sort((a, b) => b.value - a.value).slice(0, 8)

  const carriersForChart = (data.topCarriers || []).map(c => ({
    name: c.name?.length > 12 ? c.name.substring(0, 12) + '...' : c.name,
    fullName: c.name,
    teu: c.totalTEUCapacity || 0,
    reliability: c.reliability || 0,
    fleet: c.fleetSize || 0,
  }))

  const allianceData = (data.allianceBreakdown || []).filter(a => a.alliance && a.alliance !== 'null').map(a => ({
    name: a.alliance,
    value: a.totalTEU || 0,
    count: a.count,
  }))

  const congestionData = (data.congestionDistribution || []).map(c => ({
    name: c.level,
    value: c.count,
  }))

  const bookingData = (data.bookingStatusBreakdown || []).map(b => ({
    name: b.status,
    value: b.count,
  }))

  const containerData = (data.containerStatusBreakdown || []).map(c => ({
    name: c.status,
    value: c.count,
  }))

  const vesselStatusData = (data.vesselStatusBreakdown || []).map(v => ({
    name: v.status,
    value: v.count,
  }))

  const axisStyle = { fontSize: 11, fill: 'oklch(0.65 0.02 260)' }

  return (
    <div className="space-y-6">
      {/* Row 1: Trade by Route + Top Partners */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Globe className="h-4 w-4" />
              Trade Value by Route
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tradeRouteData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis dataKey="name" tick={axisStyle} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={axisStyle} tickFormatter={formatCurrencyShort} />
                <Tooltip content={<DarkTooltip />} formatter={(val: number) => formatCurrencyShort(val)} />
                <Bar dataKey="value" name="Trade Value (USD)" radius={[4, 4, 0, 0]}>
                  {tradeRouteData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <DollarSign className="h-4 w-4" />
              Top Trade Partners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <Treemap
                data={topPartners}
                dataKey="value"
                nameKey="name"
                content={({ x, y, width, height, name, value }: any) => (
                  width > 50 && height > 30 ? (
                    <g>
                      <rect x={x} y={y} width={width} height={height} rx={4}
                        fill={COLORS[topPartners.findIndex(d => d.name === name) % COLORS.length]}
                        stroke="rgba(255,255,255,0.15)" strokeWidth={2} opacity={0.85} />
                      <text x={x + 8} y={y + 18} fontSize={11} fill="#fff" fontWeight={600}>{name}</text>
                      <text x={x + 8} y={y + 32} fontSize={10} fill="rgba(255,255,255,0.7)">{formatCurrencyShort(value)}</text>
                    </g>
                  ) : null
                )}
              />
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Carrier Capacity + Alliance Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Ship className="h-4 w-4" />
              Top Carriers — Capacity vs Reliability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={carriersForChart} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis dataKey="name" tick={axisStyle} angle={-20} textAnchor="end" height={50} />
                <YAxis yAxisId="left" tick={axisStyle} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                <YAxis yAxisId="right" orientation="right" tick={axisStyle} domain={[0, 100]} unit="%" />
                <Tooltip content={<DarkTooltip />} />
                <Bar yAxisId="left" dataKey="teu" name="TEU Capacity" fill="#60a5fa" opacity={0.8} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="reliability" name="Reliability %" stroke="#4ade80" strokeWidth={2} dot={{ r: 4, fill: '#4ade80' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Activity className="h-4 w-4" />
              Alliance Market Share
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={allianceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: 'oklch(0.35 0.02 260)' }}>
                  {allianceData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} formatter={(val: number) => formatCurrencyShort(val)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'oklch(0.65 0.02 260)' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Status breakdowns */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Package className="h-4 w-4" />
              Shipment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.shipmentsByStatus || []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={1}>
                  {(data.shipmentsByStatus || []).map((entry, idx) => (
                    <Cell key={idx} fill={getColor(entry.status, idx)} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Anchor className="h-4 w-4" />
              Port Congestion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={congestionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={1}>
                  {congestionData.map((entry, idx) => (
                    <Cell key={idx} fill={getColor(entry.name, idx)} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <TrendingUp className="h-4 w-4" />
              Booking Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={bookingData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={1}>
                  {bookingData.map((entry, idx) => (
                    <Cell key={idx} fill={getColor(entry.name, idx)} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
