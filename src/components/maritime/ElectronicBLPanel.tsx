'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Link2, Shield, CheckCircle2, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-slate-500', Issued: 'bg-blue-500', Endorsed: 'bg-purple-500',
  InTransit: 'bg-amber-500', Delivered: 'bg-green-500', Surrendered: 'bg-gray-500', Void: 'bg-red-500',
}
const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#6b7280']

interface EBL { id: string; blNumber: string; status: string; carrierName: string; vesselName?: string; voyageNumber?: string; portOfLoading: string; portOfDischarge: string; descriptionOfGoods?: string; containerCount: number; grossWeight?: number; documentHash?: string; blockchainTxId?: string; issuedAt?: string; deliveredAt?: string; shipment?: { id: string; status: string; cargoDesc?: string; containerCount?: number } }

export default function ElectronicBLPanel() {
  const [ebls, setEbls] = useState<EBL[]>([])
  const [dist, setDist] = useState<{ status: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ebl').then(r => r.json()).then(d => {
      setEbls(d.ebls || [])
      setDist(d.statusDistribution || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const counts = { total: ebls.length, issued: ebls.filter(e => e.status === 'Issued').length, inTransit: ebls.filter(e => e.status === 'InTransit').length, delivered: ebls.filter(e => e.status === 'Delivered').length }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total eBLs', value: counts.total, icon: FileText, color: 'text-blue-400' },
          { label: 'Issued', value: counts.issued, icon: Shield, color: 'text-blue-400' },
          { label: 'In Transit', value: counts.inTransit, icon: ArrowRight, color: 'text-amber-400' },
          { label: 'Delivered', value: counts.delivered, icon: CheckCircle2, color: 'text-green-400' },
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-card border border-border lg:col-span-1">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Status Distribution</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            {dist.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={dist} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {dist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground">No data</p>}
            <div className="mt-2 space-y-1">
              {dist.map((d, i) => (
                <div key={d.status} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{d.status}</span>
                  </div>
                  <span className="text-foreground font-medium">{d.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border border-border lg:col-span-2">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Bills of Lading</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? <p className="text-xs text-muted-foreground animate-pulse">Loading...</p> :
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {ebls.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{e.blNumber}</span>
                      <Badge className={`${STATUS_COLORS[e.status] || 'bg-slate-500'} text-white text-[10px] px-1.5 py-0`}>{e.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{e.carrierName}</span>
                      <span>{e.portOfLoading} → {e.portOfDischarge}</span>
                      {e.containerCount > 0 && <span>{e.containerCount} TEU</span>}
                    </div>
                  </div>
                  {e.blockchainTxId && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                      <Link2 className="h-3 w-3" />
                      <span className="font-mono">{e.blockchainTxId.slice(0, 10)}...</span>
                    </div>
                  )}
                </div>
              ))}
            </div>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}