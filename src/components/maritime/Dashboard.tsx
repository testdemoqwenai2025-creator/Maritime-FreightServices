'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import {
  Ship, Anchor, Package, Container, TrendingUp, Globe,
  Navigation, BarChart3, MapPin, Clock, DollarSign,
  ChevronRight, ChevronDown, Activity, Waves, Thermometer,
  Shield, AlertTriangle, FileText, Truck, Gauge, Fuel, Wrench,
  Users, Building, Warehouse, Snowflake, Radio, Flame,
  Plane, Handshake, BookOpen, Route, Download, Search, Moon, Sun, Leaf, Bell
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import dynamic from 'next/dynamic'
import AnalyticsCharts from './AnalyticsCharts'
import ESGPanel from './ESGPanel'
import { ExportButtons } from './DataExport'
import CommandPalette from './CommandPalette'
import NotificationCenter from './NotificationCenter'
const VoyageAnalyticsPanel = dynamic(() => import('./VoyageAnalyticsPanel'), { ssr: false })

// Dynamic import for VesselMap (leaflet needs window/DOM)
const VesselMap = dynamic(() => import('./VesselMap'), { ssr: false, loading: () => <div className="flex h-[500px] items-center justify-center rounded-lg bg-muted"><div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" /></div> })
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'

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
    case 'Booked': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    case 'In Transit': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    case 'Arrived': return 'bg-green-500/10 text-green-400 border-green-500/30'
    case 'Delivered': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    case 'Cancelled': return 'bg-red-500/10 text-red-400 border-red-500/30'
    default: return 'bg-muted text-foreground/70 border-border'
  }
}

function vesselStatusColor(status: string): string {
  switch (status) {
    case 'Active': return 'bg-green-500/10 text-green-400 border-green-500/30'
    case 'In Port': return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    case 'At Anchor': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    default: return 'bg-muted text-foreground/70 border-border'
  }
}

function customsStatusColor(status: string): string {
  switch (status) {
    case 'Customs Cleared': return 'bg-green-500/10 text-green-400 border-green-500/30'
    case 'Pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    case 'Held': return 'bg-red-500/10 text-red-400 border-red-500/30'
    default: return 'bg-muted text-foreground/70 border-border'
  }
}

function congestionColor(level: string): string {
  switch (level) {
    case 'Low': return 'bg-green-500/10 text-green-400 border-green-500/30'
    case 'Medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    case 'High': return 'bg-red-500/10 text-red-400 border-red-500/30'
    case 'Critical': return 'bg-red-100 text-red-900 border-red-300'
    default: return 'bg-muted text-foreground/70 border-border'
  }
}

function documentStatusColor(status: string): string {
  switch (status) {
    case 'Approved': return 'bg-green-500/10 text-green-400 border-green-500/30'
    case 'Pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    case 'Rejected': return 'bg-red-500/10 text-red-400 border-red-500/30'
    default: return 'bg-muted text-foreground/70 border-border'
  }
}

function emissionRatingColor(rating: string): string {
  switch (rating) {
    case 'A': return 'bg-green-500/10 text-green-400 border-green-500/30'
    case 'B': return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    case 'C': return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    case 'D': return 'bg-red-500/10 text-red-400 border-red-500/30'
    default: return 'bg-muted text-foreground/70 border-border'
  }
}

// ─── Interfaces ──────────────────────────────────────────────────────

interface DashboardData {
  summary: {
    totalVessels: number
    activeVessels: number
    inPortVessels: number
    totalPorts: number
    totalShipments: number
    totalContainers: number
    totalDocuments: number
    totalTradeRecords: number
    totalCarriers: number
    totalCharters: number
    totalBookings: number
    totalCargoTypes: number
    totalTradeRoutes: number
  }
  shipmentsByStatus: { status: string; count: number }[]
  vesselTypeBreakdown: { type: string; count: number }[]
  vesselStatusBreakdown: { status: string; count: number }[]
  containerStatusBreakdown: { status: string; count: number }[]
  recentArrivals: Array<{
    id: string
    arrivalAt: string
    purpose: string
    vessel: { name: string; flagCountry: string; vesselType: string; carrier?: { name: string; code: string } | null }
    port: { name: string; countryCode: string; congestionLevel?: string | null }
  }>
  tradeOverview: {
    totalTradeValue: number
    totalGrossWeight: number
    totalCO2: number
  }
  topTradePartners: { partnerCode: string; totalValue: number }[]
  tradeByRoute: { route: string; totalValue: number; co2Emissions: number }[]
  congestionDistribution: { level: string; count: number }[]
  documentStats: { status: string; count: number }[]
  // New data
  allianceBreakdown: { alliance: string; count: number; totalTEU: number }[]
  carrierStats: { avgReliability: number; avgCO2PerTEU: number }
  topCarriers: { name: string; code: string; totalTEUCapacity: number; fleetSize: number; reliability: number }[]
  bookingStatusBreakdown: { status: string; count: number }[]
  charterTypeBreakdown: { type: string; count: number }[]
  dangerousCargoCount: number
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
  vessel: { name: string; mmsi: string; flagCountry: string; carrier?: { name: string; code: string } | null }
  carrier?: { name: string; code: string } | null
  tradeRoute?: { name: string; code: string } | null
  originPort: { name: string; countryCode: string; unlocode: string }
  destPort: { name: string; countryCode: string; unlocode: string }
  containers: ShipmentContainer[]
}

interface Vessel {
  id: string
  mmsi: string
  imo: number
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
  carrier?: { name: string; code: string; alliance: string } | null
  tradeRoute?: { name: string; code: string; originRegion: string; destRegion: string } | null
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
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      <span className="ml-3 text-sm text-muted-foreground">Loading...</span>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/70">
      <Package className="mb-2 h-8 w-8" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ─── Overview Panel ──────────────────────────────────────────────────

function OverviewPanel({ data }: { data: DashboardData | null }) {
  if (!data) return <LoadingSpinner />
  const { summary, shipmentsByStatus, vesselTypeBreakdown, vesselStatusBreakdown, containerStatusBreakdown, recentArrivals, tradeOverview, topTradePartners, tradeByRoute, congestionDistribution, documentStats, allianceBreakdown, carrierStats, topCarriers, bookingStatusBreakdown, charterTypeBreakdown, dangerousCargoCount } = data

  const totalShipmentCount = shipmentsByStatus.reduce((a, b) => a + b.count, 0)
  const totalVesselCount = vesselTypeBreakdown.reduce((a, b) => a + b.count, 0)
  const approvedDocs = documentStats.find(d => d.status === 'Approved')?.count || 0
  const pendingDocs = documentStats.find(d => d.status === 'Pending')?.count || 0
  const rejectedDocs = documentStats.find(d => d.status === 'Rejected')?.count || 0

  return (
    <div className="space-y-6">
      {/* KPI Cards — 12 cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Ship className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Vessels</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatNumber(summary.totalVessels)}</p>
            <p className="mt-1 text-xs text-green-400/70">{formatNumber(summary.activeVessels)} active</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Anchor className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Ports</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatNumber(summary.totalPorts)}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{formatNumber(summary.inPortVessels)} in port</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Shipments</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatNumber(summary.totalShipments)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Container className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Containers</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatNumber(summary.totalContainers)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Trade Value</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(tradeOverview.totalTradeValue)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Handshake className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Carriers</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatNumber(summary.totalCarriers)}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">{(carrierStats.avgReliability || 0).toFixed(1)}% avg reliability</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Route className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Trade Routes</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatNumber(summary.totalTradeRoutes)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Bookings</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatNumber(summary.totalBookings)}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Documents</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatNumber(summary.totalDocuments)}</p>
            <p className="mt-1 text-xs text-green-400/70">{approvedDocs} approved</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">DG Cargo</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatNumber(dangerousCargoCount)}</p>
            <p className="mt-1 text-xs text-amber-400/70">types registered</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Fuel className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">CO2/TEU</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{(carrierStats.avgCO2PerTEU || 0).toFixed(1)}g</p>
            <p className="mt-1 text-xs text-muted-foreground/70">fleet average</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Gauge className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Charters</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{formatNumber(summary.totalCharters)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Shipment Pipeline */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Truck className="h-4 w-4" />
              Shipment Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shipmentsByStatus.map((s) => (
              <div key={s.status} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/70">{s.status}</span>
                  <span className="font-medium text-foreground">{s.count} ({totalShipmentCount > 0 ? ((s.count / totalShipmentCount) * 100).toFixed(1) : 0}%)</span>
                </div>
                <Progress value={totalShipmentCount > 0 ? (s.count / totalShipmentCount) * 100 : 0} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Fleet Composition */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Globe className="h-4 w-4" />
              Fleet Composition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vesselTypeBreakdown.map((v) => (
              <div key={v.type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/70">{v.type}</span>
                  <span className="font-medium text-foreground">{v.count}</span>
                </div>
                <Progress value={totalVesselCount > 0 ? (v.count / totalVesselCount) * 100 : 0} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Arrivals */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Navigation className="h-4 w-4" />
              Recent Arrivals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {recentArrivals.length === 0 && <EmptyState message="No recent arrivals" />}
                {recentArrivals.map((a) => (
                  <div key={a.id} className="flex items-start justify-between rounded-lg border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{a.vessel.name}</p>
                      <p className="text-xs text-muted-foreground">{a.port.name} ({a.port.countryCode}) · {a.vessel.vesselType}</p>
                      <p className="mt-1 text-xs text-muted-foreground/70">{a.purpose}</p>
                    </div>
                    <div className="ml-3 text-right">
                      <p className="text-xs text-muted-foreground/70">{timeAgo(a.arrivalAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Congestion Distribution + Document Stats */}
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Activity className="h-4 w-4" />
                Port Congestion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {congestionDistribution.map((c) => (
                <div key={c.level} className="flex items-center justify-between">
                  <Badge variant="outline" className={congestionColor(c.level)}>{c.level}</Badge>
                  <span className="text-sm font-medium text-foreground">{c.count} ports</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <FileText className="h-4 w-4" />
                Document Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-green-500/10 p-3 text-center">
                  <p className="text-lg font-bold text-green-400">{approvedDocs}</p>
                  <p className="text-xs text-green-400/70">Approved</p>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                  <p className="text-lg font-bold text-amber-400">{pendingDocs}</p>
                  <p className="text-xs text-amber-400/70">Pending</p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-3 text-center">
                  <p className="text-lg font-bold text-red-400">{rejectedDocs}</p>
                  <p className="text-xs text-red-400/70">Rejected</p>
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
          <TableRow className="hover:bg-muted/50">
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
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(s)}
              >
                <TableCell className="p-2">
                  {expandedId === s.id ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground/70" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs font-medium text-foreground">{s.billOfLading}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-xs text-foreground/70">{s.originPort.name}</span>
                  <ChevronRight className="mx-1 inline h-3 w-3 text-muted-foreground/70" />
                  <span className="text-xs text-foreground/70">{s.destPort.name}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={shipmentStatusColor(s.status)}>{s.status}</Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="text-xs text-foreground">{s.vessel.name}</div>
                  <div className="text-xs text-muted-foreground/70">{s.vessel.flagCountry}</div>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <div className="text-xs text-foreground">{s.cargoType}</div>
                  <div className="truncate text-xs text-muted-foreground/70">{s.cargoDesc}</div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-foreground/70">{formatWeight(s.cargoWeight)}</TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-foreground/70">{s.incoterms || '—'}</TableCell>
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
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : s.priority === 'Medium'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-neutral-50 text-foreground/70 border-border'
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
                            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground/80">
                              <FileText className="h-3.5 w-3.5" /> Documents
                            </h4>
                            {expandedDocs.length === 0 ? (
                              <p className="text-xs text-muted-foreground/70">No documents</p>
                            ) : (
                              <div className="space-y-1.5">
                                {expandedDocs.map((d) => (
                                  <div key={d.id} className="flex items-center justify-between rounded border border-border bg-card p-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-medium text-foreground/80">{d.docName}</p>
                                      <p className="text-xs text-muted-foreground/70">{d.docType} · {d.issuedBy} · {formatDate(d.issuedAt)}</p>
                                    </div>
                                    <Badge variant="outline" className={`ml-2 shrink-0 ${documentStatusColor(d.status)}`}>{d.status}</Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Event Timeline */}
                          <div>
                            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground/80">
                              <Clock className="h-3.5 w-3.5" /> Event Timeline
                            </h4>
                            {expandedEvents.length === 0 ? (
                              <p className="text-xs text-muted-foreground/70">No events</p>
                            ) : (
                              <div className="relative space-y-3 pl-4">
                                <div className="absolute bottom-0 left-1.5 top-0 w-px bg-border" />
                                {expandedEvents.map((e) => (
                                  <div key={e.id} className="relative">
                                    <div className="absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-neutral-900 bg-card" />
                                    <p className="text-xs font-medium text-foreground/80">{e.eventType}</p>
                                    <p className="text-xs text-muted-foreground">{e.eventDesc}</p>
                                    <p className="text-xs text-muted-foreground/70">{e.location} · {timeAgo(e.createdAt)}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Container Breakdown */}
                          <div>
                            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground/80">
                              <Container className="h-3.5 w-3.5" /> Containers ({s.containerCount})
                            </h4>
                            {(!s.containers || s.containers.length === 0) ? (
                              <p className="text-xs text-muted-foreground/70">No container data</p>
                            ) : (
                              <div className="space-y-1.5">
                                {s.containers.map((c) => (
                                  <div key={c.id} className="flex items-center justify-between rounded border border-border bg-card p-2">
                                    <div>
                                      <p className="font-mono text-xs font-medium text-foreground/80">{c.containerNo}</p>
                                      <p className="text-xs text-muted-foreground/70">{c.isoType} · {c.size}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{formatWeight(c.weight)}</span>
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
          <TableRow className="hover:bg-muted/50">
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
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
              >
                <TableCell className="p-2">
                  {expandedId === v.id ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground/70" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Ship className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{v.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground/70">{v.imo} · {v.callSign}</div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground hidden md:table-cell">{v.mmsi}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className={vesselStatusColor(v.status)}>{v.status}</Badge>
                  <span className="ml-1 text-xs text-muted-foreground">{v.vesselType}</span>
                </TableCell>
                <TableCell className="text-xs text-foreground/70 hidden lg:table-cell">{v.vesselClass || '—'}</TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-foreground/70">{v.flagCountry}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center gap-1 text-xs text-foreground/70">
                    <Gauge className="h-3 w-3" /> {v.speed} kn
                  </div>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <div className="text-xs text-muted-foreground font-mono">
                    {v.latitude.toFixed(2)}°, {v.longitude.toFixed(2)}°
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-foreground/70">{v.destination || '—'}</TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{v.eta ? formatDate(v.eta) : '—'}</TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-foreground/70">{v.teuCapacity || '—'}</TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{v.engineType || '—'}</TableCell>
                <TableCell className="hidden xl:table-cell">
                  <Badge variant="outline" className={emissionRatingColor(v.emissionRating)}>{v.emissionRating}</Badge>
                </TableCell>
                <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{v.classificationSociety || '—'}</TableCell>
              </TableRow>
              {expandedId === v.id && (
                <TableRow key={`${v.id}-expanded`}>
                  <TableCell colSpan={14} className="bg-neutral-50 p-0">
                    <div className="p-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Specifications Card */}
                        <Card className="border-border">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-foreground/80">
                              <Wrench className="h-3.5 w-3.5" /> Specifications
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                              <div><span className="text-muted-foreground/70">GT</span><p className="font-medium text-foreground">{formatNumber(v.grossTonnage)}</p></div>
                              <div><span className="text-muted-foreground/70">DWT</span><p className="font-medium text-foreground">{formatNumber(v.deadweight)}</p></div>
                              <div><span className="text-muted-foreground/70">Length</span><p className="font-medium text-foreground">{v.length}m</p></div>
                              <div><span className="text-muted-foreground/70">Breadth</span><p className="font-medium text-foreground">{v.breadth}m</p></div>
                              <div><span className="text-muted-foreground/70">Draft</span><p className="font-medium text-foreground">{v.draft}m</p></div>
                              <div><span className="text-muted-foreground/70">Crew</span><p className="font-medium text-foreground">{v.crewCapacity}</p></div>
                              <div><span className="text-muted-foreground/70">Max Speed</span><p className="font-medium text-foreground">{v.maxSpeed} kn</p></div>
                              <div><span className="text-muted-foreground/70">Engine Power</span><p className="font-medium text-foreground">{v.enginePower} kW</p></div>
                              <div><span className="text-muted-foreground/70">Fuel Type</span><p className="font-medium text-foreground">{v.fuelType || '—'}</p></div>
                              <div><span className="text-muted-foreground/70">Year Built</span><p className="font-medium text-foreground">{v.yearBuilt}</p></div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Insurance & Ownership Card */}
                        <Card className="border-border">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-foreground/80">
                              <Shield className="h-3.5 w-3.5" /> Insurance & Ownership
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-xs">
                              <div><span className="text-muted-foreground/70">P&I Club</span><p className="font-medium text-foreground">{v.insurancePandI || '—'}</p></div>
                              <div><span className="text-muted-foreground/70">Registered Owner</span><p className="font-medium text-foreground">{v.registeredOwner || '—'}</p></div>
                              <div><span className="text-muted-foreground/70">Ship Manager</span><p className="font-medium text-foreground">{v.shipManager || '—'}</p></div>
                              <Separator className="my-2" />
                              <div><span className="text-muted-foreground/70">Total Voyages</span><p className="font-medium text-foreground">{v.totalVoyages}</p></div>
                              <div><span className="text-muted-foreground/70">Total Distance</span><p className="font-medium text-foreground">{formatNumber(v.totalDistanceNm)} NM</p></div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Certification Card */}
                        <Card className="border-border">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-foreground/80">
                              <FileText className="h-3.5 w-3.5" /> Certification
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-xs">
                              <div>
                                <span className="text-muted-foreground/70">IMO Certificate</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <p className="font-medium text-foreground">{v.imoCertExpiry ? formatDate(v.imoCertExpiry) : '—'}</p>
                                  {v.imoCertExpiry && new Date(v.imoCertExpiry) < new Date(Date.now() + 90 * 86400000) && (
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                  )}
                                </div>
                              </div>
                              <div><span className="text-muted-foreground/70">Classification Society</span><p className="font-medium text-foreground">{v.classificationSociety || '—'}</p></div>
                              <div><span className="text-muted-foreground/70">Call Sign</span><p className="font-medium text-foreground">{v.callSign || '—'}</p></div>
                              <div><span className="text-muted-foreground/70">MMSI</span><p className="font-mono font-medium text-foreground">{v.mmsi}</p></div>
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
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Trade Value</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{tradeOverview ? formatCurrency(tradeOverview.totalTradeValue) : '—'}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Gauge className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Weight</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{tradeOverview ? formatWeight(tradeOverview.totalGrossWeight) : '—'}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Fuel className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total CO₂ Emissions</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{tradeOverview ? `${formatNumber(tradeOverview.totalCO2)}t` : '—'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Route Analysis */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
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
                    <TableRow className="hover:bg-muted/50">
                      <TableHead>Route</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Voyages</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Avg Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tradeByRoute.map((r, i) => (
                      <TableRow key={i} className="hover:bg-muted/50">
                        <TableCell className="text-xs text-foreground/80">{r.route}</TableCell>
                        <TableCell className="text-right text-xs font-medium text-foreground">{formatCurrency(r.tradeValue)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground hidden sm:table-cell">{r.voyages}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground hidden sm:table-cell">{formatCurrency(r.avgFreightRate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Partner Analysis */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
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
                    <TableRow className="hover:bg-muted/50">
                      <TableHead>Partner</TableHead>
                      <TableHead className="text-right">Trade Value</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPartners.map((p) => (
                      <TableRow key={p.partnerCode} className="hover:bg-muted/50">
                        <TableCell className="text-xs text-foreground/80">{p.partnerName || p.partnerCode}</TableCell>
                        <TableCell className="text-right text-xs font-medium text-foreground">{formatCurrency(p.totalValue)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground hidden sm:table-cell">{formatWeight(p.totalWeight)}</TableCell>
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
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
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
                  <TableRow className="hover:bg-muted/50">
                    <TableHead>Commodity</TableHead>
                    <TableHead className="text-right">Shipments</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Total Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commodityBreakdown.map((c) => (
                    <TableRow key={c.name} className="hover:bg-muted/50">
                      <TableCell className="text-xs text-foreground/80">{c.name}</TableCell>
                      <TableCell className="text-right text-xs font-medium text-foreground">{c.count}</TableCell>
                      <TableCell className="text-right text-xs font-medium text-foreground">{formatCurrency(c.totalValue)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground hidden sm:table-cell">{formatWeight(c.totalWeight)}</TableCell>
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
          <TableRow className="hover:bg-muted/50">
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
            <TableRow key={p.id} className="hover:bg-muted/50">
              <TableCell>
                <div className="flex items-center gap-2">
                  <Anchor className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="font-mono text-xs text-muted-foreground/70">{p.unlocode}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs text-foreground/70">{p.countryCode}</TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{p.region || '—'}</TableCell>
              <TableCell className="hidden md:table-cell text-xs font-medium text-foreground">{formatNumber(p.annualTEU)}</TableCell>
              <TableCell className="hidden xl:table-cell text-xs text-foreground/70">{formatNumber(p.maxVesselDWT)}</TableCell>
              <TableCell className="hidden xl:table-cell text-xs text-foreground/70">{p.depth}m</TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-foreground/70">{p.berthCount}</TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="outline" className={congestionColor(p.congestionLevel)}>{p.congestionLevel}</Badge>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <div className="flex flex-wrap gap-1">
                  {p.bunkering && (
                    <Badge variant="outline" className="bg-neutral-50 text-muted-foreground border-border text-xs">
                      <Fuel className="mr-1 h-3 w-3" />Bunkering
                    </Badge>
                  )}
                  {p.coldStorage && (
                    <Badge variant="outline" className="bg-neutral-50 text-muted-foreground border-border text-xs">
                      <Snowflake className="mr-1 h-3 w-3" />Cold
                    </Badge>
                  )}
                  {p.repairFacility && (
                    <Badge variant="outline" className="bg-neutral-50 text-muted-foreground border-border text-xs">
                      <Wrench className="mr-1 h-3 w-3" />Repair
                    </Badge>
                  )}
                  {p.hazardousHandling && (
                    <Badge variant="outline" className="bg-neutral-50 text-muted-foreground border-border text-xs">
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
          <TableRow className="hover:bg-muted/50">
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
            <TableRow key={c.id} className="hover:bg-muted/50">
              <TableCell>
                <div className="flex items-center gap-2">
                  <Container className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs font-medium text-foreground">{c.containerNo}</span>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs text-foreground/70">{c.isoType}</TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{c.size}</TableCell>
              <TableCell>
                <Badge variant="outline" className={shipmentStatusColor(c.status)}>{c.status}</Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-xs text-foreground/70">{formatWeight(c.weight)}</TableCell>
              <TableCell className="hidden xl:table-cell font-mono text-xs text-muted-foreground">{c.sealNo || '—'}</TableCell>
              <TableCell className="hidden lg:table-cell">
                {c.temperature != null ? (
                  <div className="flex items-center gap-1 text-xs text-blue-700">
                    <Thermometer className="h-3.5 w-3.5" /> {c.temperature}°C
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/70">—</span>
                )}
              </TableCell>
              <TableCell className="hidden xl:table-cell font-mono text-xs text-muted-foreground">{c.shipment?.billOfLading || '—'}</TableCell>
              <TableCell className="hidden xl:table-cell text-xs text-foreground/70">{c.vessel?.name || '—'}</TableCell>
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

  const docStats = dashboardData?.documentStats || []
  const totalDocs = docStats.reduce((a, b) => a + b.count, 0)
  const approvedCount = docStats.find(d => d.status === 'Approved')?.count || 0
  const pendingCount = docStats.find(d => d.status === 'Pending')?.count || 0
  const rejectedCount = docStats.find(d => d.status === 'Rejected')?.count || 0

  return (
    <div className="space-y-6">
      {/* Document Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Docs</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{totalDocs}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-400">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Approved</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-green-700">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Pending</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-700">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Rejected</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-700">{rejectedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Document List Grouped by Shipment */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
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
                  <div key={s.id} className="rounded-lg border border-border bg-card">
                    <div
                      className="flex cursor-pointer items-center justify-between p-3 hover:bg-muted/50"
                      onClick={() => handleShipmentClick(s.id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedShipmentId === s.id ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground/70" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
                        )}
                        <div>
                          <p className="font-mono text-sm font-medium text-foreground">{s.billOfLading}</p>
                          <p className="text-xs text-muted-foreground">{s.originPort.name} → {s.destPort.name}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={shipmentStatusColor(s.status)}>{s.status}</Badge>
                    </div>
                    {expandedShipmentId === s.id && (
                      <div className="border-t border-border p-3">
                        {docsLoading ? (
                          <LoadingSpinner />
                        ) : shipmentDocs.length === 0 ? (
                          <p className="text-xs text-muted-foreground/70">No documents found for this shipment</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-muted/50">
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
                                <TableRow key={d.id} className="hover:bg-muted/50">
                                  <TableCell className="text-xs text-foreground/70">{d.docType}</TableCell>
                                  <TableCell className="text-xs font-medium text-foreground">{d.docName}</TableCell>
                                  <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">{d.docRef}</TableCell>
                                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{d.issuedBy}</TableCell>
                                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatDate(d.issuedAt)}</TableCell>
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

// ─── Carriers Panel ──────────────────────────────────────────────────

interface CarrierRecord {
  id: string; name: string; code: string; country: string; headquarters: string;
  website: string; foundedYear: number; fleetSize: number; totalTEUCapacity: number;
  alliance: string; isTop20: boolean; isFCL: boolean; isLCL: boolean; isReefer: boolean; isDG: boolean;
  transitTimeDays: number; reliability: number; co2PerTeu: number; contactEmail: string; remarks: string;
  _count: { vessels: number; shipments: number; charters: number; bookings: number }
}

function CarriersPanel() {
  const [carriers, setCarriers] = useState<CarrierRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [allianceFilter, setAllianceFilter] = useState('All')

  useEffect(() => {
    fetch('/api/carriers?limit=50')
      .then((r) => r.json())
      .then((json) => { setCarriers(json.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (carriers.length === 0) return <EmptyState message="No carriers found" />

  const alliances = ['All', ...Array.from(new Set(carriers.map(c => c.alliance).filter(Boolean)))]
  const filtered = allianceFilter === 'All' ? carriers : carriers.filter(c => c.alliance === allianceFilter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {alliances.map(a => (
          <Badge key={a} variant={allianceFilter === a ? 'default' : 'outline'}
            className={`cursor-pointer text-xs ${allianceFilter === a ? 'bg-neutral-900 text-white' : ''}`}
            onClick={() => setAllianceFilter(a)}>{a}</Badge>
        ))}
      </div>
      <ScrollArea className="max-h-[600px]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(c => (
            <Card key={c.id} className="border-border">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-foreground">{c.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{c.code} · {c.country}</p>
                  </div>
                  {c.isTop20 && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Top 20</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Fleet:</span> <span className="font-medium text-foreground">{c.fleetSize || '—'}</span></div>
                  <div><span className="text-muted-foreground">TEU:</span> <span className="font-medium text-foreground">{formatNumber(c.totalTEUCapacity || 0)}</span></div>
                  <div><span className="text-muted-foreground">Reliability:</span> <span className={`font-medium ${(c.reliability || 0) >= 80 ? 'text-green-700' : 'text-amber-700'}`}>{(c.reliability || 0).toFixed(1)}%</span></div>
                  <div><span className="text-muted-foreground">CO2/TEU:</span> <span className="font-medium text-foreground">{(c.co2PerTeu || 0).toFixed(1)}g</span></div>
                </div>
                <Separator className="my-2" />
                <div className="flex flex-wrap gap-1">
                  {c.alliance && <Badge variant="outline" className="bg-neutral-50 text-muted-foreground border-border text-xs">{c.alliance}</Badge>}
                  {c.isFCL && <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 text-xs">FCL</Badge>}
                  {c.isLCL && <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 text-xs">LCL</Badge>}
                  {c.isReefer && <Badge variant="outline" className="bg-cyan-50 text-cyan-600 border-cyan-200 text-xs">Reefer</Badge>}
                  {c.isDG && <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">DG</Badge>}
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{c._count.vessels} vessels</span>
                  <span>{c._count.shipments} shipments</span>
                  <span>{c._count.bookings} bookings</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

// ─── Charters Panel ──────────────────────────────────────────────────

interface CharterRecord {
  id: string; charterType: string; charterer: string; startDate: string; endDate: string;
  durationDays: number; ratePerDay: number; currency: string; totalValue: number;
  deliveryPort: string; redeliveryPort: string; bunkers: string; status: string; remarks: string;
  vessel: { name: string; mmsi: number; imo: number; vesselType: string; flagCountry: string };
  carrier?: { name: string; code: string } | null;
}

function ChartersPanel() {
  const [charters, setCharters] = useState<CharterRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/charters?limit=50')
      .then((r) => r.json())
      .then((json) => { setCharters(json.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (charters.length === 0) return <EmptyState message="No charters found" />

  return (
    <ScrollArea className="max-h-[600px]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-muted/50">
            <TableHead>Vessel</TableHead>
            <TableHead>Charterer</TableHead>
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead className="hidden md:table-cell">Duration</TableHead>
            <TableHead className="hidden lg:table-cell">Rate/Day</TableHead>
            <TableHead className="hidden lg:table-cell">Total Value</TableHead>
            <TableHead className="hidden xl:table-cell">Delivery → Redelivery</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {charters.map(ch => (
            <TableRow key={ch.id} className="hover:bg-muted/50">
              <TableCell>
                <div className="flex items-center gap-2">
                  <Ship className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{ch.vessel.name}</p>
                    <p className="text-xs text-muted-foreground">{ch.vessel.imo ? `IMO ${ch.vessel.imo}` : `MMSI ${ch.vessel.mmsi}`}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-foreground">{ch.charterer || '—'}</TableCell>
              <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-xs bg-neutral-50 border-border">{ch.charterType}</Badge></TableCell>
              <TableCell className="hidden md:table-cell text-xs text-foreground/70">{ch.durationDays || '—'} days</TableCell>
              <TableCell className="hidden lg:table-cell text-xs font-medium text-foreground">{ch.ratePerDay ? `${formatCurrency(ch.ratePerDay)}/day` : '—'}</TableCell>
              <TableCell className="hidden lg:table-cell text-xs font-medium text-foreground">{ch.totalValue ? formatCurrency(ch.totalValue) : '—'}</TableCell>
              <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{ch.deliveryPort} → {ch.redeliveryPort}</TableCell>
              <TableCell>
                <Badge variant="outline" className={
                  ch.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                  ch.status === 'Completed' ? 'bg-muted text-foreground/70 border-border' :
                  ch.status === 'Terminated' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                  'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }>{ch.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}

// ─── Bookings Panel ───────────────────────────────────────────────────

interface BookingRecord {
  id: string; bookingNumber: string; bookingDate: string; cutoffDate: string;
  status: string; containerCount: number; teuBooked: number; weightBookedKg: number;
  commodity: string; specialInstructions: string; equipmentType: string;
  rate: number; rateCurrency: string; rateType: string;
  carrier?: { name: string; code: string } | null;
  vessel: { name: string; mmsi: number; imo: number };
  originPort: { name: string; countryCode: string; unlocode: string };
  destPort: { name: string; countryCode: string; unlocode: string };
  shipment?: { billOfLading: string; status: string } | null;
}

function BookingsPanel() {
  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')

  useEffect(() => {
    fetch('/api/bookings?limit=50')
      .then((r) => r.json())
      .then((json) => { setBookings(json.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />
  if (bookings.length === 0) return <EmptyState message="No bookings found" />

  const statuses = ['All', ...Array.from(new Set(bookings.map(b => b.status)))]
  const filtered = statusFilter === 'All' ? bookings : bookings.filter(b => b.status === statusFilter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {statuses.map(s => (
          <Badge key={s} variant={statusFilter === s ? 'default' : 'outline'}
            className={`cursor-pointer text-xs ${statusFilter === s ? 'bg-neutral-900 text-white' : ''}`}
            onClick={() => setStatusFilter(s)}>{s}</Badge>
        ))}
      </div>
      <ScrollArea className="max-h-[600px]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-muted/50">
              <TableHead>Booking #</TableHead>
              <TableHead className="hidden md:table-cell">Carrier</TableHead>
              <TableHead>Route</TableHead>
              <TableHead className="hidden lg:table-cell">Equipment</TableHead>
              <TableHead className="hidden md:table-cell">TEU</TableHead>
              <TableHead className="hidden lg:table-cell">Rate</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(b => (
              <TableRow key={b.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-mono text-sm font-medium text-foreground">{b.bookingNumber}</p>
                      <p className="text-xs text-muted-foreground">{b.commodity}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-foreground/70">{b.carrier?.name || '—'} <span className="text-muted-foreground/70">({b.carrier?.code})</span></TableCell>
                <TableCell className="text-xs">
                  <span className="text-foreground">{b.originPort.name}</span>
                  <span className="text-muted-foreground/70"> → </span>
                  <span className="text-foreground">{b.destPort.name}</span>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant="outline" className="bg-neutral-50 text-muted-foreground border-border text-xs">{b.equipmentType}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-foreground/70">{b.teuBooked}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs font-medium text-foreground">
                  {b.rate ? `${formatCurrency(b.rate)}` : '—'}
                  <span className="ml-1 text-muted-foreground/70 text-xs">{b.rateType}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={
                    b.status === 'Confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                    b.status === 'Cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                    b.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                    b.status === 'Rolled' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                    'bg-muted text-foreground/70 border-border'
                  }>{b.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}

// ─── Map Panel ────────────────────────────────────────────────────────

function MapPanel() {
  const [vessels, setVessels] = useState<any[]>([])
  const [ports, setPorts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [liveActive, setLiveActive] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  // Load initial data
  useEffect(() => {
    Promise.all([
      fetch('/api/vessels?limit=100').then(r => r.json()),
      fetch('/api/ports?limit=60').then(r => r.json()),
    ])
      .then(([v, p]) => {
        setVessels(v.data || [])
        setPorts(p.data || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // SSE real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null

    const connect = () => {
      eventSource = new EventSource('/api/vessels/stream')

      eventSource.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'init' || msg.type === 'update') {
            setVessels(msg.vessels || [])
            setLiveActive(true)
            setLastUpdate(new Date().toLocaleTimeString())
          }
        } catch { /* ignore parse errors */ }
      }

      eventSource.onerror = () => {
        setLiveActive(false)
        eventSource?.close()
        // Reconnect after 10s
        setTimeout(connect, 10000)
      }
    }

    // Start SSE after initial load
    const timer = setTimeout(connect, 2000)

    return () => {
      clearTimeout(timer)
      eventSource?.close()
    }
  }, [])

  if (loading) return <LoadingSpinner />
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">Showing {vessels.length} vessels and {ports.length} ports worldwide</p>
          {liveActive && (
            <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-400 border-green-500/30">
              <Radio className="mr-1 h-3 w-3 animate-pulse" />
              LIVE
              {lastUpdate && <span className="ml-1 text-muted-foreground/60">{lastUpdate}</span>}
            </Badge>
          )}
        </div>
        <ExportButtons data={vessels} filename="vessels" formats={['csv']} />
      </div>
      <VesselMap vessels={vessels} ports={ports} />
    </div>
  )
}

// ─── Analytics Panel ──────────────────────────────────────────────────

function AnalyticsPanel({ data }: { data: DashboardData | null }) {
  if (!data) return <LoadingSpinner />
  return <AnalyticsCharts data={data} />
}

// ─── Main Dashboard Component ────────────────────────────────────────

export default function MaritimeDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [commandOpen, setCommandOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const darkMode = theme === 'dark'

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((json) => { setDashboardData(json); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Theme is managed by next-themes ThemeProvider in layout.tsx

  return (
    <div className='flex min-h-screen flex-col bg-background'>
      {/* Sticky Header */}
      <header className='sticky top-0 z-50 border-b backdrop-blur-sm bg-background/95 border-border'>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary'>
              <Ship className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className='text-lg font-bold text-foreground'>Maritime Analytics</h1>
              <p className='hidden text-xs sm:block text-muted-foreground'>Global Maritime & Freight Platform</p>
            </div>
          </div>
          {/* Global Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              readOnly
              placeholder="Search vessels, ports, shipments..."
              className="h-8 w-64 bg-muted border-border pl-8 text-xs text-foreground placeholder:text-muted-foreground/50 cursor-pointer"
              onClick={() => setCommandOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setCommandOpen(true)
                }
              }}
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden rounded border border-border bg-secondary px-1.5 font-mono text-[10px] font-medium text-muted-foreground lg:inline-block">
              ⌘K
            </kbd>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden gap-1 bg-green-500/10 text-green-400 border-green-500/30 sm:flex">
              <Activity className="h-3 w-3" />
              Live
            </Badge>
            <Badge variant="outline" className='border-border bg-secondary text-secondary-foreground'>
              <Waves className="mr-1 h-3 w-3" />
              {dashboardData ? formatNumber(dashboardData.summary.activeVessels) : '—'} Active
            </Badge>
            <NotificationCenter />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(darkMode ? 'light' : 'dark')}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className='mb-6 flex w-full flex-wrap gap-1 bg-muted'>
              <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Globe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Live Map</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Analytics</span>
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
              <TabsTrigger value="carriers" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Handshake className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Carriers</span>
              </TabsTrigger>
              <TabsTrigger value="charters" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Gauge className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Charters</span>
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bookings</span>
              </TabsTrigger>
              <TabsTrigger value="compliance" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Compliance</span>
              </TabsTrigger>
              <TabsTrigger value="esg" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Leaf className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">ESG</span>
              </TabsTrigger>
              <TabsTrigger value="voyage" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Navigation className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Voyage</span>
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Bell className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Alerts</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewPanel data={dashboardData} />
            </TabsContent>
            <TabsContent value="map">
              <MapPanel />
            </TabsContent>
            <TabsContent value="analytics">
              <AnalyticsPanel data={dashboardData} />
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
            <TabsContent value="carriers">
              <CarriersPanel />
            </TabsContent>
            <TabsContent value="charters">
              <ChartersPanel />
            </TabsContent>
            <TabsContent value="bookings">
              <BookingsPanel />
            </TabsContent>
            <TabsContent value="compliance">
              <CompliancePanel />
            </TabsContent>
            <TabsContent value="esg">
              <ESGPanel />
            </TabsContent>
            <TabsContent value="voyage">
              <VoyageAnalyticsPanel />
            </TabsContent>
            <TabsContent value="alerts">
              <NotificationCenter expanded />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onNavigate={(tab) => setActiveTab(tab)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <p className="text-xs text-muted-foreground/70">Global Maritime & Freight Analytics Platform</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
            <Radio className="h-3 w-3" />
            <span>System Online</span>
          </div>
        </div>
      </footer>
    </div>
  )
}