'use client'

import { useEffect, useState } from 'react'
import {
  Ship, Anchor, Package, Container, TrendingUp, Globe,
  Navigation, BarChart3, MapPin, Clock, DollarSign,
  ChevronRight, Activity, Waves
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'

interface DashboardData {
  summary: {
    totalVessels: number
    activeVessels: number
    totalPorts: number
    totalShipments: number
    totalContainers: number
  }
  shipmentsByStatus: { status: string; count: number }[]
  vesselTypeBreakdown: { type: string; count: number }[]
  recentArrivals: Array<{
    id: string
    arrivalAt: string
    purpose: string
    vessel: { name: string; flagCountry: string; vesselType: string }
    port: { name: string; countryCode: string }
  }>
  tradeOverview: { totalTradeValue: number; totalGrossWeight: number }
  topTradePartners: { partnerCode: string; totalValue: number }[]
}

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

function formatWeight(kg: number): string {
  if (kg >= 1e9) return `${(kg / 1e9).toFixed(1)}B kg`
  if (kg >= 1e6) return `${(kg / 1e6).toFixed(1)}M kg`
  if (kg >= 1e3) return `${(kg / 1e3).toFixed(1)}K kg`
  return `${kg.toFixed(0)} kg`
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const statusColor: Record<string, string> = {
  'Booked': 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  'In Transit': 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  'Arrived': 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  'Delivered': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  'Cancelled': 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
}

const vesselTypeIcon: Record<string, string> = {
  'Container Ship': '🚢',
  'Bulk Carrier': '⛏️',
  'Tanker': '🛢️',
  'Ro-Ro Ship': '🚗',
  'LNG Carrier': '🔥',
  'General Cargo': '📦',
}

export default function MaritimeDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((json) => {
        setData(json)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Waves className="h-12 w-12 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground text-sm">Loading maritime data...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Failed to load dashboard data.</p>
      </div>
    )
  }

  const maxShipments = Math.max(...data.shipmentsByStatus.map((s) => s.count), 1)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                <Anchor className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Maritime & Freight</h1>
                <p className="text-xs text-muted-foreground">Global Analytics Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="hidden sm:flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-green-500" />
                Live Data
              </Badge>
              <Badge variant="outline" className="hidden sm:flex items-center gap-1.5">
                <Globe className="h-3 w-3" />
                {data.summary.totalPorts} Ports
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vessels</CardTitle>
              <Ship className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalVessels}</div>
              <p className="text-xs text-muted-foreground">
                {data.summary.activeVessels} active at sea
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Global Ports</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalPorts}</div>
              <p className="text-xs text-muted-foreground">Across 10 regions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalShipments}</div>
              <p className="text-xs text-muted-foreground">In pipeline</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Containers</CardTitle>
              <Container className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalContainers}</div>
              <p className="text-xs text-muted-foreground">TEU tracked</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trade Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.tradeOverview.totalTradeValue)}</div>
              <p className="text-xs text-muted-foreground">Total seaborne trade</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="shipments" className="text-xs sm:text-sm">
              <Navigation className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Shipments</span>
            </TabsTrigger>
            <TabsTrigger value="vessels" className="text-xs sm:text-sm">
              <Ship className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Vessels</span>
            </TabsTrigger>
            <TabsTrigger value="trade" className="text-xs sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Trade</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Shipment Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Shipment Pipeline</CardTitle>
                  <CardDescription>Current status distribution of all shipments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.shipmentsByStatus.map((s) => (
                    <div key={s.status} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={statusColor[s.status] || ''}>
                            {s.status}
                          </Badge>
                        </div>
                        <span className="font-medium">{s.count}</span>
                      </div>
                      <Progress value={(s.count / maxShipments) * 100} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Fleet Composition */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Fleet Composition</CardTitle>
                  <CardDescription>Vessel types in the tracking system</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.vesselTypeBreakdown.map((v) => (
                    <div key={v.type} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{vesselTypeIcon[v.type] || '🚢'}</span>
                        <div>
                          <p className="text-sm font-medium">{v.type}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{v.count}</Badge>
                    </div>
                  ))}
                  <div className="pt-2 text-xs text-muted-foreground">
                    Total fleet capacity tracked across all vessel types
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Arrivals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Port Arrivals</CardTitle>
                <CardDescription>Latest vessel arrivals at global ports</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vessel</TableHead>
                        <TableHead className="hidden sm:table-cell">Type</TableHead>
                        <TableHead>Port</TableHead>
                        <TableHead className="hidden md:table-cell">Purpose</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentArrivals.map((arrival) => (
                        <TableRow key={arrival.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{arrival.vessel.name}</div>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {arrival.vessel.flagCountry}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {arrival.vessel.vesselType}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span>{arrival.port.name}</span>
                              <span className="text-muted-foreground text-xs">
                                ({arrival.port.countryCode})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="secondary" className="text-xs">
                              {arrival.purpose}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-xs">
                            <div className="flex items-center justify-end gap-1">
                              <Clock className="h-3 w-3" />
                              {timeAgo(arrival.arrivalAt)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shipments Tab */}
          <TabsContent value="shipments">
            <ShipmentsPanel />
          </TabsContent>

          {/* Vessels Tab */}
          <TabsContent value="vessels">
            <VesselsPanel />
          </TabsContent>

          {/* Trade Tab */}
          <TabsContent value="trade">
            <TradePanel />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>Maritime & Freight Analytics Platform — Open Source</p>
            <p>Data sources: AISHub, UN Comtrade, NGA World Port Index</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ShipmentsPanel() {
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/shipments?limit=50')
      .then((res) => res.json())
      .then((json) => {
        setShipments(json.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Shipment Tracking</CardTitle>
        <CardDescription>All cargo shipments with BOL, route, and status details</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BOL / Booking</TableHead>
                <TableHead className="hidden md:table-cell">Route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Vessel</TableHead>
                <TableHead className="hidden lg:table-cell">Cargo</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Loading shipments...
                  </TableCell>
                </TableRow>
              ) : shipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No shipments found.
                  </TableCell>
                </TableRow>
              ) : (
                shipments.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="font-mono text-xs font-medium">{s.billOfLading || '—'}</p>
                        <p className="text-xs text-muted-foreground">{s.bookingRef || '—'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span>{s.originPort?.name}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span>{s.destPort?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor[s.status] || ''}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs">
                      <div className="flex items-center gap-1.5">
                        <span>{s.vessel?.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {s.vessel?.flagCountry}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {s.cargoType}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell text-xs">
                      {s.cargoWeight ? `${(s.cargoWeight / 1000).toFixed(1)}T` : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function VesselsPanel() {
  const [vessels, setVessels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/vessels?limit=50')
      .then((res) => res.json())
      .then((json) => {
        setVessels(json.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vessel Fleet</CardTitle>
        <CardDescription>All tracked vessels with current position, speed, and status</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vessel Name</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead className="hidden sm:table-cell">Speed</TableHead>
                <TableHead className="hidden lg:table-cell">Position</TableHead>
                <TableHead className="hidden sm:table-cell">Destination</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Loading vessels...
                  </TableCell>
                </TableRow>
              ) : vessels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No vessels found.
                  </TableCell>
                </TableRow>
              ) : (
                vessels.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{vesselTypeIcon[v.vesselType] || '🚢'}</span>
                          <span className="font-medium text-sm">{v.name}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">MMSI: {v.mmsi}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {v.vesselType}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{v.flagCountry}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs">
                      <span className={v.speed > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                        {v.speed > 0 ? `${v.speed.toFixed(1)} kn` : 'Stationary'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono">
                      {v.latitude && v.longitude ? `${v.latitude.toFixed(2)}, ${v.longitude.toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs">
                      {v.destination || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={v.status === 'Active' ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : v.status === 'In Port' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' : ''}
                      >
                        {v.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function TradePanel() {
  const [tradeData, setTradeData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/trade-data?limit=50')
      .then((res) => res.json())
      .then((json) => {
        setTradeData(json.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seaborne Trade Overview</CardTitle>
          <CardDescription>Global trade flow data sourced from UN Comtrade API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total Trade Value</p>
              <p className="text-lg font-semibold">
                {formatCurrency(tradeData.reduce((sum, t) => sum + (t.tradeValueUsd || 0), 0))}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total Weight</p>
              <p className="text-lg font-semibold">
                {formatWeight(tradeData.reduce((sum, t) => sum + (t.grossWeightKg || 0), 0))}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Trade Records</p>
              <p className="text-lg font-semibold">{tradeData.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Data Source</p>
              <p className="text-lg font-semibold">UN Comtrade</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trade Data Records</CardTitle>
          <CardDescription>HS Code-level trade flow details with commodity descriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead className="hidden sm:table-cell">Flow</TableHead>
                  <TableHead className="hidden md:table-cell">Commodity</TableHead>
                  <TableHead className="hidden lg:table-cell">HS Code</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Loading trade data...
                    </TableCell>
                  </TableRow>
                ) : tradeData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No trade data found.
                    </TableCell>
                  </TableRow>
                ) : (
                  tradeData.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Badge variant="secondary">{t.reporterCode}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.partnerCode}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant="outline"
                          className={
                            t.tradeFlow === 'Export'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          }
                        >
                          {t.tradeFlow}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs max-w-[200px] truncate">
                        {t.commodityDesc}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell font-mono text-xs">
                        {t.commodityCode}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {formatCurrency(t.tradeValueUsd)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
