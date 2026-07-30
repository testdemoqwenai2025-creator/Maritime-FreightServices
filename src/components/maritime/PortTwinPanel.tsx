'use client'

import React, { useState, useEffect } from 'react'
import { Building2, Ship, Construction, Package, Gauge, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const BERTH_STATUS: Record<string, string> = {
  Planned: 'bg-slate-500', Arrived: 'bg-blue-500', Berthed: 'bg-cyan-500',
  Working: 'bg-amber-500', Departed: 'bg-green-500', Cancelled: 'bg-red-500',
}
const CRANE_STATUS: Record<string, string> = {
  Idle: 'bg-slate-500', Working: 'bg-green-500', Maintenance: 'bg-amber-500', Offline: 'bg-red-500',
}

interface Berth { id: string; berthNumber: string; vesselName?: string; status: string; cargoType?: string; teuExpected?: number; teuLoaded?: number; craneAssigned: number; arrivalETA?: string; departureETD?: string; actualArrival?: string; port?: { name: string; unlocode: string } }
interface Crane { id: string; craneId: string; craneType: string; berthNumber?: string; status: string; currentTask?: string; movesPerHour?: number; totalMoves: number; efficiencyPct?: number; shiftStart?: string; shiftEnd?: string }

export default function PortTwinPanel() {
  const [berths, setBerths] = useState<Berth[]>([])
  const [cranes, setCranes] = useState<Crane[]>([])
  const [summary, setSummary] = useState({ activeBerths: 0, totalCranes: 0, workingCranes: 0, teuLoaded: 0, teuExpected: 0, utilizationPct: 0, avgCraneEfficiency: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/port-operations/berths').then(r => r.json()).then(d => {
      setBerths(d.berths || [])
      setCranes(d.cranes || [])
      setSummary(d.summary || {})
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Active Berths', value: summary.activeBerths, icon: Ship, color: 'text-cyan-400' },
         { label: 'Working Cranes', value: summary.workingCranes, icon: Crane, color: 'text-green-400' },
         { label: 'TEU Utilization', value: `${summary.utilizationPct}%`, icon: Package, color: 'text-blue-400' },
         { label: 'Avg Efficiency', value: `${summary.avgCraneEfficiency}%`, icon: Gauge, color: 'text-amber-400' },
        ].map(s => (
          <Card key={s.label} className="bg-card border border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border border-border">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Building2 className="h-4 w-4" /> Berth Allocations</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? <p className="text-xs text-muted-foreground animate-pulse">Loading...</p> :
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {berths.map(b => {
                const pct = b.teuExpected && b.teuExpected > 0 ? Math.round((b.teuLoaded || 0) / b.teuExpected * 100) : 0
                return (
                  <div key={b.id} className="p-2.5 rounded-lg bg-muted/30 border border-border space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground font-mono">{b.berthNumber}</span>
                        <Badge className={`${BERTH_STATUS[b.status] || 'bg-slate-500'} text-white text-[10px] px-1.5 py-0`}>{b.status}</Badge>
                        {b.cargoType && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{b.cargoType}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground">{b.craneAssigned} crane{b.craneAssigned !== 1 ? 's' : ''}</span>
                    </div>
                    {b.vesselName && <p className="text-xs text-foreground">{b.vesselName}</p>}
                    {b.teuExpected ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-blue-500 transition-all" style={{ width: `${pct}%` }} /></div>
                        <span className="text-[10px] text-muted-foreground w-20 text-right">{(b.teuLoaded || 0)}/{b.teuExpected} TEU</span>
                      </div>
                    ) : null}
                    {b.arrivalETA && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> ETA: {new Date(b.arrivalETA).toLocaleDateString()} → {b.departureETD ? new Date(b.departureETD).toLocaleDateString() : 'TBD'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>}
          </CardContent>
        </Card>
        <Card className="bg-card border border-border">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Crane className="h-4 w-4" /> Crane Status</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {cranes.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium text-foreground">{c.craneId}</span>
                      <Badge className={`${CRANE_STATUS[c.status] || 'bg-slate-500'} text-white text-[10px] px-1.5 py-0`}>{c.status}</Badge>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{c.craneType}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                      {c.currentTask && <span>Task: {c.currentTask}</span>}
                      {c.movesPerHour != null && <span>{c.movesPerHour} moves/h</span>}
                      {c.efficiencyPct != null && <span>Eff: {c.efficiencyPct}%</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-foreground">{c.totalMoves}</p>
                    <p className="text-[10px] text-muted-foreground">moves</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}