'use client'

import React, { useState, useEffect } from 'react'
import { CreditCard, DollarSign, Clock, FileCheck, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-amber-500', Processing: 'bg-blue-500', Completed: 'bg-green-500', Failed: 'bg-red-500', Refunded: 'bg-gray-500',
}
const METHOD_COLORS: Record<string, string> = {
  Wire: 'text-blue-400', LetterOfCredit: 'text-purple-400', SmartContract: 'text-emerald-400',
}
const TYPE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#6b7280']

interface Payment { id: string; paymentRef: string; amount: number; currency: string; status: string; paymentType: string; paymentMethod: string; contractAddress?: string; contractStatus?: string; dueDate?: string; completedAt?: string; createdAt: string }

export default function PaymentLedgerPanel() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState({ totalAmount: 0, completedAmount: 0, pendingAmount: 0, smartContractCount: 0 })
  const [statusDist, setStatusDist] = useState<{ status: string; amount: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/payments').then(r => r.json()).then(d => {
      setPayments(d.payments || [])
      setSummary(d.summary || { totalAmount: 0, completedAmount: 0, pendingAmount: 0, smartContractCount: 0 })
      setStatusDist(d.statusDistribution || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const fmt = (n: number) => `$${(n / 1000).toFixed(1)}k`

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Value', value: fmt(summary.totalAmount), icon: DollarSign, color: 'text-blue-400' },
          { label: 'Completed', value: fmt(summary.completedAmount), icon: FileCheck, color: 'text-green-400' },
          { label: 'Pending', value: fmt(summary.pendingAmount), icon: Clock, color: 'text-amber-400' },
          { label: 'Smart Contracts', value: summary.smartContractCount, icon: Wallet, color: 'text-emerald-400' },
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
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Amount by Status</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            {statusDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusDist} layout="vertical">
                  <XAxis type="number" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} hide />
                  <YAxis type="category" dataKey="status" width={80} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Amount']} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {statusDist.map((d, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-xs text-muted-foreground">No data</p>}
          </CardContent>
        </Card>
        <Card className="bg-card border border-border lg:col-span-2">
          <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payment Ledger</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? <p className="text-xs text-muted-foreground animate-pulse">Loading...</p> :
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {payments.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground font-mono">{p.paymentRef}</span>
                      <Badge className={`${STATUS_COLORS[p.status] || 'bg-slate-500'} text-white text-[10px] px-1.5 py-0`}>{p.status}</Badge>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{p.paymentType}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className={METHOD_COLORS[p.paymentMethod] || 'text-muted-foreground'}>
                        {p.paymentMethod === 'SmartContract' && <Wallet className="h-3 w-3 inline mr-0.5" />}
                        {p.paymentMethod}
                      </span>
                      {p.dueDate && <span>Due: {new Date(p.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">${p.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}