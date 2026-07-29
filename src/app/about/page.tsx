'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Ship, Anchor, Globe, BarChart3, MapPin, Database,
  Radio, Shield, Cpu, Layers, Zap, ArrowLeft, GitBranch,
  Server, Activity, Search, FileText, TrendingUp, Code,
  Container, Route, Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface DashboardStats {
  summary: {
    totalVessels: number
    totalPorts: number
    totalShipments: number
    totalContainers: number
    totalCarriers: number
    totalTradeRoutes: number
  }
}

const apiEndpoints = [
  { path: '/', method: 'GET', desc: 'Dashboard UI', icon: BarChart3 },
  { path: '/about', method: 'GET', desc: 'Platform info & roadmap', icon: FileText },
  { path: '/api/health', method: 'GET', desc: 'Server health & diagnostics', icon: Activity },
  { path: '/api/search?q=<term>', method: 'GET', desc: 'Unified full-text search', icon: Search },
  { path: '/api/dashboard', method: 'GET', desc: 'Aggregated platform KPIs', icon: Zap },
  { path: '/api/vessels', method: 'GET', desc: 'Vessel fleet listing', icon: Ship },
  { path: '/api/vessels/stream', method: 'SSE', desc: 'Real-time vessel positions', icon: Radio },
  { path: '/api/ports', method: 'GET', desc: 'Global port directory', icon: Anchor },
  { path: '/api/shipments', method: 'GET', desc: 'Shipment tracking', icon: Container },
  { path: '/api/containers', method: 'GET', desc: 'Container inventory', icon: Layers },
  { path: '/api/documents', method: 'GET', desc: 'Shipping documents', icon: FileText },
  { path: '/api/events', method: 'GET', desc: 'Maritime events log', icon: Radio },
  { path: '/api/carriers', method: 'GET', desc: 'Carrier directory', icon: Ship },
  { path: '/api/trade-routes', method: 'GET', desc: 'Trade route definitions', icon: Route },
  { path: '/api/cargo-types', method: 'GET', desc: 'Cargo classification', icon: Database },
  { path: '/api/charters', method: 'GET', desc: 'Charter agreements', icon: FileText },
  { path: '/api/bookings', method: 'GET', desc: 'Booking management', icon: Users },
  { path: '/api/trade-data', method: 'GET', desc: 'Trade statistics & analytics', icon: TrendingUp },
  { path: '/api', method: 'GET', desc: 'API heartbeat', icon: Server },
]

const techStack = [
  { name: 'Next.js 16', layer: 'Framework', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { name: 'TypeScript 5', layer: 'Language', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { name: 'Tailwind CSS 4', layer: 'Styling', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { name: 'shadcn/ui', layer: 'Components', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { name: 'Prisma ORM', layer: 'Database', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { name: 'SQLite', layer: 'Storage', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { name: 'Leaflet', layer: 'Maps', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { name: 'Recharts', layer: 'Charts', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { name: 'SSE', layer: 'Real-time', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { name: 'next-themes', layer: 'Theme', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { name: 'Lucide React', layer: 'Icons', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { name: 'Node.js', layer: 'Runtime', color: 'bg-lime-500/20 text-lime-400 border-lime-500/30' },
]

const phases = [
  {
    phase: 'Phase 2 — Intelligence & Search',
    status: 'current',
    items: ['Unified full-text search API', 'Platform info page', 'Server health endpoint', 'API documentation', 'XLSX export', 'Keyboard shortcuts'],
  },
  {
    phase: 'Phase 3 — AI & Predictive',
    status: 'planned',
    items: ['AI ETA prediction', 'Anomaly detection', 'Route optimization', 'Demand forecasting', 'Automated alerts', 'Natural language queries'],
  },
  {
    phase: 'Phase 4 — Digital Supply Chain',
    status: 'planned',
    items: ['Blockchain eBL', 'Smart contracts', 'Document automation', 'Multi-party portal', 'IoT reefer tracking', 'Port digital twin'],
  },
]

export default function AboutPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [health, setHealth] = useState<{ status: string } | null>(null)

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setStats).catch(() => {})
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Maritime & Freight Analytics Platform</h1>
              <p className="text-muted-foreground">Open-source global maritime intelligence</p>
            </div>
          </div>
        </div>

        {/* Live Stats */}
        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Vessels', value: stats.summary.totalVessels, icon: Ship },
              { label: 'Ports', value: stats.summary.totalPorts, icon: Anchor },
              { label: 'Shipments', value: stats.summary.totalShipments, icon: Container },
              { label: 'Containers', value: stats.summary.totalContainers, icon: Layers },
              { label: 'Carriers', value: stats.summary.totalCarriers, icon: Users },
              { label: 'Trade Routes', value: stats.summary.totalTradeRoutes, icon: Route },
            ].map(s => (
              <Card key={s.label} className="border-border bg-card">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <s.icon className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="mt-1 text-xl font-bold">{s.value.toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Architecture */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                Architecture & Stack
              </CardTitle>
              <CardDescription>Modern full-stack maritime platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Architecture Overview</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-400" />
                      <span>Next.js App Router — SSR + API Routes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-400" />
                      <span>Prisma ORM — Type-safe database access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-400" />
                      <span>SSE Streaming — Real-time vessel positions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-purple-400" />
                      <span>React Client Components — Interactive dashboard</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {techStack.map(t => (
                    <Badge key={t.name} variant="outline" className={`border ${t.color}`}>
                      {t.name}
                      <span className="ml-1 text-[10px] opacity-60">{t.layer}</span>
                    </Badge>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded border border-border bg-muted/30 p-2">
                    <p className="text-muted-foreground">Data Models</p>
                    <p className="font-bold">13</p>
                  </div>
                  <div className="rounded border border-border bg-muted/30 p-2">
                    <p className="text-muted-foreground">API Routes</p>
                    <p className="font-bold">19</p>
                  </div>
                  <div className="rounded border border-border bg-muted/30 p-2">
                    <p className="text-muted-foreground">Seeded Records</p>
                    <p className="font-bold">1,500+</p>
                  </div>
                  <div className="rounded border border-border bg-muted/30 p-2">
                    <p className="text-muted-foreground">Dashboard Tabs</p>
                    <p className="font-bold">10+</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Reference */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                API Reference
              </CardTitle>
              <CardDescription>19 endpoints — RESTful + SSE</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-2">
                {apiEndpoints.map(ep => {
                  const Icon = ep.icon
                  return (
                    <div key={ep.path} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono border-border bg-secondary text-secondary-foreground">
                        {ep.method}
                      </Badge>
                      <code className="flex-1 truncate font-mono text-xs text-foreground/80">{ep.path}</code>
                      <span className="text-xs text-muted-foreground hidden sm:inline">{ep.desc}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Roadmap */}
          <Card className="border-border bg-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                Evolution Roadmap
              </CardTitle>
              <CardDescription>3-phase plan — from intelligence to digital supply chain</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {phases.map(p => (
                  <div key={p.phase} className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge variant={p.status === 'current' ? 'default' : 'outline'} className={p.status === 'current' ? 'bg-primary text-primary-foreground' : 'border-border'}>
                        {p.status === 'current' ? 'In Progress' : 'Planned'}
                      </Badge>
                    </div>
                    <h3 className="mb-2 text-sm font-semibold">{p.phase}</h3>
                    <ul className="space-y-1.5">
                      {p.items.map(item => (
                        <li key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className={`h-1.5 w-1.5 rounded-full ${p.status === 'current' ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status Footer */}
          {health && (
            <Card className="border-border bg-card lg:col-span-2">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${health.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-sm text-muted-foreground">
                    System {health.status === 'healthy' ? 'Online' : 'Degraded'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/60">
                  Maritime & Freight Analytics Platform v0.2.1 — Open Source
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
