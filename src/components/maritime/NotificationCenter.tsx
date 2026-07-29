'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bell, Ship, AlertTriangle, FileText, Clock, Check, CheckCheck, X, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

// ─── Alert Types & Interface ──────────────────────────────────────────

interface Alert {
  id: string
  type: 'info' | 'warning' | 'critical'
  title: string
  description: string
  timestamp: string
  read: boolean
  tab?: string // which dashboard tab to navigate to
}

interface DashboardData {
  summary: {
    activeVessels: number
    totalShipments: number
    totalDocuments: number
  }
  recentArrivals: Array<{
    arrivalAt: string
    vessel: { name: string; flagCountry: string }
    port: { name: string; congestionLevel?: string | null }
  }>
  congestionDistribution: { level: string; count: number }[]
  documentStats: { status: string; count: number }[]
  tradeOverview: {
    totalCO2: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

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
  return `${days}d ago`
}

function alertTypeIcon(type: Alert['type']) {
  switch (type) {
    case 'critical':
      return <AlertTriangle className="h-4 w-4 text-red-400" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-400" />
    case 'info':
    default:
      return <Info className="h-4 w-4 text-blue-400" />
  }
}

function alertTypeBadgeStyle(type: Alert['type']) {
  switch (type) {
    case 'critical':
      return 'bg-red-500/10 text-red-400 border-red-500/30'
    case 'warning':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    case 'info':
    default:
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  }
}

function alertTypeDotStyle(type: Alert['type']) {
  switch (type) {
    case 'critical':
      return 'bg-red-500'
    case 'warning':
      return 'bg-amber-500'
    case 'info':
    default:
      return 'bg-blue-500'
  }
}

// ─── Generate alerts from dashboard data ──────────────────────────────

function generateAlerts(data: DashboardData): Alert[] {
  const alerts: Alert[] = []
  const now = new Date()

  // Recent arrivals → vessel arrival alerts
  for (const arrival of data.recentArrivals?.slice(0, 4) ?? []) {
    const ageMs = now.getTime() - new Date(arrival.arrivalAt).getTime()
    const hoursAgo = Math.max(0, ageMs / 3600000)
    alerts.push({
      id: `arrival-${arrival.vessel.name}-${arrival.port.name}`,
      type: hoursAgo < 6 ? 'critical' : 'info',
      title: `Vessel ${arrival.vessel.name} arrived`,
      description: `${arrival.vessel.name} (${arrival.vessel.flagCountry}) arrived at ${arrival.port.name}`,
      timestamp: new Date(now.getTime() - hoursAgo * 3600000).toISOString(),
      read: false,
      tab: 'overview',
    })
  }

  // High congestion ports → congestion alerts
  const criticalCongestion = data.congestionDistribution?.find(c => c.level === 'Critical' || c.level === 'High')
  if (criticalCongestion) {
    alerts.push({
      id: 'congestion-critical',
      type: criticalCongestion.level === 'Critical' ? 'critical' : 'warning',
      title: `Congestion alert: ${criticalCongestion.level} level detected`,
      description: `${criticalCongestion.count} ports operating at ${criticalCongestion.level} congestion level`,
      timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
      read: false,
      tab: 'ports',
    })
  }

  // Document stats → pending approval alerts
  const pendingDocs = data.documentStats?.find(d => d.status === 'Pending')
  if (pendingDocs && pendingDocs.count > 0) {
    alerts.push({
      id: 'docs-pending',
      type: pendingDocs.count > 50 ? 'warning' : 'info',
      title: `${pendingDocs.count} documents pending approval`,
      description: `There are ${pendingDocs.count} documents awaiting approval. Review required.`,
      timestamp: new Date(now.getTime() - 4 * 3600000).toISOString(),
      read: false,
      tab: 'compliance',
    })
  }

  // CO₂ data → Fleet CII rating update
  alerts.push({
    id: 'co2-cii-update',
    type: 'info',
    title: 'Fleet CII rating update available',
    description: `Total fleet CO₂ emissions: ${(data.tradeOverview?.totalCO2 ?? 0).toFixed(0)}t. CII ratings recalculated for active vessels.`,
    timestamp: new Date(now.getTime() - 8 * 3600000).toISOString(),
    read: false,
    tab: 'analytics',
  })

  // ETA update simulation
  alerts.push({
    id: 'eta-bulk-update',
    type: 'info',
    title: 'ETA predictions updated',
    description: `Estimated arrival times updated for ${data.summary?.activeVessels ?? 0} active vessels based on current conditions.`,
    timestamp: new Date(now.getTime() - 1 * 3600000).toISOString(),
    read: false,
    tab: 'voyage',
  })

  return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

// ─── Popover View (compact dropdown) ───────────────────────────────────

function NotificationCenterPopover({
  alerts,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}: {
  alerts: Alert[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onNavigate: (tab: string) => void
}) {
  const unreadCount = alerts.filter(a => !a.read).length

  return (
    <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-foreground" />
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="outline" className={alertTypeBadgeStyle('info')}>
              {unreadCount} new
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onMarkAllRead()
            }}
          >
            <CheckCheck className="mr-1 h-3 w-3" />
            Mark all read
          </Button>
        )}
      </div>
      <ScrollArea className="h-96">
        <div className="divide-y divide-border">
          {alerts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="mb-2 h-6 w-6 opacity-40" />
              <p className="text-sm">No notifications</p>
            </div>
          )}
          {alerts.map((alert) => (
            <button
              key={alert.id}
              className={`group flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                alert.read ? 'opacity-60' : ''
              }`}
              onClick={() => {
                onMarkRead(alert.id)
                if (alert.tab) onNavigate(alert.tab)
              }}
            >
              <div className="mt-0.5 flex-shrink-0">{alertTypeIcon(alert.type)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{alert.title}</p>
                  {!alert.read && (
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${alertTypeDotStyle(alert.type)}`} />
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{alert.description}</p>
                <p className="mt-1 text-[10px] text-muted-foreground/60">{timeAgo(alert.timestamp)}</p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </PopoverContent>
  )
}

// ─── Expanded View (full page for alerts tab) ─────────────────────────

function NotificationCenterExpanded({
  alerts,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}: {
  alerts: Alert[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onNavigate: (tab: string) => void
}) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical' | 'warning' | 'info'>('all')

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'unread') return !a.read
    return a.type === filter || filter === 'all'
  })

  const unreadCount = alerts.filter(a => !a.read).length
  const criticalCount = alerts.filter(a => a.type === 'critical' && !a.read).length
  const warningCount = alerts.filter(a => a.type === 'warning' && !a.read).length
  const infoCount = alerts.filter(a => a.type === 'info' && !a.read).length

  const filterButtons: { label: string; value: typeof filter; count: number }[] = [
    { label: 'All', value: 'all', count: alerts.length },
    { label: 'Unread', value: 'unread', count: unreadCount },
    { label: 'Critical', value: 'critical', count: criticalCount },
    { label: 'Warning', value: 'warning', count: warningCount },
    { label: 'Info', value: 'info', count: infoCount },
  ]

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">Notification Center</CardTitle>
              <p className="text-sm text-muted-foreground">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''} across {alerts.length} total
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:text-foreground"
              onClick={onMarkAllRead}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter buttons */}
        <div className="mb-4 flex flex-wrap gap-2">
          {filterButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={filter === btn.value ? 'default' : 'outline'}
              size="sm"
              className={`h-8 text-xs ${
                filter === btn.value
                  ? 'bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setFilter(btn.value)}
            >
              {btn.label}
              {btn.count > 0 && (
                <Badge
                  variant="secondary"
                  className={`ml-1.5 h-5 min-w-5 rounded-full px-1.5 text-[10px] ${
                    filter === btn.value ? 'bg-primary-foreground/20 text-primary-foreground' : ''
                  }`}
                >
                  {btn.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        <Separator className="mb-4" />

        {/* Alert list */}
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-2">
            {filteredAlerts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Bell className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm">No notifications match this filter</p>
              </div>
            )}
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`group flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30 ${
                  alert.read ? 'border-border/50 opacity-60' : 'border-border'
                }`}
              >
                {/* Left: type indicator + icon */}
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <span className={`h-2 w-2 rounded-full ${alertTypeDotStyle(alert.type)}`} />
                  <div className="mt-1">{alertTypeIcon(alert.type)}</div>
                </div>

                {/* Middle: content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{alert.title}</p>
                    <Badge
                      variant="outline"
                      className={`flex-shrink-0 text-[10px] ${alertTypeBadgeStyle(alert.type)}`}
                    >
                      {alert.type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{alert.description}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                      <Clock className="h-3 w-3" />
                      {timeAgo(alert.timestamp)}
                    </span>
                    {alert.tab && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => onNavigate(alert.tab)}
                      >
                        View details →
                      </Button>
                    )}
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex flex-shrink-0 items-center gap-1">
                  {!alert.read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => onMarkRead(alert.id)}
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ─── Main Exported Component ───────────────────────────────────────────

interface NotificationCenterProps {
  expanded?: boolean
}

export default function NotificationCenter({ expanded = false }: NotificationCenterProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      const data: DashboardData = await res.json()
      const generated = generateAlerts(data)
      setAlerts(generated)
    } catch {
      // Fallback: generate static alerts
      setAlerts([
        {
          id: 'fallback-1',
          type: 'info',
          title: 'System initialized',
          description: 'Notification center is active. Connecting to data feeds...',
          timestamp: new Date().toISOString(),
          read: false,
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const unreadCount = alerts.filter(a => !a.read).length

  const markRead = useCallback((id: string) => {
    setAlerts(prev => {
      const updated = prev.map(a => (a.id === id ? { ...a, read: true } : a))
      const alert = prev.find(a => a.id === id)
      if (alert && !alert.read) {
        toast.success(`Marked as read: ${alert.title}`)
      }
      return updated
    })
  }, [])

  const markAllRead = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })))
    toast.success('All notifications marked as read')
  }, [])

  // When in expanded mode, we use a callback-based navigation approach
  // The parent Dashboard should pass an onNavigate handler via context or props
  // For now, we'll use a simple approach: dispatch a custom event
  const handleNavigate = useCallback((tab: string) => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: tab }))
    if (expanded) return // don't close anything in expanded mode
    setOpen(false)
  }, [expanded])

  // Expanded view (used in Alerts tab)
  if (expanded) {
    return (
      <NotificationCenterExpanded
        alerts={alerts}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onNavigate={handleNavigate}
      />
    )
  }

  // Compact popover view (used in header)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`Notifications: ${unreadCount} unread`}
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <NotificationCenterPopover
        alerts={alerts}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onNavigate={handleNavigate}
      />
    </Popover>
  )
}
