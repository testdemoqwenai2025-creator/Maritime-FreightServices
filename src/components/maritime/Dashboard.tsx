'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Ship, Anchor, Package, Container, TrendingUp, Globe,
  Navigation, BarChart3, MapPin, Clock, DollarSign,
  ChevronRight, ChevronDown, Activity, Waves, Thermometer,
  Shield, AlertTriangle, FileText, Truck, Gauge, Fuel, Wrench,
  Users, Building, Warehouse, Snowflake, Radio, Flame
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

// ─── Shared Utilities ────────────────────────────────────────────────

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

function formatNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toString()
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

// ─── Status Badge Helpers ────────────────────────────────────────────

function shipmentStatusColor(status: string): string {
  switch (status) {
    case 'Booked': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'In Transit': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'Arrived': return 'bg-green-100 text-green-800 border-green-200'
    case 'Delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-neutral-100 text-neutral-700 border-neutral-200'
  }
}

function vesselStatusColor(status: string): string {
  switch (status) {
    case 'Active': return 'bg-green-100 text-green-800 border-green-200'
    case 'In Port': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'At Anchor': return 'bg-amber-100 text-amber-800 border-amber-200'
    default: return 'bg-neutral-100 text-neutral-700 border-neutral-200'
  }
}

function customsStatusColor(status: string): string {
  switch (status) {
    case 'Customs Cleared': return 'bg-green-100 text-green-800 border-green-200'
    case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'Held': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-neutral-100 text-neutral-700 border-neutral-200'
  }
}

function congestionColor(level: string): string {
  switch (level) {
    case 'Low': return 'bg-green-100 text-green-800 border-green-200'
    case 'Medium': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'High': return 'bg-red-100 text-red-800 border-red-200'
    case 'Critical': return 'bg-red-100 text-red-900 border-red-300'
    default: return 'bg-neutral-100 text-neutral-700 border-neutral-200'
  }
}

function documentStatusColor(status: string): string {
  switch (status) {
    case 'Approved': return 'bg-green-100 text-green-800 border-green-200'
    case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'Rejected': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-neutral-100 text-neutral-700 border-neutral-200'
  }
}

function emissionRatingColor(rating: string): string {
  switch (rating) {
    case 'A': return 'bg-green-100 text-green-800 border-green-200'
    case 'B': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'C': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'D': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-neutral-100 text-neutral-700 border-neutral-200'
  }
}

// ─── Interfaces ──────────────────────────────────────────────────────

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
  vesselStatusBreakdown: { status: string; count: number }[]
  containerStatusBreakdown: { status: string; count: number }[]
  recentArrivals: Array<{
    id: string
    arrivalAt: string
    purpose: string
    vessel: { name: string; flagCountry: string; vesselType: string }
    port: { name: string; countryCode: string }
  }>
  tradeOverview: {
    totalTradeValue: number
    totalGrossWeight: number
    totalCO2: number
  }
  topTradePartners: { partnerCode: string; partnerName: string; totalValue: number; totalWeight: number }[]
  tradeByRoute: Array<{
    route: string
    tradeValue: number
    voyages: number
    avgFreightRate: number
  }>
  congestionDistribution: { level: string; count: number }[]
  documentStats: {
    total: number
    approved: number
    pending: number
    rejected: number
    byType: { docType: string; count: number }[]
  }
}

interface ShipmentContainer {
  id: string
  containerNo: string
  isoType: string
  size: string
  weight: number
}

interface Shipment {
  id: string
  billOfLading: string
  bookingRef: string
  status: string
  cargoType: string
  cargoWeight: number
  cargoValue: number
  cargoDesc: string
  hsCode: string
  incoterms: string
  paymentTerms: string
  freightTerms: string
  containerCount: number
  totalTEU: number
  dangerousGoods: boolean
  dgClass: string
  temperatureCtrl: boolean
  tempMin: number
  tempMax: number
  customsStatus: string
  customsRef: string
  priority: string
  serviceLevel: string
  vessel: { name: string; mmsi: string; flagCountry: string }
  originPort: { name: string; countryCode: string; unlocode: string }
  destPort: { name: string; countryCode: string; unlocode: string }
  containers: ShipmentContainer[]
}

interface Vessel {
  id: string
  mmsi: string
  imo: string
  name: string
  callSign: string
  vesselType: string
  vesselClass: string
  flagCountry: string
  grossTonnage: number
  deadweight: number
  length: number
  breadth: number
  draft: number
  speed: number
  heading: number
  latitude: number
  longitude: number
  destination: string
  eta: string
  teuCapacity: number
  engineType: string
  enginePower: number
  maxSpeed: number
  fuelType: string
  emissionRating: string
  classificationSociety: string
  crewCapacity: number
  shipManager: string
  registeredOwner: string
  insurancePandI: string
  imoCertExpiry: string
  totalVoyages: number
  totalDistanceNm: number
  yearBuilt: number
  status: string
  lastPosition: string
}

interface TradeRecord {
  id: string
  reporterCode: string
  reporterName: string
  partnerCode: string
  partnerName: string
  year: number
  tradeFlow: string
  commodityCode: string
  commodityChapter: string
  commodityDesc: string
  grossWeightKg: number
  netWeightKg: number
  tradeValueUsd: number
  quantity: number
  qtyUnit: string
  unitValueUsd: number
  vesselType: string
  estimatedVoyages: number
  co2EmissionsT: number
  freightRateUsd: number
  tradeRoute: string
  transshipment: boolean
}

interface Port {
  id: string
  name: string
  countryCode: string
  region: string
  unlocode: string
  harborSize: string
  depth: number
  annualTEU: number
  annualDWT: number
  maxVesselDWT: number
  berthCount: number
  craneCount: number
  bunkering: boolean
  coldStorage: boolean
  repairFacility: boolean
  hazardousHandling: boolean
  congestionLevel: string
  avgWaitHours: number
  avgStayHours: number
  timezone: string
  population: number
  owner: string
  operator: string
  website: string
}

interface ContainerRecord {
  id: string
  containerNo: string
  isoType: string
  size: string
  status: string
  weight: number
  sealNo: string
  temperature: number
  vessel: { name: string }
  shipment: { billOfLading: string; status: string }
}

interface Document {
  id: string
  docType: string
  docName: string
  docRef: string
  status: string
  issuedBy: string
  issuedAt: string
  fileFormat: string
  fileSize: number
}

interface ShipmentEvent {
  id: string
  eventType: string
  eventDesc: string
  location: string
  countryCode: string
  vesselName: string
  createdAt: string
}

// ─── Loading / Empty States ──────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      <span className="ml-3 text-sm text-neutral-500">Loading...</span>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
      <Package className="mb-2 h-8 w-8" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ─── Overview Panel ──────────────────────────────────────────────────

function OverviewPanel({ data }: { data: DashboardData | null }) {
  if (!data) return <LoadingSpinner />
  const { summary, shipmentsByStatus, vesselTypeBreakdown, vesselStatusBreakdown, containerStatusBreakdown, recentArrivals, tradeOverview, topTradePartners, tradeByRoute, congestionDistribution, documentStats } = data

  const totalShipmentCount = shipmentsByStatus.reduce((a, b) => a + b.count, 0)
  const totalVesselCount = vesselTypeBreakdown.reduce((a, b) => a + b.count, 0)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-neutral-500">
              <Ship className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Vessels</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{formatNumber(summary.totalVessels)}</p>
            <p className="mt-1 text-xs text-green-600">{formatNumber(summary.activeVessels)} active</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-neutral-500">
              <Anchor className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Ports</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{formatNumber(summary.totalPorts)}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-neutral-500">
              <Package className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Shipments</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{formatNumber(summary.totalShipments)}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-neutral-500">
              <Container className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Containers</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{formatNumber(summary.totalContainers)}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-neutral-500">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Trade Value</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{formatCurrency(tradeOverview.totalTradeValue)}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-neutral-500">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Documents</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{formatNumber(documentStats.total)}</p>
            <p className="mt-1 text-xs text-green-600">{documentStats.approved} approved</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Shipment Pipeline */}
        <Card className="border-neutral-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900">
              <Truck className="h-4 w-4" />
              Shipment Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shipmentsByStatus.map((s) => (
              <div key={s.status} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700">{s.status}</span>
                  <span className="font-medium text-neutral-900">{s.count} ({totalShipmentCount > 0 ? ((s.count / totalShipmentCount) * 100).toFixed(1) : 0}%)</span>
                </div>
                <Progress value={totalShipmentCount > 0 ? (s.count / totalShipmentCount) * 100 : 0} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Fleet Composition */}
        <Card className="border-neutral-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900">
              <Globe className="h-4 w-4" />
              Fleet Composition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vesselTypeBreakdown.map((v) => (
              <div key={v.type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700">{v.type}</span>
                  <span className="font-medium text-neutral-900">{v.count}</span>
                </div>
                <Progress value={totalVesselCount > 0 ? (v.count / totalVesselCount) * 100 : 0} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Arrivals */}
        <Card className="border-neutral-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900">
              <Navigation className="h-4 w-4" />
              Recent Arrivals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {recentArrivals.length === 0 && <EmptyState message="No recent arrivals" />}
                {recentArrivals.map((a) => (
                  <div key={a.id} className="flex items-start justify-between rounded-lg border border-neutral-100 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-900">{a.vessel.name}</p>
                      <p className="text-xs text-neutral-500">{a.port.name} ({a.port.countryCode}) · {a.vessel.vesselType}</p>
                      <p className="mt-1 text-xs text-neutral-400">{a.purpose}</p>
                    </div>
                    <div className="ml-3 text-right">
                      <p className="text-xs text-neutral-400">{timeAgo(a.arrivalAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Congestion Distribution + Document Stats */}
        <div className="space-y-6">
          <Card className="border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900">
                <Activity className="h-4 w-4" />
                Port Congestion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {congestionDistribution.map((c) => (
                <div key={c.level} className="flex items-center justify-between">
                  <Badge variant="outline" className={congestionColor(c.level)}>{c.level}</Badge>
                  <span className="text-sm font-medium text-neutral-900">{c.count} ports</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-neutral-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900">
                <FileText className="h-4 w-4" />
                Document Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-lg font-bold text-green-700">{documentStats.approved}</p>
                  <p className="text-xs text-green-600">Approved</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <p className="text-lg font-bold text-amber-700">{documentStats.pending}</p>
                  <p className="text-xs text-amber-600">Pending</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-lg font-bold text-red-700">{documentStats.rejected}</p>
                  <p className="text-xs text-red-600">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Shipments Panel ─────────────────────────────────────────────────

function ShipmentsPanel() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedDocs, setExpandedDocs] = useState<Document[]>([])
  const [expandedEvents, setExpandedEvents] = useState<ShipmentEvent[]>([])
  const [subLoading, setSubLoading] = useState(false)

  useEffect(() => {
    fetch('/api/shipments?limit=50')
      .then((r) => r.json())
      .then((json) => { setShipments(json.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleRowClick = useCallback(async (shipment: Shipment) => {
    if (expandedId === shipment.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(shipment.id)
    setSubLoading(true)
    try {
      const [docsRes, eventsRes] = await Promise.all([
        fetch(`/api/documents?shipmentId=${shipment.id}`).then((r) => r.json()),
        fetch(`/api/events?shipmentId=${shipment.id}`).then((r) => r.json()),
      ])
      setExpandedDocs(docsRes.data || [])
      setExpandedEvents(eventsRes.data || [])
    } catch {
      setExpandedDocs([])
      setExpandedEvents([])
    }
    setSubLoading(false)
  }, [expandedId])

  if (loading) return <LoadingSpinner />
  if (shipments.length === 0) return <EmptyState message="No shipments found" />

  return (
    <ScrollArea className="max-h-[600px]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-neutral-50">
            <TableHead className="w-8" />
            <TableHead>BOL</TableHead>
            <TableHead className="hidden md:table-cell">Route</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Vessel</TableHead>
            <TableHead className="hidden xl:table-cell">Cargo</TableHead>
            <TableHead className="hidden lg:table-cell">Weight</TableHead>
            <TableHead className="hidden xl:table-cell">Incoterms</TableHead>
            <TableHead className="hidden lg:table-cell">Customs</TableHead>
            <TableHead className="hidden xl:table-cell">Flags</TableHead>
            <TableHead className="hidden xl:table-cell">Priority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map((s) => (
            <>
              <TableRow
                key={s.id}
                className="cursor-pointer hover:bg-neutral-50"
                onClick={() => handleRowClick(s)}
              >
                <TableCell className="p-2">
                  {expandedId === s.id ? (
                    <ChevronDown className="h-4 w-4 text-neutral-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs font-medium text-neutral-900">{s.billOfLading}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-xs text-neutral-700">{s.originPort.name}</span>
                  <ChevronRight className="mx-1 inline h-3 w-3 text-neutral-400" />
                  <span className="text-xs text-neutral-700">{s.destPort.name}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={shipmentStatusColor(s.status)}>{s.status}</Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="text-xs text-neutral-900">{s.vessel.name}</div>
                  <div className="text-xs text-neutral-400">{s.vessel.flagCountry}</div>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <div className="text-xs text-neutral-900">{s.cargoType}</div>
                  <div className="truncate text-xs text-neutral-400">{s.cargoDesc}</div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-neutral-700">{formatWeight(s.cargoWeight)}</TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-neutral-700">{s.incoterms || '—'}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant="outline" className={customsStatusColor(s.customsStatus)}>{s.customsStatus}</Badge>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <div className="flex items-center gap-1">
                    {s.dangerousGoods && <span title={`DG Class: ${s.dgClass}`}><Flame className="h-3.5 w-3.5 text-red-500" /></span>}
                    {s.temperatureCtrl && <span title={`${s.tempMin}°C – ${s.tempMax}°C`}><Thermometer className="h-3.5 w-3.5 text-blue-500" /></span>}
                  </div>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  {s.priority && s.priority !== 'Normal' && (
                    <Badge variant="outline" className={
                      s.priority === 'High'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : s.priority === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-neutral-50 text-neutral-700 border-neutral-200'
                    }>{s.priority}</Badge>
                  )}
                </TableCell>
              </TableRow>
              {expandedId === s.id && (
                <TableRow key={`${s.id}-expanded`}>
                  <TableCell colSpan={11} className="bg-neutral-50 p-0">
                    <div className="p-4">
                      {subLoading ? (
                        <LoadingSpinner />
                      ) : (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                          {/* Documents */}
                          <div>
                            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
                              <FileText className="h-3.5 w-3.5" /> Documents
                            </h4>
                            {expandedDocs.length === 0 ? (
                              <p className="text-xs text-neutral-400">No documents</p>
                            ) : (
                              <div className="space-y-1.5">
                                {expandedDocs.map((d) => (
                                  <div key={d.id} className="flex items-center justify-between rounded border border-neutral-200 bg-white p-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-medium text-neutral-800">{d.docName}</p>
                                      <p className="text-xs text-neutral-400">{d.docType} · {d.issuedBy} · {formatDate(d.issuedAt)}</p>
                                    </div>
                                    <Badge variant="outline" className={`ml-2 shrink-0 ${documentStatusColor(d.status)}`}>{d.status}</Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Event Timeline */}
                          <div>
                            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
                              <Clock className="h-3.5 w-3.5" /> Event Timeline
                            </h4>
                            {expandedEvents.length === 0 ? (
                              <p className="text-xs text-neutral-400">No events</p>
                            ) : (
                              <div className="relative space-y-3 pl-4">
                                <div className="absolute bottom-0 left-1.5 top-0 w-px bg-neutral-200" />
                                {expandedEvents.map((e) => (
                                  <div key={e.id} className="relative">
                                    <div className="absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-neutral-900 bg-white" />
                                    <p className="text-xs font-medium text-neutral-800">{e.eventType}</p>
                                    <p className="text-xs text-neutral-500">{e.eventDesc}</p>
                                    <p className="text-xs text-neutral-400">{e.location} · {timeAgo(e.createdAt)}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Container Breakdown */}
                          <div>
                            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
                              <Container className="h-3.5 w-3.5" /> Containers ({s.containerCount})
                            </h4>
                            {(!s.containers || s.containers.length === 0) ? (
                              <p className="text-xs text-neutral-400">No container data</p>
                            ) : (
                              <div className="space-y-1.5">
                                {s.containers.map((c) => (
                                  <div key={c.id} className="flex items-center justify-between rounded border border-neutral-200 bg-white p-2">
                                    <div>
                                      <p className="font-mono text-xs font-medium text-neutral-800">{c.containerNo}</p>
                                      <p className="text-xs text-neutral-400">{c.isoType} · {c.size}</p>
                                    </div>
                                    <span className="text-xs text-neutral-500">{formatWeight(c.weight)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}

// ─── Vessels Panel ───────────────────────────────────────────────────

function VesselsPanel() {
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/vessels?limit=50')
      .then((r) => r.json())
      .then((json) => { setVessels(json.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (vessels.length === 0) return <EmptyState message="No vessels found" />

  return (
    <ScrollArea className="max-h-[600px]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-neutral-50">
            <TableHead className="w-8" />
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">MMSI</TableHead>
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead className="hidden lg:table-cell">Class</TableHead>
            <TableHead className="hidden xl:table-cell">Flag</TableHead>
            <TableHead className="hidden lg:table-cell">Speed</TableHead>
            <TableHead className="hidden xl:table-cell">Position</TableHead>
            <TableHead className="hidden lg:table-cell">Destination</TableHead>
            <TableHead className="hidden xl:table-cell">ETB</TableHead>
            <TableHead className="hidden xl:table-cell">TEU</TableHead>
            <TableHead className="hidden xl:table-cell">Engine</TableHead>
            <TableHead className="hidden xl:table-cell">Emission</TableHead>
            <TableHead className="hidden xl:table-cell">Class Society</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vessels.map((v) => (
            <>
              <TableRow
                key={v.id}
                className="cursor-pointer hover:bg-neutral-50"
                onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
              >
                <TableCell className="p-2">
                  {expandedId === v.id ? (
                    <ChevronDown className="h-4 w-4 text-neutral-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Ship className="h-4 w-4 text-neutral-500" />
                    <span className="text-sm font-medium text-neutral-900">{v.name}</span>
                  </div>
                  <div className="text-xs text-neutral-400">{v.imo} · {v.callSign}</div>
                </TableCell>
                <TableCell className="font-mono text-xs text-neutral-600 hidden md:table-cell">{v.mmsi}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className={vesselStatusColor(v.status)}>{v.status}</Badge>
                  <span className="ml-1 text-xs text-neutral-500">{v.vesselType}</span>
                </TableCell>
                <TableCell className="text-xs text-neutral-700 hidden lg:table-cell">{v.vesselClass || '—'}</TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-neutral-700">{v.flagCountry}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center gap-1 text-xs text-neutral-700">
                    <Gauge className="h-3 w-3" /> {v.speed} kn
                  </div>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <div className="text-xs text-neutral-600 font-mono">
                    {v.latitude.toFixed(2)}°, {v.longitude.toFixed(2)}°
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-neutral-700">{v.destination || '—'}</TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-neutral-500">{v.eta ? formatDate(v.eta) : '—'}</TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-neutral-700">{v.teuCapacity || '—'}</TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-neutral-500">{v.engineType || '—'}</TableCell>
                <TableCell className="hidden xl:table-cell">
                  <Badge variant="outline" className={emissionRatingColor(v.emissionRating)}>{v.emissionRating}</Badge>
                </TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-neutral-500">{v.classificationSociety || '—'}</TableCell>
              </TableRow>
              {expandedId === v.id && (
                <TableRow key={`${v.id}-expanded`}>
                  <TableCell colSpan={14} className="bg-neutral-50 p-0">
                    <div className="p-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Specifications Card */}
                        <Card className="border-neutral-200">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
                              <Wrench className="h-3.5 w-3.5" /> Specifications
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                              <div><span className="text-neutral-400">GT</span><p className="font-medium text-neutral-900">{formatNumber(v.grossTonnage)}</p></div>
                              <div><span className="text-neutral-400">DWT</span><p className="font-medium text-neutral-900">{formatNumber(v.deadweight)}</p></div>
                              <div><span className="text-neutral-400">Length</span><p className="font-medium text-neutral-900">{v.length}m</p></div>
                              <div><span className="text-neutral-400">Breadth</span><p className="font-medium text-neutral-900">{v.breadth}m</p></div>
                              <div><span className="text-neutral-400">Draft</span><p className="font-medium text-neutral-900">{v.draft}m</p></div>
                              <div><span className="text-neutral-400">Crew</span><p className="font-medium text-neutral-900">{v.crewCapacity}</p></div>
                              <div><span className="text-neutral-400">Max Speed</span><p className="font-medium text-neutral-900">{v.maxSpeed} kn</p></div>
                              <div><span className="text-neutral-400">Engine Power</span><p className="font-medium text-neutral-900">{v.enginePower} kW</p></div>
                              <div><span className="text-neutral-400">Fuel Type</span><p className="font-medium text-neutral-900">{v.fuelType || '—'}</p></div>
                              <div><span className="text-neutral-400">Year Built</span><p className="font-medium text-neutral-900">{v.yearBuilt}</p></div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Insurance & Ownership Card */}
                        <Card className="border-neutral-200">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
                              <Shield className="h-3.5 w-3.5" /> Insurance & Ownership
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-xs">
                              <div><span className="text-neutral-400">P&I Club</span><p className="font-medium text-neutral-900">{v.insurancePandI || '—'}</p></div>
                              <div><span className="text-neutral-400">Registered Owner</span><p className="font-medium text-neutral-900">{v.registeredOwner || '—'}</p></div>
                              <div><span className="text-neutral-400">Ship Manager</span><p className="font-medium text-neutral-900">{v.shipManager || '—'}</p></div>
                              <Separator className="my-2" />
                              <div><span className="text-neutral-400">Total Voyages</span><p className="font-medium text-neutral-900">{v.totalVoyages}</p></div>
                              <div><span className="text-neutral-400">Total Distance</span><p className="font-medium text-neutral-900">{formatNumber(v.totalDistanceNm)} NM</p></div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Certification Card */}
                        <Card className="border-neutral-200">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
                              <FileText className="h-3.5 w-3.5" /> Certification
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-xs">
                              <div>
                                <span className="text-neutral-400">IMO Certificate</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <p className="font-medium text-neutral-900">{v.imoCertExpiry ? formatDate(v.imoCertExpiry) : '—'}</p>
                                  {v.imoCertExpiry && new Date(v.imoCertExpiry) < new Date(Date.now() + 90 * 86400000) && (
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                  )}
                                </div>
                              </div>
                              <div><span className="text-neutral-400">Classification Society</span><p className="font-medium text-neutral-900">{v.classificationSociety || '—'}</p></div>
                              <div><span className="text-neutral-400">Call Sign</span><p className="font-medium text-neutral-900">{v.callSign || '—'}</p></div>
                              <div><span className="text-neutral-400">MMSI</span><p className="font-mono font-medium text-neutral-900">{v.mmsi}</p></div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}

// ─── Trade Panel ─────────────────────────────────────────────────────

function TradePanel() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [tradeData, setTradeData] = useState<TradeRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then((r) => r.json()),
      fetch('/api/trade-data?limit=50').then((r) => r.json()),
    ])
      .then(([dash, trade]) => {
        setDashboardData(dash)
        setTradeData(trade.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const tradeOverview = dashboardData?.tradeOverview
  const topPartners = dashboardData?.topTradePartners || []
  const tradeByRoute = dashboardData?.tradeByRoute || []

  const commodityMap = new Map<string, { count: number; totalValue: number; totalWeight: number }>()
  tradeData.forEach((t) => {
    const key = t.commodityDesc || t.commodityChapter || 'Unknown'
    const existing = commodityMap.get(key) || { count: 0, totalValue: 0, totalWeight: 0 }
    existing.count++
    existing.totalValue += t.tradeValueUsd
    existing.totalWeight += t.grossWeightKg
    commodityMap.set(key, existing)
  })
  const commodityBreakdown = Array.from(commodityMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Trade Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-neutral-500">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Trade Value</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{tradeOverview ? formatCurrency(tradeOverview.totalTradeValue) : '—'}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-neutral-500">
              <Gauge className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Weight</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{tradeOverview ? formatWeight(tradeOverview.totalGrossWeight) : '—'}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-neutral-500">
              <Fuel className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total CO₂ Emissions</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{tradeOverview ? `${formatNumber(tradeOverview.totalCO2)}t` : '—'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Route Analysis */}
        <Card className="border-neutral-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900">
              <Navigation className="h-4 w-4" />
              Route Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tradeByRoute.length === 0 ? (
              <EmptyState message="No route data" />
            ) : (
              <ScrollArea className="max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-neutral-50">
                      <TableHead>Route</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Voyages</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Avg Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tradeByRoute.map((r, i) => (
                      <TableRow key={i} className="hover:bg-neutral-50">
                        <TableCell className="text-xs text-neutral-800">{r.route}</TableCell>
                        <TableCell className="text-right text-xs font-medium text-neutral-900">{formatCurrency(r.tradeValue)}</TableCell>
                        <TableCell className="text-right text-xs text-neutral-600 hidden sm:table-cell">{r.voyages}</TableCell>
                        <TableCell className="text-right text-xs text-neutral-600 hidden sm:table-cell">{formatCurrency(r.avgFreightRate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Partner Analysis */}
        <Card className="border-neutral-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900">
              <Globe className="h-4 w-4" />
              Partner Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPartners.length === 0 ? (
              <EmptyState message="No partner data" />
            ) : (
              <ScrollArea className="max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-neutral-50">
                      <TableHead>Partner</TableHead>
                      <TableHead className="text-right">Trade Value</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPartners.map((p) => (
                      <TableRow key={p.partnerCode} className="hover:bg-neutral-50">
                        <TableCell className="text-xs text-neutral-800">{p.partnerName || p.partnerCode}</TableCell>
                        <TableCell className="text-right text-xs font-medium text-neutral-900">{formatCurrency(p.totalValue)}</TableCell>
                        <TableCell className="text-right text-xs text-neutral-600 hidden sm:table-cell">{formatWeight(p.totalWeight)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commodity Breakdown */}
      <Card className="border-neutral-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900">
            <Package className="h-4 w-4" />
            Commodity Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {commodityBreakdown.length === 0 ? (
            <EmptyState message="No commodity data" />
          ) : (
            <ScrollArea className="max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-neutral-50">
                    <TableHead>Commodity</TableHead>
                    <TableHead className="text-right">Shipments</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Total Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commodityBreakdown.map((c) => (
                    <TableRow key={c.name} className="hover:bg-neutral-50">
                      <TableCell className="text-xs text-neutral-800">{c.name}</TableCell>
                      <TableCell className="text-right text-xs font-medium text-neutral-900">{c.count}</TableCell>
                      <TableCell className="text-right text-xs font-medium text-neutral-900">{formatCurrency(c.totalValue)}</TableCell>
                      <TableCell className="text-right text-xs text-neutral-600 hidden sm:table-cell">{formatWeight(c.totalWeight)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Ports Panel ─────────────────────────────────────────────────────

function PortsPanel() {
  const [ports, setPorts] = useState<Port[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ports?limit=50')
      .then((r) => r.json())
      .then((json) => { setPorts(json.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (ports.length === 0) return <EmptyState message="No ports found" />

  return (
    <ScrollArea className="max-h-[600px]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-neutral-50">
            <TableHead>Port</TableHead>
            <TableHead className="hidden md:table-cell">Country</TableHead>
            <TableHead className="hidden lg:table-cell">Region</TableHead>
            <TableHead className="hidden md:table-cell">TEU/Year</TableHead>
            <TableHead className="hidden xl:table-cell">Max DWT</TableHead>
            <TableHead className="hidden xl:table-cell">Depth</TableHead>
            <TableHead className="hidden lg:table-cell">Berths</TableHead>
            <TableHead className="hidden md:table-cell">Congestion</TableHead>
            <TableHead className="hidden xl:table-cell">Facilities</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ports.map((p) => (
            <TableRow key={p.id} className="hover:bg-neutral-50">
              <TableCell>
                <div className="flex items-center gap-2">
                  <Anchor className="h-4 w-4 text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{p.name}</p>
                    <p className="font-mono text-xs text-neutral-400">{p.unlocode}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs text-neutral-700">{p.countryCode}</TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-neutral-600">{p.region || '—'}</TableCell>
              <TableCell className="hidden md:table-cell text-xs font-medium text-neutral-900">{formatNumber(p.annualTEU)}</TableCell>
              <TableCell className="hidden xl:table-cell text-xs text-neutral-700">{formatNumber(p.maxVesselDWT)}</TableCell>
              <TableCell className="hidden xl:table-cell text-xs text-neutral-700">{p.depth}m</TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-neutral-700">{p.berthCount}</TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="outline" className={congestionColor(p.congestionLevel)}>{p.congestionLevel}</Badge>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <div className="flex flex-wrap gap-1">
                  {p.bunkering && (
                    <Badge variant="outline" className="bg-neutral-50 text-neutral-600 border-neutral-200 text-xs">
                      <Fuel className="mr-1 h-3 w-3" />Bunkering
                    </Badge>
                  )}
                  {p.coldStorage && (
                    <Badge variant="outline" className="bg-neutral-50 text-neutral-600 border-neutral-200 text-xs">
                      <Snowflake className="mr-1 h-3 w-3" />Cold
                    </Badge>
                  )}
                  {p.repairFacility && (
                    <Badge variant="outline" className="bg-neutral-50 text-neutral-600 border-neutral-200 text-xs">
                      <Wrench className="mr-1 h-3 w-3" />Repair
                    </Badge>
                  )}
                  {p.hazardousHandling && (
                    <Badge variant="outline" className="bg-neutral-50 text-neutral-600 border-neutral-200 text-xs">
                      <AlertTriangle className="mr-1 h-3 w-3" />Hazmat
                    </Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}

// ─── Containers Panel ────────────────────────────────────────────────

function ContainersPanel() {
  const [containers, setContainers] = useState<ContainerRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/containers?limit=50')
      .then((r) => r.json())
      .then((json) => { setContainers(json.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (containers.length === 0) return <EmptyState message="No containers found" />

  return (
    <ScrollArea className="max-h-[600px]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-neutral-50">
            <TableHead>Number</TableHead>
            <TableHead className="hidden md:table-cell">ISO Type</TableHead>
            <TableHead className="hidden md:table-cell">Size</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Weight</TableHead>
            <TableHead className="hidden xl:table-cell">Seal</TableHead>
            <TableHead className="hidden lg:table-cell">Temperature</TableHead>
            <TableHead className="hidden xl:table-cell">BOL</TableHead>
            <TableHead className="hidden xl:table-cell">Vessel</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {containers.map((c) => (
            <TableRow key={c.id} className="hover:bg-neutral-50">
              <TableCell>
                <div className="flex items-center gap-2">
                  <Container className="h-4 w-4 text-neutral-500" />
                  <span className="font-mono text-xs font-medium text-neutral-900">{c.containerNo}</span>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs text-neutral-700">{c.isoType}</TableCell>
              <TableCell className="hidden md:table-cell text-xs text-neutral-600">{c.size}</TableCell>
              <TableCell>
                <Badge variant="outline" className={shipmentStatusColor(c.status)}>{c.status}</Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-neutral-700">{formatWeight(c.weight)}</TableCell>
              <TableCell className="hidden xl:table-cell font-mono text-xs text-neutral-500">{c.sealNo || '—'}</TableCell>
              <TableCell className="hidden lg:table-cell">
                {c.temperature != null ? (
                  <div className="flex items-center gap-1 text-xs text-blue-700">
                    <Thermometer className="h-3.5 w-3.5" /> {c.temperature}°C
                  </div>
                ) : (
                  <span className="text-xs text-neutral-400">—</span>
                )}
              </TableCell>
              <TableCell className="hidden xl:table-cell font-mono text-xs text-neutral-600">{c.shipment?.billOfLading || '—'}</TableCell>
              <TableCell className="hidden xl:table-cell text-xs text-neutral-700">{c.vessel?.name || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}

// ─── Compliance Panel ────────────────────────────────────────────────

function CompliancePanel() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [expandedShipmentId, setExpandedShipmentId] = useState<string | null>(null)
  const [shipmentDocs, setShipmentDocs] = useState<Document[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then((r) => r.json()),
      fetch('/api/shipments?limit=50').then((r) => r.json()),
    ])
      .then(([dash, ship]) => {
        setDashboardData(dash)
        setShipments(ship.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleShipmentClick = useCallback(async (shipmentId: string) => {
    if (expandedShipmentId === shipmentId) {
      setExpandedShipmentId(null)
      return
    }
    setExpandedShipmentId(shipmentId)
    setDocsLoading(true)
    try {
      const res = await fetch(`/api/documents?shipmentId=${shipmentId}`).then((r) => r.json())
      setShipmentDocs(res.data || [])
    } catch {
      setShipmentDocs([])
    }
    setDocsLoading(false)
  }, [expandedShipmentId])

  if (loading) return <LoadingSpinner />

  const docStats = dashboardData?.documentStats

  return (
    <div className="space-y-6">
      {/* Document Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-neutral-500">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Docs</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{docStats?.total ?? '—'}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Approved</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-green-700">{docStats?.approved ?? '—'}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Pending</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-700">{docStats?.pending ?? '—'}</p>
          </CardContent>
        </Card>
        <Card className="border-neutral-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Rejected</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-700">{docStats?.rejected ?? '—'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents by Type */}
      {docStats?.byType && docStats.byType.length > 0 && (
        <Card className="border-neutral-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900">
              <BarChart3 className="h-4 w-4" />
              Documents by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {docStats.byType.map((dt) => (
                <div key={dt.docType} className="rounded-lg border border-neutral-200 bg-white p-3">
                  <p className="text-sm font-medium text-neutral-900">{dt.docType}</p>
                  <p className="text-lg font-bold text-neutral-700">{dt.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document List Grouped by Shipment */}
      <Card className="border-neutral-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900">
            <FileText className="h-4 w-4" />
            Documents by Shipment
          </CardTitle>
          <CardDescription>Click a shipment to view its documents</CardDescription>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <EmptyState message="No shipments found" />
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {shipments.map((s) => (
                  <div key={s.id} className="rounded-lg border border-neutral-200 bg-white">
                    <div
                      className="flex cursor-pointer items-center justify-between p-3 hover:bg-neutral-50"
                      onClick={() => handleShipmentClick(s.id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedShipmentId === s.id ? (
                          <ChevronDown className="h-4 w-4 text-neutral-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-neutral-400" />
                        )}
                        <div>
                          <p className="font-mono text-sm font-medium text-neutral-900">{s.billOfLading}</p>
                          <p className="text-xs text-neutral-500">{s.originPort.name} → {s.destPort.name}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={shipmentStatusColor(s.status)}>{s.status}</Badge>
                    </div>
                    {expandedShipmentId === s.id && (
                      <div className="border-t border-neutral-100 p-3">
                        {docsLoading ? (
                          <LoadingSpinner />
                        ) : shipmentDocs.length === 0 ? (
                          <p className="text-xs text-neutral-400">No documents found for this shipment</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-neutral-50">
                                <TableHead className="text-xs">Type</TableHead>
                                <TableHead className="text-xs">Name</TableHead>
                                <TableHead className="hidden sm:table-cell text-xs">Ref</TableHead>
                                <TableHead className="hidden md:table-cell text-xs">Issued By</TableHead>
                                <TableHead className="hidden md:table-cell text-xs">Date</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {shipmentDocs.map((d) => (
                                <TableRow key={d.id} className="hover:bg-neutral-50">
                                  <TableCell className="text-xs text-neutral-700">{d.docType}</TableCell>
                                  <TableCell className="text-xs font-medium text-neutral-900">{d.docName}</TableCell>
                                  <TableCell className="hidden sm:table-cell font-mono text-xs text-neutral-500">{d.docRef}</TableCell>
                                  <TableCell className="hidden md:table-cell text-xs text-neutral-600">{d.issuedBy}</TableCell>
                                  <TableCell className="hidden md:table-cell text-xs text-neutral-500">{formatDate(d.issuedAt)}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={documentStatusColor(d.status)}>{d.status}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Dashboard Component ────────────────────────────────────────

export default function MaritimeDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((json) => { setDashboardData(json); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900">
              <Ship className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900">Maritime Analytics</h1>
              <p className="hidden text-xs text-neutral-500 sm:block">Global Maritime & Freight Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden gap-1 bg-green-50 text-green-700 border-green-200 sm:flex">
              <Activity className="h-3 w-3" />
              Live
            </Badge>
            <Badge variant="outline" className="bg-neutral-100 text-neutral-600 border-neutral-200">
              <Waves className="mr-1 h-3 w-3" />
              {dashboardData ? formatNumber(dashboardData.summary.activeVessels) : '—'} Active
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 flex w-full flex-wrap gap-1 bg-neutral-100">
              <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="shipments" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Package className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Shipments</span>
              </TabsTrigger>
              <TabsTrigger value="vessels" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Ship className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Vessels</span>
              </TabsTrigger>
              <TabsTrigger value="trade" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Trade</span>
              </TabsTrigger>
              <TabsTrigger value="ports" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Anchor className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ports</span>
              </TabsTrigger>
              <TabsTrigger value="containers" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Container className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Containers</span>
              </TabsTrigger>
              <TabsTrigger value="compliance" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Compliance</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewPanel data={dashboardData} />
            </TabsContent>
            <TabsContent value="shipments">
              <ShipmentsPanel />
            </TabsContent>
            <TabsContent value="vessels">
              <VesselsPanel />
            </TabsContent>
            <TabsContent value="trade">
              <TradePanel />
            </TabsContent>
            <TabsContent value="ports">
              <PortsPanel />
            </TabsContent>
            <TabsContent value="containers">
              <ContainersPanel />
            </TabsContent>
            <TabsContent value="compliance">
              <CompliancePanel />
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <p className="text-xs text-neutral-400">Global Maritime & Freight Analytics Platform</p>
          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <Radio className="h-3 w-3" />
            <span>System Online</span>
          </div>
        </div>
      </footer>
    </div>
  )
}